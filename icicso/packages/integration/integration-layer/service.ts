import { IntegrationLayerModuleDescriptor } from "./types"; import type { IntegrationLayerModuleContract } from "./types";
 export const createIntegrationLayerModuleService=(): IntegrationLayerModuleContract=>({module:IntegrationLayerModuleDescriptor,inputs:[...IntegrationLayerModuleDescriptor.inputs],outputs:[...IntegrationLayerModuleDescriptor.outputs]});
