export const provenanceSourceTypes = ["document", "registry", "guideline", "manual", "system", "derived"] as const;
export type ProvenanceSourceType = (typeof provenanceSourceTypes)[number];

export const hashAlgorithms = ["sha256"] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number];
