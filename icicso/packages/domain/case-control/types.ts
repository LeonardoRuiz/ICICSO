import type { ModuleDescriptor } from "../../shared-kernel";
 export interface CaseControlModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const CaseControlModuleDescriptor: ModuleDescriptor={code:"CCCL",name:"Case Control Module",layer:"domain/case-control",path:"packages/domain/case-control",status:"scaffolded",inputs:["estado del caso"],outputs:["CaseControlState"],dependencies:["shared-kernel", "readiness-gates", "adverse-events"]};
