import type { ModuleDescriptor } from "../../shared-kernel";
 export interface FinancialIntelligenceModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const FinancialIntelligenceModuleDescriptor: ModuleDescriptor={code:"FIL",name:"Financial Intelligence Module",layer:"intelligence/financial-intelligence",path:"packages/intelligence/financial-intelligence",status:"scaffolded",inputs:["costos", "ClinicalPathwayObject"],outputs:["insights financieros"],dependencies:["shared-kernel", "cpo"]};
