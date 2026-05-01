import type { ModuleDescriptor } from "../../packages/shared-kernel";
 export interface LegalServiceContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const LegalServiceDescriptor: ModuleDescriptor={code:"Legal",name:"Legal Service",layer:"services/legal-service",path:"services/legal-service",status:"scaffolded",inputs:["EvidenceSnapshotLegal"],outputs:["APIs legales"],dependencies:["packages/domain/legal-snapshots", "packages/shared-kernel"]};
