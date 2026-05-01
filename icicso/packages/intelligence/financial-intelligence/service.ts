import { FinancialIntelligenceModuleDescriptor } from "./types"; import type { FinancialIntelligenceModuleContract } from "./types";
 export const createFinancialIntelligenceModuleService=(): FinancialIntelligenceModuleContract=>({module:FinancialIntelligenceModuleDescriptor,inputs:[...FinancialIntelligenceModuleDescriptor.inputs],outputs:[...FinancialIntelligenceModuleDescriptor.outputs]});
