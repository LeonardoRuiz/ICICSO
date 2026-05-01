import { createPrismaClient } from "@icicso/database";
import { createEvidenceObjectModuleService } from "../eo/index.ts";
import { createSourceEvidenceRecordModuleService } from "../ser/index.ts";
import { createEvidenceLakeModuleService } from "./index.ts";

async function testEvidenceLakeModule() {
    console.log("🧪 Testing Evidence Lake Module");

    const prisma = createPrismaClient();
    const serService = createSourceEvidenceRecordModuleService(prisma);
    const eoService = createEvidenceObjectModuleService(prisma);
    const elService = createEvidenceLakeModuleService(prisma);

    try {
        // Create a sample SER
        console.log("� Creating Source Evidence Record...");
        const ser = await serService.registerFromIngest({
            sourceDocumentId: "test-doc-001",
            sourceId: "test-paper-001",
            canonicalTitle: "ACC/AHA Guidelines for CABG Surgery 2023",
            shortTitle: "CABG Guidelines 2023",
            documentType: "Clinical Guideline",
            issuingBody: "ACC/AHA",
            publicationDate: "2023-01-15",
            publicationYear: 2023,
            sourceUrlReference: "https://example.com/guidelines",
            sourceHash: "abc123",
            payload: {
                content: "Sample guideline content...",
                metadata: { pages: 45, format: "PDF" },
            },
            audit: {
                createdBy: "test-user",
                createdByType: "system",
                createdAt: new Date().toISOString(),
            },
        });
        console.log("✅ SER created:", ser.id);

        // Create corresponding EO
        console.log("� Creating Evidence Object...");
        const eo = await eoService.createFromRecord(ser);
        console.log("✅ EO created:", eo.id);

        // Index in Evidence Lake
        console.log("🏞️ Indexing in Evidence Lake...");
        const elRecord = await elService.indexEvidenceObject(eo);
        console.log("✅ Evidence Lake record created:", elRecord.id);
        console.log("   Indexing key:", elRecord.payload.indexingKey);
        console.log("   Domain tags:", elRecord.payload.domainTags);
        console.log("   Canonical claims:", elRecord.payload.canonicalClaims.length);

        // Retrieve the record
        console.log("🔍 Retrieving Evidence Lake record...");
        const retrieved = await elService.getRecord(eo.payload.sourceId);
        if (retrieved) {
            console.log("✅ Record retrieved:", retrieved.id);
            console.log("   Status:", retrieved.payload.lakeStatus);
        } else {
            console.log("❌ Record not found");
        }

        // List all records
        console.log("📋 Listing all Evidence Lake records...");
        const allRecords = await elService.listRecords();
        console.log(`✅ Found ${allRecords.length} records in Evidence Lake`);

        console.log("🎉 Evidence Lake Module test completed successfully!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (import.meta.main) {
    testEvidenceLakeModule().catch(console.error);
}

export { testEvidenceLakeModule };