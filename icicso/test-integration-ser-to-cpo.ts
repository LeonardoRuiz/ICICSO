import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createGuidelineHierarchyLayerService } from "./packages/domain/ghl/index.ts";
import { createEvidenceLakeService } from "./packages/domain/evidence-lake/index.ts";
import { createEvidenceOrchestratorService } from "./packages/domain/eo/index.ts";
import { createStructuredEvidenceRepositoryService } from "./packages/domain/ser/index.ts";

async function testCompleteEvidenceToCPOIntegration() {
    console.log("🔬 Testing Complete Evidence-to-CPO Integration Pipeline");
    console.log("Pipeline: SER → EO → Evidence Lake → GHL → CPO");

    try {
        // Initialize all services
        console.log("🔧 Initializing all services...");
        const serService = createStructuredEvidenceRepositoryService();
        const eoService = createEvidenceOrchestratorService();
        const elService = createEvidenceLakeService();
        const ghlService = createGuidelineHierarchyLayerService();
        const cpoService = createClinicalPracticeObjectGeneratorService();
        console.log("✅ All services initialized");

        // Step 1: Create and store evidence in SER
        console.log("📄 Step 1: Creating and storing evidence in SER...");
        const evidenceArtifact = await serService.createEvidenceArtifact({
            title: "2023 ACC/AHA CABG Guidelines",
            content: "Comprehensive guidelines for coronary artery bypass grafting surgery...",
            specialty: "CARD",
            condition: "CABG",
            source: "ACC/AHA",
            publicationYear: 2023,
            evidenceLevel: "A",
            recommendationClass: "I",
            keyFindings: [
                "CABG is recommended for patients with significant left main coronary artery disease",
                "Complete revascularization should be attempted when possible",
                "Internal thoracic artery grafting should be used for left anterior descending artery"
            ]
        });
        console.log(`✅ Evidence stored: ${evidenceArtifact.id}`);

        // Step 2: Process evidence through EO
        console.log("🎯 Step 2: Processing evidence through EO...");
        const processedEvidence = await eoService.processEvidence(evidenceArtifact);
        console.log(`✅ Evidence processed: ${processedEvidence.id}`);

        // Step 3: Store in Evidence Lake
        console.log("🏞️ Step 3: Storing in Evidence Lake...");
        const lakeArtifact = await elService.storeEvidence(processedEvidence);
        console.log(`✅ Evidence stored in lake: ${lakeArtifact.id}`);

        // Step 4: Update GHL hierarchy
        console.log("📊 Step 4: Updating GHL hierarchy...");
        const hierarchy = await ghlService.rebuildHierarchy("CARD");
        console.log(`✅ Hierarchy rebuilt: ${hierarchy.id}`);

        // Step 5: Generate CPO
        console.log("🏥 Step 5: Generating Clinical Practice Object...");
        const clinicalQuery = {
            specialty: "CARD",
            condition: "CABG",
            patientContext: {
                age: 65,
                gender: "M" as const,
                comorbidities: ["hypertension", "diabetes"],
                medications: ["aspirin", "metformin"]
            },
            urgency: "routine" as const,
            queryType: "treatment" as const
        };

        const cpo = await cpoService.generateCPO(clinicalQuery);
        console.log(`✅ CPO generated: ${cpo.id}`);
        console.log(`   Recommendations: ${cpo.payload.recommendations.length}`);
        console.log(`   Evidence references: ${cpo.payload.recommendations[0]?.evidenceReferences.length || 0}`);

        // Step 6: Validate complete pipeline
        console.log("🔍 Step 6: Validating complete pipeline...");

        // Check that CPO references the original evidence
        const hasEvidenceReference = cpo.payload.recommendations.some(rec =>
            rec.evidenceReferences.some(ref => ref.sourceId === evidenceArtifact.id)
        );
        console.log(`✅ CPO references original evidence: ${hasEvidenceReference}`);

        // Check that GHL was updated with evidence
        const cardHierarchy = await ghlService.getHierarchy("CARD");
        const hasEvidenceInHierarchy = cardHierarchy.payload.nodes.some(node =>
            node.evidenceReferences.includes(evidenceArtifact.id)
        );
        console.log(`✅ Evidence integrated in GHL: ${hasEvidenceInHierarchy}`);

        // Check evidence lake contains the evidence
        const lakeEvidence = await elService.getEvidenceById(evidenceArtifact.id);
        console.log(`✅ Evidence available in lake: ${!!lakeEvidence}`);

        console.log("🎉 Complete Evidence-to-CPO Integration test PASSED!");
        console.log("📊 Pipeline Summary:");
        console.log(`   SER → Evidence: ${evidenceArtifact.id}`);
        console.log(`   EO → Processed: ${processedEvidence.id}`);
        console.log(`   EL → Stored: ${lakeArtifact.id}`);
        console.log(`   GHL → Hierarchy: ${hierarchy.id}`);
        console.log(`   CPO → Generated: ${cpo.id}`);

    } catch (error) {
        console.error("❌ Integration test failed:", error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testCompleteEvidenceToCPOIntegration().catch(console.error);
}

export { testCompleteEvidenceToCPOIntegration };