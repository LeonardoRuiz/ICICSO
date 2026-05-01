import { CPOServiceDescriptor } from "./types"; import type { CPOServiceContract } from "./types";
 export const createCPOServiceService=(): CPOServiceContract=>({module:CPOServiceDescriptor,inputs:[...CPOServiceDescriptor.inputs],outputs:[...CPOServiceDescriptor.outputs]});
