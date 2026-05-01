import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ResourceOrchestrationModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ResourceOrchestrationModuleDescriptor: ModuleDescriptor={code:"ROL",name:"Resource Orchestration Module",layer:"execution/resource-orchestration",path:"packages/execution/resource-orchestration",status:"scaffolded",inputs:["BillOfMaterials", "TemporalActivationModel"],outputs:["plan de recursos"],dependencies:["shared-kernel", "bom", "tam"]};
