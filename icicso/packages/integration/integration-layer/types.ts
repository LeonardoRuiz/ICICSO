import type { ModuleDescriptor } from "../../shared-kernel";
 export interface IntegrationLayerModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const IntegrationLayerModuleDescriptor: ModuleDescriptor={code:"IIL",name:"Integration Layer Module",layer:"integration/integration-layer",path:"packages/integration/integration-layer",status:"scaffolded",inputs:["artefactos canónicos", "mensajes externos"],outputs:["payloads integrados"],dependencies:["shared-kernel"]};
