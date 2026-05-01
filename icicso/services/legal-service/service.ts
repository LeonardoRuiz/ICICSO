import { LegalServiceDescriptor } from "./types"; import type { LegalServiceContract } from "./types";
 export const createLegalServiceService=(): LegalServiceContract=>({module:LegalServiceDescriptor,inputs:[...LegalServiceDescriptor.inputs],outputs:[...LegalServiceDescriptor.outputs]});
