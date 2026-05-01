import { writeRunOutputs } from "../engine/output";
import { runIcicsoPipeline } from "../engine/pipeline";
import { packageOutDir } from "./paths";

async function main(): Promise<void> {
  const run = runIcicsoPipeline();
  const paths = await writeRunOutputs(run, packageOutDir());

  for (const layer of run.layers) {
    console.log(`${layer.id}: ${layer.status}`);
  }

  console.log(`TRACE: ${paths.trace}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
