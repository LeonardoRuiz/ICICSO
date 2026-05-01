import type { ActorType } from "../enums/events.ts";
import type { TimestampedEntity } from "./common.ts";

export interface AuditMetadata extends TimestampedEntity {
  createdBy: string;
  createdByType: ActorType;
  updatedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
