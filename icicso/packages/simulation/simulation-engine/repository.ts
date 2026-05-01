import type { SimulationEngineModuleContract } from "./types";
 export interface SimulationEngineModuleRepository{save(contract:SimulationEngineModuleContract):Promise<void>;load():Promise<SimulationEngineModuleContract|null>}
 export const createInMemorySimulationEngineModuleRepository=(): SimulationEngineModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
