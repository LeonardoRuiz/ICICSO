import { DriftModuleDescriptor } from "./types"; import type { DriftModuleContract } from "./types";
 export const createDriftModuleService=(): DriftModuleContract=>({module:DriftModuleDescriptor,inputs:[...DriftModuleDescriptor.inputs],outputs:[...DriftModuleDescriptor.outputs]});
