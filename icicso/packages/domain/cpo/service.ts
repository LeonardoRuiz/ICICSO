import {
    buildHashMetadata,
    createAuditMetadata,
    createVrn,
} from "../../shared-kernel/index.ts";
import {
    createInMemoryClinicalPracticeObjectRepository,
    type ClinicalPracticeObjectRepository,
} from "./repository.ts";
import {
    ClinicalPracticeObjectGeneratorDescriptor,
    type ClinicalPracticeObjectGeneratorContract,
    type ClinicalQuery,
    type ClinicalPracticeObject,
    type ClinicalPracticeObjectArtifact,
    type ClinicalRecommendation,
    type EvidenceReference,
} from "./types.ts";
import {
    createInMemoryClinicalPracticeObjectEventPublisher,
    type ClinicalPracticeObjectEventPublisher,
} from "./events.ts";
import type { EvidenceLakeModuleContract, EvidenceLakeRecordArtifact } from "../evidence-lake/index.ts";

// Mock evidence data for demonstration
const MOCK_EVIDENCE_BASE: EvidenceReference[] = [
    {
        evidenceId: "acc-aha-cabg-2023",
        sourceId: "acc-aha-cabg-2023",
        title: "2023 ACC/AHA Guideline for Coronary Artery Bypass Graft Surgery",
        recommendationLevel: "Class I",
        strength: "Strong",
        applicability: 0.95,
        keyFindings: [
            "CABG is recommended for patients with significant left main coronary artery disease",
            "Complete revascularization should be attempted when possible",
            "Internal thoracic artery grafting should be used for left anterior descending artery"
        ]
    },
    {
        evidenceId: "acc-aha-afib-2023",
        sourceId: "acc-aha-afib-2023",
        title: "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation",
        recommendationLevel: "Class I",
        strength: "Strong",
        applicability: 0.88,
        keyFindings: [
            "Anticoagulation is recommended for AF patients with CHA2DS2-VASc score ≥2",
            "Rate control is preferred for asymptomatic patients",
            "Rhythm control may be considered for symptomatic patients"
        ]
    }
];

function generateQueryHash(query: ClinicalQuery): string {
    const queryString = JSON.stringify({
        specialty: query.specialty,
        condition: query.condition,
        patientContext: query.patientContext,
        queryType: query.queryType
    });
    return buildHashMetadata(queryString, "sha256", null).hash.slice(0, 16);
}

function tokenize(value: string | undefined): string[] {
    return String(value ?? "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter(Boolean);
}

function normalizeClinicalTokens(query: ClinicalQuery): string[] {
    const tokens = new Set<string>([
        ...tokenize(query.specialty),
        ...tokenize(query.condition),
        ...tokenize(query.queryType),
        ...tokenize(query.urgency),
        ...(query.patientContext?.comorbidities ?? []).flatMap((item) => tokenize(item)),
        ...(query.patientContext?.medications ?? []).flatMap((item) => tokenize(item)),
    ]);

    if (tokens.has("afib")) {
        tokens.add("atrial");
        tokens.add("fibrillation");
    }

    return [...tokens];
}

function scoreEvidenceMatch(queryTokens: string[], haystack: string): number {
    const normalizedHaystack = haystack.toLowerCase();
    return queryTokens.reduce((score, token) => {
        if (!token) return score;
        return normalizedHaystack.includes(token) ? score + 1 : score;
    }, 0);
}

function inferRecommendationLevel(record: EvidenceLakeRecordArtifact): EvidenceReference["recommendationLevel"] {
    const title = record.payload.canonicalTitle.toLowerCase();
    const synopsis = record.payload.evidenceSynopsis.toLowerCase();
    if (title.includes("guideline") || synopsis.includes("guideline")) return "Class I";
    if (title.includes("consensus") || synopsis.includes("consensus")) return "Class IIa";
    if (title.includes("review") || synopsis.includes("review")) return "Class IIb";
    return "Class III";
}

function inferStrength(record: EvidenceLakeRecordArtifact): EvidenceReference["strength"] {
    const tags = record.payload.domainTags.map((tag) => tag.toLowerCase());
    if (tags.includes("guideline") || tags.includes("recommendation")) return "Strong";
    if (tags.includes("review")) return "Moderate";
    return "Weak";
}

function mapEvidenceLakeRecordToReference(
    record: EvidenceLakeRecordArtifact,
    query: ClinicalQuery,
): EvidenceReference {
    const queryTokens = normalizeClinicalTokens(query);
    const matchingText = [
        record.payload.canonicalTitle,
        record.payload.evidenceSynopsis,
        record.payload.snapshotSummary,
        ...record.payload.domainTags,
        ...record.payload.canonicalClaims,
    ].join(" ");
    const score = scoreEvidenceMatch(queryTokens, matchingText);
    const normalizedApplicability = queryTokens.length
        ? Math.min(1, Math.max(0.35, score / queryTokens.length))
        : 0.5;
    const findings = record.payload.canonicalClaims.length
        ? record.payload.canonicalClaims
        : [record.payload.evidenceSynopsis];

    return {
        evidenceId: record.id,
        sourceId: record.payload.sourceId,
        title: record.payload.canonicalTitle,
        recommendationLevel: inferRecommendationLevel(record),
        strength: inferStrength(record),
        applicability: Number(normalizedApplicability.toFixed(2)),
        keyFindings: findings.slice(0, 4),
    };
}

async function getRelevantEvidenceForQuery(
    query: ClinicalQuery,
    evidenceLakeService?: EvidenceLakeModuleContract,
): Promise<EvidenceReference[]> {
    const queryTokens = normalizeClinicalTokens(query);
    const lakeRecords = evidenceLakeService ? await evidenceLakeService.listRecords() : [];
    const lakeReferences = lakeRecords
        .map((record) => {
            const haystack = [
                record.payload.canonicalTitle,
                record.payload.evidenceSynopsis,
                record.payload.snapshotSummary,
                ...record.payload.domainTags,
                ...record.payload.canonicalClaims,
            ].join(" ");
            return {
                reference: mapEvidenceLakeRecordToReference(record, query),
                score: scoreEvidenceMatch(queryTokens, haystack),
            };
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || right.reference.applicability - left.reference.applicability)
        .map((entry) => entry.reference);

    if (lakeReferences.length > 0) {
        return lakeReferences;
    }

    return MOCK_EVIDENCE_BASE.filter(evidence => {
        if (query.condition === "CABG" && evidence.sourceId.includes("cabg")) return true;
        if (query.condition === "AFIB" && evidence.sourceId.includes("afib")) return true;
        return false;
    });
}

function generateRecommendations(
    query: ClinicalQuery,
    evidence: EvidenceReference[]
): ClinicalRecommendation[] {
    const recommendations: ClinicalRecommendation[] = [];
    const conditionToken = query.condition.toLowerCase();

    if (query.condition === "CABG" && query.queryType === "treatment") {
        recommendations.push({
            id: `rec-${Date.now()}-1`,
            category: "therapeutic",
            priority: "high",
            recommendation: "Consider coronary artery bypass grafting (CABG) for patients with significant left main coronary artery disease or multivessel disease",
            rationale: "CABG has been shown to improve survival and reduce cardiac events in patients with significant coronary artery disease",
            evidenceReferences: evidence.filter((item) => item.sourceId.toLowerCase().includes(conditionToken)),
            confidence: 0.92,
            alternatives: ["Percutaneous coronary intervention (PCI)", "Medical therapy alone"],
            contraindications: ["Patient refusal", "Severe comorbidities precluding surgery"]
        });
    }

    if (query.condition === "AFIB" && query.queryType === "treatment") {
        recommendations.push({
            id: `rec-${Date.now()}-2`,
            category: "therapeutic",
            priority: "high",
            recommendation: "Initiate anticoagulation therapy for patients with CHA2DS2-VASc score ≥2",
            rationale: "Anticoagulation significantly reduces stroke risk in patients with atrial fibrillation",
            evidenceReferences: evidence.filter((item) => item.sourceId.toLowerCase().includes(conditionToken)),
            confidence: 0.95,
            alternatives: ["Antiplatelet therapy for low-risk patients"],
            contraindications: ["Active bleeding", "Severe thrombocytopenia"]
        });
    }

    return recommendations;
}

export function createClinicalPracticeObjectGeneratorService(
    repository: ClinicalPracticeObjectRepository = createInMemoryClinicalPracticeObjectRepository(),
    eventPublisher: ClinicalPracticeObjectEventPublisher = createInMemoryClinicalPracticeObjectEventPublisher(),
    evidenceLakeService?: EvidenceLakeModuleContract,
): ClinicalPracticeObjectGeneratorContract {
    return {
        module: ClinicalPracticeObjectGeneratorDescriptor,
        inputs: [...ClinicalPracticeObjectGeneratorDescriptor.inputs],
        outputs: [...ClinicalPracticeObjectGeneratorDescriptor.outputs],

        async generateCPO(query: ClinicalQuery): Promise<ClinicalPracticeObjectArtifact> {
            // Check cache first
            const queryHash = generateQueryHash(query);
            const cached = await this.getCachedCPO(queryHash);
            if (cached) {
                console.log(`[CPO] Returning cached CPO for query: ${queryHash}`);
                return cached;
            }

            // Get relevant evidence
            const relevantEvidence = await getRelevantEvidenceForQuery(query, evidenceLakeService);

            // Generate recommendations
            const recommendations = generateRecommendations(query, relevantEvidence);
            const rankedRecommendations = this.rankRecommendations(recommendations);

            // Create CPO
            const cpo: ClinicalPracticeObject = {
                id: `CPO-${queryHash}`,
                query,
                recommendations: rankedRecommendations,
                generatedAt: new Date().toISOString(),
                validityPeriod: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                version: "1.0.0",
                evidenceSummary: {
                    totalEvidence: relevantEvidence.length,
                    highQualityEvidence: relevantEvidence.filter(e => e.recommendationLevel === "Class I").length,
                    conflictingEvidence: 0 // Simplified
                }
            };

            // Create artifact
            const payload = cpo;
            const integrity = buildHashMetadata(payload, "sha256", null);

            const artifact: ClinicalPracticeObjectArtifact = {
                id: `CPO-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: 1,
                createdAt: new Date().toISOString(),
                payload,
                audit: createAuditMetadata({
                    createdBy: "cpo-system",
                    createdByType: "system",
                }),
                provenance: [],
                integrity,
                maturity: "implemented",
            };

            // Save to repository
            await repository.save(artifact);

            // Publish event
            await eventPublisher.publish({
                type: "cpo.generated",
                payload: {
                    cpo: artifact,
                    queryHash,
                    generatedAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async validateCPO(cpo: ClinicalPracticeObjectArtifact): Promise<boolean> {
            // Basic validation - check if CPO has recommendations and evidence
            const hasRecommendations = cpo.payload.recommendations.length > 0;
            const hasEvidence = cpo.payload.evidenceSummary.totalEvidence > 0;
            const isValidPeriod = new Date(cpo.payload.validityPeriod) > new Date();

            return hasRecommendations && hasEvidence && isValidPeriod;
        },

        async getRelevantEvidence(query: ClinicalQuery): Promise<EvidenceReference[]> {
            return getRelevantEvidenceForQuery(query, evidenceLakeService);
        },

        rankRecommendations(recommendations: ClinicalRecommendation[]): ClinicalRecommendation[] {
            return recommendations.sort((a, b) => {
                // Sort by priority first, then by confidence
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
            });
        },

        async getCachedCPO(queryHash: string): Promise<ClinicalPracticeObjectArtifact | null> {
            return repository.getByQueryHash(queryHash);
        },

        async invalidateCache(specialty?: string): Promise<void> {
            if (specialty) {
                console.log(`[CPO] Invalidating cache for specialty: ${specialty}`);
                // In a real implementation, this would clear cached CPOs for the specialty
            } else {
                console.log(`[CPO] Invalidating entire cache`);
                // In a real implementation, this would clear all cached CPOs
            }

            await eventPublisher.publish({
                type: "cpo.cache.invalidated",
                payload: {
                    specialty,
                    invalidatedAt: new Date().toISOString(),
                },
            });
        },
    };
}
