import type { OutcomesServiceContract } from "./types";
 export interface OutcomesServiceRepository{save(contract:OutcomesServiceContract):Promise<void>;load():Promise<OutcomesServiceContract|null>}
 export const createInMemoryOutcomesServiceRepository=(): OutcomesServiceRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
