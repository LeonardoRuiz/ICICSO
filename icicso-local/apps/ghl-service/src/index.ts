import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  getGuidelineDomain,
  getGuidelinePackage,
  getNeutralityDeclaration,
  getSunsetPolicy,
  listGuidelineDomains,
  listGuidelinePackages,
  listPackageEoLinks,
  publishGuidelinePackage,
} from "@icicso/database";
import {
  ghlSummarySchema,
  guidelineDomainSchema,
  guidelinePackageSchema,
  neutralityDeclarationSchema,
  packageEoLinkSchema,
  sunsetPolicySchema,
} from "@icicso/contracts";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("ghl-service", 3105);
const logger = createLogger("ghl-service");

function sendJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Correlation-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, statusCode: number, message: string, correlationId: string) {
  sendJson(response, statusCode, { message }, correlationId);
}

function buildSummary(caseId: string) {
  const gp = publishGuidelinePackage(caseId);
  const domain = getGuidelineDomain("DOM-REVASC-CABG");
  if (!gp || !domain) {
    return null;
  }

  const packageEoLinks = listPackageEoLinks(gp.gpId);
  const eoGroups = [...new Set(packageEoLinks.map((item) => item.groupLabel))].map((groupLabel) => {
    const groupItems = packageEoLinks.filter((item) => item.groupLabel === groupLabel);
    return {
      groupLabel,
      eoIds: groupItems.map((item) => item.eoId),
      domains: [...new Set(groupItems.map((item) => item.domain))],
    };
  });

  return ghlSummarySchema.parse({
    domain: guidelineDomainSchema.parse(domain),
    guidelinePackage: guidelinePackageSchema.parse(gp),
    packageEoLinks: packageEoLinkSchema.array().parse(packageEoLinks),
    eoGroups,
    sunsetPolicy: sunsetPolicySchema.parse(getSunsetPolicy(gp.gpId)),
    neutralityDeclaration: neutralityDeclarationSchema.parse(getNeutralityDeclaration(gp.gpId)),
  });
}

const server = createServer((request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
  });

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {}, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      service: "ghl-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/domains") {
    sendJson(response, 200, guidelineDomainSchema.array().parse(listGuidelineDomains()), correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/packages/publish") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const published = publishGuidelinePackage(caseId);
    if (!published) {
      sendError(response, 404, "No fue posible publicar GP para el caso", correlationId);
      return;
    }

    sendJson(response, 201, guidelinePackageSchema.parse(published), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/domains/") && url.pathname.endsWith("/packages")) {
    const domainId = decodeURIComponent(url.pathname.replace("/domains/", "").replace("/packages", ""));
    sendJson(response, 200, guidelinePackageSchema.array().parse(listGuidelinePackages(domainId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/packages/")) {
    const gpId = decodeURIComponent(url.pathname.replace("/packages/", ""));
    const gp = getGuidelinePackage(gpId);
    if (!gp) {
      sendError(response, 404, "GP no encontrado", correlationId);
      return;
    }

    sendJson(response, 200, guidelinePackageSchema.parse(gp), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const summary = buildSummary(caseId);
    if (!summary) {
      sendError(response, 404, "Summary GHL no disponible", correlationId);
      return;
    }

    sendJson(response, 200, summary, correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
