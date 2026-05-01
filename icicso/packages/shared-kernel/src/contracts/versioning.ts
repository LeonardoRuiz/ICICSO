import type { HashMetadata } from "./hash.ts";
import type { AuditMetadata } from "./audit.ts";
import type { ProvenanceMetadata } from "./provenance.ts";
import type { TimestampedEntity } from "./common.ts";
import type { MaturityStatus } from "../enums/maturity.ts";
import type { VRN } from "../ids/types.ts";

export interface VersionedEntity<TId extends string = string> extends TimestampedEntity {
  id: TId;
  vrn: VRN;
  version: number;
}

export interface AppendOnlyRecord<TPayload = unknown> {
  sequence: number;
  previousHash: string | null;
  integrity: HashMetadata;
  payload: TPayload;
  appendedAt: string;
}

export interface VersionedArtifact<TPayload, TId extends string = string>
  extends VersionedEntity<TId> {
  payload: TPayload;
  audit: AuditMetadata;
  provenance: ProvenanceMetadata[];
  integrity: HashMetadata;
  maturity: MaturityStatus;
}
