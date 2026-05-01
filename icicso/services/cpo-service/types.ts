import type { ModuleDescriptor } from "../../packages/shared-kernel";
 export interface CPOServiceContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const CPOServiceDescriptor: ModuleDescriptor={code:"CPO",name:"CPO Service",layer:"services/cpo-service",path:"services/cpo-service",status:"scaffolded",inputs:["ClinicalPathwayObject"],outputs:["APIs de CPO"],dependencies:["packages/domain/cpo", "packages/shared-kernel"]};
