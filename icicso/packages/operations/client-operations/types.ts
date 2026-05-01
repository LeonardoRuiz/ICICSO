import type { ModuleDescriptor } from "../../shared-kernel";
 export interface ClientOperationsModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const ClientOperationsModuleDescriptor: ModuleDescriptor={code:"COL",name:"Client Operations Module",layer:"operations/client-operations",path:"packages/operations/client-operations",status:"scaffolded",inputs:["estado operativo", "servicios disponibles"],outputs:["acciones operativas"],dependencies:["shared-kernel", "resource-orchestration"]};
