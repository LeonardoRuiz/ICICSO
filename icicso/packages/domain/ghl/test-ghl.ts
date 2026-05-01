import { createGuidelineHierarchyLayerService } from "./index.ts";

async function testGuidelineHierarchyLayer() {
    console.log("🗂️ Testing Guideline Hierarchy Layer");

    const ghlService = createGuidelineHierarchyLayerService();

    try {
        // Test rebuilding a hierarchy
        console.log("🔄 Rebuilding Cardiology hierarchy...");
        const hierarchy = await ghlService.rebuildHierarchy("CARD");
        console.log(`✅ Hierarchy rebuilt: ${hierarchy.id}`);
        console.log(`   Specialty: ${hierarchy.payload.rootSpecialty}`);
        console.log(`   Nodes: ${hierarchy.payload.nodes.length}`);
        console.log(`   Total evidence: ${hierarchy.payload.totalEvidenceCount}`);

        // Test getting hierarchy
        console.log("🔍 Retrieving Cardiology hierarchy...");
        const retrieved = await ghlService.getSpecialtyHierarchy("CARD");
        if (retrieved) {
            console.log(`✅ Hierarchy retrieved: ${retrieved.id}`);
        } else {
            console.log("❌ Hierarchy not found");
        }

        // Test getting condition nodes
        console.log("📋 Getting Atrial Fibrillation nodes...");
        const afibNodes = await ghlService.getConditionNodes("AFIB");
        console.log(`✅ Found ${afibNodes.length} AFIB nodes`);

        // Test getting evidence by recommendation
        console.log("📊 Getting Class I recommendations for Cardiology...");
        const classIEvidence = await ghlService.getEvidenceByRecommendation("CARD", "Class I");
        console.log(`✅ Found ${classIEvidence.length} Class I evidence references`);

        // Test updating node references
        if (hierarchy.payload.nodes.length > 0) {
            console.log("🔗 Updating node references...");
            const firstNode = hierarchy.payload.nodes[0];
            await ghlService.updateNodeReferences(firstNode.id, ["evidence-001", "evidence-002"]);
            console.log(`✅ Updated references for node: ${firstNode.id}`);
        }

        console.log("🎉 Guideline Hierarchy Layer test completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testGuidelineHierarchyLayer().catch(console.error);
}

// ES module equivalent
if (import.meta.url === `file://${process.argv[1]}`) {
    testGuidelineHierarchyLayer().catch(console.error);
}

// Direct call for testing
testGuidelineHierarchyLayer().catch(console.error);

export { testGuidelineHierarchyLayer };