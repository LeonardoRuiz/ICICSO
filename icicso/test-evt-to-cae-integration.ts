import { createClinicalPracticeObjectGeneratorService } from "./packages/domain/cpo/index.ts";
import { createEventTriggerModuleService } from "./packages/domain/evt/index.ts";
import { createClinicalAdverseEventsModuleService } from "./packages/domain/adverse-events/index.ts";

async function testEvtToCaeIntegration() {
    console.log("🔁 Testing EVT → CAE integration pipeline...");

    const cpoService = createClinicalPracticeObjectGeneratorService();
    const evtService = createEventTriggerModuleService();
    const caeService = createClinicalAdverseEventsModuleService();

    const query = {
        specialty: "CARD",
        condition: "CABG",
        patientContext: {
            age: 65,
            gender: "M" as const,
            comorbidities: ["diabetes", "hypertension"],
            medications: ["aspirin", "metformin"],
        },
        urgency: "emergency" as const,
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

    console.log("⚕️ Generating Clinical Adverse Events from EVT...");
    const cae = await caeService.generateClinicalAdverseEventRecord(evtCatalog);
    console.log(`✅ CAE generated: ${cae.id}`);
    console.log(`   Record ID: ${cae.payload.caeId}`);
    console.log(`   Detected Events: ${cae.payload.detectedEvents.length}`);
    console.log(`   Overall Risk Score: ${cae.payload.overallRiskScore.toFixed(2)}`);

    console.log("🔍 Validating CAE record...");
    const isValid = await caeService.validateClinicalAdverseEventRecord(cae);
    console.log(`✅ CAE validation: ${isValid ? "PASSED" : "FAILED"}`);

    console.log("💾 Testing CAE cache lookup...");
    const cached = await caeService.getCachedClinicalAdverseEventRecord(evtCatalog.id);
    console.log(`✅ Cache lookup: ${cached ? "HIT" : "MISS"}`);

    console.log("🗑️ Invalidating CAE cache...");
    await caeService.invalidateCache(evtCatalog.id);
    const cachedAfter = await caeService.getCachedClinicalAdverseEventRecord(evtCatalog.id);
    console.log(`✅ Cache after invalidation: ${cachedAfter ? "HIT" : "MISS"}`);

    console.log("🎉 EVT → CAE integration test completed successfully!");
}

const isMain = typeof require !== "undefined"
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
    testEvtToCaeIntegration().catch(console.error);
}

export { testEvtToCaeIntegration };

// For direct execution
testEvtToCaeIntegration().catch(console.error);