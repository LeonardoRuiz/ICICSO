// Basic integration test for EO module
import { createEvidenceObjectModuleService } from "./service.ts";
import { createSourceEvidenceRecordModuleService } from "../ser/service.ts";
import { createIngestModuleService } from "../ingest/service.ts";

async function testEOModule() {
    console.log("Testing EO Module...");

    // Create services
    const ingestService = createIngestModuleService();
    const serService = createSourceEvidenceRecordModuleService();
    const eoService = createEvidenceObjectModuleService();

    // Create a mock source document input
    const mockInput = {
        sourceId: "test-guideline-002",
        title: "ACC/AHA Clinical Practice Guidelines for Heart Failure Management",
        documentType: "guideline",
        issuingBody: "American College of Cardiology / American Heart Association",
        publicationDate: "2024-02-15",
        sourceType: "web" as const,
        sourceUrlReference: "https://example.com/acc-aha-guideline.pdf",
        content: "Comprehensive guidelines for heart failure management including beta-blockers, ACE inhibitors, and device therapy recommendations.",
        createdBy: "test-user",
        createdByType: "human" as const,
    };

    // Ingest document
    const ingestedDoc = await ingestService.ingestDocument(mockInput);
    console.log("Created ingested document:", ingestedDoc.id);

    // Create SER
    const ser = await serService.registerFromIngest(ingestedDoc);
    console.log("Created SER:", ser.id, ser.payload.canonicalTitle);

    // Create EO from SER
    const eo = await eoService.createFromRecord(ser);
    console.log("Created EO:", eo.id, eo.payload.canonicalTitle);
    console.log("Domain tags:", eo.payload.domainTags);
    console.log("Canonical claims:", eo.payload.canonicalClaims);

    // Retrieve EO by source ID
    const retrieved = await eoService.getObject("test-guideline-002");
    console.log("Retrieved EO:", retrieved?.id);

    // List all EOs
    const all = await eoService.listObjects();
    console.log("Total EOs:", all.length);

    console.log("EO Module test completed successfully!");
}

// Run test if this file is executed directly
if (import.meta.main) {
    testEOModule().catch(console.error);
}