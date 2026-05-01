import type { ArchitectureLayerRecord } from "../../../packages/shared-kernel/index.ts";
import { architectureMapData } from "./architectureMap.data.js";

export type { ArchitectureLayerRecord } from "../../../packages/shared-kernel/index.ts";

export const architectureMap: ArchitectureLayerRecord[] = architectureMapData satisfies ArchitectureLayerRecord[];
