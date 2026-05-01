import type { BOMServiceContract } from "./types";
 export interface BOMServiceRepository{save(contract:BOMServiceContract):Promise<void>;load():Promise<BOMServiceContract|null>}
 export const createInMemoryBOMServiceRepository=(): BOMServiceRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
