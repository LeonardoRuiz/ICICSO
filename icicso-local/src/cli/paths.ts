import { resolve } from "node:path";

export function packageOutDir(): string {
  return resolve(process.cwd(), "out");
}
