import type { ClientOperationsModuleContract } from "./types";
 export interface ClientOperationsModuleRepository{save(contract:ClientOperationsModuleContract):Promise<void>;load():Promise<ClientOperationsModuleContract|null>}
 export const createInMemoryClientOperationsModuleRepository=(): ClientOperationsModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
