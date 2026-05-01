import { createHash } from "node:crypto";

import { hashAlgorithms, type HashAlgorithm } from "../enums/provenance.ts";
import type { HashMetadata } from "../contracts/hash.ts";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
    .join(",")}}`;
}

export function buildHashMetadata(
  payload: unknown,
  algorithm: HashAlgorithm = "sha256",
  previousHash: string | null = null,
): HashMetadata {
  if (!hashAlgorithms.includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  const canonicalSource = canonicalize(payload);
  const hash = createHash(algorithm).update(canonicalSource).digest("hex");

  return {
    algorithm,
    hash,
    canonicalSource,
    previousHash,
  };
}
