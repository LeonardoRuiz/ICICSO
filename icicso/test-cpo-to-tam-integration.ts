import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createTemporalActivationModelModuleService } from "./packages/domain/tam/index.ts";

async function testCpoToTamIntegration() {
    console.log("🔁 Testing CPO → TAM integration pipeline...");

    const cpoService = createClinicalPracticeObjectGeneratorService();
    const tamService = createTemporalActivationModelModuleService();

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

    console.log("🏥 Generating CPO for TAM input...");
    const cpo = await cpoService.generateCPO(query);
    console.log(`✅ CPO generated: ${cpo.id}`);

    console.log("⏳ Generating TAM from CPO...");
    const tam = await tamService.generateTAM(cpo);
    console.log(`✅ TAM generated: ${tam.id}`);
    console.log(`   TAM ID: ${tam.payload.tamId}`);
    console.log(`   Steps: ${tam.payload.activations.length}`);

    console.log("🔍 Validating TAM...");
    const isValid = await tamService.validateTAM(tam);
    console.log(`✅ TAM validation: ${isValid ? "PASSED" : "FAILED"}`);

    console.log("💾 Testing TAM cache lookup...");
    const cached = await tamService.getCachedTAM(cpo.id);
    console.log(`✅ Cache lookup: ${cached ? "HIT" : "MISS"}`);

    console.log("🗑️ Invalidating TAM cache...");
    await tamService.invalidateCache(cpo.id);
    const cachedAfter = await tamService.getCachedTAM(cpo.id);
    console.log(`✅ Cache after invalidation: ${cachedAfter ? "HIT" : "MISS"}`);

    console.log("🎉 CPO → TAM integration test completed successfully!");
}

const isMain = typeof require !== "undefined"
    ? require.main === module
    : typeof import.meta === "object" && "main" in import.meta && (import.meta as any).main;

if (isMain) {
    testCpoToTamIntegration().catch((error) => {
        console.error("❌ Integration test failed:", error);
        process.exit(1);
    });
}

export { testCpoToTamIntegration };
