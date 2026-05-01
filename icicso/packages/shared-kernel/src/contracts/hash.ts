import type { HashAlgorithm } from "../enums/provenance.ts";

export interface HashMetadata {
  algorithm: HashAlgorithm;
  hash: string;
  canonicalSource: string;
  previousHash: string | null;
}
