// Integrated test: SER → EO transformation pipeline
import { createEvidenceObjectModuleService } from "./eo/service.ts";
import { createSourceEvidenceRecordModuleService } from "./ser/service.ts";
import { createIngestModuleService } from "./ingest/service.ts";

async function testSerToEoPipeline() {
    console.log("Testing SER → EO Pipeline...");

    // Initialize services
    const ingestService = createIngestModuleService();
    const serService = createSourceEvidenceRecordModuleService();
    const eoService = createEvidenceObjectModuleService();

    // Test data: Clinical guidelines from different authorities
    const testDocuments = [
        {
            sourceId: "acc-aha-001",
            title: "ACC/AHA Guideline for the Management of Heart Failure",
            documentType: "guideline",
            issuingBody: "American College of Cardiology / American Heart Association",
            publicationDate: "2024-01-15",
            sourceType: "web" as const,
            sourceUrlReference: "https://example.com/acc-aha-hf.pdf",
            content: "Comprehensive guidelines for heart failure management",
            createdBy: "test-user",
            createdByType: "human" as const,
        },
        {
            sourceId: "esc-001",
            title: "ESC Guidelines for the Diagnosis and Treatment of Acute Heart Failure",
            documentType: "guideline",
            issuingBody: "European Society of Cardiology",
            publicationDate: "2023-08-25",
            sourceType: "web" as const,
            sourceUrlReference: "https://example.com/esc-ahf.pdf",
            content: "European guidelines for acute heart failure",
            createdBy: "test-user",
            createdByType: "human" as const,
        },
        {
            sourceId: "nejm-trial-001",
            title: "DAPA-HF Trial: Dapagliflozin in Heart Failure with Reduced Ejection Fraction",
            documentType: "trial",
            issuingBody: "New England Journal of Medicine",
            publicationDate: "2019-09-19",
            sourceType: "web" as const,
            sourceUrlReference: "https://example.com/dapa-hf-trial.pdf",
            content: "Randomized controlled trial of dapagliflozin in HFrEF",
            createdBy: "test-user",
            createdByType: "human" as const,
        },
    ];

    console.log("Processing documents through SER → EO pipeline...\n");

    for (const docInput of testDocuments) {
        console.log(`📄 Processing: ${docInput.title.slice(0, 50)}...`);

        // Step 1: Ingest document
        const ingested = await ingestService.ingestDocument(docInput);
        console.log(`  ✅ Ingested: ${ingested.id}`);

        // Step 2: Create SER
        const ser = await serService.registerFromIngest(ingested);
        console.log(`  ✅ SER: ${ser.id} (${ser.payload.documentType})`);

        // Step 3: Transform to EO
        const eo = await eoService.createFromRecord(ser);
        console.log(`  ✅ EO: ${eo.id}`);
        console.log(`    📋 Tags: ${eo.payload.domainTags.join(", ")}`);
        console.log(`    🎯 Claims: ${eo.payload.canonicalClaims.length} claims`);
        console.log(`    📊 Synopsis: ${eo.payload.evidenceSynopsis}`);
        console.log("");
    }

    // Verify pipeline results
    const allSers = await serService.listRecords();
    const allEos = await eoService.listObjects();

    console.log("Pipeline Results:");
    console.log(`📊 Total SERs: ${allSers.length}`);
    console.log(`📊 Total EOs: ${allEos.length}`);
    console.log(`🔗 Pipeline efficiency: ${allEos.length}/${allSers.length} (${((allEos.length / allSers.length) * 100).toFixed(1)}%)`);

    // Show domain tag distribution
    const tagCounts: Record<string, number> = {};
    allEos.forEach(eo => {
        eo.payload.domainTags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    console.log("\n🏷️  Domain Tag Distribution:");
    Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([tag, count]) => {
            console.log(`  ${tag}: ${count}`);
        });

    console.log("\n🎉 SER → EO Pipeline test completed successfully!");
}

// Run test if this file is executed directly
if (import.meta.main) {
    testSerToEoPipeline().catch(console.error);
}