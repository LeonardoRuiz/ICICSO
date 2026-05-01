import "./styles.css";

interface TraceLayer {
  order: number;
  id: string;
  name: string;
  status: string;
  message: string;
  blockers: string[];
  metrics: Record<string, unknown>;
  critical: boolean;
}

interface TraceFile {
  runId: string;
  generatedAt: string;
  case: {
    caseId: string;
    episodeId: string;
    label: string;
    displayCase: string;
  };
  pipeline: TraceLayer[];
}

interface RunFile {
  runId: string;
  generatedAt: string;
  ok: boolean;
  case: {
    caseId: string;
    episodeId: string;
    label: string;
    displayCase: string;
  };
  layers: TraceLayer[];
  artifacts: Record<string, unknown>;
  summary: string;
}

interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
  tone: "ready" | "blocked" | "neutral";
}

const app = document.querySelector<HTMLElement>("#app");

const groups = [
  { title: "Governance", ids: ["IGL", "TG"] },
  { title: "Evidence", ids: ["EL", "ETE", "EUL", "GHL"] },
  { title: "Operative", ids: ["KBOL", "RO", "BOM", "TAM"] },
  { title: "Execution", ids: ["EVT", "RDY-G", "LCCB", "CCCL"] },
  { title: "Downstream", ids: ["SRM", "CQOI", "CML"] },
];

async function loadJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusTone(status: string): "ready" | "blocked" | "neutral" {
  if (status.includes("BLOCKED")) return "blocked";
  if (status.includes("PASS") || status.includes("READY") || status.includes("GO") || status.includes("ACTIVE") || status.includes("COMPLETE")) {
    return "ready";
  }
  return "neutral";
}

function layerById(trace: TraceFile, id: string): TraceLayer | undefined {
  return trace.pipeline.find((layer) => layer.id === id);
}

function artifactValue<T extends object>(run: RunFile, key: string): T | undefined {
  return run.artifacts[key] as T | undefined;
}

function compactValue(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (value === null || value === undefined) return "NA";
  if (Array.isArray(value)) return `${value.length}`;
  if (typeof value === "object") return "OBJECT";
  return String(value);
}

function renderMetric(metric: DashboardMetric): string {
  return `
    <li class="metric ${metric.tone}">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <small>${escapeHtml(metric.hint)}</small>
    </li>
  `;
}

function renderLayerNode(layer: TraceLayer): string {
  return `
    <li class="layer-node ${statusTone(layer.status)}">
      <span class="layer-index">${layer.order.toString().padStart(2, "0")}</span>
      <div>
        <strong>${escapeHtml(layer.id)}</strong>
        <small>${escapeHtml(layer.status)}</small>
      </div>
    </li>
  `;
}

function renderGroup(trace: TraceFile, title: string, ids: string[]): string {
  const layers = ids.map((id) => layerById(trace, id)).filter((layer): layer is TraceLayer => Boolean(layer));

  return `
    <section class="group">
      <header>
        <h3>${escapeHtml(title)}</h3>
        <span>${layers.filter((layer) => !layer.critical).length}/${layers.length}</span>
      </header>
      <ol>${layers.map(renderLayerNode).join("")}</ol>
    </section>
  `;
}

function renderTraceRow(layer: TraceLayer): string {
  const blockers = layer.blockers.length > 0 ? layer.blockers.join(", ") : "None";
  const metrics = Object.entries(layer.metrics)
    .slice(0, 4)
    .map(([key, value]) => `<span><b>${escapeHtml(key)}</b>${escapeHtml(compactValue(value))}</span>`)
    .join("");

  return `
    <tr>
      <td>${layer.order}</td>
      <td><strong>${escapeHtml(layer.id)}</strong><small>${escapeHtml(layer.name)}</small></td>
      <td><span class="pill ${statusTone(layer.status)}">${escapeHtml(layer.status)}</span></td>
      <td>${escapeHtml(layer.message)}</td>
      <td class="mini-metrics">${metrics}</td>
      <td>${escapeHtml(blockers)}</td>
    </tr>
  `;
}

function renderArtifacts(run: RunFile): string {
  const artifactRows = [
    ["Evidence Lake", "evidenceLake", "SER / EO / ICDR"],
    ["ETE", "ete", "ECS / UCI / MAC"],
    ["EUL", "eul", "Uncertainty level"],
    ["GHL", "ghl", "Guideline package"],
    ["KBOL", "kbol", "CPO"],
    ["RO", "runbook", "Actor runbook"],
    ["BOM", "bom", "Materials readiness"],
    ["TAM", "tam", "Phases 0-6"],
    ["EVT", "evt", "Structured triggers"],
    ["RDY-G", "rdyg", "Readiness gate"],
    ["CCCL", "cccl", "State machine + ESL"],
    ["SRM", "srm", "Advisory risk"],
    ["CQOI", "cqoi", "Post-closure quality"],
    ["CML", "cml", "Commercial isolation"],
  ];

  return artifactRows
    .map(([name, key, purpose]) => {
      const exists = Boolean(run.artifacts[key]);
      return `
        <li class="${exists ? "ready" : "blocked"}">
          <strong>${escapeHtml(name)}</strong>
          <span>${exists ? "GENERATED" : "MISSING"}</span>
          <small>${escapeHtml(purpose)}</small>
        </li>
      `;
    })
    .join("");
}

function render(run: RunFile, trace: TraceFile): string {
  const ete = artifactValue<{ ecs?: number; uci?: number; mac?: { applicable?: number; conditional?: number; indeterminate?: number } }>(run, "ete");
  const eul = artifactValue<{ level?: string; rationale?: string }>(run, "eul");
  const evt = artifactValue<{ criticalActive?: number; triggers?: unknown[] }>(run, "evt");
  const rdyg = artifactValue<{ gateId?: string; decision?: string }>(run, "rdyg");
  const cccl = artifactValue<{ status?: string; from?: string; to?: string; stcId?: string; esl?: unknown }>(run, "cccl");
  const cml = artifactValue<{ status?: string }>(run, "cml");
  const ghl = artifactValue<{ guidelinePackageId?: string }>(run, "ghl");
  const raw = JSON.stringify({ run, trace }, null, 2);
  const blocked = trace.pipeline.filter((layer) => layer.critical || layer.status.includes("BLOCKED"));

  const metrics: DashboardMetric[] = [
    { label: "Engine", value: run.ok ? "OK" : "BLOCKED", hint: "Local, no tokens", tone: run.ok ? "ready" : "blocked" },
    { label: "ECS", value: ete?.ecs?.toFixed(1) ?? "NA", hint: "Evidence confidence", tone: "ready" },
    { label: "UCI", value: ete?.uci?.toFixed(2) ?? "NA", hint: "Uncertainty index", tone: "neutral" },
    { label: "EUL", value: eul?.level ?? "NA", hint: eul?.rationale ?? "Uncertainty level", tone: statusTone(eul?.level ?? "") },
    { label: "RDY-G", value: `${rdyg?.gateId ?? "NA"} ${rdyg?.decision ?? ""}`.trim(), hint: "Readiness gate", tone: rdyg?.decision === "GO" ? "ready" : "blocked" },
    { label: "EVT Critical", value: String(evt?.criticalActive ?? 0), hint: "Active critical triggers", tone: (evt?.criticalActive ?? 0) === 0 ? "ready" : "blocked" },
    { label: "CCCL", value: cccl?.status ?? "NA", hint: `${cccl?.from ?? "NA"} -> ${cccl?.to ?? "NA"}`, tone: statusTone(cccl?.status ?? "") },
    { label: "CML", value: cml?.status ?? "NA", hint: "Blocked until Closed", tone: statusTone(cml?.status ?? "") },
  ];

  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span>IC</span>
          <div>
            <strong>ICICSO</strong>
            <small>Local Construction Console</small>
          </div>
        </div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#gates">Gates</a>
          <a href="#artifacts">Artifacts</a>
          <a href="#raw">Raw JSON</a>
        </nav>
        <div class="sidebar-note">
          <span>No LLM</span>
          <span>No APIs</span>
          <span>Fixtures only</span>
        </div>
      </aside>

      <main class="workspace">
        <header class="topbar" id="overview">
          <div>
            <p class="eyebrow">Current fixture</p>
            <h1>${escapeHtml(run.case.displayCase)}</h1>
            <p class="meta">${escapeHtml(run.case.caseId)} · ${escapeHtml(run.case.episodeId)} · ${escapeHtml(run.runId)}</p>
          </div>
          <div class="run-status ${run.ok ? "ready" : "blocked"}">
            <span>${run.ok ? "RUN PASS" : "RUN BLOCKED"}</span>
            <strong>${trace.pipeline.filter((layer) => !layer.critical).length}/${trace.pipeline.length}</strong>
          </div>
        </header>

        <ul class="metrics">${metrics.map(renderMetric).join("")}</ul>

        <section class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Construction map</p>
              <h2>ICICSO pipeline status</h2>
            </div>
            <span class="quiet">${blocked.length === 0 ? "No critical blockers" : `${blocked.length} blockers`}</span>
          </div>
          <div class="groups">${groups.map((group) => renderGroup(trace, group.title, group.ids)).join("")}</div>
        </section>

        <section class="panel" id="pipeline">
          <div class="section-head">
            <div>
              <p class="eyebrow">Trace</p>
              <h2>Layer-by-layer execution</h2>
            </div>
            <span class="quiet">${escapeHtml(trace.generatedAt)}</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Layer</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Metrics</th>
                  <th>Blockers</th>
                </tr>
              </thead>
              <tbody>${trace.pipeline.map(renderTraceRow).join("")}</tbody>
            </table>
          </div>
        </section>

        <section class="two-col" id="gates">
          <div class="panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Gates</p>
                <h2>Readiness & EVT</h2>
              </div>
              <span class="pill ${rdyg?.decision === "GO" ? "ready" : "blocked"}">${escapeHtml(rdyg?.decision ?? "NA")}</span>
            </div>
            <dl class="detail-list">
              <dt>Critical EVT</dt>
              <dd>${escapeHtml(evt?.criticalActive ?? 0)}</dd>
              <dt>Trigger count</dt>
              <dd>${escapeHtml(evt?.triggers?.length ?? 0)}</dd>
              <dt>Readiness gate</dt>
              <dd>${escapeHtml(`${rdyg?.gateId ?? "NA"} ${rdyg?.decision ?? "NA"}`)}</dd>
              <dt>Guideline package</dt>
              <dd>${escapeHtml(ghl?.guidelinePackageId ?? "NA")}</dd>
            </dl>
          </div>

          <div class="panel">
            <div class="section-head">
              <div>
                <p class="eyebrow">Case control</p>
                <h2>CCCL state machine</h2>
              </div>
              <span class="pill ${statusTone(cccl?.status ?? "")}">${escapeHtml(cccl?.status ?? "NA")}</span>
            </div>
            <div class="state-flow">
              <span>${escapeHtml(cccl?.from ?? "NA")}</span>
              <b>-></b>
              <span>${escapeHtml(cccl?.to ?? "NA")}</span>
            </div>
            <dl class="detail-list">
              <dt>STC</dt>
              <dd>${escapeHtml(cccl?.stcId ?? "NA")}</dd>
              <dt>ESL</dt>
              <dd>${cccl?.esl ? "GENERATED" : "NOT GENERATED"}</dd>
              <dt>CML</dt>
              <dd>${escapeHtml(cml?.status ?? "NA")}</dd>
            </dl>
          </div>
        </section>

        <section class="panel" id="artifacts">
          <div class="section-head">
            <div>
              <p class="eyebrow">Outputs</p>
              <h2>Generated artifacts</h2>
            </div>
            <span class="quiet">latest-run / latest-trace / latest-esl</span>
          </div>
          <ul class="artifact-grid">${renderArtifacts(run)}</ul>
        </section>

        <section class="panel" id="raw">
          <div class="section-head">
            <div>
              <p class="eyebrow">Source data</p>
              <h2>Raw JSON</h2>
            </div>
            <span class="quiet">Local files from /out</span>
          </div>
          <details>
            <summary>Open raw payload</summary>
            <pre>${escapeHtml(raw)}</pre>
          </details>
        </section>
      </main>
    </div>
  `;
}

async function main(): Promise<void> {
  if (!app) return;

  try {
    const [run, trace] = await Promise.all([loadJson<RunFile>("/out/latest-run.json"), loadJson<TraceFile>("/out/latest-trace.json")]);
    if (!run || !trace) {
      app.innerHTML = `
        <section class="empty">
          <h1>ICICSO Local Construction Console</h1>
          <p>No local output files found in <code>/out</code>.</p>
          <code>pnpm icicso:run</code>
        </section>
      `;
      return;
    }

    app.innerHTML = render(run, trace);
  } catch (error) {
    app.innerHTML = `
      <section class="empty">
        <h1>ICICSO Local Construction Console</h1>
        <p>${escapeHtml(error instanceof Error ? error.message : "Unknown viewer error")}</p>
      </section>
    `;
  }
}

void main();
