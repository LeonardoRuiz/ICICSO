import type { EpistemicUncertaintyEngineContract } from "./types";
 export interface EpistemicUncertaintyEngineRepository{save(contract:EpistemicUncertaintyEngineContract):Promise<void>;load():Promise<EpistemicUncertaintyEngineContract|null>}
 export const createInMemoryEpistemicUncertaintyEngineRepository=(): EpistemicUncertaintyEngineRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
