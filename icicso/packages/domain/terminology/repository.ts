import type { TerminologyModuleContract } from "./types";
 export interface TerminologyModuleRepository{save(contract:TerminologyModuleContract):Promise<void>;load():Promise<TerminologyModuleContract|null>}
 export const createInMemoryTerminologyModuleRepository=(): TerminologyModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
