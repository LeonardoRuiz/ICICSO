import type { DeviceIntelligenceModuleContract } from "./types";
 export interface DeviceIntelligenceModuleRepository{save(contract:DeviceIntelligenceModuleContract):Promise<void>;load():Promise<DeviceIntelligenceModuleContract|null>}
 export const createInMemoryDeviceIntelligenceModuleRepository=(): DeviceIntelligenceModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
