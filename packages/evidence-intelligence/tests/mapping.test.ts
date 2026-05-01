import assert from "node:assert/strict";
import { mapSerToEoWithInferences } from "../src/mappers/ser-to-eo-engine.js";
import type { StructuredEvidenceRecord } from "../src/models/ser.js";

function baseSer(overrides: Partial<StructuredEvidenceRecord>): StructuredEvidenceRecord {
  return {
    serId: "SER-BASE-0001",
    sourceDocumentId: "EDOC-BASE-0001",
    title: "Base SER",
    evidenceType: "guideline",
    clinicalDomain: "cardiovascular",
    summary: "Base summary",
    statements: [
      {
        statementId: "SES-BASE-01",
        clinicalFunction: "intervention-selection",
        interventionClass: "surgery",
        effectDirection: "benefit",
        strength: "high",
        certainty: "high",
        decisionReadiness: "ready-for-execution",
        timeHorizon: "1-year",
        outcomes: [{ outcomeCode: "mortality", effectDirection: "benefit" }],
        operationalContext: {
          implementationComplexity: "high",
          resourceDemand: "critical",
          costRelevance: "transformational",
          operationalRelevance: "transformational",
          resourceRequirements: [
            { resourceType: "or", role: "surgeon", quantity: 1, unit: "team", mandatory: true, costCenter: "or", notes: null },
          ],
          constraints: ["requires specialty team"],
        },
      },
    ],
    applicability: {
      clinicalDomain: "cardiovascular",
      careSetting: "tertiary-hospital",
      jurisdictions: ["us"],
      decisionReadiness: "ready-for-execution",
      population: {
        summary: "Adult cardiovascular population",
        inclusionCriteria: ["adult patient"],
        exclusionCriteria: ["prohibitive risk"],
      },
      dimensionAssessments: [
        { dimension: "population-fit", score: 3, rationale: "direct fit" },
        { dimension: "intervention-fit", score: 3, rationale: "direct fit" },
        { dimension: "setting-fit", score: 2, rationale: "tertiary setting available" },
        { dimension: "jurisdiction-fit", score: 3, rationale: "local fit" },
        { dimension: "resource-fit", score: 2, rationale: "resources available" },
      ],
      implementationPreconditions: ["team review"],
    },
    provenance: {
      sourceSystem: "manual-ingest",
      capturedAt: "2026-01-01T00:00:00Z",
      capturedBy: "icicso.evidence.curator",
      chainOfCustody: [{ step: "derive", actor: "curator", timestamp: "2026-01-01T00:00:00Z", hashSha256: "hash", note: "ok" }],
      legal: {
        licenseStatus: "licensed",
        attestationStatus: "attested",
        reviewPolicy: "board",
        retentionClass: "permanent",
      },
      versioning: {
        canonicalId: "CANON-BASE",
        version: "1.0.0",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        supersedes: [],
        status: "active",
      },
    },
    ...overrides,
  };
}

const cases = [
  {
    name: "generated guideline remains limited until specialist audit",
    ser: baseSer({
      serId: "SER-CABG-0001",
      sourceDocumentId: "EDOC-CABG-0001",
      title: "Guideline revascularization",
      evidenceType: "guideline",
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.reviewMetadata.reviewState, "needs-human-review");
      assert.equal(eo.decision.verb, "defer_to_review");
      assert.equal(eo.decision.readiness, "not-ready");
      assert.equal(eo.applicabilityMatrix?.classification, "applicable");
      assert.equal(eo.minimumDataDependencyGate?.status, "pass");
      assert.equal(eo.epistemicUncertaintyLayer?.level, "II");
      assert.ok((eo.confidence.evidenceConfidenceScore ?? 0) >= 80);
      assert.ok((eo.confidence.uncertaintyConfidenceIndex ?? 1) <= 0.25);
      assert.ok((eo.confidence.score ?? 0) >= 0.8);
    },
  },
  {
    name: "specialist-approved ERAS remains executable with operational constraints",
    options: {
      specialistReview: {
        approved: true,
        reviewer: "icicso.specialist.perioperative",
        reviewedAt: "2026-04-04T00:00:00Z",
      },
    },
    ser: baseSer({
      serId: "SER-ERAS-0001",
      sourceDocumentId: "EDOC-ERAS-0001",
      title: "ERAS pathway",
      evidenceType: "pathway",
      clinicalDomain: "perioperative",
      statements: [
        {
          statementId: "SES-ERAS-01",
          clinicalFunction: "postoperative-management",
          interventionClass: "nutrition-strategy",
          effectDirection: "benefit",
          strength: "high",
          certainty: "moderate",
          decisionReadiness: "ready-for-execution",
          timeHorizon: "postoperative-48h",
          outcomes: [{ outcomeCode: "hospital-los", effectDirection: "benefit" }],
          operationalContext: {
            implementationComplexity: "moderate",
            resourceDemand: "moderate",
            costRelevance: "moderate",
            operationalRelevance: "high",
            resourceRequirements: [
              { resourceType: "ward-protocol", role: "nurse", quantity: 1, unit: "protocol", mandatory: true, costCenter: "ward", notes: null },
            ],
            constraints: ["exclude uncontrolled ileus"],
          },
        },
      ],
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.reviewMetadata.reviewState, "specialist-approved");
      assert.equal(eo.decision.verb, "recommend");
      assert.equal(eo.epistemicUncertaintyLayer?.level, "II");
      assert.ok(eo.operationalConstraintBundle.hardConstraints.includes("exclude uncontrolled ileus"));
      assert.equal(eo.trigger.clinicalFunction, "postoperative-management");
    },
  },
  {
    name: "RCT terapeutico produces consider/recommend depending confidence",
    ser: baseSer({
      serId: "SER-RCT-0001",
      sourceDocumentId: "EDOC-RCT-0001",
      title: "Therapeutic RCT",
      evidenceType: "rct",
      statements: [
        {
          statementId: "SES-RCT-01",
          clinicalFunction: "intervention-selection",
          interventionClass: "drug",
          effectDirection: "benefit",
          strength: "moderate",
          certainty: "moderate",
          decisionReadiness: "synthesis-required",
          timeHorizon: "90-days",
          outcomes: [{ outcomeCode: "adverse-event", effectDirection: "benefit" }],
          operationalContext: {
            implementationComplexity: "low",
            resourceDemand: "low",
            costRelevance: "moderate",
            operationalRelevance: "moderate",
            resourceRequirements: [
              { resourceType: "pharmacy", role: "pharmacist", quantity: 1, unit: "service", mandatory: true, costCenter: "pharmacy", notes: null },
            ],
            constraints: [],
          },
        },
      ],
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.decision.verb, "defer_to_review");
      assert.equal(eo.decision.readiness, "not-ready");
      assert.equal(eo.reviewMetadata.reviewState, "needs-human-review");
    },
  },
  {
    name: "missing critical DDMO blocks activation even with specialist approval",
    options: {
      specialistReview: {
        approved: true,
        reviewer: "icicso.specialist.cardiovascular",
        reviewedAt: "2026-04-04T00:00:00Z",
      },
      minimumDataDependencies: [
        { key: "left-ventricular-ejection-fraction", label: "FEVI", required: true, present: false, critical: true },
      ],
    },
    ser: baseSer({
      serId: "SER-DDMO-0001",
      sourceDocumentId: "EDOC-DDMO-0001",
      title: "DDMO blocked guideline",
      evidenceType: "guideline",
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.minimumDataDependencyGate?.status, "blocked");
      assert.equal(eo.applicabilityMatrix?.classification, "indeterminate");
      assert.equal(eo.epistemicUncertaintyLayer?.level, "IV");
      assert.equal(eo.epistemicUncertaintyLayer?.activationBlocked, true);
      assert.equal(eo.reviewMetadata.reviewState, "needs-human-review");
      assert.equal(eo.decision.verb, "defer_to_review");
      assert.ok((eo.conflicts ?? []).some((item) => item.code === "ddmo-missing-critical"));
    },
  },
  {
    name: "observational old low-applicability evidence requires human review",
    ser: baseSer({
      serId: "SER-OBS-0001",
      sourceDocumentId: "EDOC-OBS-0001",
      title: "Observational limited applicability",
      evidenceType: "cohort",
      applicability: {
        clinicalDomain: "critical-care",
        careSetting: "community-hospital",
        jurisdictions: ["global"],
        decisionReadiness: "contextual-only",
        population: {
          summary: "Population mismatch case",
          inclusionCriteria: ["elderly"],
          exclusionCriteria: [],
        },
        dimensionAssessments: [
          { dimension: "population-fit", score: 1, rationale: "population differs materially" },
          { dimension: "intervention-fit", score: 1, rationale: "protocol differs" },
          { dimension: "setting-fit", score: 1, rationale: "setting mismatch" },
          { dimension: "jurisdiction-fit", score: 1, rationale: "foreign context" },
          { dimension: "resource-fit", score: 1, rationale: "resource mismatch" },
        ],
      },
      provenance: {
        sourceSystem: "manual-ingest",
        capturedAt: "2012-01-01T00:00:00Z",
        capturedBy: "icicso.evidence.curator",
        chainOfCustody: [{ step: "derive", actor: "curator", timestamp: "2012-01-01T00:00:00Z", hashSha256: "hash", note: "ok" }],
        legal: {
          licenseStatus: "licensed",
          attestationStatus: "attested",
          reviewPolicy: "board",
          retentionClass: "permanent",
        },
        versioning: {
          canonicalId: "CANON-OBS",
          version: "1.0.0",
          effectiveFrom: "2012-01-01",
          effectiveTo: null,
          supersedes: [],
          status: "active",
        },
      },
      statements: [
        {
          statementId: "SES-OBS-01",
          clinicalFunction: "critical-care-management",
          interventionClass: "icu-strategy",
          effectDirection: "benefit",
          strength: "low",
          certainty: "low",
          decisionReadiness: "contextual-only",
          timeHorizon: "icu-stay",
          outcomes: [{ outcomeCode: "icu-los", effectDirection: "benefit" }],
          operationalContext: {
            implementationComplexity: "high",
            resourceDemand: "critical",
            costRelevance: "high",
            operationalRelevance: "high",
            resourceRequirements: [
              { resourceType: "icu", role: "intensivist", quantity: 1, unit: "team", mandatory: true, costCenter: "icu", notes: null },
            ],
            constraints: ["specialized unit required"],
          },
        },
      ],
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.reviewMetadata.reviewState, "needs-human-review");
      assert.equal(eo.decision.verb, "defer_to_review");
      assert.ok((eo.conflicts ?? []).length > 0);
    },
  },
  {
    name: "inconclusive evidence is escalated and not silently decided",
    ser: baseSer({
      serId: "SER-INCON-0001",
      sourceDocumentId: "EDOC-INCON-0001",
      title: "Inconclusive evidence",
      evidenceType: "systematic-review",
      statements: [
        {
          statementId: "SES-INCON-01",
          clinicalFunction: "intervention-selection",
          interventionClass: "device",
          effectDirection: "inconclusive",
          strength: "insufficient",
          certainty: "unknown",
          decisionReadiness: "contextual-only",
          timeHorizon: "1-year",
          outcomes: [{ outcomeCode: "adverse-event", effectDirection: "inconclusive" }],
          operationalContext: {
            implementationComplexity: "moderate",
            resourceDemand: "moderate",
            costRelevance: "moderate",
            operationalRelevance: "moderate",
            resourceRequirements: [
              { resourceType: "device-lab", role: "operator", quantity: 1, unit: "team", mandatory: true, costCenter: "lab", notes: null },
            ],
            constraints: [],
          },
        },
      ],
    }),
    assert(eo: ReturnType<typeof mapSerToEoWithInferences>) {
      assert.equal(eo.reviewMetadata.reviewState, "needs-human-review");
      assert.equal(eo.decision.readiness, "not-ready");
      assert.equal(eo.epistemicUncertaintyLayer?.level, "IV");
      assert.ok((eo.conflicts ?? []).some((item) => item.code === "effect-direction-conflict"));
    },
  },
];

let failed = false;
for (const item of cases) {
  try {
    const eo = mapSerToEoWithInferences(item.ser, { now: "2026-04-04T00:00:00Z", ...(item.options ?? {}) });
    item.assert(eo);
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${item.name}`);
    console.error(error);
  }
}

if (failed) process.exit(1);
