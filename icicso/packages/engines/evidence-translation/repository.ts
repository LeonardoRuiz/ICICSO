import type { EvidenceTranslationEngineContract } from "./types";
 export interface EvidenceTranslationEngineRepository{save(contract:EvidenceTranslationEngineContract):Promise<void>;load():Promise<EvidenceTranslationEngineContract|null>}
 export const createInMemoryEvidenceTranslationEngineRepository=(): EvidenceTranslationEngineRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
