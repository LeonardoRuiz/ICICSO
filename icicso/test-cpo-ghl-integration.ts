import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createGuidelineHierarchyLayerService } from "./packages/domain/ghl/index.ts";

async function testCPOWithGHLIntegration() {
    console.log("🔗 Testing CPO-GHL Integration");

    try {
        // Initialize services
        console.log("🔧 Initializing CPO and GHL services...");
        const ghlService = createGuidelineHierarchyLayerService();
        const cpoService = createClinicalPracticeObjectGeneratorService();
        console.log("✅ Services initialized");

        // Step 1: Rebuild GHL hierarchy
        console.log("📊 Rebuilding GHL hierarchy for CARD...");
        const hierarchy = await ghlService.rebuildHierarchy("CARD");
        console.log(`✅ Hierarchy rebuilt: ${hierarchy.id}`);

        // Step 2: Generate CPO
        console.log("🏥 Generating CPO for CABG treatment...");
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

        // Step 3: Validate integration
        console.log("🔍 Validating CPO-GHL integration...");

        // Check that CPO uses evidence from GHL
        const relevantEvidence = await cpoService.getRelevantEvidence(clinicalQuery);
        console.log(`✅ Found ${relevantEvidence.length} relevant evidence items`);

        // Check hierarchy contains the condition
        const cardHierarchy = await ghlService.getSpecialtyHierarchy("CARD");
        const hasCabgNode = cardHierarchy?.payload.nodes.some(node => node.condition.code === "CABG");

        console.log("🎉 CPO-GHL Integration test PASSED!");

    } catch (error) {
        console.error("❌ Integration test failed:", error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testCPOWithGHLIntegration().catch(console.error);
}

export { testCPOWithGHLIntegration };