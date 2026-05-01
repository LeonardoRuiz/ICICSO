import type { ModuleDescriptor } from "../../packages/shared-kernel";
 export interface BOMServiceContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const BOMServiceDescriptor: ModuleDescriptor={code:"BOM",name:"BOM Service",layer:"services/bom-service",path:"services/bom-service",status:"scaffolded",inputs:["BillOfMaterials"],outputs:["APIs de BOM"],dependencies:["packages/domain/bom", "packages/shared-kernel"]};
