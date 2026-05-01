import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCccl } from "../src/domains/cccl";
import { evaluateCml } from "../src/domains/cml";
import { activateEvidenceLake } from "../src/domains/el";
import { runEte } from "../src/domains/ete";
import { classifyEul } from "../src/domains/eul";
import { evaluateEvt } from "../src/domains/evt";
import { harmonizeGuideline } from "../src/domains/ghl";
import { evaluateIgl } from "../src/domains/igl";
import { compileKbol } from "../src/domains/kbol";
import { evaluateReadinessGate } from "../src/domains/rdyg";
import { writeRunOutputs } from "../src/engine/output";
import { runIcicsoPipeline } from "../src/engine/pipeline";
import { createCabgFixture } from "../src/fixtures/cabg-x3-dm2-nstemi";

function translatedFixture() {
  const caseData = createCabgFixture();
  const el = activateEvidenceLake(caseData);
  const ete = runEte(caseData, el.artifact);
  const eul = classifyEul(caseData, ete.artifact);
  const ghl = harmonizeGuideline();
  return { caseData, el, ete, eul, ghl };
}

describe("ICICSO local engine", () => {
  it("IGL bloquea sin ILC", () => {
    const caseData = createCabgFixture();
    caseData.ilc.valid = false;
    const result = evaluateIgl(caseData);
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("ILC invalid or missing");
  });

  it("IGL bloquea sin consentimiento", () => {
    const caseData = createCabgFixture();
    caseData.consent.active = false;
    const result = evaluateIgl(caseData);
    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toContain("Active consent missing");
  });

  it("ETE bloquea sin DDMO", () => {
    const caseData = createCabgFixture();
    caseData.ddmo.present = false;
    const el = activateEvidenceLake(caseData);
    const ete = runEte(caseData, el.artifact);
    expect(ete.result.status).toBe("BLOCKED");
    expect(ete.artifact.ddmoGate).toBe("BLOCKED");
  });

  it("EUL fixture = Nivel II", () => {
    const { eul } = translatedFixture();
    expect(eul.artifact.level).toBe("LEVEL II");
  });

  it("EUL ICDR severidad 4 = Nivel IV", () => {
    const caseData = createCabgFixture();
    caseData.evidence.icdr[0] = {
      ...caseData.evidence.icdr[0],
      maxSeverity: 4,
    };
    const el = activateEvidenceLake(caseData);
    const ete = runEte(caseData, el.artifact);
    const eul = classifyEul(caseData, ete.artifact);
    expect(eul.artifact.level).toBe("LEVEL IV");
  });

  it("KBOL bloquea sin VRN", () => {
    const { caseData, ete, eul, ghl } = translatedFixture();
    caseData.vrn.active = false;
    const kbol = compileKbol(caseData, ete.artifact, eul.artifact, ghl.artifact);
    expect(kbol.result.status).toBe("BLOCKED");
    expect(kbol.result.blockers).toContain("VRN is not active");
  });

  it("RDY-G bloquea con EVT critico", () => {
    const caseData = createCabgFixture();
    caseData.evt.active.push({
      id: "EVT-CRITICAL-001",
      label: "Critical structured event",
      severity: "CRITICAL",
      active: true,
    });
    const evt = evaluateEvt(caseData);
    const rdyg = evaluateReadinessGate(evt.artifact);
    expect(rdyg.result.status).toBe("GATE-0 BLOCKED");
    expect(rdyg.artifact.decision).toBe("BLOCKED");
  });

  it("CCCL no transiciona sin STC", () => {
    const { caseData, ete, eul, ghl } = translatedFixture();
    caseData.stc.available = false;
    const cccl = runCccl(caseData, ete.artifact, eul.artifact, ghl.artifact);
    expect(cccl.result.status).toBe("BLOCKED");
    expect(cccl.artifact.to).toBe(caseData.caseState);
    expect(cccl.artifact.esl).toBeNull();
  });

  it("CCCL genera ESL", () => {
    const { caseData, ete, eul, ghl } = translatedFixture();
    const cccl = runCccl(caseData, ete.artifact, eul.artifact, ghl.artifact);
    expect(cccl.result.status).toBe("PRE-OPERATIVE ACTIVE");
    expect(cccl.artifact.esl?.id).toBe("ESL-CASE-CABG-0001");
  });

  it("CML bloquea si caso no Closed", () => {
    const caseData = createCabgFixture();
    const cml = evaluateCml(caseData);
    expect(cml.artifact.status).toBe("BLOCKED UNTIL CLOSED");
    expect(cml.artifact.lcrIndividualAccess).toBe(false);
  });

  it("Pipeline completo genera /out/latest-run.json", async () => {
    const run = runIcicsoPipeline();
    const outDir = fileURLToPath(new URL("../out", import.meta.url));
    const paths = await writeRunOutputs(run, outDir);
    const raw = await readFile(paths.run, "utf8");
    expect(existsSync(paths.run)).toBe(true);
    expect(JSON.parse(raw).runId).toBe("RUN-CASE-CABG-0001-20260425T000000Z");
  });
});
