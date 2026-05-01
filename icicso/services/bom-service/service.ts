import { BOMServiceDescriptor } from "./types"; import type { BOMServiceContract } from "./types";
 export const createBOMServiceService=(): BOMServiceContract=>({module:BOMServiceDescriptor,inputs:[...BOMServiceDescriptor.inputs],outputs:[...BOMServiceDescriptor.outputs]});
