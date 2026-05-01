import type { ModuleDescriptor } from "../../shared-kernel";
 export interface SimulationEngineModuleContract{module:ModuleDescriptor;inputs:string[];outputs:string[]}
 export const SimulationEngineModuleDescriptor: ModuleDescriptor={code:"SIM",name:"Simulation Engine Module",layer:"simulation/simulation-engine",path:"packages/simulation/simulation-engine",status:"scaffolded",inputs:["ClinicalPathwayObject", "BillOfMaterials", "TemporalActivationModel"],outputs:["escenarios simulados"],dependencies:["shared-kernel", "cpo", "bom", "tam"]};
