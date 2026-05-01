import { caseStates } from "../enums/case-state.ts";
import { maturityStatuses, type MaturityStatus } from "../enums/maturity.ts";
import type { AuditMetadata } from "../contracts/audit.ts";
import type { CaseRuntimeState } from "../contracts/common.ts";
import type { CaseState } from "../enums/case-state.ts";
import type { case_id } from "../ids/types.ts";

export function createCaseRuntimeState(input: {
  caseId: case_id;
  currentState: CaseState;
  allowedTransitions: CaseState[];
  maturity: MaturityStatus;
  audit: AuditMetadata;
}): CaseRuntimeState {
  if (!caseStates.includes(input.currentState)) {
    throw new Error(`Unsupported case state: ${input.currentState}`);
  }

  for (const transition of input.allowedTransitions) {
    if (!caseStates.includes(transition)) {
      throw new Error(`Unsupported case transition: ${transition}`);
    }
  }

  if (!maturityStatuses.includes(input.maturity)) {
    throw new Error(`Unsupported maturity status: ${input.maturity}`);
  }

  return {
    caseId: input.caseId,
    currentState: input.currentState,
    allowedTransitions: [...new Set(input.allowedTransitions)],
    maturity: input.maturity,
    audit: input.audit,
  };
}
