import type { ModuleDescriptor } from "../../shared-kernel";
 export interface EvidenceTranslationEngineContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const EvidenceTranslationEngineDescriptor: ModuleDescriptor={code:"ETE",name:"Evidence Translation Engine",layer:"engines/evidence-translation",path:"packages/engines/evidence-translation",status:"scaffolded",inputs:["EvidenceObject"],outputs:["EvidenceTranslationResult"],dependencies:["shared-kernel", "eo"]};
