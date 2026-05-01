import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson<T>(relativePath: string): T {
  const filePath = path.join(baseDir, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export const ontologyCatalogs = {
  evidenceTypes: readJson("ontology/evidence-types/catalog.json"),
  evidenceLevels: readJson("ontology/evidence-levels/catalog.json"),
  interventions: readJson("ontology/interventions/catalog.json"),
  outcomes: readJson("ontology/outcomes/catalog.json"),
  clinicalFunctions: readJson("ontology/clinical-functions/catalog.json"),
  timeHorizons: readJson("ontology/time-horizons/catalog.json"),
  uncertaintyCatalog: readJson("ontology/uncertainty/catalog.json"),
  certaintyLevels: readJson("ontology/certainty-levels/catalog.json"),
  jurisdictions: readJson("ontology/jurisdictions/catalog.json"),
  conflictRules: readJson("ontology/conflict-rules/catalog.json"),
  applicabilityDimensions: readJson("ontology/applicability-dimensions/catalog.json"),
  implementationComplexity: readJson("ontology/implementation-complexity/catalog.json"),
  effectDirection: readJson("ontology/effect-direction/catalog.json"),
  evidenceDecay: readJson("ontology/evidence-decay/catalog.json"),
  provenanceMinimumSet: readJson("ontology/provenance-minimum-set/catalog.json"),
  operationalRelevance: readJson("ontology/operational-relevance/catalog.json"),
};

export const seedBundles = {
  cardiacRevascularizationBundle: readJson("seeds/cardiac-revascularization.bundle.json"),
  colorectalErasBundle: readJson("seeds/colorectal-eras.bundle.json"),
  cardiovascularRctBundle: readJson("seeds/cardiovascular-rct.bundle.json"),
  systematicReviewMetaAnalysisBundle: readJson("seeds/systematic-review-meta-analysis.bundle.json"),
  registryRweBundle: readJson("seeds/registry-rwe.bundle.json"),
  institutionalProtocolBundle: readJson("seeds/institutional-protocol.bundle.json"),
  conflictiveEvidenceBundle: readJson("seeds/conflictive-evidence.bundle.json"),
  negativeNeutralEvidenceBundle: readJson("seeds/negative-neutral-evidence.bundle.json"),
};
