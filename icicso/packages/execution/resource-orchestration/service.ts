import { ResourceOrchestrationModuleDescriptor } from "./types"; import type { ResourceOrchestrationModuleContract } from "./types";
 export const createResourceOrchestrationModuleService=(): ResourceOrchestrationModuleContract=>({module:ResourceOrchestrationModuleDescriptor,inputs:[...ResourceOrchestrationModuleDescriptor.inputs],outputs:[...ResourceOrchestrationModuleDescriptor.outputs]});
