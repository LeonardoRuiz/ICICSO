import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ClinicalQualityOutcomesIntelligenceModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ClinicalQualityOutcomesIntelligenceModuleDescriptor: ModuleDescriptor={code:"CQOI",name:"Clinical Quality Outcomes Intelligence Module",layer:"domain/outcomes",path:"packages/domain/outcomes",status:"scaffolded",inputs:["resultados del caso"],outputs:["CQOIMetricSet"],dependencies:["shared-kernel", "case-control"]};
