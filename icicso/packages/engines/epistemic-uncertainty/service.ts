import { EpistemicUncertaintyEngineDescriptor } from "./types"; import type { EpistemicUncertaintyEngineContract } from "./types";
 export const createEpistemicUncertaintyEngineService=(): EpistemicUncertaintyEngineContract=>({module:EpistemicUncertaintyEngineDescriptor,inputs:[...EpistemicUncertaintyEngineDescriptor.inputs],outputs:[...EpistemicUncertaintyEngineDescriptor.outputs]});
