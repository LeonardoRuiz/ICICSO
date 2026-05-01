import type { CPOServiceContract } from "./types";
 export interface CPOServiceRepository{save(contract:CPOServiceContract):Promise<void>;load():Promise<CPOServiceContract|null>}
 export const createInMemoryCPOServiceRepository=(): CPOServiceRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
