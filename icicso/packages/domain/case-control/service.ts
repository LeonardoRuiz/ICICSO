import { CaseControlModuleDescriptor } from "./types"; import type { CaseControlModuleContract } from "./types";
 export const createCaseControlModuleService=(): CaseControlModuleContract=>({module:CaseControlModuleDescriptor,inputs:[...CaseControlModuleDescriptor.inputs],outputs:[...CaseControlModuleDescriptor.outputs]});
