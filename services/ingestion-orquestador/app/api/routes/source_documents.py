from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.core.config import get_settings
from app.domain.models import (
    CatalogImportResult,
    ContinuumPreparation,
    ContinuumMaterializationResult,
    DocumentIngestionFeed,
    DocumentIngestionRequest,
    DocumentIngestionResponse,
    DocumentVersionHistory,
    DocumentClassificationUpdate,
    DocumentMetadataUpdate,
    DocumentAuditFeed,
    DocumentAuditReport,
    GovernanceRecord,
    GovernanceRecordRequest,
    GovernanceLedgerFeed,
    EvidenceObjectAuditRecord,
    EvidenceObjectAuditRequest,
    EvidenceObjectCandidate,
    GuidelineRecommendation,
    ManifestImportRun,
    ManifestSummary,
    SourceDocument,
    SourceDocumentPage,
    NomenclatureCatalog,
    VrnPolicy,
)
from app.services.catalog_repository import CatalogRepository
from app.services.document_ingestion_service import DocumentIngestionService
from app.services.governance_record_service import GovernanceRecordService
from app.services.audit_report_service import AuditReportService
from app.services.manifest_repository import ManifestRepository
from app.services.vrn_policy_service import VrnPolicyService
from app.services.nomenclature_service import NomenclatureService


router = APIRouter()
repository = ManifestRepository()
catalog_repository = CatalogRepository()
document_ingestion_service = DocumentIngestionService()
vrn_policy_service = VrnPolicyService()
governance_record_service = GovernanceRecordService()
audit_report_service = AuditReportService()
nomenclature_service = NomenclatureService()


def require_import_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()

    if not settings.import_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Import endpoint is disabled until INGESTION_IMPORT_API_KEY is configured.",
        )

    if x_api_key != settings.import_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid import API key.",
        )


@router.get("/summary", response_model=ManifestSummary)
def read_manifest_summary() -> ManifestSummary:
    return catalog_repository.load_summary()


@router.get("/vrn-policy", response_model=VrnPolicy)
def read_vrn_policy() -> VrnPolicy:
    return vrn_policy_service.load_policy()


@router.get("/nomenclature", response_model=NomenclatureCatalog)
def read_nomenclature() -> NomenclatureCatalog:
    return nomenclature_service.load_catalog()


@router.post("/ingestions", response_model=DocumentIngestionResponse)
def ingest_source_document(
    request: DocumentIngestionRequest,
) -> DocumentIngestionResponse:
    return document_ingestion_service.ingest_document(request)


@router.get("/ingestions", response_model=list[SourceDocument])
def list_uploaded_source_documents(
    limit: int = Query(default=25, ge=1, le=250),
) -> list[SourceDocument]:
    return document_ingestion_service.list_uploaded_documents(limit=limit)


@router.patch("/ingestions/{document_id}/classification", response_model=SourceDocument)
def update_document_classification(
    document_id: str,
    update: DocumentClassificationUpdate,
) -> SourceDocument:
    updated = document_ingestion_service.update_classification(document_id, update)
    if updated is None:
        catalog = catalog_repository.get_document(document_id)
        if catalog is None:
            raise HTTPException(status_code=404, detail="Source document not found.")
        return catalog

    return updated


@router.patch("/ingestions/{document_id}/metadata", response_model=SourceDocument)
def update_document_metadata(
    document_id: str,
    update: DocumentMetadataUpdate,
) -> SourceDocument:
    try:
        updated = document_ingestion_service.update_metadata(document_id, update)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    if updated is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")

    return updated


@router.get("/ingestions/feed", response_model=DocumentIngestionFeed)
def read_document_ingestion_feed(
    limit: int = Query(default=12, ge=1, le=100),
) -> DocumentIngestionFeed:
    return document_ingestion_service.get_feed(limit=limit)


@router.get("/ingestions/{document_id}/versions", response_model=DocumentVersionHistory)
def read_document_version_history(document_id: str) -> DocumentVersionHistory:
    history = document_ingestion_service.get_version_history(document_id)
    if history is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")
    return history


@router.get("/ingestions/{document_id}/continuum", response_model=ContinuumPreparation)
def read_document_continuum_preparation(document_id: str) -> ContinuumPreparation:
    preparation = document_ingestion_service.get_continuum_preparation(document_id)
    if preparation is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")

    return preparation


@router.post("/ingestions/{document_id}/materialize", response_model=ContinuumMaterializationResult)
def materialize_document_continuum(document_id: str) -> ContinuumMaterializationResult:
    try:
        materialized = document_ingestion_service.materialize_continuum(document_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))
    if materialized is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")

    return materialized


@router.get("/ingestions/materialized")
def list_materialized_document_continuum() -> list[dict[str, str]]:
    return document_ingestion_service.list_materialized_records()


@router.get("/ingestions/{document_id}/eo-candidates", response_model=list[EvidenceObjectCandidate])
def list_document_eo_candidates(document_id: str) -> list[EvidenceObjectCandidate]:
    document = document_ingestion_service.get_uploaded_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")
    return document_ingestion_service.list_eo_candidates(document_id)


@router.get(
    "/ingestions/{document_id}/guideline-recommendations",
    response_model=list[GuidelineRecommendation],
)
def list_document_guideline_recommendations(document_id: str) -> list[GuidelineRecommendation]:
    document = document_ingestion_service.get_uploaded_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")
    return document_ingestion_service.list_guideline_recommendations(document_id)


@router.post(
    "/ingestions/{document_id}/eo-candidates/{candidate_id}/audits",
    response_model=EvidenceObjectAuditRecord,
)
def record_document_eo_audit(
    document_id: str,
    candidate_id: str,
    request: EvidenceObjectAuditRequest,
) -> EvidenceObjectAuditRecord:
    try:
        return document_ingestion_service.record_eo_candidate_audit(
            document_id=document_id,
            candidate_id=candidate_id,
            request=request,
        )
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))


@router.post("/ingestions/{document_id}/governance", response_model=GovernanceRecord)
def create_governance_record_for_document(
    document_id: str,
    request: GovernanceRecordRequest,
) -> GovernanceRecord:
    document = document_ingestion_service.get_uploaded_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Uploaded source document not found.")

    try:
        record = governance_record_service.create_record(document=document, request=request)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))

    if request.activate_vrn:
        document.vrn_status = request.vrn_status

    return record


@router.get("/governance/records", response_model=list[GovernanceRecord])
def list_governance_records(limit: int = Query(default=50, ge=1, le=200)) -> list[GovernanceRecord]:
    return governance_record_service.list_records(limit=limit)


@router.get("/governance/feed", response_model=GovernanceLedgerFeed)
def read_governance_feed(limit: int = Query(default=50, ge=1, le=200)) -> GovernanceLedgerFeed:
    return governance_record_service.build_feed(limit=limit)


@router.get("/audit/feed", response_model=DocumentAuditFeed)
def read_audit_feed(limit: int = Query(default=50, ge=1, le=200)) -> DocumentAuditFeed:
    return audit_report_service.build_feed(limit=limit)


@router.get("/ingestions/{document_id}/audit", response_model=DocumentAuditReport)
def read_document_audit_report(document_id: str) -> DocumentAuditReport:
    return audit_report_service.get_report(document_id)


@router.post("/import", response_model=CatalogImportResult, dependencies=[Depends(require_import_api_key)])
def import_source_documents() -> CatalogImportResult:
    return catalog_repository.import_manifest()


@router.get("/import-runs", response_model=list[ManifestImportRun])
def list_import_runs(
    limit: int = Query(default=10, ge=1, le=100),
) -> list[ManifestImportRun]:
    return catalog_repository.list_import_runs(limit=limit)


@router.get("/catalog", response_model=SourceDocumentPage)
def list_catalog_source_documents(
    layer: str | None = Query(default=None),
    category: str | None = Query(default=None),
    document_group: str | None = Query(default=None),
    language: str | None = Query(default=None),
    specialty: str | None = Query(default=None),
    sub_specialty: str | None = Query(default=None),
    epidemic_focus: str | None = Query(default=None),
    query: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=250),
    offset: int = Query(default=0, ge=0),
) -> SourceDocumentPage:
    return catalog_repository.list_documents(
        layer=layer,
        category=category,
        document_group=document_group,
        language=language,
        specialty=specialty,
        sub_specialty=sub_specialty,
        epidemic_focus=epidemic_focus,
        query=query,
        limit=limit,
        offset=offset,
    )


@router.get("", response_model=list[SourceDocument])
def list_source_documents(
    layer: str | None = Query(default=None),
    category: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=250),
) -> list[SourceDocument]:
    documents = repository.list_documents(layer=layer, category=category)
    return documents[:limit]


@router.get("/{document_id}", response_model=SourceDocument)
def get_source_document(document_id: str) -> SourceDocument:
    document = catalog_repository.get_document(document_id) or repository.get_document(
        document_id
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Source document not found.")

    return document
