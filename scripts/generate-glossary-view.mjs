import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const glossaryMarkdownPath = resolve(repoRoot, "docs", "glossary.md");
const glossaryHtmlPath = resolve(repoRoot, "docs", "glossary.html");
const clinicalConceptsSearchPath = resolve(repoRoot, "docs", "generated", "clinical-concepts-search.json");

const FIELD_LABELS = new Map([
  ["Definición corta", "shortDefinition"],
  ["Definicion corta", "shortDefinition"],
  ["Definición larga", "longDefinition"],
  ["Definicion larga", "longDefinition"],
  ["Tipo", "type"],
  ["Fuente primaria", "primarySource"],
  ["Menciones", "mentions"],
  ["Relación médica/terminológica", "terminologyRelation"],
  ["Relacion medica/terminologica", "terminologyRelation"],
]);

function stripMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function categorize(entry) {
  const haystack = `${entry.section} ${entry.type} ${entry.title} ${entry.shortDefinition} ${entry.longDefinition}`.toLowerCase();

  if (
    haystack.includes("término médico") ||
    haystack.includes("termino medico") ||
    haystack.includes("médico") ||
    haystack.includes("medico") ||
    entry.section.toLowerCase().includes("médicos")
  ) {
    return "medical";
  }

  if (
    haystack.includes("governanza") ||
    haystack.includes("gobernanza") ||
    haystack.includes("versionado") ||
    haystack.includes("estado")
  ) {
    return "governance";
  }

  if (
    haystack.includes("artefacto") ||
    haystack.includes("evidencia") ||
    haystack.includes("entidad")
  ) {
    return "evidence";
  }

  return "technical";
}

function parseGlossaryMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];
  let section = "General";
  let current = null;

  function commit() {
    if (!current) {
      return;
    }
    current.searchText = stripMarkdown(
      [
        current.title,
        current.section,
        current.shortDefinition,
        current.longDefinition,
        current.type,
        current.primarySource,
        current.mentions,
        current.terminologyRelation,
      ].join(" "),
    ).toLowerCase();
    current.category = categorize(current);
    entries.push(current);
    current = null;
  }

  for (const line of lines) {
    const sectionMatch = /^##\s+(.+)$/.exec(line);
    if (sectionMatch) {
      commit();
      section = sectionMatch[1].trim();
      continue;
    }

    const entryMatch = /^###\s+(.+)$/.exec(line);
    if (entryMatch) {
      commit();
      current = {
        id: entryMatch[1]
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        title: entryMatch[1].trim(),
        section,
        shortDefinition: "",
        longDefinition: "",
        type: "",
        primarySource: "",
        mentions: "",
        terminologyRelation: "",
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const fieldMatch = /^-\s+\*\*([^:]+):\*\*\s*(.*)$/.exec(line);
    if (fieldMatch) {
      const key = FIELD_LABELS.get(fieldMatch[1].trim());
      if (key) {
        current[key] = fieldMatch[2].trim();
      }
    }
  }

  commit();
  return entries;
}

async function loadClinicalSummary() {
  try {
    const payload = JSON.parse(await readFile(clinicalConceptsSearchPath, "utf8"));
    const counts = payload.metadata?.counts ?? {};
    const byType = counts.bySemanticType ?? {};
    const byStatus = counts.byIcicsoStatus ?? {};
    const concepts = Array.isArray(payload.concepts) ? payload.concepts : [];

    function findConcept(predicate) {
      const concept = concepts.find(predicate);
      if (!concept) return null;
      return {
        label: concept.label,
        code: concept.code,
        semanticType: concept.semanticType,
        sourceSystem: concept.sourceSystem,
      };
    }

    return {
      available: true,
      generatedAt: payload.metadata?.generatedAt ?? "",
      conceptCount: payload.metadata?.conceptCount ?? concepts.length,
      diagnosisCount: byType.diagnosis ?? 0,
      procedureCount: byType.procedure ?? 0,
      eoCandidateCount: byType["eo-candidate"] ?? 0,
      routeReadyCount: byStatus["route-ready"] ?? 0,
      terminologyOnlyCount: byStatus["terminology-only"] ?? 0,
      examples: [
        findConcept((concept) => concept.code === "I21"),
        findConcept((concept) => concept.code === "I21.9"),
        findConcept((concept) => concept.code === "I63"),
        findConcept((concept) => concept.code === "H18.6"),
        findConcept((concept) => concept.label === "CABG" && concept.sourceSystem === "ICICSO_EO_ENGINE"),
      ].filter(Boolean),
    };
  } catch {
    return {
      available: false,
      generatedAt: "",
      conceptCount: 0,
      diagnosisCount: 0,
      procedureCount: 0,
      eoCandidateCount: 0,
      routeReadyCount: 0,
      terminologyOnlyCount: 0,
      examples: [],
    };
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-MX");
}

function escapeTemplate(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtml(entries, sourceMarkdown, clinicalSummary) {
  const generatedAt = new Date().toISOString();
  const data = {
    generatedAt,
    entries,
    sourceMarkdown,
  };

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Glosario ICICSO</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080a09;
      --panel: #111614;
      --panel-raised: #151b18;
      --panel-soft: #0d1110;
      --ink: #eff5ee;
      --muted: #9aa8a1;
      --line: #27312d;
      --green: #39d0b1;
      --green-strong: #8ef2d9;
      --blue: #8bb8ff;
      --amber: #f4c46b;
      --red: #ff8d7e;
      --purple: #c8a7ff;
      --shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background:
        linear-gradient(180deg, #0d1110 0%, #080a09 46%, #060807 100%);
      color: var(--ink);
    }

    a {
      color: var(--green-strong);
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    header {
      border-bottom: 1px solid var(--line);
      background: rgba(8, 10, 9, 0.9);
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(14px);
    }

    .header-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 18px 24px 16px;
      display: grid;
      gap: 14px;
    }

    .title-row {
      display: flex;
      gap: 16px;
      align-items: end;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.35rem, 2vw, 2.1rem);
      line-height: 1.05;
      letter-spacing: 0;
    }

    .meta {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 0.86rem;
      align-items: center;
    }

    .badge {
      border: 1px solid var(--line);
      background: #0f1412;
      border-radius: 999px;
      padding: 4px 9px;
      white-space: nowrap;
    }

    .badge.link-strong {
      color: var(--ink);
      background: #14362f;
      border-color: rgba(57, 208, 177, 0.62);
      text-decoration: none;
    }

    .controls {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto;
      gap: 12px;
      align-items: center;
    }

    .search-wrap {
      position: relative;
    }

    .search-wrap::before {
      content: "";
      position: absolute;
      left: 13px;
      top: 50%;
      width: 12px;
      height: 12px;
      border: 2px solid var(--muted);
      border-radius: 50%;
      transform: translateY(-58%);
    }

    .search-wrap::after {
      content: "";
      position: absolute;
      left: 24px;
      top: 53%;
      width: 7px;
      height: 2px;
      background: var(--muted);
      transform: rotate(45deg);
      transform-origin: left center;
    }

    input[type="search"] {
      width: 100%;
      height: 42px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0 14px 0 42px;
      color: var(--ink);
      background: #0d1210;
      font: inherit;
      outline: none;
    }

    input[type="search"]:focus {
      border-color: var(--green);
      box-shadow: 0 0 0 3px rgba(57, 208, 177, 0.15);
    }

    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    button.filter {
      border: 1px solid var(--line);
      background: #0d1210;
      color: var(--muted);
      height: 36px;
      border-radius: 8px;
      padding: 0 12px;
      font: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      white-space: nowrap;
    }

    button.filter[aria-pressed="true"] {
      background: #153d36;
      border-color: var(--green);
      color: var(--green-strong);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.8;
    }

    main {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 22px 24px 30px;
      display: grid;
      grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
      gap: 18px;
    }

    .knowledge-strip {
      max-width: 1440px;
      width: calc(100% - 48px);
      margin: 20px auto 0;
      border: 1px solid rgba(57, 208, 177, 0.3);
      background: linear-gradient(180deg, #13211d 0%, #0f1513 100%);
      border-radius: 8px;
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.9fr);
      gap: 18px;
      box-shadow: var(--shadow);
    }

    .knowledge-copy {
      min-width: 0;
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .eyebrow {
      color: var(--green-strong);
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .knowledge-copy h2 {
      margin: 0;
      font-size: clamp(1.3rem, 2.6vw, 2.4rem);
      line-height: 1.04;
      letter-spacing: 0;
    }

    .knowledge-copy p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
      max-width: 92ch;
    }

    .knowledge-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 4px;
    }

    .action-link {
      border: 1px solid var(--line);
      background: #0d1210;
      color: var(--ink);
      border-radius: 8px;
      min-height: 38px;
      padding: 9px 12px;
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }

    .action-link.primary {
      background: #153d36;
      border-color: var(--green);
      color: var(--green-strong);
      font-weight: 700;
    }

    .clinical-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }

    .clinical-metric {
      border: 1px solid var(--line);
      background: rgba(8, 10, 9, 0.48);
      border-radius: 8px;
      padding: 11px;
      min-width: 0;
    }

    .clinical-metric strong {
      display: block;
      font-size: 1.25rem;
      line-height: 1;
    }

    .clinical-metric span {
      display: block;
      color: var(--muted);
      font-size: 0.76rem;
      margin-top: 7px;
      text-transform: uppercase;
    }

    .clinical-examples {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 2px;
    }

    .clinical-example {
      border: 1px solid var(--line);
      color: var(--muted);
      background: #0d1210;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 0.78rem;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .results,
    .detail {
      min-height: calc(100vh - 160px);
    }

    .results {
      display: grid;
      align-content: start;
      gap: 10px;
    }

    .result-count {
      color: var(--muted);
      font-size: 0.88rem;
      padding: 0 2px 4px;
    }

    .entry-list {
      display: grid;
      gap: 8px;
    }

    .entry-button {
      text-align: left;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #131917 0%, #101512 100%);
      border-radius: 8px;
      padding: 12px 13px;
      cursor: pointer;
      box-shadow: none;
      transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }

    .entry-button:hover,
    .entry-button:focus-visible {
      border-color: rgba(57, 208, 177, 0.62);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.32);
      transform: translateY(-1px);
      outline: none;
    }

    .entry-button.active {
      border-color: var(--green);
      box-shadow: inset 3px 0 0 var(--green);
    }

    .entry-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 7px;
    }

    .entry-title strong {
      font-size: 1rem;
      line-height: 1.2;
    }

    .entry-button p {
      margin: 0;
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.92rem;
    }

    .category {
      font-size: 0.74rem;
      line-height: 1;
      border-radius: 999px;
      padding: 5px 8px;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .category.medical {
      color: var(--red);
      background: rgba(255, 141, 126, 0.12);
      border-color: rgba(255, 141, 126, 0.34);
    }

    .category.evidence {
      color: var(--green-strong);
      background: rgba(57, 208, 177, 0.12);
      border-color: rgba(57, 208, 177, 0.35);
    }

    .category.technical {
      color: var(--blue);
      background: rgba(139, 184, 255, 0.12);
      border-color: rgba(139, 184, 255, 0.35);
    }

    .category.governance {
      color: var(--amber);
      background: rgba(244, 196, 107, 0.12);
      border-color: rgba(244, 196, 107, 0.35);
    }

    .detail {
      position: sticky;
      top: 126px;
      align-self: start;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #151b18 0%, #101512 100%);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .detail-head {
      padding: 22px 24px 18px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #18211d 0%, #111714 100%);
    }

    .detail-head h2 {
      margin: 0 0 10px;
      font-size: clamp(1.5rem, 3vw, 2.45rem);
      line-height: 1.05;
      letter-spacing: 0;
    }

    .detail-head p {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.55;
      max-width: 72ch;
    }

    .detail-body {
      padding: 20px 24px 24px;
      display: grid;
      gap: 18px;
    }

    .field {
      display: grid;
      gap: 6px;
    }

    .field-label {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    .field-value {
      margin: 0;
      line-height: 1.62;
      font-size: 0.98rem;
    }

    .link-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .link-list a {
      border: 1px solid var(--line);
      background: #0d1210;
      border-radius: 8px;
      padding: 7px 9px;
      font-size: 0.88rem;
      text-decoration: none;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    .empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 20px;
      color: var(--muted);
      background: rgba(17, 22, 20, 0.7);
    }

    mark {
      background: rgba(244, 196, 107, 0.28);
      color: var(--ink);
      padding: 0 2px;
      border-radius: 3px;
    }

    @media (max-width: 980px) {
      .controls {
        grid-template-columns: 1fr;
      }

      .filters {
        justify-content: flex-start;
      }

      main {
        grid-template-columns: 1fr;
      }

      .knowledge-strip {
        grid-template-columns: 1fr;
        width: calc(100% - 28px);
      }

      .detail {
        position: static;
        min-height: auto;
      }

      .results {
        min-height: auto;
      }
    }

    @media (max-width: 560px) {
      .header-inner,
      main {
        padding-left: 14px;
        padding-right: 14px;
      }

      .filters {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      button.filter {
        justify-content: center;
      }

      .entry-title {
        align-items: flex-start;
        flex-direction: column;
      }

      .detail-head,
      .detail-body {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="header-inner">
        <div class="title-row">
          <div>
            <h1>Glosario ICICSO</h1>
          </div>
          <div class="meta">
            <span class="badge" id="entryTotal">0 términos</span>
            <a class="badge link-strong" href="clinical-concepts.html">Índice clínico amplio</a>
            <a class="badge" href="glossary.md">Markdown fuente</a>
            <a class="badge" href="glossary-candidates.md">Candidatos auto</a>
            <span class="badge" id="syncState">Snapshot local</span>
          </div>
        </div>
        <div class="controls">
          <div class="search-wrap">
            <input id="searchInput" type="search" autocomplete="off" placeholder="Buscar término, fuente, dominio, EO, CABG, queratocono...">
          </div>
          <div class="filters" role="toolbar" aria-label="Filtros del glosario">
            <button class="filter" type="button" data-filter="all" aria-pressed="true"><span class="dot"></span>Todos</button>
            <button class="filter" type="button" data-filter="medical" aria-pressed="false"><span class="dot"></span>Médico</button>
            <button class="filter" type="button" data-filter="evidence" aria-pressed="false"><span class="dot"></span>Evidencia</button>
            <button class="filter" type="button" data-filter="technical" aria-pressed="false"><span class="dot"></span>Técnico</button>
            <button class="filter" type="button" data-filter="governance" aria-pressed="false"><span class="dot"></span>Gobernanza</button>
          </div>
        </div>
      </div>
    </header>

    <section class="knowledge-strip" aria-label="Índice clínico ICICSO">
      <div class="knowledge-copy">
        <span class="eyebrow">Capa amplia generada automáticamente</span>
        <h2>${clinicalSummary.available ? `${formatNumber(clinicalSummary.conceptCount)} conceptos clínicos extraídos del repo` : "Índice clínico pendiente de generar"}</h2>
        <p>El glosario de esta página es la capa curada. El volumen clínico completo vive en el índice clínico: diagnósticos, procedimientos quirúrgicos, medicamentos/clases, candidatos EO, triggers y conceptos route-ready para futuros motores de ICICSO.</p>
        <div class="knowledge-actions">
          <a class="action-link primary" href="clinical-concepts.html">Abrir explorador clínico</a>
          <a class="action-link" href="generated/clinical-concepts-search.json">JSON de búsqueda</a>
          <a class="action-link" href="clinical-concepts.md">Resumen del barrido</a>
        </div>
      </div>
      <div class="clinical-metrics">
        <div class="clinical-metric"><strong>${formatNumber(clinicalSummary.diagnosisCount)}</strong><span>Diagnósticos</span></div>
        <div class="clinical-metric"><strong>${formatNumber(clinicalSummary.procedureCount)}</strong><span>Procedimientos</span></div>
        <div class="clinical-metric"><strong>${formatNumber(clinicalSummary.eoCandidateCount)}</strong><span>Candidatos EO</span></div>
        <div class="clinical-metric"><strong>${formatNumber(clinicalSummary.routeReadyCount)}</strong><span>Route-ready ICICSO</span></div>
        <div class="clinical-examples">
          ${clinicalSummary.examples.length ? clinicalSummary.examples.map((concept) => `<span class="clinical-example">${escapeTemplate(concept.label)}${concept.code ? ` · ${escapeTemplate(concept.code)}` : ""}</span>`).join("") : '<span class="clinical-example">Ejecuta pnpm knowledge:refresh</span>'}
        </div>
      </div>
    </section>

    <main>
      <section class="results" aria-label="Resultados">
        <div class="result-count" id="resultCount"></div>
        <div class="entry-list" id="entryList"></div>
      </section>

      <article class="detail" id="detailPanel" aria-live="polite"></article>
    </main>
  </div>

  <script id="glossaryData" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
  <script>
    const FIELD_LABELS = new Map([
      ["Definición corta", "shortDefinition"],
      ["Definicion corta", "shortDefinition"],
      ["Definición larga", "longDefinition"],
      ["Definicion larga", "longDefinition"],
      ["Tipo", "type"],
      ["Fuente primaria", "primarySource"],
      ["Menciones", "mentions"],
      ["Relación médica/terminológica", "terminologyRelation"],
      ["Relacion medica/terminologica", "terminologyRelation"],
    ]);

    const CATEGORY_LABELS = {
      medical: "Médico",
      evidence: "Evidencia",
      technical: "Técnico",
      governance: "Gobernanza",
    };

    const CATEGORY_ORDER = ["medical", "evidence", "technical", "governance"];
    const state = {
      entries: [],
      filter: "all",
      query: "",
      selectedId: null,
    };

    const fallback = JSON.parse(document.getElementById("glossaryData").textContent);

    function stripMarkdown(value) {
      const tick = String.fromCharCode(96);
      return String(value || "")
        .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, "$1")
        .replace(new RegExp(tick + "([^" + tick + "]+)" + tick, "g"), "$1")
        .replace(/\\*\\*([^*]+)\\*\\*/g, "$1")
        .replace(/\\s+/g, " ")
        .trim();
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function renderInline(value) {
      const tick = String.fromCharCode(96);
      const escaped = escapeHtml(value || "");
      return escaped
        .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>')
        .replace(new RegExp(tick + "([^" + tick + "]+)" + tick, "g"), "<code>$1</code>")
        .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
    }

    function parseLinks(value) {
      const links = [];
      const matcher = /\\[([^\\]]+)\\]\\(([^)]+)\\)/g;
      let match;
      while ((match = matcher.exec(value || ""))) {
        links.push({ label: match[1], href: match[2] });
      }
      return links;
    }

    function categorize(entry) {
      const haystack = [
        entry.section,
        entry.type,
        entry.title,
        entry.shortDefinition,
        entry.longDefinition,
      ].join(" ").toLowerCase();

      if (
        haystack.includes("término médico") ||
        haystack.includes("termino medico") ||
        haystack.includes("médico") ||
        haystack.includes("medico") ||
        entry.section.toLowerCase().includes("médicos")
      ) {
        return "medical";
      }

      if (
        haystack.includes("governanza") ||
        haystack.includes("gobernanza") ||
        haystack.includes("versionado") ||
        haystack.includes("estado")
      ) {
        return "governance";
      }

      if (
        haystack.includes("artefacto") ||
        haystack.includes("evidencia") ||
        haystack.includes("entidad")
      ) {
        return "evidence";
      }

      return "technical";
    }

    function parseGlossaryMarkdown(markdown) {
      const lines = markdown.split(/\\r?\\n/);
      const entries = [];
      let section = "General";
      let current = null;

      function commit() {
        if (!current) return;
        current.searchText = stripMarkdown([
          current.title,
          current.section,
          current.shortDefinition,
          current.longDefinition,
          current.type,
          current.primarySource,
          current.mentions,
          current.terminologyRelation,
        ].join(" ")).toLowerCase();
        current.category = categorize(current);
        entries.push(current);
        current = null;
      }

      for (const line of lines) {
        const sectionMatch = /^##\\s+(.+)$/.exec(line);
        if (sectionMatch) {
          commit();
          section = sectionMatch[1].trim();
          continue;
        }

        const entryMatch = /^###\\s+(.+)$/.exec(line);
        if (entryMatch) {
          commit();
          current = {
            id: entryMatch[1].trim().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            title: entryMatch[1].trim(),
            section,
            shortDefinition: "",
            longDefinition: "",
            type: "",
            primarySource: "",
            mentions: "",
            terminologyRelation: "",
          };
          continue;
        }

        if (!current) continue;
        const fieldMatch = /^-\\s+\\*\\*([^:]+):\\*\\*\\s*(.*)$/.exec(line);
        if (fieldMatch) {
          const key = FIELD_LABELS.get(fieldMatch[1].trim());
          if (key) current[key] = fieldMatch[2].trim();
        }
      }

      commit();
      return entries;
    }

    function scoreEntry(entry, query) {
      if (!query) return 1;
      const normalized = query.toLowerCase().trim();
      if (!entry.searchText.includes(normalized)) return 0;
      if (entry.title.toLowerCase().includes(normalized)) return 5;
      if ((entry.type || "").toLowerCase().includes(normalized)) return 4;
      if ((entry.shortDefinition || "").toLowerCase().includes(normalized)) return 3;
      return 2;
    }

    function highlight(value) {
      const rendered = renderInline(value || "");
      const query = state.query.trim();
      if (!query) return rendered;
      const safeQuery = query.replace(/[.*+?^$(){}|[\\]\\\\]/g, "\\\\$&");
      return rendered.replace(new RegExp(safeQuery, "ig"), (match) => "<mark>" + match + "</mark>");
    }

    function getFilteredEntries() {
      return state.entries
        .map((entry) => ({ entry, score: scoreEntry(entry, state.query) }))
        .filter(({ entry, score }) => score > 0 && (state.filter === "all" || entry.category === state.filter))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const categoryDelta = CATEGORY_ORDER.indexOf(a.entry.category) - CATEGORY_ORDER.indexOf(b.entry.category);
          if (categoryDelta !== 0) return categoryDelta;
          return a.entry.title.localeCompare(b.entry.title, "es");
        })
        .map(({ entry }) => entry);
    }

    function renderList(entries) {
      const list = document.getElementById("entryList");
      const resultCount = document.getElementById("resultCount");
      resultCount.textContent = entries.length === 1 ? "1 término visible" : entries.length + " términos visibles";

      if (!entries.length) {
        list.innerHTML = '<div class="empty">No hay términos para esta búsqueda.</div>';
        renderDetail(null);
        return;
      }

      if (!entries.some((entry) => entry.id === state.selectedId)) {
        state.selectedId = entries[0].id;
      }

      list.innerHTML = entries.map((entry) => {
        const active = entry.id === state.selectedId ? " active" : "";
        return '<button class="entry-button' + active + '" type="button" data-id="' + escapeHtml(entry.id) + '">' +
          '<span class="entry-title"><strong>' + highlight(entry.title) + '</strong><span class="category ' + entry.category + '">' + CATEGORY_LABELS[entry.category] + '</span></span>' +
          '<p>' + highlight(entry.shortDefinition || entry.type || entry.section) + '</p>' +
        '</button>';
      }).join("");

      for (const button of list.querySelectorAll(".entry-button")) {
        button.addEventListener("click", () => {
          state.selectedId = button.dataset.id;
          render();
        });
      }
    }

    function renderLinks(label, value) {
      const links = parseLinks(value);
      if (!links.length) return "";
      return '<div class="field"><span class="field-label">' + label + '</span><div class="link-list">' +
        links.map((link) => '<a href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + '</a>').join("") +
      '</div></div>';
    }

    function renderField(label, value) {
      if (!value) return "";
      return '<div class="field"><span class="field-label">' + label + '</span><p class="field-value">' + highlight(value) + '</p></div>';
    }

    function renderDetail(entry) {
      const detail = document.getElementById("detailPanel");
      if (!entry) {
        detail.innerHTML = '<div class="detail-body"><div class="empty">Selecciona otro filtro o cambia la búsqueda.</div></div>';
        return;
      }

      detail.innerHTML = '<div class="detail-head">' +
        '<span class="category ' + entry.category + '">' + CATEGORY_LABELS[entry.category] + '</span>' +
        '<h2>' + highlight(entry.title) + '</h2>' +
        '<p>' + highlight(entry.shortDefinition || "") + '</p>' +
      '</div>' +
      '<div class="detail-body">' +
        renderField("Definición larga", entry.longDefinition) +
        renderField("Tipo", entry.type) +
        renderLinks("Fuente primaria", entry.primarySource) +
        renderLinks("Menciones", entry.mentions) +
        renderField("Relación médica/terminológica", entry.terminologyRelation) +
        '<div class="field"><span class="field-label">Sección</span><p class="field-value">' + escapeHtml(entry.section) + '</p></div>' +
      '</div>';
    }

    function render() {
      const entries = getFilteredEntries();
      document.getElementById("entryTotal").textContent = state.entries.length === 1 ? "1 término" : state.entries.length + " términos";
      renderList(entries);
      renderDetail(entries.find((entry) => entry.id === state.selectedId) || entries[0] || null);
      for (const button of document.querySelectorAll(".filter")) {
        button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter));
      }
    }

    async function loadEntries() {
      state.entries = fallback.entries;
      document.getElementById("syncState").textContent = "Snapshot local";

      if (location.protocol !== "file:") {
        try {
          const response = await fetch("glossary.md", { cache: "no-cache" });
          if (response.ok) {
            state.entries = parseGlossaryMarkdown(await response.text());
            document.getElementById("syncState").textContent = "Markdown en vivo";
          }
        } catch (_) {
          document.getElementById("syncState").textContent = "Snapshot local";
        }
      }

      state.selectedId = state.entries[0]?.id || null;
      render();
    }

    document.getElementById("searchInput").addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    for (const button of document.querySelectorAll(".filter")) {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        render();
      });
    }

    loadEntries();
  </script>
</body>
</html>`;
}

const sourceMarkdown = await readFile(glossaryMarkdownPath, "utf8");
const entries = parseGlossaryMarkdown(sourceMarkdown);
const clinicalSummary = await loadClinicalSummary();
const html = buildHtml(entries, sourceMarkdown, clinicalSummary);

await writeFile(glossaryHtmlPath, html, "utf8");

console.log(`Generated docs/glossary.html with ${entries.length} entries.`);
