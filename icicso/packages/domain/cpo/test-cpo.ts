import { createClinicalPracticeObjectGeneratorService } from "./index.ts";

async function testClinicalPracticeObjectGenerator() {
    console.log("🏥 Testing Clinical Practice Object Generator");

    const cpoService = createClinicalPracticeObjectGeneratorService();

    try {
        // Test 1: Generate CPO for CABG treatment
        console.log("🔄 Generating CPO for CABG treatment...");
        const cabgQuery = {
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

        const cabgCpo = await cpoService.generateCPO(cabgQuery);
        console.log(`✅ CABG CPO generated: ${cabgCpo.id}`);
        console.log(`   Recommendations: ${cabgCpo.payload.recommendations.length}`);
        console.log(`   Evidence summary: ${cabgCpo.payload.evidenceSummary.totalEvidence} total`);

        // Test 2: Generate CPO for AFib treatment
        console.log("🔄 Generating CPO for AFib treatment...");
        const afibQuery = {
            specialty: "CARD",
            condition: "AFIB",
            patientContext: {
                age: 72,
                gender: "F" as const,
                comorbidities: ["hypertension"],
                medications: ["warfarin"]
            },
            urgency: "routine" as const,
            queryType: "treatment" as const
        };

        const afibCpo = await cpoService.generateCPO(afibQuery);
        console.log(`✅ AFib CPO generated: ${afibCpo.id}`);
        console.log(`   Recommendations: ${afibCpo.payload.recommendations.length}`);

        // Test 3: Validate CPO
        console.log("🔍 Validating CABG CPO...");
        const isValid = await cpoService.validateCPO(cabgCpo);
        console.log(`✅ CPO validation: ${isValid ? "PASSED" : "FAILED"}`);

        // Test 4: Get relevant evidence
        console.log("📊 Getting relevant evidence for CABG...");
        const relevantEvidence = await cpoService.getRelevantEvidence(cabgQuery);
        console.log(`✅ Found ${relevantEvidence.length} relevant evidence items`);

        // Test 5: Test caching
        console.log("💾 Testing cache functionality...");
        const cachedCpo = await cpoService.getCachedCPO(cabgCpo.payload.id.replace("CPO-", ""));
        console.log(`✅ Cache lookup: ${cachedCpo ? "HIT" : "MISS"}`);

        // Test 6: Invalidate cache
        console.log("🗑️ Invalidating cache for CARD specialty...");
        await cpoService.invalidateCache("CARD");
        console.log("✅ Cache invalidated");

        // Test 7: Show recommendation details
        if (cabgCpo.payload.recommendations.length > 0) {
            const firstRec = cabgCpo.payload.recommendations[0];
            console.log("📋 First recommendation details:");
            console.log(`   Category: ${firstRec.category}`);
            console.log(`   Priority: ${firstRec.priority}`);
            console.log(`   Confidence: ${(firstRec.confidence * 100).toFixed(1)}%`);
            console.log(`   Evidence references: ${firstRec.evidenceReferences.length}`);
        }

        console.log("🎉 Clinical Practice Object Generator test completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testClinicalPracticeObjectGenerator().catch(console.error);
}

export { testClinicalPracticeObjectGenerator };