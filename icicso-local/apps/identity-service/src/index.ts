import { randomUUID } from "node:crypto";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import { createCaseSchema, createEpisodeSchema, createIdentitySchema } from "@icicso/contracts";
import { createCase, createEpisode, createIdentity, findIdentity, getCase } from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("identity-service", 3102);
const logger = createLogger("identity-service");

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

async function writeAudit(
  eventType: "create_case" | "read_case",
  payload: Record<string, unknown>,
  correlationId: string,
  targetCaseId: string,
) {
  try {
    await fetch(`${config.urls.audit}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      body: JSON.stringify({
        eventType,
        actorId: null,
        actorEmail: null,
        targetCaseId,
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
        service: "identity-service",
        status: "ok",
        port: config.port,
        timestamp: new Date().toISOString(),
      },
      correlationId,
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/identities") {
    try {
      const parsed = createIdentitySchema.parse(await readJsonBody(request));
      const created = createIdentity({
        ilcId: parsed.ilcId ?? `ILC-${randomUUID()}`,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        birthDate: parsed.birthDate,
        sex: parsed.sex,
      });

      sendJson(response, 201, created, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/episodes") {
    try {
      const parsed = createEpisodeSchema.parse(await readJsonBody(request));
      const identity = findIdentity(parsed.identityId, parsed.ilcId);

      if (!identity) {
        sendError(response, 404, "Identidad longitudinal no encontrada", correlationId);
        return;
      }

      const episode = createEpisode({
        identityId: identity.id,
        episodeId: parsed.episodeId ?? `EPI-${randomUUID()}`,
        episodeType: parsed.episodeType,
      });

      if (!episode) {
        sendError(response, 500, "No fue posible crear episodio", correlationId);
        return;
      }

      sendJson(response, 201, episode, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "POST" && url.pathname === "/cases") {
    try {
      const parsed = createCaseSchema.parse(await readJsonBody(request));
      const existingCase = createCase({
        episodeId: parsed.episodeId,
        caseId: parsed.caseId ?? `CASE-${randomUUID()}`,
        reason: parsed.reason,
        clinicalSummary: parsed.clinicalSummary ?? null,
        pathwayId: parsed.pathwayId ?? null,
      });

      if (!existingCase) {
        sendError(response, 404, "Episodio clinico no encontrado", correlationId);
        return;
      }

      await writeAudit(
        "create_case",
        {
          caseId: existingCase.caseId,
          episodeId: existingCase.episodes[0]?.episodeId ?? parsed.episodeId,
          ilcId: existingCase.longitudinalIdentity?.ilcId ?? null,
        },
        correlationId,
        existingCase.caseId,
      );

      sendJson(response, 201, existingCase, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === `/cases/${config.demoCaseId}`) {
    const clinicalCase = getCase(config.demoCaseId);

    if (!clinicalCase) {
      sendError(response, 404, "Caso demo no encontrado", correlationId);
      return;
    }

    await writeAudit(
      "read_case",
      {
        caseId: clinicalCase.caseId,
        source: "demo-case",
      },
      correlationId,
      clinicalCase.caseId,
    );

    sendJson(response, 200, clinicalCase, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/cases/")) {
    const caseId = decodeURIComponent(url.pathname.replace("/cases/", ""));
    const clinicalCase = getCase(caseId);

    if (!clinicalCase) {
      sendError(response, 404, "Caso clinico no encontrado", correlationId);
      return;
    }

    await writeAudit(
      "read_case",
      {
        caseId: clinicalCase.caseId,
        source: "lookup",
      },
      correlationId,
      clinicalCase.caseId,
    );

    sendJson(response, 200, clinicalCase, correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
