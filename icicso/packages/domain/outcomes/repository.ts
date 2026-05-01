import type { ClinicalQualityOutcomesIntelligenceModuleContract } from "./types";
 export interface ClinicalQualityOutcomesIntelligenceModuleRepository{save(contract:ClinicalQualityOutcomesIntelligenceModuleContract):Promise<void>;load():Promise<ClinicalQualityOutcomesIntelligenceModuleContract|null>}
 export const createInMemoryClinicalQualityOutcomesIntelligenceModuleRepository=(): ClinicalQualityOutcomesIntelligenceModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
