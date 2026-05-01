import { ClinicalExecutionModuleDescriptor } from "./types"; import type { ClinicalExecutionModuleContract } from "./types";
 export const createClinicalExecutionModuleService=(): ClinicalExecutionModuleContract=>({module:ClinicalExecutionModuleDescriptor,inputs:[...ClinicalExecutionModuleDescriptor.inputs],outputs:[...ClinicalExecutionModuleDescriptor.outputs]});
