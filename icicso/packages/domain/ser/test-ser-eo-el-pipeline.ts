// Complete pipeline test: SER → EO → Evidence Lake
import { createPrismaClient } from "@icicso/database";
import { createEvidenceLakeModuleService } from "../evidence-lake/index.ts";
import { createEvidenceObjectModuleService } from "../eo/index.ts";
import { createSourceEvidenceRecordModuleService } from "../ser/index.ts";

async function testCompleteEvidencePipeline() {
    console.log("🔬 Testing Complete Evidence Pipeline: SER → EO → Evidence Lake");

    const prisma = createPrismaClient();

    try {
        // Initialize services
        const serService = createSourceEvidenceRecordModuleService(prisma);
        const eoService = createEvidenceObjectModuleService(prisma);
        const elService = createEvidenceLakeModuleService(prisma);

        // Test data: ACC/AHA CABG Guidelines
        const testData = {
            sourceDocumentId: "cpt-335-001",
            sourceId: "acc-aha-cabg-2023",
            canonicalTitle: "2023 ACC/AHA Guideline for Coronary Artery Bypass Graft Surgery",
            shortTitle: "CABG Surgery Guidelines 2023",
            documentType: "Clinical Practice Guideline",
            issuingBody: "American College of Cardiology / American Heart Association",
            publicationDate: "2023-12-15",
            publicationYear: 2023,
            sourceUrlReference: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193",
            sourceHash: "sha256:cabg2023hash",
            payload: {
                content: `Comprehensive guidelines for coronary artery bypass graft surgery including:
        - Indications for CABG in stable ischemic heart disease
        - Perioperative management strategies
        - Long-term outcomes and follow-up care
        - Integration with percutaneous coronary intervention`,
                metadata: {
                    pages: 89,
                    format: "PDF",
                    doi: "10.1161/CIR.0000000000001193",
                    keywords: ["CABG", "coronary artery bypass", "cardiac surgery", "guidelines"]
                },
            },
            audit: {
                createdBy: "icicso-system",
                createdByType: "system",
                createdAt: new Date().toISOString(),
            },
        };

        // Phase 1: Create Source Evidence Record
        console.log("📄 Phase 1: Creating Source Evidence Record...");
        const ser = await serService.registerFromIngest(testData);
        console.log(`✅ SER created: ${ser.id} (${ser.payload.canonicalTitle})`);

        // Phase 2: Transform to Evidence Object
        console.log("🔄 Phase 2: Transforming to Evidence Object...");
        const eo = await eoService.createFromRecord(ser);
        console.log(`✅ EO created: ${eo.id}`);
        console.log(`   Domain tags: ${eo.payload.domainTags.join(", ")}`);
        console.log(`   Canonical claims: ${eo.payload.canonicalClaims.length} claims extracted`);

        // Phase 3: Index in Evidence Lake
        console.log("🏞️ Phase 3: Indexing in Evidence Lake...");
        const elRecord = await elService.indexEvidenceObject(eo);
        console.log(`✅ Evidence Lake record indexed: ${elRecord.id}`);
        console.log(`   Indexing key: ${elRecord.payload.indexingKey}`);
        console.log(`   Status: ${elRecord.payload.lakeStatus}`);
        console.log(`   Snapshot: ${elRecord.payload.snapshotSummary}`);

        // Verification: Query Evidence Lake
        console.log("🔍 Verification: Querying Evidence Lake...");
        const retrieved = await elService.getRecord(eo.payload.sourceId);
        if (retrieved) {
            console.log(`✅ Record retrieved successfully: ${retrieved.id}`);
            console.log(`   Integrity verified: ${retrieved.integrity.hash.startsWith("sha256:")}`);
        } else {
            throw new Error("Failed to retrieve Evidence Lake record");
        }

        // List all indexed records
        const allRecords = await elService.listRecords();
        console.log(`📊 Evidence Lake contains ${allRecords.length} indexed records`);

        console.log("🎉 Complete Evidence Pipeline test passed!");
        console.log("   SER → EO → Evidence Lake transformation successful");

    } catch (error) {
        console.error("❌ Pipeline test failed:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this file is executed directly
if (import.meta.main) {
    testCompleteEvidencePipeline().catch(console.error);
}

export { testCompleteEvidencePipeline };