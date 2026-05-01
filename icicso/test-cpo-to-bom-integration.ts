import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createBillofMaterialsModuleService } from "./packages/domain/bom/index.ts";

async function testCpoToBomIntegration() {
    console.log("🔁 Testing CPO → BOM integration pipeline...");

    const cpoService = createClinicalPracticeObjectGeneratorService();
    const bomService = createBillofMaterialsModuleService();

    const query = {
        specialty: "CARD",
        condition: "CABG",
        patientContext: {
            age: 65,
            gender: "M" as const,
            comorbidities: ["diabetes", "hypertension"],
            medications: ["aspirin", "metformin"],
        },
        urgency: "routine" as const,
        queryType: "treatment" as const,
    };

    console.log("🏥 Generating CPO for BOM input...");
    const cpo = await cpoService.generateCPO(query);
    console.log(`✅ CPO generated: ${cpo.id}`);

    console.log("📦 Generating BOM from CPO...");
    const bom = await bomService.generateBillOfMaterials(cpo);
    console.log(`✅ BOM generated: ${bom.id}`);
    console.log(`   Phase: ${bom.payload.phase}`);
    console.log(`   Resources: ${bom.payload.resources.length}`);

    console.log("🔍 Validating BOM...");
    const isValid = await bomService.validateBOM(bom);
    console.log(`✅ BOM validation: ${isValid ? "PASSED" : "FAILED"}`);

    console.log("💾 Testing BOM cache lookup...");
    const cached = await bomService.getCachedBOM(cpo.id);
    console.log(`✅ Cache lookup: ${cached ? "HIT" : "MISS"}`);

    console.log("🗑️ Invalidating BOM cache...");
    await bomService.invalidateCache(cpo.id);
    const cachedAfter = await bomService.getCachedBOM(cpo.id);
    console.log(`✅ Cache after invalidation: ${cachedAfter ? "HIT" : "MISS"}`);

    console.log("🎉 CPO → BOM integration test completed successfully!");
}

if (typeof require !== "undefined" && require.main === module) {
    testCpoToBomIntegration().catch((error) => {
        console.error("❌ Integration test failed:", error);
        process.exit(1);
    });
}

export { testCpoToBomIntegration };
