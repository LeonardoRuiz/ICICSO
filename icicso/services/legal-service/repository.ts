import type { LegalServiceContract } from "./types";
 export interface LegalServiceRepository{save(contract:LegalServiceContract):Promise<void>;load():Promise<LegalServiceContract|null>}
 export const createInMemoryLegalServiceRepository=(): LegalServiceRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
