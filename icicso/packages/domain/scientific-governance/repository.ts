import type { ScientificGovernanceModuleContract } from "./types";
 export interface ScientificGovernanceModuleRepository{save(contract:ScientificGovernanceModuleContract):Promise<void>;load():Promise<ScientificGovernanceModuleContract|null>}
 export const createInMemoryScientificGovernanceModuleRepository=(): ScientificGovernanceModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
