import type { GuidelineHarmonizationEngineContract } from "./types";
 export interface GuidelineHarmonizationEngineRepository{save(contract:GuidelineHarmonizationEngineContract):Promise<void>;load():Promise<GuidelineHarmonizationEngineContract|null>}
 export const createInMemoryGuidelineHarmonizationEngineRepository=(): GuidelineHarmonizationEngineRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
