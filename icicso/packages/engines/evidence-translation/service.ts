import { EvidenceTranslationEngineDescriptor } from "./types"; import type { EvidenceTranslationEngineContract } from "./types";
 export const createEvidenceTranslationEngineService=(): EvidenceTranslationEngineContract=>({module:EvidenceTranslationEngineDescriptor,inputs:[...EvidenceTranslationEngineDescriptor.inputs],outputs:[...EvidenceTranslationEngineDescriptor.outputs]});
