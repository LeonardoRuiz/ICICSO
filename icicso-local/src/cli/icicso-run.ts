import { writeRunOutputs } from "../engine/output";
import { runIcicsoPipeline } from "../engine/pipeline";
import { packageOutDir } from "./paths";

async function main(): Promise<void> {
  const run = runIcicsoPipeline();
  await writeRunOutputs(run, packageOutDir());
  console.log(run.summary);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
