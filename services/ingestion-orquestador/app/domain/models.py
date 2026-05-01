from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    document_id: str
    lineage_id: str | None = None
    lineage_key: str | None = None
    vrn: str | None = None
    vrn_policy_id: str | None = None
    version_number: int | None = None
    institutional_version: str | None = None
    previous_document_id: str | None = None
    vrn_status: str = "ACTIVE"
    specialty: str | None = None
    sub_specialty: str | None = None
    epidemic_focus: str | None = None
    ingest_artifact_id: str | None = None
    ser_artifact_id: str | None = None
    file_name: str
    absolute_path: str
    relative_path: str
    extension: str
    document_type: str
    layer: str
    category: str
    document_group: str
    language: str
    version_detected: str | None = None
    size_bytes: int
    last_write_time_utc: str
    ingestion_timestamp_utc: str
    hash_sha256: str
    source_status: str
    source_origin: str = "manifest"
    continuum_stage: str = "ING"
    ingestion_notes: str | None = None
    derived_artifacts: list[str] = Field(default_factory=list)


class ManifestSummary(BaseModel):
    manifest_name: str
    generated_at_utc: str
    root_path: str
    total_documents: int
    catalog_roots: list[str]
    imported_at_utc: str | None = None
    uploaded_documents: int = 0
    continuum_ready_documents: int = 0


class SourceDocumentPage(BaseModel):
    items: list[SourceDocument]
    total: int
    limit: int
    offset: int


class CatalogImportResult(BaseModel):
    manifest_name: str
    imported_documents: int
    sqlite_path: str
    imported_at_utc: str


class ManifestImportRun(BaseModel):
    import_id: int
    imported_at_utc: str
    manifest_name: str
    manifest_generated_at_utc: str
    total_documents: int


class DocumentIngestionRequest(BaseModel):
    file_name: str
    content_base64: str
    lineage_key: str | None = None
    layer: str = "ING"
    category: str = "user-upload"
    document_group: str = "continuum-intake"
    document_type: str | None = None
    language: str = "en"
    continuum_stage: str = "ING"
    ingestion_notes: str | None = None
    specialty: str | None = None
    sub_specialty: str | None = None
    epidemic_focus: str | None = None


class DocumentIngestionResponse(BaseModel):
    document: SourceDocument
    duplicate_detected: bool = False
    sync_artifacts: list[str] = Field(default_factory=list)


class DocumentIngestionFeed(BaseModel):
    generated_at_utc: str
    uploaded_documents: int
    continuum_ready_documents: int
    layers: dict[str, int]
    sync_artifacts: list[str] = Field(default_factory=list)
    latest_documents: list[SourceDocument] = Field(default_factory=list)


class AuditMetadata(BaseModel):
    created_at: str
    created_by: str
    created_by_type: str


class ProvenanceMetadata(BaseModel):
    source_type: str
    source_id: str
    captured_at: str
    location: str | None = None
    chain_of_custody: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class HashMetadata(BaseModel):
    algorithm: str = "sha256"
    hash: str
    canonical_source: str
    previous_hash: str | None = None


class VrnPolicy(BaseModel):
    policy_id: str
    institution_code: str
    governance_layer: str
    default_scope: str
    active_status: str
    version_prefix: str = "V"
    version_width: int = 3
    hash_length: int = 8
    segments: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class GovernanceRecord(BaseModel):
    governance_record_id: str
    record_type: str
    vrn: str
    severity: str
    description: str
    source_domain: str
    affected_entities: list[str] = Field(default_factory=list)
    effective_from: str
    effective_to: str | None = None
    append_only_flag: bool = True
    created_at: str
    created_by: str
    source_document_id: str | None = None
    source_file_name: str | None = None
    source_absolute_path: str | None = None
    source_relative_path: str | None = None


class GovernanceRecordRequest(BaseModel):
    record_type: str = "CR"
    severity: str = "moderate"
    description: str
    source_domain: str = "GCL"
    affected_entities: list[str] = Field(default_factory=list)
    effective_from: str | None = None
    effective_to: str | None = None
    created_by: str = "icicso-governance-console"
    activate_vrn: bool = True
    vrn_status: str = "ACTIVE"
    allow_reactivate: bool = False


class GovernanceLedgerFeed(BaseModel):
    generated_at_utc: str
    total_records: int
    active_vrn_count: int
    records: list[GovernanceRecord] = Field(default_factory=list)


class DocumentVersionRecord(BaseModel):
    version_id: str
    lineage_id: str
    lineage_key: str
    document_id: str
    version_number: int
    institutional_version: str
    previous_document_id: str | None = None
    vrn: str
    content_hash: str
    issued_at: str
    issued_by: str
    change_reason: str


class DocumentVersionHistory(BaseModel):
    lineage_id: str
    lineage_key: str
    current_document_id: str | None = None
    current_version_number: int = 0
    versions: list[DocumentVersionRecord] = Field(default_factory=list)


class DocumentAuditEvent(BaseModel):
    event_id: int | None = None
    document_id: str | None = None
    vrn: str | None = None
    event_type: str
    stage: str | None = None
    actor: str
    summary: str
    payload: dict[str, object] = Field(default_factory=dict)
    related_record_id: str | None = None
    created_at: str


class DocumentAuditArtifacts(BaseModel):
    ingest_artifact_id: str | None = None
    ser_artifact_id: str | None = None
    eo_artifact_id: str | None = None
    el_artifact_id: str | None = None


class ClinicalEntity(BaseModel):
    label: str
    entity_type: str
    normalized_term: str | None = None
    source_text: str | None = None


class NumericThreshold(BaseModel):
    label: str
    metric: str | None = None
    comparator: str | None = None
    value: str | None = None
    unit: str | None = None


class TriggerConstraint(BaseModel):
    constraint_type: str
    label: str
    operator: str = "eq"
    value: str | None = None
    unit: str | None = None
    source: str | None = None


class RecommendationExecutionTrigger(BaseModel):
    population: str | None = None
    clinical_state: str | None = None
    disease: str | None = None
    time_constraint: str | None = None
    event_anchor: str | None = None
    exclusions: list[str] = Field(default_factory=list)
    numeric_constraints: list[NumericThreshold] = Field(default_factory=list)
    qualifiers: list[str] = Field(default_factory=list)
    constraints: list[TriggerConstraint] = Field(default_factory=list)


class RecommendationExecutionModel(BaseModel):
    trigger: str | None = None
    trigger_model: RecommendationExecutionTrigger = Field(default_factory=RecommendationExecutionTrigger)
    action: str | None = None
    contraindications: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    intended_outcome: str | None = None


class GuidelineRecommendation(BaseModel):
    recommendation_id: str
    document_id: str
    ser_artifact_id: str
    statement_key: str
    canonical_title: str
    recommendation_text: str
    recommendation_class: str | None = None
    level_of_evidence: str | None = None
    document_family: str | None = None
    clinical_topic: str | None = None
    population: str | None = None
    intervention: str | None = None
    comparator: str | None = None
    outcome: str | None = None
    conditions: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    clinical_state: str | None = None
    disease: str | None = None
    severity: str | None = None
    time_window: str | None = None
    event_anchor: str | None = None
    numeric_thresholds: list[NumericThreshold] = Field(default_factory=list)
    care_phase: str | None = None
    clinical_temporality: str | None = None
    temporal_qualifiers: list[str] = Field(default_factory=list)
    guidance_temporality: str | None = None
    care_setting: str | None = None
    specialty: str | None = None
    sub_specialty: str | None = None
    source_excerpt: str | None = None
    source_locator: str | None = None
    information_weight: str | None = None
    weight_score: float | None = None
    weight_rationale: str | None = None
    extraction_confidence: float | None = None
    confidence_rationale: list[str] = Field(default_factory=list)
    clinical_entities: list[ClinicalEntity] = Field(default_factory=list)
    execution_model: RecommendationExecutionModel = Field(default_factory=RecommendationExecutionModel)
    created_at: str
    updated_at: str


class ClinicalTopicRankingEntry(BaseModel):
    clinical_topic: str
    document_id: str
    file_name: str | None = None
    document_group: str | None = None
    document_type: str | None = None
    specialty: str | None = None
    vrn: str | None = None
    recommendation_count: int = 0
    average_weight_score: float | None = None
    average_confidence: float | None = None
    eo_type_summary: list[str] = Field(default_factory=list)


class ClinicalTopicConflictEntry(BaseModel):
    clinical_topic: str
    conflict_level: str
    preferred_document_id: str
    preferred_file_name: str | None = None
    preferred_stance: str | None = None
    preferred_score: float | None = None
    challenger_document_id: str
    challenger_file_name: str | None = None
    challenger_stance: str | None = None
    challenger_score: float | None = None
    rationale: str | None = None


class DocumentAuditReport(BaseModel):
    document_id: str
    audit_status: str = "valid"
    vrn: str | None = None
    vrn_status: str | None = None
    file_name: str | None = None
    absolute_path: str | None = None
    relative_path: str | None = None
    hash_sha256: str | None = None
    source_origin: str | None = None
    document_present: bool = False
    file_exists: bool = False
    database_path: str
    report_generated_at_utc: str
    materialized_artifacts: DocumentAuditArtifacts = Field(default_factory=DocumentAuditArtifacts)
    guideline_recommendations: list[GuidelineRecommendation] = Field(default_factory=list)
    eo_candidates: list[EvidenceObjectCandidate] = Field(default_factory=list)
    eo_candidate_audits: list[EvidenceObjectAuditRecord] = Field(default_factory=list)
    governance_records: list[GovernanceRecord] = Field(default_factory=list)
    events: list[DocumentAuditEvent] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class DocumentAuditFeed(BaseModel):
    generated_at_utc: str
    database_path: str
    reports: list[DocumentAuditReport] = Field(default_factory=list)


class NomenclatureCatalog(BaseModel):
    specialties: list[str]
    sub_specialties: dict[str, list[str]]
    epidemics: list[str]
    defaults: dict[str, str]


class DocumentClassificationUpdate(BaseModel):
    specialty: str
    sub_specialty: str
    epidemic_focus: str
    updated_by: str = "icicso-catalog-ui"


class DocumentMetadataUpdate(BaseModel):
    file_name: str | None = None
    category: str | None = None
    document_group: str | None = None
    language: str | None = None
    ingestion_notes: str | None = None
    move_to: str | None = None


class IngestedDocumentPayload(BaseModel):
    source_id: str
    canonical_title: str
    document_type: str
    issuing_body: str
    publication_date: str
    publication_year: int
    source_url_reference: str | None = None
    content: str


class IngestArtifact(BaseModel):
    id: str
    vrn: str
    version: int = 1
    created_at: str
    payload: IngestedDocumentPayload
    audit: AuditMetadata
    provenance: list[ProvenanceMetadata]
    integrity: HashMetadata
    maturity: str = "implemented"


class SourceEvidenceRecordPayload(BaseModel):
    source_document_id: str
    source_id: str
    canonical_title: str
    short_title: str
    document_type: str
    issuing_body: str
    publication_date: str
    publication_year: int
    source_url_reference: str | None = None
    source_hash: str
    lifecycle_status: str = "validated"


class SourceEvidenceRecordArtifact(BaseModel):
    id: str
    vrn: str
    version: int = 1
    created_at: str
    payload: SourceEvidenceRecordPayload
    audit: AuditMetadata
    provenance: list[ProvenanceMetadata]
    integrity: HashMetadata
    maturity: str = "implemented"


class EvidenceObjectPayload(BaseModel):
    source_record_id: str
    source_id: str
    canonical_title: str
    evidence_synopsis: str
    document_type: str
    issuing_body: str
    publication_date: str
    publication_year: int
    source_url_reference: str | None = None
    source_hash: str
    evidence_status: str = "Active"
    canonical_claims: list[str] = Field(default_factory=list)
    domain_tags: list[str] = Field(default_factory=list)


class EvidenceObjectArtifact(BaseModel):
    id: str
    vrn: str
    version: int = 1
    created_at: str
    payload: EvidenceObjectPayload
    audit: AuditMetadata
    provenance: list[ProvenanceMetadata]
    integrity: HashMetadata
    maturity: str = "implemented"


class EvidenceObjectCandidate(BaseModel):
    candidate_id: str
    document_id: str
    ser_artifact_id: str
    primary_eo_artifact_id: str
    statement_key: str
    statement_text: str
    canonical_title: str
    domain: str
    recommendation_class: str | None = None
    level_of_evidence: str | None = None
    eo_type: str | None = None
    eo_subtype: str | None = None
    source_excerpt: str | None = None
    completion_level: str = "L1_structured"
    review_state: str = "pending"
    clinical_audit_state: str = "pending"
    surgical_audit_state: str = "pending"
    finalization_status: str = "candidate"
    evidence_strength: str | None = None
    information_weight: str | None = None
    weight_score: float | None = None
    weight_rationale: str | None = None
    source_locator: str | None = None
    created_at: str
    updated_at: str


class EvidenceObjectAuditRequest(BaseModel):
    audit_kind: str
    decision: str
    comments: str | None = None
    requested_changes: list[str] = Field(default_factory=list)
    signed_by: str


class EvidenceObjectAuditRecord(BaseModel):
    audit_id: str
    candidate_id: str
    document_id: str
    audit_kind: str
    decision: str
    comments: str | None = None
    requested_changes: list[str] = Field(default_factory=list)
    signed_by: str
    signed_at: str


class EvidenceLakeRecordPayload(BaseModel):
    source_object_id: str
    source_record_id: str
    source_id: str
    canonical_title: str
    evidence_synopsis: str
    lake_status: str = "indexed"
    indexing_key: str
    domain_tags: list[str] = Field(default_factory=list)
    canonical_claims: list[str] = Field(default_factory=list)
    evidence_hash: str
    snapshot_summary: str


class EvidenceLakeRecordArtifact(BaseModel):
    id: str
    vrn: str
    version: int = 1
    created_at: str
    payload: EvidenceLakeRecordPayload
    audit: AuditMetadata
    provenance: list[ProvenanceMetadata]
    integrity: HashMetadata
    maturity: str = "implemented"


class ContinuumPreparation(BaseModel):
    document: SourceDocument
    ingest_artifact: IngestArtifact
    ser_artifact_preview: SourceEvidenceRecordArtifact


class ContinuumMaterializationResult(BaseModel):
    document: SourceDocument
    ingest_artifact: IngestArtifact
    ser_artifact: SourceEvidenceRecordArtifact
    eo_artifact: EvidenceObjectArtifact
    el_artifact: EvidenceLakeRecordArtifact
    guideline_recommendations: list[GuidelineRecommendation] = Field(default_factory=list)
    eo_candidates: list[EvidenceObjectCandidate] = Field(default_factory=list)
