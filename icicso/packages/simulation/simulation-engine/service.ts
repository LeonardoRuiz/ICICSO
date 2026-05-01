import { SimulationEngineModuleDescriptor } from "./types"; import type { SimulationEngineModuleContract } from "./types";
 export const createSimulationEngineModuleService=(): SimulationEngineModuleContract=>({module:SimulationEngineModuleDescriptor,inputs:[...SimulationEngineModuleDescriptor.inputs],outputs:[...SimulationEngineModuleDescriptor.outputs]});
