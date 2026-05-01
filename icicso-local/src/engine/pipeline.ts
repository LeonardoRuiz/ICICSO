import { validateBom } from "../domains/bom";
import { runCccl } from "../domains/cccl";
import { evaluateCml } from "../domains/cml";
import { evaluateCqoi } from "../domains/cqoi";
import { activateEvidenceLake } from "../domains/el";
import { runEte } from "../domains/ete";
import { classifyEul } from "../domains/eul";
import { evaluateEvt } from "../domains/evt";
import { harmonizeGuideline } from "../domains/ghl";
import { evaluateIgl } from "../domains/igl";
import { compileKbol } from "../domains/kbol";
import { evaluateLccb } from "../domains/lccb";
import { evaluateReadinessGate } from "../domains/rdyg";
import { generateRunbook } from "../domains/ro";
import { generateSrm } from "../domains/srm";
import { evaluateTg } from "../domains/tg";
import { buildTam } from "../domains/tam";
import { icicsoCaseSchema, type EngineRun, type IcicsoCase, type LayerResult, type PipelineContext } from "../core/types";
import { createCabgFixture } from "../fixtures/cabg-x3-dm2-nstemi";

const GENERATED_AT = "2026-04-25T00:00:00.000Z";

function pushLayer(context: PipelineContext, result: LayerResult): void {
  context.layers.push(result);
}

export function runIcicsoPipeline(input: IcicsoCase = createCabgFixture()): EngineRun {
  const caseData = icicsoCaseSchema.parse(input);
  const context: PipelineContext = {
    caseData,
    layers: [],
    artifacts: {},
  };

  pushLayer(context, evaluateIgl(caseData));
  pushLayer(context, evaluateTg(caseData));

  const el = activateEvidenceLake(caseData);
  context.artifacts.evidenceLake = el.artifact;
  pushLayer(context, el.result);

  const ete = runEte(caseData, el.artifact);
  context.artifacts.ete = ete.artifact;
  pushLayer(context, ete.result);

  const eul = classifyEul(caseData, ete.artifact);
  context.artifacts.eul = eul.artifact;
  pushLayer(context, eul.result);

  const ghl = harmonizeGuideline();
  context.artifacts.ghl = ghl.artifact;
  pushLayer(context, ghl.result);

  const kbol = compileKbol(caseData, ete.artifact, eul.artifact, ghl.artifact);
  if (kbol.artifact) context.artifacts.kbol = kbol.artifact;
  pushLayer(context, kbol.result);

  const ro = generateRunbook(kbol.artifact);
  if (ro.artifact) context.artifacts.runbook = ro.artifact;
  pushLayer(context, ro.result);

  const bom = validateBom(ro.artifact);
  if (bom.artifact) context.artifacts.bom = bom.artifact;
  pushLayer(context, bom.result);

  const tam = buildTam(bom.artifact);
  if (tam.artifact) context.artifacts.tam = tam.artifact;
  pushLayer(context, tam.result);

  const evt = evaluateEvt(caseData);
  context.artifacts.evt = evt.artifact;
  pushLayer(context, evt.result);

  const rdyg = evaluateReadinessGate(evt.artifact);
  context.artifacts.rdyg = rdyg.artifact;
  pushLayer(context, rdyg.result);

  const lccb = evaluateLccb(rdyg.artifact);
  if (lccb.artifact) context.artifacts.lccb = lccb.artifact;
  pushLayer(context, lccb.result);

  const cccl = runCccl(caseData, ete.artifact, eul.artifact, ghl.artifact);
  context.artifacts.cccl = cccl.artifact;
  pushLayer(context, cccl.result);

  const srm = generateSrm();
  context.artifacts.srm = srm.artifact;
  pushLayer(context, srm.result);

  const cqoi = evaluateCqoi(caseData);
  context.artifacts.cqoi = cqoi.artifact;
  pushLayer(context, cqoi.result);

  const cml = evaluateCml(caseData);
  context.artifacts.cml = cml.artifact;
  pushLayer(context, cml.result);

  const ok = context.layers.every((layer) => !layer.critical);
  const run: EngineRun = {
    runId: `RUN-${caseData.caseId}-20260425T000000Z`,
    generatedAt: GENERATED_AT,
    ok,
    case: {
      caseId: caseData.caseId,
      episodeId: caseData.episodeId,
      label: caseData.label,
      displayCase: caseData.displayCase,
    },
    layers: context.layers,
    artifacts: context.artifacts,
    summary: "",
  };

  run.summary = formatRunSummary(run);
  return run;
}

export function formatRunSummary(run: EngineRun): string {
  const ete = run.artifacts.ete;
  const eul = run.artifacts.eul;
  const ghl = run.artifacts.ghl;
  const evt = run.artifacts.evt;
  const rdyg = run.artifacts.rdyg;
  const lccb = run.artifacts.lccb;
  const cccl = run.artifacts.cccl;
  const cml = run.artifacts.cml;
  const cqoi = run.artifacts.cqoi;

  return [
    "ICICSO LOCAL ENGINE RUN",
    `Case: ${run.case.displayCase}`,
    "",
    `IGL: ${statusOf(run, "IGL")}`,
    `TG: ${statusOf(run, "TG")}`,
    `EL: ${statusOf(run, "EL")}`,
    `ETE: ${statusOf(run, "ETE")}`,
    `ECS: ${ete?.ecs.toFixed(1) ?? "NA"}`,
    `UCI: ${ete?.uci.toFixed(2) ?? "NA"}`,
    `EUL: ${eul?.level ?? "NA"}`,
    `GHL: ${ghl?.guidelinePackageId ?? statusOf(run, "GHL")}`,
    `KBOL: ${statusOf(run, "KBOL")}`,
    `RO: ${statusOf(run, "RO")}`,
    `BOM: ${statusOf(run, "BOM")}`,
    `TAM: ${statusOf(run, "TAM")}`,
    `EVT: ${evt?.criticalActive ?? 0} CRITICAL ACTIVE`,
    `RDY-G: ${rdyg ? `${rdyg.gateId} ${rdyg.decision}` : statusOf(run, "RDY-G")}`,
    `LCCB: ${lccb?.status ?? statusOf(run, "LCCB")}`,
    `CCCL: ${cccl?.status ?? statusOf(run, "CCCL")}`,
    `ESL: ${cccl?.esl ? "GENERATED" : "NOT GENERATED"}`,
    `SRM: ${statusOf(run, "SRM")}`,
    `CQOI: ${cqoi?.status ?? statusOf(run, "CQOI")}`,
    `CML: ${cml?.status ?? statusOf(run, "CML")}`,
  ].join("\n");
}

export function statusOf(run: EngineRun, id: LayerResult["id"]): string {
  return run.layers.find((layer) => layer.id === id)?.status ?? "MISSING";
}
