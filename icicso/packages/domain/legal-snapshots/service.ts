import { EvidenceSnapshotLegalModuleDescriptor } from "./types"; import type { EvidenceSnapshotLegalModuleContract } from "./types";
 export const createEvidenceSnapshotLegalModuleService=(): EvidenceSnapshotLegalModuleContract=>({module:EvidenceSnapshotLegalModuleDescriptor,inputs:[...EvidenceSnapshotLegalModuleDescriptor.inputs],outputs:[...EvidenceSnapshotLegalModuleDescriptor.outputs]});
