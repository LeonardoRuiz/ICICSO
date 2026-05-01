import type { ModuleDescriptor } from "../../packages/shared-kernel";
 export interface OutcomesServiceContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const OutcomesServiceDescriptor: ModuleDescriptor={code:"Outcomes",name:"Outcomes Service",layer:"services/outcomes-service",path:"services/outcomes-service",status:"scaffolded",inputs:["CQOIMetricSet"],outputs:["APIs de outcomes"],dependencies:["packages/domain/outcomes", "packages/shared-kernel"]};
