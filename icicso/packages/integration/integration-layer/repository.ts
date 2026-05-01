import type { IntegrationLayerModuleContract } from "./types";
 export interface IntegrationLayerModuleRepository{save(contract:IntegrationLayerModuleContract):Promise<void>;load():Promise<IntegrationLayerModuleContract|null>}
 export const createInMemoryIntegrationLayerModuleRepository=(): IntegrationLayerModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
