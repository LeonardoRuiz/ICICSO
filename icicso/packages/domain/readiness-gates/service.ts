import { ReadinessGatesModuleDescriptor } from "./types"; import type { ReadinessGatesModuleContract } from "./types";
 export const createReadinessGatesModuleService=(): ReadinessGatesModuleContract=>({module:ReadinessGatesModuleDescriptor,inputs:[...ReadinessGatesModuleDescriptor.inputs],outputs:[...ReadinessGatesModuleDescriptor.outputs]});
