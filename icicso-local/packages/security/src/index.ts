import { createHmac, timingSafeEqual } from "node:crypto";
import { BASE_ROLES, type BaseRole } from "@icicso/canonical-types";

export type AuditEventType =
  | "login"
  | "login_failed"
  | "logout"
  | "create_case"
  | "read_case"
  | "document.ingested"
  | "access_denied"
  | "access_granted_sensitive"
  | "privileged_action"
  | "permission_changed"
  | "role_changed"
  | "backup_executed"
  | "restore_executed"
  | "config_changed";

export type PermissionAction = "read" | "write" | "admin" | "privileged";
export type HumanRole = BaseRole;

export interface AuthClaims {
  sub: string;
  email: string;
  fullName: string;
  role: BaseRole;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export interface RoutePolicy {
  id: string;
  methods: string[];
  pathPrefix: string;
  resource: string;
  action: PermissionAction;
  allowedRoles: BaseRole[];
  requiresAuth: boolean;
  auditMode: "none" | "sensitive" | "privileged";
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: "public" | "allowed" | "missing_token" | "invalid_token" | "expired_token" | "forbidden";
  policy: RoutePolicy | null;
}

const PUBLIC_READ_ROLES: BaseRole[] = ["admin", "devops", "operator", "clinician", "auditor", "governance"];
const PRIVILEGED_OPERATORS: BaseRole[] = ["admin", "devops", "operator"];
const CLINICAL_WRITERS: BaseRole[] = ["admin", "operator", "clinician"];
const AUDIT_READERS: BaseRole[] = ["admin", "devops", "auditor", "governance"];
const ADMIN_ONLY: BaseRole[] = ["admin"];

export const ROUTE_POLICIES: RoutePolicy[] = [
  {
    id: "auth-self",
    methods: ["GET", "POST"],
    pathPrefix: "/auth/me",
    resource: "session",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "none",
  },
  {
    id: "auth-logout",
    methods: ["POST"],
    pathPrefix: "/auth/logout",
    resource: "session",
    action: "write",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "block-overview",
    methods: ["GET"],
    pathPrefix: "/block",
    resource: "dashboard",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "identity-read",
    methods: ["GET"],
    pathPrefix: "/identity/cases/",
    resource: "clinical-case",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "identity-write",
    methods: ["POST"],
    pathPrefix: "/identity/",
    resource: "clinical-case",
    action: "write",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "audit-read",
    methods: ["GET"],
    pathPrefix: "/audit/",
    resource: "audit",
    action: "read",
    allowedRoles: AUDIT_READERS,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "ingestion-write",
    methods: ["POST"],
    pathPrefix: "/ingestion/",
    resource: "parser",
    action: "write",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "storage-read",
    methods: ["GET"],
    pathPrefix: "/storage/",
    resource: "documents",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "governance-read",
    methods: ["GET"],
    pathPrefix: "/governance/",
    resource: "governance",
    action: "read",
    allowedRoles: ["admin", "devops", "operator", "auditor", "governance"],
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "governance-write",
    methods: ["POST"],
    pathPrefix: "/governance/",
    resource: "governance",
    action: "write",
    allowedRoles: ["admin", "operator", "governance"],
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "engine-read",
    methods: ["GET"],
    pathPrefix: "/evidence-lake/",
    resource: "engine",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "guideline-write",
    methods: ["POST"],
    pathPrefix: "/ghl/",
    resource: "guidelines",
    action: "privileged",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "pathway-write",
    methods: ["POST"],
    pathPrefix: "/kbol/",
    resource: "pathway",
    action: "privileged",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "runbook-write",
    methods: ["POST"],
    pathPrefix: "/runbook/",
    resource: "runbook",
    action: "privileged",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "readiness-write",
    methods: ["POST"],
    pathPrefix: "/readiness/",
    resource: "readiness",
    action: "privileged",
    allowedRoles: CLINICAL_WRITERS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "case-control-write",
    methods: ["POST"],
    pathPrefix: "/case-control/",
    resource: "case-control",
    action: "privileged",
    allowedRoles: PRIVILEGED_OPERATORS,
    requiresAuth: true,
    auditMode: "privileged",
  },
  {
    id: "systemic-read",
    methods: ["GET"],
    pathPrefix: "/systemic-risk/",
    resource: "systemic-risk",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "cqoi-read",
    methods: ["GET"],
    pathPrefix: "/cqoi/",
    resource: "cqoi",
    action: "read",
    allowedRoles: PUBLIC_READ_ROLES,
    requiresAuth: true,
    auditMode: "sensitive",
  },
  {
    id: "infra-admin",
    methods: ["POST", "DELETE", "PATCH", "PUT"],
    pathPrefix: "/admin/",
    resource: "platform-admin",
    action: "admin",
    allowedRoles: ADMIN_ONLY,
    requiresAuth: true,
    auditMode: "privileged",
  },
];

export function getDefaultRoutePolicy(pathname: string, method: string): RoutePolicy | null {
  const normalizedMethod = method.toUpperCase();
  if (pathname.startsWith("/health") || pathname === "/metrics" || pathname === "/auth/login") {
    return null;
  }

  for (const policy of ROUTE_POLICIES) {
    if (policy.methods.includes(normalizedMethod) && pathname.startsWith(policy.pathPrefix)) {
      return policy;
    }
  }

  const authenticatedPrefixes = [
    "/auth/",
    "/identity/",
    "/audit/",
    "/storage/",
    "/ingestion/",
    "/terminology/",
    "/governance/",
    "/evidence-lake/",
    "/ghl/",
    "/kbol/",
    "/runbook/",
    "/readiness/",
    "/case-control/",
    "/systemic-risk/",
    "/cqoi/",
  ];
  if (authenticatedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return {
      id: "default-authenticated",
      methods: [normalizedMethod],
      pathPrefix: pathname,
      resource: "service-endpoint",
      action: normalizedMethod === "GET" ? "read" : "write",
      allowedRoles: PUBLIC_READ_ROLES,
      requiresAuth: true,
      auditMode: normalizedMethod === "GET" ? "sensitive" : "privileged",
    };
  }

  return null;
}

export function isKnownRole(value: string): value is BaseRole {
  return (BASE_ROLES as readonly string[]).includes(value);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function parseDuration(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Unsupported JWT_EXPIRES_IN format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const multiplier =
    unit === "s" ? 1
      : unit === "m" ? 60
        : unit === "h" ? 3600
          : 86400;
  return amount * multiplier;
}

export function signJwt(claims: AuthClaims, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function issueJwt(
  payload: Omit<AuthClaims, "iat" | "exp">,
  secret: string,
  expiresIn: string,
): { token: string; claims: AuthClaims } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + parseDuration(expiresIn);
  const claims: AuthClaims = {
    ...payload,
    iat,
    exp,
  };
  return {
    token: signJwt(claims, secret),
    claims,
  };
}

export function verifyJwt(token: string, secret: string, expectedIssuer: string, expectedAudience: string): AuthClaims | null {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AuthClaims>;
    if (!parsed.sub || !parsed.email || !parsed.fullName || !parsed.role || !parsed.iss || !parsed.aud || !parsed.iat || !parsed.exp) {
      return null;
    }
    if (!isKnownRole(parsed.role)) {
      return null;
    }
    if (parsed.iss !== expectedIssuer || parsed.aud !== expectedAudience) {
      return null;
    }
    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed as AuthClaims;
  } catch {
    return null;
  }
}

export function getBearerToken(headerValue?: string | null): string | null {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }
  return headerValue.slice("Bearer ".length);
}

export function isRoleAllowed(role: BaseRole, policy: RoutePolicy): boolean {
  return policy.allowedRoles.includes(role);
}

export function authorizeRequest(
  pathname: string,
  method: string,
  claims: AuthClaims | null,
): AuthorizationResult {
  const policy = getDefaultRoutePolicy(pathname, method);
  if (!policy) {
    return { allowed: true, reason: "public", policy: null };
  }
  if (!policy.requiresAuth) {
    return { allowed: true, reason: "public", policy };
  }
  if (!claims) {
    return { allowed: false, reason: "missing_token", policy };
  }
  if (!isRoleAllowed(claims.role, policy)) {
    return { allowed: false, reason: "forbidden", policy };
  }
  return { allowed: true, reason: "allowed", policy };
}

export function buildInternalServiceHeaders(serviceName: string, internalServiceToken: string) {
  return {
    "X-ICICSO-Service-Name": serviceName,
    "X-ICICSO-Service-Token": internalServiceToken,
  };
}

export function isTrustedInternalRequest(
  serviceName: string | null | undefined,
  providedToken: string | null | undefined,
  expectedToken: string,
  allowedServices: string[],
): boolean {
  if (!serviceName || !providedToken) {
    return false;
  }
  if (!allowedServices.includes(serviceName)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken));
}
