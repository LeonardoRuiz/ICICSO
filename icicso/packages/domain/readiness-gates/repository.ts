import type { ReadinessGatesModuleContract } from "./types";
 export interface ReadinessGatesModuleRepository{save(contract:ReadinessGatesModuleContract):Promise<void>;load():Promise<ReadinessGatesModuleContract|null>}
 export const createInMemoryReadinessGatesModuleRepository=(): ReadinessGatesModuleRepository=>({async save(){return Promise.resolve();},async load(){return Promise.resolve(null);}});
