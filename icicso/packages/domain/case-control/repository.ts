import type { CaseControlModuleContract } from "./types";
 export interface CaseControlModuleRepository{save(contract:CaseControlModuleContract):Promise<void>;load():Promise<CaseControlModuleContract|null>}
 export const createInMemoryCaseControlModuleRepository=(): CaseControlModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
