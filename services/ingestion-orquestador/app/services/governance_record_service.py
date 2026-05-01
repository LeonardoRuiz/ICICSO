import json
from datetime import UTC, datetime

from app.core.config import Settings, get_settings
from app.domain.models import (
    GovernanceLedgerFeed,
    GovernanceRecord,
    GovernanceRecordRequest,
    SourceDocument,
)
from app.persistence.database import get_connection
from app.services.audit_report_service import AuditReportService


class GovernanceRecordService:
    def __init__(self, *, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._audit_report_service = AuditReportService(settings=self._settings)

    def create_record(
        self, *, document: SourceDocument, request: GovernanceRecordRequest
    ) -> GovernanceRecord:
        now = datetime.now(UTC).isoformat()
        effective_from = request.effective_from or now
        record_id = f"GOV-{document.document_id}"

        record = GovernanceRecord(
            governance_record_id=record_id,
            record_type=request.record_type,
            vrn=document.vrn or "",
            severity=request.severity,
            description=request.description,
            source_domain=request.source_domain,
            affected_entities=request.affected_entities or [document.document_id],
            effective_from=effective_from,
            effective_to=request.effective_to,
            append_only_flag=True,
            created_at=now,
            created_by=request.created_by,
            source_document_id=document.document_id,
            source_file_name=document.file_name,
            source_absolute_path=document.absolute_path,
            source_relative_path=document.relative_path,
        )

        with get_connection(self._settings.sqlite_path) as connection:
            if request.activate_vrn and request.vrn_status == "ACTIVE" and not request.allow_reactivate:
                existing_deprecation = connection.execute(
                    """
                    SELECT 1
                    FROM governance_records
                    WHERE vrn = ?
                      AND record_type = 'deprecation'
                    LIMIT 1
                    """,
                    (document.vrn or "",),
                ).fetchone()
                if existing_deprecation is not None:
                    raise ValueError("VRN reactivation is blocked by deprecation record.")
            connection.execute(
                """
                INSERT OR REPLACE INTO governance_records (
                    governance_record_id,
                    record_type,
                    vrn,
                    severity,
                    description,
                    source_domain,
                    affected_entities_json,
                    effective_from,
                    effective_to,
                    append_only_flag,
                    created_at,
                    created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.governance_record_id,
                    record.record_type,
                    record.vrn,
                    record.severity,
                    record.description,
                    record.source_domain,
                    json.dumps(record.affected_entities),
                    record.effective_from,
                    record.effective_to,
                    1 if record.append_only_flag else 0,
                    record.created_at,
                    record.created_by,
                ),
            )

            if request.activate_vrn:
                connection.execute(
                    """
                    UPDATE uploaded_source_documents
                    SET vrn_status = ?
                    WHERE document_id = ?
                    """,
                    (request.vrn_status, document.document_id),
                )
            connection.commit()

        self.write_feed_exports()
        self._audit_report_service.append_event(
            document_id=document.document_id,
            vrn=document.vrn,
            event_type="GOVERNANCE_RECORDED",
            stage=document.continuum_stage,
            actor=request.created_by,
            summary=f"Governance record {record.governance_record_id} persistido.",
            payload={
                "governance_record_id": record.governance_record_id,
                "record_type": record.record_type,
                "severity": record.severity,
                "description": record.description,
                "vrn_status": request.vrn_status if request.activate_vrn else document.vrn_status,
            },
            related_record_id=record.governance_record_id,
        )
        self._audit_report_service.write_feed_exports()
        return record

    def list_records(self, *, limit: int = 50) -> list[GovernanceRecord]:
        with get_connection(self._settings.sqlite_path) as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM governance_records
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

            records: list[GovernanceRecord] = []
            for row in rows:
                affected_entities = json.loads(row["affected_entities_json"])
                source_document = self._resolve_source_document(
                    connection=connection,
                    affected_entities=affected_entities,
                )
                records.append(
                    GovernanceRecord(
                        governance_record_id=row["governance_record_id"],
                        record_type=row["record_type"],
                        vrn=row["vrn"],
                        severity=row["severity"],
                        description=row["description"],
                        source_domain=row["source_domain"],
                        affected_entities=affected_entities,
                        effective_from=row["effective_from"],
                        effective_to=row["effective_to"],
                        append_only_flag=bool(row["append_only_flag"]),
                        created_at=row["created_at"],
                        created_by=row["created_by"],
                        source_document_id=source_document.document_id if source_document else None,
                        source_file_name=source_document.file_name if source_document else None,
                        source_absolute_path=source_document.absolute_path if source_document else None,
                        source_relative_path=source_document.relative_path if source_document else None,
                    )
                )

        return records

    def _resolve_source_document(self, *, connection, affected_entities: list[str]) -> SourceDocument | None:
        for entity_id in affected_entities:
            row = connection.execute(
                """
                SELECT *
                FROM uploaded_source_documents
                WHERE document_id = ?
                LIMIT 1
                """,
                (entity_id,),
            ).fetchone()
            if row is not None:
                return SourceDocument(
                    document_id=row["document_id"],
                    vrn=row["source_vrn"],
                    vrn_policy_id=row["vrn_policy_id"],
                    institutional_version=row["institutional_version"],
                    vrn_status=row["vrn_status"],
                    specialty=None,
                    sub_specialty=None,
                    epidemic_focus=None,
                    ingest_artifact_id=row["ingest_artifact_id"],
                    ser_artifact_id=row["ser_artifact_id"],
                    file_name=row["file_name"],
                    absolute_path=row["absolute_path"],
                    relative_path=row["relative_path"],
                    extension=row["extension"],
                    document_type=row["document_type"],
                    layer=row["layer"],
                    category=row["category"],
                    document_group=row["document_group"],
                    language=row["language"],
                    version_detected=row["version_detected"],
                    size_bytes=row["size_bytes"],
                    last_write_time_utc=row["last_write_time_utc"],
                    ingestion_timestamp_utc=row["ingestion_timestamp_utc"],
                    hash_sha256=row["hash_sha256"],
                    source_status=row["source_status"],
                    source_origin=row["source_origin"],
                    continuum_stage=row["continuum_stage"],
                    ingestion_notes=row["ingestion_notes"],
                    derived_artifacts=json.loads(row["derived_artifacts_json"] or "[]"),
                )
        return None

    def build_feed(self, *, limit: int = 50) -> GovernanceLedgerFeed:
        records = self.list_records(limit=limit)
        active_vrn_count = sum(1 for record in records if record.record_type in {"CR", "GCA"})
        return GovernanceLedgerFeed(
            generated_at_utc=datetime.now(UTC).isoformat(),
            total_records=len(records),
            active_vrn_count=active_vrn_count,
            records=records,
        )

    def write_feed_exports(self) -> None:
        feed = self.build_feed(limit=50)
        payload = feed.model_dump(mode="json")
        runtime_json = json.dumps(payload, ensure_ascii=True, indent=2)

        self._settings.gcl_runtime_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.gcl_dashboard_feed_path.parent.mkdir(parents=True, exist_ok=True)

        self._settings.gcl_runtime_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.gcl_dashboard_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.gcl_emulator_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.gcl_emulator_feed_path.write_text(
            "export const gclLedgerFeed = "
            f"{runtime_json};\n",
            encoding="utf-8",
        )
