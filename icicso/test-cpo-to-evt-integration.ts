import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createEventTriggerModuleService } from "./packages/domain/evt/index.ts";

async function testCpoToEvtIntegration() {
    console.log("🔁 Testing CPO → EVT integration pipeline...");

    const cpoService = createClinicalPracticeObjectGeneratorService();
    const evtService = createEventTriggerModuleService();

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

    console.log("🏥 Generating CPO for EVT input...");
    const cpo = await cpoService.generateCPO(query);
    console.log(`✅ CPO generated: ${cpo.id}`);

    console.log("🚨 Generating Event Trigger Catalog from CPO...");
    const evtCatalog = await evtService.generateEventTriggerCatalog(cpo);
    console.log(`✅ EVT generated: ${evtCatalog.id}`);
    console.log(`   Catalog ID: ${evtCatalog.payload.evtCatalogId}`);
    console.log(`   Triggers: ${evtCatalog.payload.triggerDefinitions.length}`);

    console.log("🔍 Validating EVT catalog...");
    const isValid = await evtService.validateEventTriggerCatalog(evtCatalog);
    console.log(`✅ EVT validation: ${isValid ? "PASSED" : "FAILED"}`);

    console.log("💾 Testing EVT cache lookup...");
    const cached = await evtService.getCachedEventTriggerCatalog(cpo.id);
    console.log(`✅ Cache lookup: ${cached ? "HIT" : "MISS"}`);

    console.log("🗑️ Invalidating EVT cache...");
    await evtService.invalidateCache(cpo.id);
    const cachedAfter = await evtService.getCachedEventTriggerCatalog(cpo.id);
    console.log(`✅ Cache after invalidation: ${cachedAfter ? "HIT" : "MISS"}`);

    console.log("🎉 CPO → EVT integration test completed successfully!");
}

const isMain = typeof require !== "undefined"
    ? require.main === module
    : typeof import.meta === "object" && "main" in import.meta && (import.meta as any).main;

if (isMain) {
    testCpoToEvtIntegration().catch((error) => {
        console.error("❌ Integration test failed:", error);
        process.exit(1);
    });
}

export { testCpoToEvtIntegration };
