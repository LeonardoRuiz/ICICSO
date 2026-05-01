import type { DriftServiceContract } from "./types";
 export interface DriftServiceRepository{save(contract:DriftServiceContract):Promise<void>;load():Promise<DriftServiceContract|null>}
 export const createInMemoryDriftServiceRepository=(): DriftServiceRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
