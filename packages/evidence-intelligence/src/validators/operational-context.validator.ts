import type { ValidationIssue } from "../models/common.js";
import type { OperationalContext } from "../models/operational-context.js";
import {
  COST_RELEVANCE_CODES,
  IMPLEMENTATION_COMPLEXITY_CODES,
  RESOURCE_DEMAND_CODES,
} from "../models/common.js";
import { enumSet, isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

const complexities = enumSet(IMPLEMENTATION_COMPLEXITY_CODES);
const demands = enumSet(RESOURCE_DEMAND_CODES);
const costs = enumSet(COST_RELEVANCE_CODES);

export function validateOperationalContext(value: unknown, path = "operationalContext") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<OperationalContext>(issues);
  }

  if (!isNonEmptyString(value.implementationComplexity) || !complexities.has(value.implementationComplexity)) {
    pushIssue(issues, `${path}.implementationComplexity`, "must be a supported complexity code");
  }
  if (!isNonEmptyString(value.resourceDemand) || !demands.has(value.resourceDemand)) {
    pushIssue(issues, `${path}.resourceDemand`, "must be a supported demand code");
  }
  if (!isNonEmptyString(value.costRelevance) || !costs.has(value.costRelevance)) {
    pushIssue(issues, `${path}.costRelevance`, "must be a supported cost relevance code");
  }
  if (!Array.isArray(value.resourceRequirements)) {
    pushIssue(issues, `${path}.resourceRequirements`, "must be an array");
  }

  return result<OperationalContext>(issues, issues.length === 0 ? (value as unknown as OperationalContext) : undefined);
}
