import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ClinicalExecutionModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ClinicalExecutionModuleDescriptor: ModuleDescriptor={code:"CEL",name:"Clinical Execution Module",layer:"execution/clinical-execution",path:"packages/execution/clinical-execution",status:"scaffolded",inputs:["ClinicalPathwayObject", "CaseControlState"],outputs:["órdenes y acciones clínicas"],dependencies:["shared-kernel", "cpo", "case-control"]};
