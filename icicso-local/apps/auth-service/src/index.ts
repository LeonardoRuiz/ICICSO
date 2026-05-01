import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import { authSessionSchema, loginRequestSchema } from "@icicso/contracts";
import { getAuthUserByEmail, hashPassword } from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("auth-service", 3101);
const logger = createLogger("auth-service");

function sendJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, statusCode: number, message: string, correlationId: string) {
  sendJson(response, statusCode, { message }, correlationId);
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", config.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expected = createHmac("sha256", config.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeAudit(eventType: "login", payload: Record<string, unknown>, correlationId: string, actorId?: string, actorEmail?: string) {
  try {
    await fetch(`${config.urls.audit}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      body: JSON.stringify({
        eventType,
        actorId: actorId ?? null,
        actorEmail: actorEmail ?? null,
        targetCaseId: null,
        correlationId,
        payload,
      }),
    });
  } catch (error) {
    logger.warn("audit-write-failed", {
      correlationId,
      error: error instanceof Error ? error.message : "unknown-error",
    });
  }
}

function getBearerToken(request: IncomingMessage) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

const server = createServer(async (request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
  });

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(
      response,
      200,
      {
        service: "auth-service",
        status: "ok",
        port: config.port,
        timestamp: new Date().toISOString(),
      },
      correlationId,
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/login") {
    try {
      const parsed = loginRequestSchema.parse(await readJsonBody(request));
      const user = getAuthUserByEmail(parsed.email);

      if (!user || !user.isActive || user.passwordHash !== hashPassword(parsed.password)) {
        sendError(response, 401, "Credenciales invalidas", correlationId);
        return;
      }

      const session = authSessionSchema.parse({
        token: signJwt({
          sub: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        }),
        user: {
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });

      await writeAudit(
        "login",
        { role: user.role, service: "auth-service" },
        correlationId,
        user.userId,
        user.email,
      );

      sendJson(response, 200, session, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/me") {
    const token = getBearerToken(request);
    if (!token) {
      sendError(response, 401, "Falta token bearer", correlationId);
      return;
    }

    const payload = verifyJwt(token);
    if (!payload) {
      sendError(response, 401, "Token invalido", correlationId);
      return;
    }

    sendJson(
      response,
      200,
      {
        userId: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
      },
      correlationId,
    );
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
