import { DriftServiceDescriptor } from "./types"; import type { DriftServiceContract } from "./types";
 export const createDriftServiceService=(): DriftServiceContract=>({module:DriftServiceDescriptor,inputs:[...DriftServiceDescriptor.inputs],outputs:[...DriftServiceDescriptor.outputs]});
