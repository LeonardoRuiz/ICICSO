import type { ClinicalExecutionModuleContract } from "./types";
 export interface ClinicalExecutionModuleRepository{save(contract:ClinicalExecutionModuleContract):Promise<void>;load():Promise<ClinicalExecutionModuleContract|null>}
 export const createInMemoryClinicalExecutionModuleRepository=(): ClinicalExecutionModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
