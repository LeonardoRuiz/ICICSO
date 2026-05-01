import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ReadinessGatesModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ReadinessGatesModuleDescriptor: ModuleDescriptor={code:"RDY-G",name:"Readiness Gates Module",layer:"domain/readiness-gates",path:"packages/domain/readiness-gates",status:"scaffolded",inputs:["estado del caso", "reglas"],outputs:["ReadinessGateResult"],dependencies:["shared-kernel", "evt", "tam"]};
