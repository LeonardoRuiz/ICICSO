import type { ModuleDescriptor } from "../../shared-kernel";
 export interface DeviceIntelligenceModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const DeviceIntelligenceModuleDescriptor: ModuleDescriptor={code:"DIL",name:"Device Intelligence Module",layer:"intelligence/device-intelligence",path:"packages/intelligence/device-intelligence",status:"scaffolded",inputs:["device telemetry", "device UDI"],outputs:["insights de dispositivo"],dependencies:["shared-kernel", "integration-layer"]};
