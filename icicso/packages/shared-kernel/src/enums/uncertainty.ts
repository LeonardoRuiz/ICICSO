export const uncertaintyLevels = ["LevelI", "LevelII", "LevelIII", "LevelIV"] as const;
export type UncertaintyLevel = (typeof uncertaintyLevels)[number];
