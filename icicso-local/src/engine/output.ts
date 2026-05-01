import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EngineRun } from "../core/types";

export interface OutputPaths {
  run: string;
  trace: string;
  esl: string;
  summary: string;
}

export async function writeRunOutputs(run: EngineRun, outputDir: string): Promise<OutputPaths> {
  await mkdir(outputDir, { recursive: true });

  const paths: OutputPaths = {
    run: join(outputDir, "latest-run.json"),
    trace: join(outputDir, "latest-trace.json"),
    esl: join(outputDir, "latest-esl.json"),
    summary: join(outputDir, "latest-summary.txt"),
  };

  const trace = {
    runId: run.runId,
    generatedAt: run.generatedAt,
    case: run.case,
    pipeline: run.layers.map((layer, index) => ({
      order: index + 1,
      id: layer.id,
      name: layer.name,
      status: layer.status,
      message: layer.message,
      blockers: layer.blockers,
      metrics: layer.metrics,
      critical: layer.critical,
    })),
  };

  const esl = run.artifacts.cccl?.esl ?? {
    generated: false,
    reason: "CCCL did not generate an ESL",
  };

  await writeFile(paths.run, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  await writeFile(paths.trace, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  await writeFile(paths.esl, `${JSON.stringify(esl, null, 2)}\n`, "utf8");
  await writeFile(paths.summary, `${run.summary}\n`, "utf8");

  return paths;
}
