import type { DriftModuleContract } from "./types";
 export interface DriftModuleRepository{save(contract:DriftModuleContract):Promise<void>;load():Promise<DriftModuleContract|null>}
 export const createInMemoryDriftModuleRepository=(): DriftModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
