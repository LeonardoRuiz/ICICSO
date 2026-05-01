import { architectureMap } from "./data/architectureMap.js";
import { documentAuditFeed } from "./data/documentAuditFeed.generated.js";
import { documentIngestionFeed } from "./data/documentIngestionFeed.generated.js";
import { gclLedgerFeed } from "./data/gclLedgerFeed.generated.js";
import { implementedSlice } from "./data/implementedSlice.data.js";

const ingestionFeedNode = document.getElementById("ingestion-feed");
const gclFeedNode = document.getElementById("gcl-feed");
const summary = document.getElementById("summary");
const counts = document.getElementById("status-counts");
const implementedSliceNode = document.getElementById("implemented-slice");
const body = document.getElementById("architecture-body");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value, fallback = "-") {
  const text = value == null || value === "" ? fallback : String(value);
  return escapeHtml(text);
}

function safeToken(value, fallback = "unknown") {
  const token = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return token || fallback;
}

function safePreformattedJson(value) {
  return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function extractLevel(value) {
  const match = String(value || "").match(/L(\d{1,2})/i);
  return match ? `L${match[1]}` : null;
}

function levelClass(value) {
  const level = extractLevel(value);
  return level ? `l${level.slice(1)}` : "";
}

function renderRiskList(risks) {
  if (!risks.length) {
    return "<li>Sin riesgos estructurales declarados</li>";
  }

  return risks
    .map(
      (risk) =>
        `<li><strong>${safeText(risk.title)}</strong> (${safeText(risk.severity)}): ${safeText(risk.note)}</li>`,
    )
    .join("");
}

function renderRepoPaths(repoPaths) {
  return repoPaths
    .map((reference) => safeText(reference.path))
    .join(", ");
}

function formatUtc(value) {
  if (!value) return "pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function toFileHref(absolutePath) {
  if (!absolutePath) return null;
  return `file:///${String(absolutePath).replace(/\\/g, "/")}`;
}

function resolveGovernanceDocument(record) {
  if (record.source_absolute_path) {
    return {
      documentId: record.source_document_id || record.affected_entities?.[0] || null,
      fileName: record.source_file_name || "Documento fuente",
      absolutePath: record.source_absolute_path,
      relativePath: record.source_relative_path || "",
    };
  }

  const candidateIds = [
    record.source_document_id,
    ...(record.affected_entities || []),
  ].filter(Boolean);
  const fallback = (documentIngestionFeed.latest_documents || []).find((document) => {
    return candidateIds.includes(document.document_id) || (record.vrn && document.vrn === record.vrn);
  });

  if (!fallback) return null;
  return {
    documentId: fallback.document_id,
    fileName: fallback.file_name,
    absolutePath: fallback.absolute_path,
    relativePath: fallback.relative_path,
  };
}

function resolveAuditReport(record) {
  const candidateIds = [
    record.source_document_id,
    ...(record.affected_entities || []),
  ].filter(Boolean);
  return (documentAuditFeed.reports || []).find((report) => candidateIds.includes(report.document_id)) || null;
}

function renderAuditReport(report) {
  const governanceItems = (report.governance_records || [])
    .map(
      (item) =>
        `<li>${safeText(item.record_type)} · ${safeText(item.governance_record_id)} · ${safeText(item.description)}</li>`,
    )
    .join("");
  const eventItems = (report.events || [])
    .map((event) => {
      const payload = Object.keys(event.payload || {}).length
        ? safePreformattedJson(event.payload)
        : "";
      return `
        <li>
          <strong>${safeText(event.event_type)}</strong> · ${safeText(formatUtc(event.created_at), "pending")}<br>
          <span>${safeText(event.summary)}</span>
          ${payload}
        </li>
      `;
    })
    .join("");
  const warningItems = (report.warnings || [])
    .map((warning) => `<li>${safeText(warning)}</li>`)
    .join("");
  const candidateAuditMap = (report.eo_candidate_audits || []).reduce((accumulator, audit) => {
    const bucket = accumulator.get(audit.candidate_id) || [];
    bucket.push(audit);
    accumulator.set(audit.candidate_id, bucket);
    return accumulator;
  }, new Map());
  const candidateItems = (report.eo_candidates || [])
    .map((candidate) => {
      const audits = candidateAuditMap.get(candidate.candidate_id) || [];
      const auditHtml = audits.length
        ? `<ul>${
            audits
              .map(
                (audit) =>
                  `<li>${safeText(audit.audit_kind)} · ${safeText(audit.decision)} · ${safeText(audit.signed_by)} · ${safeText(formatUtc(audit.signed_at))}</li>`,
              )
              .join("")
          }</ul>`
        : "<div class=\"slice-path\">Sin auditorias registradas</div>";
      return `
        <li>
          <strong>${safeText(candidate.statement_key)}</strong>
          <div>${safeText(candidate.statement_text)}</div>
          <div class="status-counts" style="margin-top:8px;">
            <span class="chip chip-${safeToken(candidate.completion_level, "l1_structured")}">${safeText(candidate.completion_level)}</span>
            <span class="chip chip-${safeToken(candidate.review_state, "pending")}">${safeText(candidate.review_state)}</span>
            <span class="chip chip-${safeToken(candidate.finalization_status, "candidate")}">${safeText(candidate.finalization_status)}</span>
          </div>
          <div class="slice-path">clinical: ${safeText(candidate.clinical_audit_state)} · surgical: ${safeText(candidate.surgical_audit_state)} · strength: ${safeText(candidate.evidence_strength)}</div>
          ${candidate.source_excerpt ? `<div class="slice-path">${safeText(candidate.source_excerpt)}</div>` : ""}
          ${auditHtml}
        </li>
      `;
    })
    .join("");

  return `
    <div class="gcl-audit-panel" hidden>
      <div class="gcl-audit-grid">
        <div>
          <strong>Documento</strong>
          <div class="slice-path">${safeText(report.file_name || report.document_id)}</div>
        </div>
        <div>
          <strong>SQLite</strong>
          <div class="slice-path">${safeText(report.database_path)}</div>
        </div>
        <div>
          <strong>Artefactos</strong>
          <div class="slice-path">ING ${safeText(report.materialized_artifacts.ingest_artifact_id)}</div>
          <div class="slice-path">SER ${safeText(report.materialized_artifacts.ser_artifact_id)}</div>
          <div class="slice-path">EO ${safeText(report.materialized_artifacts.eo_artifact_id)}</div>
          <div class="slice-path">EL ${safeText(report.materialized_artifacts.el_artifact_id)}</div>
        </div>
      </div>
      ${warningItems ? `<div class="gcl-audit-warnings"><strong>Alertas</strong><ul>${warningItems}</ul></div>` : ""}
      <div class="gcl-audit-section">
        <strong>Governance</strong>
        <ul>${governanceItems || "<li>Sin governance records vinculados</li>"}</ul>
      </div>
      <div class="gcl-audit-section">
        <strong>EO Candidates</strong>
        <ul>${candidateItems || "<li>Sin EO candidates materializados</li>"}</ul>
      </div>
      <div class="gcl-audit-section">
        <strong>Timeline</strong>
        <ul>${eventItems || "<li>Sin eventos auditables</li>"}</ul>
      </div>
    </div>
  `;
}

const totals = architectureMap.reduce((accumulator, layer) => {
  accumulator[layer.maturity] = (accumulator[layer.maturity] ?? 0) + 1;
  return accumulator;
}, {});

summary.textContent = `${architectureMap.length} capas ICICSO auditadas en el canon \`icicso/\`.`;
counts.innerHTML = ["implemented", "partial", "mock", "planned", "missing"]
  .map((status) => `<span class="chip chip-${safeToken(status)}">${escapeHtml(status)}: ${totals[status] ?? 0}</span>`)
  .join("");

if (ingestionFeedNode) {
  const latestDocuments = documentIngestionFeed.latest_documents ?? [];
  const layers = Object.entries(documentIngestionFeed.layers ?? {});
  const vrnStatusTotals = latestDocuments.reduce((accumulator, document) => {
    const status = (document.vrn_status || "PENDING").toLowerCase();
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});
  ingestionFeedNode.innerHTML = `
    <article class="feed-card">
      <header class="feed-header">
        <div>
          <p class="module-layer">workspace ingestion feed</p>
          <h2>ING operativo compartido</h2>
        </div>
        <span class="status status-implemented">uploaded: ${documentIngestionFeed.uploaded_documents ?? 0}</span>
      </header>
      <p class="feed-summary">
        La consola de ingesta deja un feed sincronizado para runtime, dashboard y emulador. Es la base para aplicar VRN, SER y trazabilidad posterior.
      </p>
      <div class="feed-metrics">
        <div><strong>${documentIngestionFeed.continuum_ready_documents ?? 0}</strong><span>continuum-ready</span></div>
        <div><strong>${layers.length}</strong><span>layers activas</span></div>
        <div><strong>${safeText(documentIngestionFeed.generated_at_utc, "pending")}</strong><span>última sync</span></div>
      </div>
      <div class="status-counts">
        ${["active", "pending", "sunset"]
          .map(
            (status) =>
              `<span class="chip chip-${safeToken(status)}">${escapeHtml(status)}: ${vrnStatusTotals[status] ?? 0}</span>`,
          )
          .join("")}
      </div>
      <div class="status-counts" style="margin: 0 0 12px;">
        <button class="quick-link" data-vrn-filter="all">Ver todos</button>
        <button class="quick-link" data-vrn-filter="active">Solo ACTIVE</button>
        <button class="quick-link" data-vrn-filter="pending">Solo PENDING</button>
        <button class="quick-link" data-vrn-filter="sunset">Solo SUNSET</button>
      </div>
      <div class="feed-table-shell">
        <div class="feed-table-scroll">
          <table class="feed-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>VRN</th>
                <th>Clasificación</th>
                <th>Estado</th>
                <th>Tamaño</th>
                <th>Sync</th>
              </tr>
            </thead>
            <tbody>
        ${latestDocuments.length
          ? latestDocuments
              .map((document) => {
                const docLevel = extractLevel(document.vrn || document.continuum_stage);
                const docClass = levelClass(document.vrn || document.continuum_stage);
                const vrnStatus = safeToken(document.vrn_status || "PENDING", "pending");
                return `
                  <tr class="feed-document-row ${escapeHtml(docClass)}" data-vrn-status="${vrnStatus}" ${docLevel ? `data-level="${escapeHtml(docLevel)}"` : ""}>
                    <td>
                      <div class="feed-doc-main">
                        <div class="feed-doc-title">${safeText(document.file_name)}</div>
                        <div class="feed-doc-path">${safeText(document.relative_path)}</div>
                      </div>
                    </td>
                    <td>
                      <div class="feed-cell-stack">
                        <strong>${safeText(document.vrn, "pending")}</strong>
                        <span class="chip chip-implemented">${safeText(document.continuum_stage, "ING")}</span>
                      </div>
                    </td>
                    <td>
                      <div class="feed-cell-stack">
                        <strong>${safeText(document.specialty)}</strong>
                        <span>${safeText(document.sub_specialty)}</span>
                        <span>${safeText(document.epidemic_focus, "N/A")}</span>
                      </div>
                    </td>
                    <td>
                      <div class="feed-cell-stack">
                        <span class="chip chip-${vrnStatus}">${safeText(document.vrn_status, "PENDING")}</span>
                        <span>${safeText(document.source_origin)}</span>
                        <span>${safeText(document.ingestion_notes, "Sin notas operativas registradas.")}</span>
                      </div>
                    </td>
                    <td>
                      <div class="feed-cell-stack">
                        <strong>${safeText(formatBytes(document.size_bytes))}</strong>
                        <span>${safeText(document.language)}</span>
                        <span>${safeText(document.extension)}</span>
                      </div>
                    </td>
                    <td>
                      <div class="feed-cell-stack">
                        <strong>${safeText(formatUtc(document.ingestion_timestamp_utc), "pending")}</strong>
                        <span>${safeText(document.document_id)}</span>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")
          : `<tr class="feed-document-row is-empty">
              <td colspan="6">
                <div class="feed-empty-state">
                  <h3>Sin documentos sincronizados</h3>
                  <p>La primera ingesta aparecerá aquí cuando se registre desde la consola HTML.</p>
                  <div class="slice-path">dashboard/document-ingestion.html</div>
                </div>
              </td>
            </tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  `;

  const filterButtons = ingestionFeedNode.querySelectorAll("[data-vrn-filter]");
  const rows = ingestionFeedNode.querySelectorAll(".feed-document-row");
  filterButtons[0]?.classList.add("is-active");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-vrn-filter") || "all";
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      rows.forEach((card) => {
        if (card.classList.contains("is-empty")) return;
        const status = card.getAttribute("data-vrn-status") || "pending";
        const show = filter === "all" || status === filter;
        card.style.display = show ? "table-row" : "none";
      });
    });
  });
}

if (gclFeedNode) {
  const records = gclLedgerFeed.records ?? [];
  const activeRecords = records.filter((record) => record.record_type === "CR" || record.record_type === "GCA");
  gclFeedNode.innerHTML = `
    <article class="gcl-card">
      <header class="gcl-header">
        <div>
          <p class="module-layer">GCL governance ledger</p>
          <h2>VRN activos y gobernanza</h2>
        </div>
        <span class="status status-implemented">records: ${gclLedgerFeed.total_records ?? 0}</span>
      </header>
      <p class="gcl-summary">
        Ledger GCL sincronizado desde el backend. Marca los VRN activos y la gobernanza aplicada a los artefactos del continuum.
      </p>
      <div class="gcl-metrics">
        <div><strong>${gclLedgerFeed.active_vrn_count ?? 0}</strong><span>VRN activos</span></div>
        <div><strong>${activeRecords.length}</strong><span>records ACTIVE</span></div>
        <div><strong>${safeText(gclLedgerFeed.generated_at_utc, "pending")}</strong><span>última sync</span></div>
      </div>
      <div class="status-counts" style="margin: 0 0 12px;">
        <button class="quick-link" data-gcl-filter="active">Solo ACTIVE</button>
        <button class="quick-link" data-gcl-filter="all">Ver todos</button>
      </div>
      <div class="gcl-records">
        ${activeRecords.length
          ? activeRecords
              .map((record) => {
                const recordLevel = extractLevel(record.vrn);
                const recordClass = levelClass(record.vrn);
                const severityToken = safeToken(record.severity);
                const isActive = record.record_type === "CR" || record.record_type === "GCA";
                return `
                  <article class="gcl-record ${escapeHtml(recordClass)}" data-gcl-active="${isActive}" ${recordLevel ? `data-level="${escapeHtml(recordLevel)}"` : ""}>
                    <div class="slice-stage-top">
                      <strong>${safeText(record.record_type)}</strong>
                      <span class="chip chip-${severityToken}">${safeText(record.severity)}</span>
                    </div>
                    <h3>${safeText(record.governance_record_id)}</h3>
                    <p>${safeText(record.description)}</p>
                    <div class="slice-path">${safeText(record.vrn)}</div>
                    ${(() => {
                      const sourceDocument = resolveGovernanceDocument(record);
                      const auditReport = resolveAuditReport(record);
                      if (!sourceDocument) {
                        return `
                          ${auditReport ? renderAuditReport(auditReport) : ""}
                          <div class="gcl-actions">
                            ${auditReport?.audit_status === "orphaned" ? `<span class="chip chip-orphaned">ORPHANED</span>` : ""}
                            ${auditReport ? `<button class="quick-link" data-audit-toggle="${auditReport.document_id}">Ver reporte</button>` : ""}
                            <span class="chip chip-missing">Sin documento disponible</span>
                          </div>
                        `;
                      }
                      return `
                        <div class="gcl-source-meta">
                          <strong>${safeText(sourceDocument.fileName)}</strong>
                          <div class="slice-path">${safeText(sourceDocument.relativePath || sourceDocument.documentId, "Documento fuente")}</div>
                        </div>
                        <div class="gcl-actions">
                          ${auditReport?.audit_status === "orphaned" ? `<span class="chip chip-orphaned">ORPHANED</span>` : ""}
                          <a class="quick-link" href="${escapeHtml(toFileHref(sourceDocument.absolutePath) || "#")}" target="_blank" rel="noopener noreferrer">Ver documento</a>
                          ${auditReport ? `<button class="quick-link" data-audit-toggle="${escapeHtml(auditReport.document_id)}">Ver reporte</button>` : ""}
                        </div>
                        ${auditReport ? renderAuditReport(auditReport) : ""}
                      `;
                    })()}
                  </article>
                `;
              })
              .join("")
          : `<article class="gcl-record">
              <h3>Sin governance records</h3>
              <p>El ledger se llenará cuando registres GCL desde la consola de ingesta.</p>
              <div class="slice-path">dashboard/document-ingestion.html</div>
            </article>`}
      </div>
    </article>
  `;

  const gclButtons = gclFeedNode.querySelectorAll("[data-gcl-filter]");
  const gclCards = gclFeedNode.querySelectorAll(".gcl-record");
  const auditButtons = gclFeedNode.querySelectorAll("[data-audit-toggle]");
  gclButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-gcl-filter") || "active";
      gclButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      gclCards.forEach((card) => {
        const isActive = card.getAttribute("data-gcl-active") === "true";
        const show = filter === "all" || isActive;
        card.style.display = show ? "block" : "none";
      });
    });
  });

  const defaultActive = gclFeedNode.querySelector("[data-gcl-filter='active']");
  if (defaultActive) {
    defaultActive.classList.add("is-active");
  }

  auditButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest(".gcl-record")?.querySelector(".gcl-audit-panel");
      if (!panel) return;
      const nextHidden = panel.hasAttribute("hidden") ? false : true;
      if (nextHidden) {
        panel.setAttribute("hidden", "");
        button.textContent = "Ver reporte";
      } else {
        panel.removeAttribute("hidden");
        button.textContent = "Ocultar reporte";
      }
    });
  });
}

if (implementedSliceNode) {
  implementedSliceNode.innerHTML = `
    <article class="slice-card">
      <header class="slice-header">
        <div>
          <p class="module-layer">implemented</p>
          <h2>${safeText(implementedSlice.title)}</h2>
        </div>
        <span class="status status-implemented">ING -> SER -> EO -> EL</span>
      </header>
      <p class="slice-summary">${safeText(implementedSlice.summary)}</p>
      <div class="slice-ribbon">
        ${implementedSlice.stages
          .map(
            (stage) => `
              <article class="slice-stage">
                <div class="slice-stage-top">
                  <strong>${safeText(stage.code)}</strong>
                  <span class="chip chip-${safeToken(stage.status)}">${safeText(stage.status)}</span>
                </div>
                <h3>${safeText(stage.name)}</h3>
                <p>${safeText(stage.detail)}</p>
                <div class="slice-path">${safeText(stage.path)}</div>
              </article>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

body.innerHTML = architectureMap
  .map(
    (layer) => `
      <article class="module-card ${escapeHtml(levelClass(layer.id))}" ${extractLevel(layer.id) ? `data-level="${escapeHtml(extractLevel(layer.id))}"` : ""}>
        <header class="module-card-header">
          <div>
            <p class="module-layer">${safeText(layer.stage)}</p>
            <h2>${safeText(layer.name)}</h2>
          </div>
          <span class="status status-${safeToken(layer.maturity)}">${safeText(layer.maturity)}</span>
        </header>
        <p class="module-definition">${safeText(layer.description)}</p>
        <dl class="module-meta">
          <div><dt>Layer ID</dt><dd>${safeText(layer.id)}</dd></div>
          <div><dt>Repo Paths</dt><dd>${renderRepoPaths(layer.repoPaths)}</dd></div>
          <div><dt>Inputs</dt><dd>${safeText(layer.inputs.join(", "), "none")}</dd></div>
          <div><dt>Outputs</dt><dd>${safeText(layer.outputs.join(", "), "none")}</dd></div>
        </dl>
        <div class="module-panels">
          <section>
            <h3>Dependencies</h3>
            <ul>${layer.dependencies.map((dependency) => `<li>${safeText(dependency.id)}: ${safeText(dependency.reason)}</li>`).join("") || "<li>none</li>"}</ul>
          </section>
          <section>
            <h3>Risks</h3>
            <ul>${renderRiskList(layer.risks)}</ul>
          </section>
        </div>
      </article>
    `,
  )
  .join("");
