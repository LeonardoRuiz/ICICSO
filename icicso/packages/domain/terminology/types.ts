import type { ModuleDescriptor } from "../../shared-kernel";
 export interface TerminologyModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const TerminologyModuleDescriptor: ModuleDescriptor={code:"TERM",name:"Terminology Module",layer:"domain/terminology",path:"packages/domain/terminology",status:"scaffolded",inputs:["códigos clínicos", "diccionarios"],outputs:["conceptos normalizados"],dependencies:["shared-kernel"]};
