import type { EvidenceSnapshotLegalModuleContract } from "./types";
 export interface EvidenceSnapshotLegalModuleRepository{save(contract:EvidenceSnapshotLegalModuleContract):Promise<void>;load():Promise<EvidenceSnapshotLegalModuleContract|null>}
 export const createInMemoryEvidenceSnapshotLegalModuleRepository=(): EvidenceSnapshotLegalModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
