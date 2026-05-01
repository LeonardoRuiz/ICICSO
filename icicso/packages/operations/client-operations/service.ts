import { ClientOperationsModuleDescriptor } from "./types"; import type { ClientOperationsModuleContract } from "./types";
 export const createClientOperationsModuleService=(): ClientOperationsModuleContract=>({module:ClientOperationsModuleDescriptor,inputs:[...ClientOperationsModuleDescriptor.inputs],outputs:[...ClientOperationsModuleDescriptor.outputs]});
