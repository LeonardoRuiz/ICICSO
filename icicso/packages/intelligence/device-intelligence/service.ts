import { DeviceIntelligenceModuleDescriptor } from "./types"; import type { DeviceIntelligenceModuleContract } from "./types";
 export const createDeviceIntelligenceModuleService=(): DeviceIntelligenceModuleContract=>({module:DeviceIntelligenceModuleDescriptor,inputs:[...DeviceIntelligenceModuleDescriptor.inputs],outputs:[...DeviceIntelligenceModuleDescriptor.outputs]});
