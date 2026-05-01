import type { ModuleDescriptor } from "../../shared-kernel";
 export interface EpistemicUncertaintyEngineContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const EpistemicUncertaintyEngineDescriptor: ModuleDescriptor={code:"EUL",name:"Epistemic Uncertainty Engine",layer:"engines/epistemic-uncertainty",path:"packages/engines/epistemic-uncertainty",status:"scaffolded",inputs:["EvidenceObject", "EvidenceTranslationResult"],outputs:["señales de incertidumbre"],dependencies:["shared-kernel", "eo", "evidence-translation"]};
