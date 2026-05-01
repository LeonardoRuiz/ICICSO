export type Brand<T, B extends string> = T & { readonly __brand: B };

export const idPrefixes = {
  vrn: "VRN",
  ilc: "ILC",
  actor: "ACTOR",
  case: "CASE",
  ser: "SER",
  eo: "EO",
  cpo: "CPO",
  bom: "BOM",
  tam: "TAM",
  evt: "EVT",
  gate: "GATE",
  cae: "CAE",
  esl: "ESL",
  outcome: "OUTCOME",
  drift: "DRIFT",
  udi: "UDI",
} as const;

export type VRN = Brand<string, "VRN">;
export type ILC = Brand<string, "ILC">;
export type actor_id = Brand<string, "actor_id">;
export type case_id = Brand<string, "case_id">;
export type ser_id = Brand<string, "ser_id">;
export type eo_id = Brand<string, "eo_id">;
export type cpo_id = Brand<string, "cpo_id">;
export type bom_id = Brand<string, "bom_id">;
export type tam_id = Brand<string, "tam_id">;
export type evt_id = Brand<string, "evt_id">;
export type gate_id = Brand<string, "gate_id">;
export type cae_id = Brand<string, "cae_id">;
export type esl_id = Brand<string, "esl_id">;
export type outcome_id = Brand<string, "outcome_id">;
export type drift_id = Brand<string, "drift_id">;
export type device_udi = Brand<string, "device_udi">;

function ensurePrefixedValue(value: string, prefix: string, label: string): string {
  if (!value.startsWith(`${prefix}-`)) {
    throw new Error(`${label} must start with ${prefix}-`);
  }

  return value;
}

function createPrefixedIdentifier<T extends string>(prefix: string, label: string, value: string): T {
  return ensurePrefixedValue(value, prefix, label) as T;
}

export const createVrn = (value = `${idPrefixes.vrn}-${crypto.randomUUID()}`): VRN =>
  createPrefixedIdentifier<VRN>(idPrefixes.vrn, "VRN", value);

export const createIlc = (value = `${idPrefixes.ilc}-${crypto.randomUUID()}`): ILC =>
  createPrefixedIdentifier<ILC>(idPrefixes.ilc, "ILC", value);

export const createActorId = (value = `${idPrefixes.actor}-${crypto.randomUUID()}`): actor_id =>
  createPrefixedIdentifier<actor_id>(idPrefixes.actor, "Actor ID", value);

export const createCaseId = (value = `${idPrefixes.case}-${crypto.randomUUID()}`): case_id =>
  createPrefixedIdentifier<case_id>(idPrefixes.case, "Case ID", value);

export const createSerId = (value = `${idPrefixes.ser}-${crypto.randomUUID()}`): ser_id =>
  createPrefixedIdentifier<ser_id>(idPrefixes.ser, "SER ID", value);

export const createEoId = (value = `${idPrefixes.eo}-${crypto.randomUUID()}`): eo_id =>
  createPrefixedIdentifier<eo_id>(idPrefixes.eo, "EO ID", value);

export const createCpoId = (value = `${idPrefixes.cpo}-${crypto.randomUUID()}`): cpo_id =>
  createPrefixedIdentifier<cpo_id>(idPrefixes.cpo, "CPO ID", value);

export const createBomId = (value = `${idPrefixes.bom}-${crypto.randomUUID()}`): bom_id =>
  createPrefixedIdentifier<bom_id>(idPrefixes.bom, "BOM ID", value);

export const createTamId = (value = `${idPrefixes.tam}-${crypto.randomUUID()}`): tam_id =>
  createPrefixedIdentifier<tam_id>(idPrefixes.tam, "TAM ID", value);

export const createEvtId = (value = `${idPrefixes.evt}-${crypto.randomUUID()}`): evt_id =>
  createPrefixedIdentifier<evt_id>(idPrefixes.evt, "EVT ID", value);

export const createGateId = (value = `${idPrefixes.gate}-${crypto.randomUUID()}`): gate_id =>
  createPrefixedIdentifier<gate_id>(idPrefixes.gate, "Gate ID", value);

export const createCaeId = (value = `${idPrefixes.cae}-${crypto.randomUUID()}`): cae_id =>
  createPrefixedIdentifier<cae_id>(idPrefixes.cae, "CAE ID", value);

export const createEslId = (value = `${idPrefixes.esl}-${crypto.randomUUID()}`): esl_id =>
  createPrefixedIdentifier<esl_id>(idPrefixes.esl, "ESL ID", value);

export const createOutcomeId = (value = `${idPrefixes.outcome}-${crypto.randomUUID()}`): outcome_id =>
  createPrefixedIdentifier<outcome_id>(idPrefixes.outcome, "Outcome ID", value);

export const createDriftId = (value = `${idPrefixes.drift}-${crypto.randomUUID()}`): drift_id =>
  createPrefixedIdentifier<drift_id>(idPrefixes.drift, "Drift ID", value);

export const createDeviceUdi = (value = `${idPrefixes.udi}-${crypto.randomUUID()}`): device_udi =>
  createPrefixedIdentifier<device_udi>(idPrefixes.udi, "Device UDI", value);
