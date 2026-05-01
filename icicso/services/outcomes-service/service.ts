import { OutcomesServiceDescriptor } from "./types"; import type { OutcomesServiceContract } from "./types";
 export const createOutcomesServiceService=(): OutcomesServiceContract=>({module:OutcomesServiceDescriptor,inputs:[...OutcomesServiceDescriptor.inputs],outputs:[...OutcomesServiceDescriptor.outputs]});
