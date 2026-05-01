// Basic integration test for SER module
import { createSourceEvidenceRecordModuleService } from "./service.ts";
import { createIngestModuleService } from "../ingest/service.ts";

async function testSERModule() {
  console.log("Testing SER Module...");

  // Create ingest service
  const ingestService = createIngestModuleService();

  // Create SER service
  const serService = createSourceEvidenceRecordModuleService();

  // Create a mock source document input
  const mockInput = {
    sourceId: "test-guideline-001",
    title: "Test Clinical Guideline for Testing",
    documentType: "guideline",
    issuingBody: "Test Medical Association",
    publicationDate: "2024-01-15",
    sourceType: "web" as const,
    sourceUrlReference: "https://example.com/guideline.pdf",
    content: "Mock content for testing",
    createdBy: "test-user",
    createdByType: "human" as const,
  };

  // Ingest document
  const ingestedDoc = await ingestService.ingestDocument(mockInput);
  console.log("Created ingested document:", ingestedDoc.id);

  // Register in SER
  const ser = await serService.registerFromIngest(ingestedDoc);
  console.log("Created SER:", ser.id, ser.payload.canonicalTitle);

  // Retrieve by source ID
  const retrieved = await serService.getRecord("test-guideline-001");
  console.log("Retrieved SER:", retrieved?.id);

  // List all
  const all = await serService.listRecords();
  console.log("Total SERs:", all.length);

  console.log("SER Module test completed successfully!");
}

// Run test if this file is executed directly
if (import.meta.main) {
  testSERModule().catch(console.error);
}