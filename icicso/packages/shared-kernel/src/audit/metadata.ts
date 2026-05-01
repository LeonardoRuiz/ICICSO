import type { ActorType } from "../enums/events.ts";
import type { AuditMetadata } from "../contracts/audit.ts";

function ensureIsoTimestamp(value: string, label: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid ISO timestamp`);
  }

  return new Date(parsed).toISOString();
}

export function createAuditMetadata(input: {
  createdBy: string;
  createdByType: ActorType;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}): AuditMetadata {
  return {
    createdAt: ensureIsoTimestamp(input.createdAt ?? new Date().toISOString(), "createdAt"),
    createdBy: input.createdBy,
    createdByType: input.createdByType,
    updatedAt: input.updatedAt ? ensureIsoTimestamp(input.updatedAt, "updatedAt") : undefined,
    updatedBy: input.updatedBy,
    reviewedAt: input.reviewedAt ? ensureIsoTimestamp(input.reviewedAt, "reviewedAt") : undefined,
    reviewedBy: input.reviewedBy,
  };
}
