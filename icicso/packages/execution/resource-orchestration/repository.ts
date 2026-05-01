import type { ResourceOrchestrationModuleContract } from "./types";
 export interface ResourceOrchestrationModuleRepository{save(contract:ResourceOrchestrationModuleContract):Promise<void>;load():Promise<ResourceOrchestrationModuleContract|null>}
 export const createInMemoryResourceOrchestrationModuleRepository=(): ResourceOrchestrationModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
