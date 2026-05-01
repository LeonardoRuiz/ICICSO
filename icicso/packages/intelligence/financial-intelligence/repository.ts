import type { FinancialIntelligenceModuleContract } from "./types";
 export interface FinancialIntelligenceModuleRepository{save(contract:FinancialIntelligenceModuleContract):Promise<void>;load():Promise<FinancialIntelligenceModuleContract|null>}
 export const createInMemoryFinancialIntelligenceModuleRepository=(): FinancialIntelligenceModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
