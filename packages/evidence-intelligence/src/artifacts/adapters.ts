import type { EvidenceObject } from "../models/eo.js";
import type { EvidenceDocument } from "../models/evidence-document.js";
import type { StructuredEvidenceRecord } from "../models/ser.js";
import type { OperationalContext } from "../models/operational-context.js";
import type { ProvenanceRecord } from "../models/provenance.js";
import type { ValidationResult } from "../models/common.js";
import { validateArtifactPayload, validateEvidenceDocumentArtifact, validateEvidenceObjectArtifact, validateStructuredEvidenceRecordArtifact } from "../validators/interchange.validator.js";
import type {
  ApplicabilityArtifact,
  EvidenceDocumentArtifact,
  EvidenceObjectArtifact,
  InterchangeArtifactKind,
  InterchangeArtifactMap,
  OperationalContextArtifact,
  ProvenanceArtifact,
  StructuredEvidenceRecordArtifact,
} from "./types.js";

function result<T>(issues: ValidationResult<T>["issues"], value?: T): ValidationResult<T> {
  return { ok: issues.length === 0, issues, value };
}

function asApplicabilityScore(value: number): 0 | 1 | 2 | 3 {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error(`Unsupported applicability score: ${value}`);
}

function adaptApplicability(input: ApplicabilityArtifact, options?: { clinicalDomain?: string; jurisdictions?: string[]; populationSummary?: string }): EvidenceDocument["applicability"] {
  return {
    clinicalDomain: options?.clinicalDomain ?? "unspecified-domain",
    careSetting: "mixed",
    jurisdictions: (options?.jurisdictions as EvidenceDocument["applicability"]["jurisdictions"]) ?? ["global"],
    decisionReadiness: input.overall_recommendation === "directly-applicable" ? "ready-for-execution" : input.overall_recommendation === "applicable-with-review" ? "ready-with-local-review" : input.overall_recommendation === "contextual-only" ? "contextual-only" : "not-ready",
    population: {
      summary: options?.populationSummary ?? "Population imported from interchange artifact",
    },
    dimensionAssessments: [
      { dimension: "population-fit", score: asApplicabilityScore(input.population_fit.score), rationale: input.population_fit.rationale },
      { dimension: "intervention-fit", score: asApplicabilityScore(input.intervention_fit.score), rationale: input.intervention_fit.rationale },
      { dimension: "setting-fit", score: asApplicabilityScore(input.setting_fit.score), rationale: input.setting_fit.rationale },
      { dimension: "jurisdiction-fit", score: asApplicabilityScore(input.jurisdiction_fit.score), rationale: input.jurisdiction_fit.rationale },
      { dimension: "resource-fit", score: asApplicabilityScore(input.resource_fit.score), rationale: input.resource_fit.rationale },
    ],
  };
}

function adaptProvenance(input: ProvenanceArtifact): ProvenanceRecord {
  return {
    sourceSystem: input.source_system,
    capturedAt: input.captured_at,
    capturedBy: input.captured_by,
    chainOfCustody: input.chain_of_custody.map((step) => ({
      step: step.step,
      actor: step.actor,
      timestamp: step.timestamp,
      hashSha256: step.hash,
      note: step.note ?? null,
    })),
    legal: {
      licenseStatus: input.license_status as ProvenanceRecord["legal"]["licenseStatus"],
      attestationStatus: input.attestation_status as ProvenanceRecord["legal"]["attestationStatus"],
      reviewPolicy: input.review_policy ?? "unspecified-review-policy",
    },
    versioning: {
      canonicalId: input.canonical_id,
      version: input.version,
      effectiveFrom: input.effective_from ?? input.captured_at.slice(0, 10),
      effectiveTo: input.effective_to ?? null,
      status: input.status as ProvenanceRecord["versioning"]["status"],
    },
  };
}

function adaptOperationalContext(input: OperationalContextArtifact): OperationalContext {
  return {
    implementationComplexity: input.implementation_complexity,
    resourceDemand: input.resource_demand,
    costRelevance: input.cost_relevance,
    operationalRelevance: input.operational_relevance,
    resourceRequirements: input.resource_requirements.map((resource) => ({
      resourceType: resource.resource_type,
      role: resource.role,
      quantity: resource.quantity,
      unit: resource.unit,
      mandatory: resource.mandatory,
      costCenter: resource.cost_center ?? null,
      notes: resource.note ?? null,
    })),
    constraints: input.constraints ?? [],
  };
}

export function adaptEvidenceDocumentArtifact(input: unknown): ValidationResult<EvidenceDocument> {
  const validation = validateEvidenceDocumentArtifact(input);
  if (!validation.ok || !validation.value) return result(validation.issues);

  const document = validation.value;
  return result([], {
    documentId: document.id,
    title: document.title,
    evidenceType: document.evidence_type,
    clinicalDomain: document.clinical_domain,
    publicationDate: `${document.publication_year}-01-01`,
    publication: {
      publisher: document.source_type,
      citation: document.references[0]?.citation ?? document.title,
      doi: document.references[0]?.doi ?? null,
      sourceUri: document.references[0]?.uri ?? null,
    },
    evidenceHierarchy: document.evidence_type === "guideline" || document.evidence_type === "consensus" || document.evidence_type === "pathway" || document.evidence_type === "protocol" ? "directive" : document.evidence_type === "systematic-review" || document.evidence_type === "meta-analysis" || document.evidence_type === "network-meta-analysis" ? "synthesis" : document.evidence_type === "rct" || document.evidence_type === "pragmatic-trial" ? "comparative-primary" : document.evidence_type === "cohort" || document.evidence_type === "case-control" || document.evidence_type === "cross-sectional" || document.evidence_type === "registry" || document.evidence_type === "rwe" ? "observational" : "contextual-implementation",
    effectDirection: document.effect_direction,
    strength: document.certainty === "very-high" || document.certainty === "high" ? "high" : document.certainty === "moderate" ? "moderate" : document.certainty === "unknown" ? "insufficient" : "low",
    certainty: document.certainty,
    recency: {
      publicationYear: document.publication_year,
      currencyStatus: document.status === "deprecated" ? "outdated" : "current",
    },
    applicability: adaptApplicability(document.applicability, {
      clinicalDomain: document.clinical_domain,
      jurisdictions: document.jurisdiction,
      populationSummary: document.population.summary,
    }),
    provenance: adaptProvenance(document.provenance),
  });
}

export function adaptStructuredEvidenceRecordArtifact(input: unknown): ValidationResult<StructuredEvidenceRecord> {
  const validation = validateStructuredEvidenceRecordArtifact(input);
  if (!validation.ok || !validation.value) return result(validation.issues);

  const ser = validation.value;
  return result([], {
    serId: ser.ser_id,
    sourceDocumentId: ser.linked_source_ids[0],
    title: `${ser.pico.intervention} evidence statement`,
    evidenceType: "rct",
    clinicalDomain: "imported-ser",
    summary: `${ser.pico.population} :: ${ser.pico.intervention}`,
    statements: ser.outcome_objects.map((outcome, index) => ({
      statementId: `${ser.ser_id}-ST-${String(index + 1).padStart(3, "0")}`,
      clinicalFunction: "intervention-selection",
      interventionClass: ser.intervention_details.class,
      interventionLabel: ser.intervention_details.summary,
      comparatorLabel: ser.comparator_details?.summary ?? ser.pico.comparator ?? null,
      effectDirection: outcome.effect_direction,
      strength: ser.evidence_grading.certainty === "very-high" || ser.evidence_grading.certainty === "high" ? "high" : ser.evidence_grading.certainty === "moderate" ? "moderate" : "low",
      certainty: ser.evidence_grading.certainty,
      decisionReadiness: ser.decision_readiness,
      timeHorizon: "1-year",
      outcomes: [{ outcomeCode: outcome.outcome_class, effectDirection: outcome.effect_direction, note: outcome.measure }],
      conditions: [ser.population_details.summary],
      exclusions: [],
      rationale: ser.bias_limitations.join(" "),
      operationalContext: {
        implementationComplexity: ser.operational_relevance === "transformational" ? "high" : "moderate",
        resourceDemand: "moderate",
        costRelevance: "moderate",
        operationalRelevance: ser.operational_relevance,
        resourceRequirements: [],
        constraints: [],
      },
    })),
    applicability: adaptApplicability(ser.applicability_assessment, {
      clinicalDomain: "imported-ser",
      populationSummary: ser.population_details.summary,
    }),
    provenance: adaptProvenance(ser.provenance),
  });
}

export function adaptEvidenceObjectArtifact(input: unknown): ValidationResult<EvidenceObject> {
  const validation = validateEvidenceObjectArtifact(input);
  if (!validation.ok || !validation.value) return result(validation.issues);

  const eo = validation.value;
  return result([], {
    eoId: eo.eo_id,
    sourceDocumentId: eo.evidence_support.find((support) => support.artifact_type === "document")?.artifact_id ?? "unknown-document",
    sourceSerId: eo.evidence_support.find((support) => support.artifact_type === "ser")?.artifact_id ?? "unknown-ser",
    trigger: {
      event: eo.trigger.event,
      clinicalFunction: eo.trigger.clinical_function,
    },
    conditions: eo.conditions,
    exclusions: eo.exclusions ?? [],
    decision: {
      verb: eo.decision.verb === "defer-to-review" ? "defer_to_review" : eo.decision.verb,
      effectDirection: eo.decision.effect_direction,
      readiness: eo.decision.decision_readiness,
      rationale: eo.decision.rationale ?? null,
    },
    action: {
      interventionClass: eo.actions[0]?.intervention_class ?? "workflow-rule",
      description: eo.actions[0]?.summary ?? "No action summary provided",
    },
    expectedOutcomes: eo.expected_outcomes.map((outcome) => ({
      outcomeCode: outcome.outcome_class,
      effectDirection: outcome.effect_direction,
      note: outcome.note ?? null,
    })),
    confidence: {
      strength: eo.confidence.certainty === "very-high" || eo.confidence.certainty === "high" ? "high" : eo.confidence.certainty === "moderate" ? "moderate" : "low",
      certainty: eo.confidence.certainty,
      uncertainties: eo.confidence.uncertainty_sources,
    },
    evidenceLinks: eo.evidence_support.map((support) => ({
      artifactType: support.artifact_type,
      artifactId: support.artifact_id,
    })),
    evidenceSupport: {
      sourceDocumentId: eo.evidence_support.find((support) => support.artifact_type === "document")?.artifact_id ?? "unknown-document",
      sourceSerId: eo.evidence_support.find((support) => support.artifact_type === "ser")?.artifact_id ?? "unknown-ser",
      evidenceType: "guideline",
      primaryStatementId: eo.evidence_support.find((support) => support.artifact_type === "statement")?.artifact_id ?? "unknown-statement",
      supportLinks: eo.evidence_support.map((support) => ({
        artifactType: support.artifact_type,
        artifactId: support.artifact_id,
      })),
      supportSummary: eo.decision.rationale ?? "Imported EO artifact",
    },
    provenance: {
      sourceSystem: eo.audit_fields.created_by,
      capturedAt: eo.audit_fields.created_at,
      capturedBy: eo.audit_fields.created_by,
      chainOfCustody: [],
      legal: {
        licenseStatus: "restricted",
        attestationStatus: "pending",
        reviewPolicy: "imported-from-interchange-eo",
      },
      versioning: {
        canonicalId: eo.eo_id,
        version: eo.version,
        effectiveFrom: eo.audit_fields.created_at.slice(0, 10),
        status: eo.review_status,
      },
    },
    operationalConstraints: adaptOperationalContext(eo.operational_constraints),
    operationalConstraintBundle: {
      implementationComplexity: eo.operational_constraints.implementation_complexity,
      resourceDemand: eo.operational_constraints.resource_demand,
      costRelevance: eo.operational_constraints.cost_relevance,
      operationalRelevance: eo.operational_constraints.operational_relevance,
      hardConstraints: eo.operational_constraints.constraints ?? [],
      requiredResources: adaptOperationalContext(eo.operational_constraints).resourceRequirements,
    },
    temporalContext: {
      timeHorizon: "index-hospitalization",
    },
    jurisdiction: eo.jurisdiction[0] ?? "global",
    reviewMetadata: {
      owner: eo.audit_fields.created_by,
      status: eo.review_status,
      lastReviewedAt: eo.audit_fields.updated_at ?? eo.audit_fields.created_at,
      rationale: eo.decision.rationale ?? null,
    },
    inferenceTrace: [
      {
        step: "import-external-eo",
        rationale: "EO artifact imported from interchange boundary and normalized into runtime EO shape.",
      },
    ],
  });
}

export function validateAndAdaptInterchangeArtifact<K extends InterchangeArtifactKind>(kind: K, input: unknown): ValidationResult<InterchangeArtifactMap[K]> {
  return validateArtifactPayload(kind, input);
}
