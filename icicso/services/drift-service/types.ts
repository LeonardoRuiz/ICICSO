import type { ModuleDescriptor } from "../../packages/shared-kernel";
 export interface DriftServiceContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const DriftServiceDescriptor: ModuleDescriptor={code:"Drift",name:"Drift Service",layer:"services/drift-service",path:"services/drift-service",status:"scaffolded",inputs:["DriftAlert"],outputs:["APIs de drift"],dependencies:["packages/domain/drift", "packages/shared-kernel"]};
