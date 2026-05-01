import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const glossaryPath = resolve(repoRoot, "docs", "glossary.md");
const generatedJsonPath = resolve(repoRoot, "docs", "generated", "glossary-candidates.json");
const generatedMarkdownPath = resolve(repoRoot, "docs", "glossary-candidates.md");

const INCLUDE_EXTENSIONS = new Set([".md", ".json", ".ts", ".tsx", ".py", ".mjs"]);
const MAX_FILE_BYTES = 1_200_000;
const MAX_SNIPPET_LENGTH = 220;
const MAX_SOURCES_PER_TERM = 8;
const MAX_MARKDOWN_CANDIDATES = 120;

const EXCLUDED_PREFIXES = [
  ".git/",
  ".pytest_cache/",
  ".pnpm-store/",
  "_archive/",
  "node_modules/",
  "logs/",
  "pytest-cache-files-",
  "dashboard/generated/post_ingesta_",
  "docs/audit/",
  "docs/ci-cd/",
  "docs/generated/",
  "docs/COMPLETE_REPO_AUDIT.md",
  "docs/FINAL_DELIVERABLES_CLOSURE.md",
  "docs/FINAL_VALIDATION_REPORT.md",
  "docs/INTERVENTION_CHECKPOINT_1.md",
  "docs/glossary.html",
  "docs/glossary.md",
  "docs/generated/glossary-candidates.json",
  "docs/glossary-candidates.md",
  "ICICSO_TERMINOLOGIAS/01_RAW/",
  "ICICSO_TERMINOLOGIAS/02_STAGING/",
  "ICICSO_TERMINOLOGIAS/03_NORMALIZED/",
  "packages/evidence-intelligence/dist/",
  "services/ingestion-orquestador/tests/_tmp/",
  "services/ingestion-orquestador/pytest-cache-files-",
];

const INCLUDED_PREFIXES = [
  "README.md",
  "START_HERE.md",
  "SYSTEM_STATUS.md",
  "NEXT_ACTIONS.md",
  "docs/",
  "icicso/docs/",
  "icicso/packages/",
  "packages/evidence-intelligence/",
  "services/ingestion-orquestador/README.md",
  "services/ingestion-orquestador/docs/",
  "services/ingestion-orquestador/schemas/",
  "services/ingestion-orquestador/app/domain/",
  "services/ingestion-orquestador/app/engines/",
  "dashboard/generated/eo_extraction_engine_summary.json",
  "dashboard/generated/eo_extraction_engine_papers_",
];

const STOP_TERMS = new Set([
  "api",
  "app",
  "apps",
  "array",
  "architecture",
  "bash",
  "boolean",
  "build",
  "cd",
  "ci",
  "csv",
  "data",
  "debug",
  "docs",
  "docx",
  "error",
  "example",
  "examples",
  "false",
  "fase",
  "generated",
  "html",
  "http",
  "https",
  "index",
  "input",
  "inputs",
  "integer",
  "json",
  "kb",
  "license",
  "local",
  "markdown",
  "metadata",
  "node",
  "null",
  "number",
  "object",
  "ok",
  "output",
  "outputs",
  "package",
  "packages",
  "parte",
  "pdf",
  "pipeline",
  "powershell",
  "python",
  "readme",
  "repo",
  "root",
  "schema",
  "schemas",
  "script",
  "scripts",
  "service",
  "services",
  "source",
  "status",
  "string",
  "test",
  "tests",
  "todo",
  "true",
  "tsv",
  "type",
  "types",
  "url",
  "valid",
  "version",
  "workflow",
]);

const GENERIC_HEADINGS = new Set([
  "arquitectura",
  "cobertura actual",
  "comandos de validación rápidos",
  "convenciones operativas",
  "development",
  "estado actual",
  "estado del documento",
  "estado real",
  "estructura",
  "fuentes primarias actuales",
  "implementation order",
  "inputs",
  "known limits of v1",
  "menciones",
  "modelo normalizado",
  "notas de mantenimiento",
  "outputs",
  "overview",
  "propósito",
  "purpose",
  "regla",
  "regla de actualización",
  "regla de origen",
  "scope",
  "siguiente integración prevista",
  "test cases",
  "validación",
]);

const JSON_TERM_KEYS = new Set([
  "artifact_kind",
  "canonicalId",
  "clinicalDomain",
  "clinicalFunction",
  "code",
  "comparatorLabel",
  "decisionReadiness",
  "display",
  "domain",
  "effectDirection",
  "evidenceType",
  "interventionClass",
  "interventionLabel",
  "label",
  "outcomeClass",
  "outcomeCode",
  "reviewState",
  "seedId",
  "sourceSystem",
  "system",
  "title",
]);

const JSON_STRING_ARRAY_KEYS = new Set([
  "biomarkers",
  "comorbidities",
  "conditions",
  "constraints",
  "diagnoses",
  "exclusions",
  "implementationPreconditions",
  "inclusionCriteria",
  "exclusionCriteria",
  "procedures",
  "required_context",
  "uncertainty_sources",
]);

function normalizeRepoPath(path) {
  return path.replaceAll("\\", "/");
}

function shouldScan(path) {
  const normalized = normalizeRepoPath(path);
  if (EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (!INCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  return INCLUDE_EXTENSIONS.has(extname(normalized));
}

function listRepoFiles() {
  throw new Error("Use listRepoFilesRecursive in this environment.");
}

async function listRepoFilesRecursive() {
  const files = [];

  async function walk(relativeDir) {
    let entries;
    try {
      entries = await readdir(resolve(repoRoot, relativeDir), { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relativePath = normalizeRepoPath(relativeDir ? `${relativeDir}/${entry.name}` : entry.name);

      if (entry.isDirectory()) {
        const dirPath = `${relativePath}/`;
        if (EXCLUDED_PREFIXES.some((prefix) => dirPath.startsWith(prefix) || relativePath.startsWith(prefix))) {
          continue;
        }
        if (
          !INCLUDED_PREFIXES.some((prefix) => prefix.startsWith(dirPath) || dirPath.startsWith(prefix)) &&
          !["docs/", "icicso/", "packages/", "services/", "dashboard/"].some((prefix) => dirPath.startsWith(prefix))
        ) {
          continue;
        }
        await walk(relativePath);
        continue;
      }

      if (entry.isFile() && shouldScan(relativePath)) {
        files.push(relativePath);
      }
    }
  }

  await walk("");
  return files.sort();
}

function slug(term) {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTerm(raw) {
  if (!raw) {
    return "";
  }

  let term = String(raw)
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/[`*_#"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  term = term.replace(/^[.:;,\-/\\\s]+|[.:;,\-/\\\s]+$/g, "");

  if (!term || term.length < 2 || term.length > 80) {
    return "";
  }

  if (/^\d+$/.test(term) || /^v?\d+(\.\d+){0,3}$/i.test(term)) {
    return "";
  }

  if (/^[./\\_-]+$/.test(term)) {
    return "";
  }

  const lower = term.toLowerCase();
  if (STOP_TERMS.has(lower) || GENERIC_HEADINGS.has(lower)) {
    return "";
  }

  if (/^\/[a-z0-9/_-]+$/i.test(String(raw).trim())) {
    return "";
  }

  if (term.includes("/") && term.length > 16) {
    return "";
  }

  return term;
}

function cleanSnippet(line) {
  return line.replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_LENGTH);
}

function categoryFor(term, snippets = []) {
  const haystack = `${term} ${snippets.join(" ")}`.toLowerCase();
  if (
    haystack.includes("cabg") ||
    haystack.includes("coronary") ||
    haystack.includes("cardiac") ||
    haystack.includes("cardio") ||
    haystack.includes("surgery") ||
    haystack.includes("antithrombotic") ||
    haystack.includes("bleeding") ||
    haystack.includes("colorectal") ||
    haystack.includes("eras") ||
    haystack.includes("patient") ||
    haystack.includes("diagnos") ||
    haystack.includes("intervention")
  ) {
    return "medical";
  }

  if (
    haystack.includes("vrn") ||
    haystack.includes("governance") ||
    haystack.includes("gobernanza") ||
    haystack.includes("review") ||
    haystack.includes("audit") ||
    haystack.includes("legal") ||
    haystack.includes("status")
  ) {
    return "governance";
  }

  if (
    haystack.includes("evidence") ||
    haystack.includes("evidencia") ||
    haystack.includes("ser") ||
    haystack.includes("eo") ||
    haystack.includes("el") ||
    haystack.includes("guideline") ||
    haystack.includes("outcome") ||
    haystack.includes("certainty") ||
    haystack.includes("confidence")
  ) {
    return "evidence";
  }

  return "technical";
}

function reasonScore(reason) {
  if (reason.startsWith("json:")) {
    return 5;
  }
  if (reason === "markdown-heading") {
    return 4;
  }
  if (reason === "domain-type") {
    return 4;
  }
  if (reason === "inline-code") {
    return 3;
  }
  if (reason === "acronym") {
    return 2;
  }
  return 1;
}

function addCandidate(map, rawTerm, source) {
  const term = normalizeTerm(rawTerm);
  if (!term) {
    return;
  }

  const key = slug(term);
  if (!key || STOP_TERMS.has(key)) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, {
      term,
      key,
      score: 0,
      sources: [],
      snippets: [],
      reasons: new Set(),
    });
  }

  const item = map.get(key);
  item.score += reasonScore(source.reason);
  item.reasons.add(source.reason);

  if (item.sources.length < MAX_SOURCES_PER_TERM) {
    item.sources.push(source);
  }
  if (source.snippet) {
    item.snippets.push(source.snippet);
  }
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function extractFromTextFile(map, path, content) {
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const snippet = cleanSnippet(line);

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      addCandidate(map, heading[2], {
        path,
        line: lineNumber,
        reason: "markdown-heading",
        snippet,
      });
    }

    const inlineCodeMatches = line.matchAll(/`([^`]{2,80})`/g);
    for (const match of inlineCodeMatches) {
      const value = match[1];
      for (const part of value.split(/\s*->\s*/)) {
        addCandidate(map, part, {
          path,
          line: lineNumber,
          reason: "inline-code",
          snippet,
        });
      }
    }

    const acronymMatches = line.matchAll(/\b[A-Z][A-Z0-9-]{1,10}\b/g);
    for (const match of acronymMatches) {
      addCandidate(map, match[0], {
        path,
        line: lineNumber,
        reason: "acronym",
        snippet,
      });
    }
  });

  if ([".ts", ".tsx"].includes(extname(path))) {
    const declarationMatches = content.matchAll(/\b(?:export\s+)?(?:interface|type|class|enum)\s+([A-Z][A-Za-z0-9]{2,60})\b/g);
    for (const match of declarationMatches) {
      addCandidate(map, match[1], {
        path,
        line: lineNumberFor(content, match.index ?? 0),
        reason: "domain-type",
        snippet: cleanSnippet(match[0]),
      });
    }
  }

  if (extname(path) === ".py") {
    const classMatches = content.matchAll(/\bclass\s+([A-Z][A-Za-z0-9]{2,60})\b/g);
    for (const match of classMatches) {
      addCandidate(map, match[1], {
        path,
        line: lineNumberFor(content, match.index ?? 0),
        reason: "domain-type",
        snippet: cleanSnippet(match[0]),
      });
    }
  }
}

function isSemanticJsonPath(path) {
  return (
    path.includes("/seeds/") ||
    path.includes("/examples/valid/") ||
    path.includes("/ontology/") ||
    path.includes("/schemas/") ||
    path.endsWith("architecture-registry.json") ||
    path.includes("eo_extraction_engine_")
  );
}

function extractFromJsonValue(map, path, value, keyPath = []) {
  if (Array.isArray(value)) {
    const parentKey = keyPath.at(-1) ?? "";
    for (const item of value) {
      if (typeof item === "string" && JSON_STRING_ARRAY_KEYS.has(parentKey)) {
        addCandidate(map, item, {
          path,
          line: null,
          reason: `json:${parentKey}`,
          snippet: `${parentKey}: ${item}`,
        });
      } else {
        extractFromJsonValue(map, path, item, keyPath);
      }
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...keyPath, key];
    if (typeof child === "string") {
      if (JSON_TERM_KEYS.has(key)) {
        addCandidate(map, child, {
          path,
          line: null,
          reason: `json:${key}`,
          snippet: `${key}: ${child}`,
        });
      }
    } else {
      extractFromJsonValue(map, path, child, nextPath);
    }
  }
}

function parseExistingGlossary(markdown) {
  const terms = new Set();
  for (const match of markdown.matchAll(/^###\s+(.+)$/gm)) {
    const key = slug(match[1]);
    if (key) {
      terms.add(key);
    }
  }
  return terms;
}

function confidenceFor(candidate, existingGlossaryTerms) {
  if (existingGlossaryTerms.has(candidate.key)) {
    return "already-covered";
  }
  if (candidate.sources.length >= 4 || candidate.score >= 16) {
    return "high";
  }
  if (candidate.sources.length >= 2 || candidate.score >= 5) {
    return "medium";
  }
  return "low";
}

function buildCandidateJson(candidates, filesScanned, existingGlossaryTerms) {
  const generatedAt = new Date().toISOString();
  const normalized = candidates
    .map((candidate) => {
      const snippets = candidate.snippets.slice(0, 6);
      const confidence = confidenceFor(candidate, existingGlossaryTerms);
      return {
        term: candidate.term,
        key: candidate.key,
        category: categoryFor(candidate.term, snippets),
        confidence,
        alreadyInGlossary: existingGlossaryTerms.has(candidate.key),
        score: candidate.score,
        sourceCount: candidate.sources.length,
        reasons: Array.from(candidate.reasons).sort(),
        shortDefinitionSuggestion: `Candidato detectado automaticamente en ${candidate.sources.length} fuente(s) del repo; revisar antes de promover al glosario canonico.`,
        sources: candidate.sources,
      };
    })
    .filter((candidate) => candidate.alreadyInGlossary || candidate.confidence !== "low")
    .sort((a, b) => {
      if (a.alreadyInGlossary !== b.alreadyInGlossary) {
        return a.alreadyInGlossary ? 1 : -1;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.term.localeCompare(b.term, "es");
    });

  return {
    generatedAt,
    filesScanned,
    candidateCount: normalized.length,
    newCandidateCount: normalized.filter((item) => !item.alreadyInGlossary).length,
    candidates: normalized,
  };
}

function linkToSource(source) {
  const suffix = source.line ? `:${source.line}` : "";
  return `${source.path}${suffix}`;
}

function buildCandidateMarkdown(data) {
  const candidates = data.candidates
    .filter((candidate) => !candidate.alreadyInGlossary && candidate.confidence !== "low")
    .slice(0, MAX_MARKDOWN_CANDIDATES);

  const lines = [
    "# Candidatos automaticos para Glosario ICICSO",
    "",
    "Estado del documento: generado; no editar manualmente.",
    "",
    `Generado: ${data.generatedAt}`,
    `Archivos escaneados: ${data.filesScanned}`,
    `Candidatos nuevos medium/high: ${candidates.length}`,
    "",
    "Regla: estos candidatos no son canonicos hasta que se revisen y se promuevan manualmente a `docs/glossary.md`.",
    "",
  ];

  for (const candidate of candidates) {
    lines.push(`## ${candidate.term}`);
    lines.push("");
    lines.push(`- **Categoria sugerida:** ${candidate.category}`);
    lines.push(`- **Confianza:** ${candidate.confidence}`);
    lines.push(`- **Sugerencia:** ${candidate.shortDefinitionSuggestion}`);
    lines.push("- **Fuentes:**");
    for (const source of candidate.sources.slice(0, 4)) {
      lines.push(`  - \`${linkToSource(source)}\` (${source.reason}) - ${source.snippet ?? ""}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const glossaryMarkdown = await readFile(glossaryPath, "utf8");
const existingGlossaryTerms = parseExistingGlossary(glossaryMarkdown);
const files = await listRepoFilesRecursive();
const candidateMap = new Map();
let filesScanned = 0;

for (const path of files) {
  const absolutePath = resolve(repoRoot, path);
  const info = await stat(absolutePath);
  if (info.size > MAX_FILE_BYTES) {
    continue;
  }

  const content = await readFile(absolutePath, "utf8");
  filesScanned += 1;
  extractFromTextFile(candidateMap, path, content);

  if (extname(path) === ".json" && isSemanticJsonPath(path)) {
    try {
      extractFromJsonValue(candidateMap, path, JSON.parse(content));
    } catch {
      // Keep text-derived candidates for JSON files that are not strict JSON.
    }
  }
}

const data = buildCandidateJson(Array.from(candidateMap.values()), filesScanned, existingGlossaryTerms);
await mkdir(dirname(generatedJsonPath), { recursive: true });
await writeFile(generatedJsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
await writeFile(generatedMarkdownPath, buildCandidateMarkdown(data), "utf8");

console.log(
  `Scanned ${filesScanned} files. Wrote ${data.candidateCount} candidates (${data.newCandidateCount} new) to docs/generated/glossary-candidates.json.`,
);
