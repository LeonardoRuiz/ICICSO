import { ScientificGovernanceModuleDescriptor } from "./types"; import type { ScientificGovernanceModuleContract } from "./types";
 export const createScientificGovernanceModuleService=(): ScientificGovernanceModuleContract=>({module:ScientificGovernanceModuleDescriptor,inputs:[...ScientificGovernanceModuleDescriptor.inputs],outputs:[...ScientificGovernanceModuleDescriptor.outputs]});
