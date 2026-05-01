import type {
  CostRelevance,
  ImplementationComplexity,
  OperationalRelevance,
  ResourceDemand,
} from "./common.js";

export interface ResourceRequirement {
  resourceType: string;
  role: string;
  quantity: number;
  unit: string;
  mandatory: boolean;
  costCenter?: string | null;
  notes?: string | null;
}

export interface OperationalContext {
  implementationComplexity: ImplementationComplexity;
  resourceDemand: ResourceDemand;
  costRelevance: CostRelevance;
  operationalRelevance?: OperationalRelevance;
  resourceRequirements: ResourceRequirement[];
  constraints?: string[];
}
