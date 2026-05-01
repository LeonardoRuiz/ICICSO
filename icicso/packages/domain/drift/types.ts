import type { ModuleDescriptor } from "../../shared-kernel";
 export interface DriftModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const DriftModuleDescriptor: ModuleDescriptor={code:"Drift",name:"Drift Module",layer:"domain/drift",path:"packages/domain/drift",status:"scaffolded",inputs:["outcomes", "evidencia"],outputs:["DriftAlert"],dependencies:["shared-kernel", "outcomes", "eo"]};
