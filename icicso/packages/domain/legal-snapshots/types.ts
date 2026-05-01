import type { ModuleDescriptor } from "../../shared-kernel";
 export interface EvidenceSnapshotLegalModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const EvidenceSnapshotLegalModuleDescriptor: ModuleDescriptor={code:"ESL",name:"Evidence Snapshot Legal Module",layer:"domain/legal-snapshots",path:"packages/domain/legal-snapshots",status:"scaffolded",inputs:["artefactos del caso"],outputs:["EvidenceSnapshotLegal"],dependencies:["shared-kernel", "case-control"]};
