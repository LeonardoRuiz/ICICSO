import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ScientificGovernanceModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ScientificGovernanceModuleDescriptor: ModuleDescriptor={code:"Gov",name:"Scientific Governance Module",layer:"domain/scientific-governance",path:"packages/domain/scientific-governance",status:"scaffolded",inputs:["artefactos auditables", "hallazgos de deriva"],outputs:["ScientificGovernanceRecord"],dependencies:["shared-kernel", "drift"]};
