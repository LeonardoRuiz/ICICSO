import type { ModuleDescriptor } from "../../shared-kernel";
 export interface GuidelineHarmonizationEngineContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const GuidelineHarmonizationEngineDescriptor: ModuleDescriptor={code:"GHL",name:"Guideline Harmonization Engine",layer:"engines/guideline-harmonization",path:"packages/engines/guideline-harmonization",status:"scaffolded",inputs:["EvidenceObject[]"],outputs:["GuidelinePackage"],dependencies:["shared-kernel", "eo", "epistemic-uncertainty"]};
