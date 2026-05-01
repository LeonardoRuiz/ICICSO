import { TerminologyModuleDescriptor } from "./types"; import type { TerminologyModuleContract } from "./types";
 export const createTerminologyModuleService=(): TerminologyModuleContract=>({module:TerminologyModuleDescriptor,inputs:[...TerminologyModuleDescriptor.inputs],outputs:[...TerminologyModuleDescriptor.outputs]});
