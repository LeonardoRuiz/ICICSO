export const BASE_ROLES = ["admin", "devops", "operator", "clinician", "auditor", "governance"] as const;
export type BaseRole = (typeof BASE_ROLES)[number];

export const AUDIT_EVENT_TYPES = [
  "login",
  "login_failed",
  "logout",
  "create_case",
  "read_case",
  "document.ingested",
  "access_denied",
  "access_granted_sensitive",
  "privileged_action",
  "permission_changed",
  "role_changed",
  "backup_executed",
  "restore_executed",
  "config_changed",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type ServiceName = "gateway-api" | "auth-service" | "identity-service" | "audit-service";

export interface ServiceHealth {
  service: ServiceName;
  status: "ok" | "degraded" | "down";
  port: number;
  timestamp: string;
}

export interface AuthUserProfile {
  userId: string;
  email: string;
  fullName: string;
  role: BaseRole;
}

export interface AuthSession {
  token: string;
  user: AuthUserProfile;
}

export interface LongitudinalIdentityRecord {
  id: string;
  ilcId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  createdAt: string;
}

export interface ClinicalEpisodeRecord {
  id: string;
  episodeId: string;
  identityId: string;
  episodeType: string;
  status: string;
  startedAt: string;
}

export interface ClinicalCaseRecord {
  id: string;
  caseId: string;
  identityId: string;
  episodeId: string;
  status: string;
  reason: string | null;
  clinicalSummary: string | null;
  pathwayId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEventRecord {
  id: string;
  auditEventId: string;
  eventType: AuditEventType;
  actorId: string | null;
  actorEmail: string | null;
  targetCaseId: string | null;
  correlationId: string;
  hash: string;
  previousHash: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Block1Overview {
  services: ServiceHealth[];
  demoCase: {
    ilcId: string;
    episodeId: string;
    caseId: string;
    reason: string | null;
    clinicalSummary: string | null;
    status: string;
  } | null;
  auditTimeline: AuditEventRecord[];
}
