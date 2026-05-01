import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const paths = {
  icd10: resolve(repoRoot, "ICICSO_TERMINOLOGIAS", "01_RAW", "ICD10", "icd10_claml.xml"),
  pcs: resolve(repoRoot, "ICICSO_TERMINOLOGIAS", "01_RAW", "ICD10_PCS", "icd10pcs_codes", "icd10pcs_codes_2026.txt"),
  atc: resolve(repoRoot, "ICICSO_TERMINOLOGIAS", "01_RAW", "ATC_DDD", "atc_index.csv"),
  mesh: resolve(repoRoot, "ICICSO_TERMINOLOGIAS", "01_RAW", "MESH", "mesh.xml"),
  seedDir: resolve(repoRoot, "packages", "evidence-intelligence", "seeds"),
  ontologyDir: resolve(repoRoot, "packages", "evidence-intelligence", "ontology"),
  examplesDir: resolve(repoRoot, "packages", "evidence-intelligence", "examples", "valid"),
  dashboardSummary: resolve(repoRoot, "dashboard", "generated", "eo_extraction_engine_summary.json"),
  dashboardDir: resolve(repoRoot, "dashboard", "generated"),
  ghlService: resolve(repoRoot, "icicso", "packages", "domain", "ghl", "service.ts"),
  cpoCase: resolve(repoRoot, "icicso", "packages", "domain", "cpo", "examples", "cabg-case.ts"),
  cabgEvidenceDir: resolve(repoRoot, "evidence", "cabg_non_plus_ultra", "processed"),
  generatedDir: resolve(repoRoot, "docs", "generated"),
  outputJson: resolve(repoRoot, "docs", "generated", "clinical-concepts.json"),
  outputSearchJson: resolve(repoRoot, "docs", "generated", "clinical-concepts-search.json"),
  outputMarkdown: resolve(repoRoot, "docs", "clinical-concepts.md"),
  outputHtml: resolve(repoRoot, "docs", "clinical-concepts.html"),
};

const FIELD_TYPES = new Map([
  ["clinicalDomain", "clinical-domain"],
  ["clinical_domain", "clinical-domain"],
  ["specialty", "clinical-domain"],
  ["sub_specialty", "clinical-topic"],
  ["subSpecialty", "clinical-topic"],
  ["clinical_topic", "clinical-topic"],
  ["clinicalTopic", "clinical-topic"],
  ["diagnosis", "diagnosis"],
  ["diagnoses", "diagnosis"],
  ["disease", "diagnosis"],
  ["conditions", "clinical-criterion"],
  ["condition", "clinical-criterion"],
  ["clinical_state", "clinical-state"],
  ["clinicalState", "clinical-state"],
  ["severity", "severity"],
  ["population", "population"],
  ["target_population", "population"],
  ["inclusionCriteria", "inclusion-criterion"],
  ["exclusionCriteria", "exclusion-criterion"],
  ["exclusions", "exclusion-criterion"],
  ["comorbidities", "comorbidity"],
  ["biomarkers", "biomarker"],
  ["procedure", "procedure"],
  ["procedures", "procedure"],
  ["intervention", "intervention"],
  ["interventions", "intervention"],
  ["interventionLabel", "intervention"],
  ["comparator", "comparator"],
  ["comparatorLabel", "comparator"],
  ["interventionClass", "intervention-class"],
  ["intervention_class", "intervention-class"],
  ["clinicalFunction", "clinical-function"],
  ["clinical_function", "clinical-function"],
  ["outcome", "outcome"],
  ["outcomes", "outcome"],
  ["outcomeCode", "outcome"],
  ["outcome_class", "outcome"],
  ["expected_outcomes", "outcome"],
  ["implementationPreconditions", "operational-prerequisite"],
  ["required_context", "operational-prerequisite"],
  ["requiredContext", "operational-prerequisite"],
  ["resourceRequirements", "resource"],
  ["resource_requirements", "resource"],
  ["resourceType", "resource"],
  ["resource_type", "resource"],
  ["care_phase", "care-phase"],
  ["careSetting", "care-setting"],
  ["care_setting", "care-setting"],
  ["time_window", "time-window"],
  ["event_anchor", "event-anchor"],
  ["numeric_thresholds", "numeric-threshold"],
  ["execution_trigger", "route-trigger"],
  ["execution_trigger_population", "population"],
  ["execution_trigger_state", "clinical-state"],
  ["execution_trigger_disease", "diagnosis"],
  ["execution_trigger_time", "time-window"],
  ["execution_trigger_anchor", "event-anchor"],
  ["execution_trigger_exclusions", "exclusion-criterion"],
  ["execution_trigger_numeric_constraints", "numeric-threshold"],
  ["execution_trigger_qualifiers", "route-qualifier"],
  ["execution_trigger_constraints", "route-trigger"],
  ["execution_action", "route-action"],
  ["execution_prerequisites", "operational-prerequisite"],
  ["execution_contraindications", "contraindication"],
  ["execution_outcome", "outcome"],
]);

const STOP_LABELS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "by",
  "can",
  "de",
  "del",
  "el",
  "for",
  "from",
  "in",
  "is",
  "it",
  "la",
  "las",
  "los",
  "may",
  "no",
  "not",
  "null",
  "of",
  "or",
  "patient",
  "patients",
  "require",
  "selected",
  "the",
  "to",
  "undergoing",
  "with",
  "yes",
]);

const TOKEN_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "by",
  "con",
  "de",
  "del",
  "el",
  "en",
  "for",
  "from",
  "in",
  "is",
  "la",
  "las",
  "los",
  "of",
  "or",
  "para",
  "por",
  "the",
  "to",
  "un",
  "una",
  "with",
  "y",
]);

const concepts = new Map();
const sourceStatus = [];

function toRepoPath(filePath) {
  return relative(repoRoot, filePath).replace(/\\/g, "/");
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearch(value) {
  return normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slug(value) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function cleanLabel(value) {
  return normalizeWhitespace(value)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^\((?=[A-Za-z])/, "")
    .replace(/\s+([,.;:])/g, "$1");
}

function shouldSkipLabel(label) {
  const clean = cleanLabel(label);
  const normalized = normalizeSearch(clean);
  if (!clean || clean.length < 3) return true;
  if (STOP_LABELS.has(normalized)) return true;
  if (/^[0-9.\-_\s]+$/.test(clean)) return true;
  if (/^(true|false|null|undefined)$/i.test(clean)) return true;
  if (/^is (recommended|reasonable|useful|required)$/i.test(clean)) return true;
  if (/^(should|may|can|must|shall)\b/i.test(clean) && clean.length < 24) return true;
  return false;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(cleanLabel).filter(Boolean))];
}

function makeLineIndex(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

function lineNumberAt(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (starts[mid] <= index) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}

function findLineForValue(text, lineIndex, value) {
  if (!value) return null;
  const needle = String(value).slice(0, 120);
  const index = text.indexOf(needle);
  return index >= 0 ? lineNumberAt(lineIndex, index) : null;
}

function decodeXml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXml(value) {
  return cleanLabel(
    decodeXml(value)
      .replace(/<Reference\b[^>]*>([\s\S]*?)<\/Reference>/g, " ($1)")
      .replace(/<[^>]+>/g, " ")
  );
}

function tokensFor(...values) {
  const text = values.flat().filter(Boolean).join(" ");
  return unique(
    normalizeSearch(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !TOKEN_STOPWORDS.has(token))
  ).slice(0, 48);
}

function inferClinicalFamily(label, meta = {}) {
  const text = normalizeSearch([
    label,
    meta.semanticType,
    meta.sourceField,
    meta.sourceSystem,
    meta.clinicalDomain,
  ].join(" "));

  if (/keratoconus|cornea|corneal|ocular|ophthalm|retina|eye\b/.test(text)) return "ophthalmology";
  if (/myocard|coronary|cardiac|heart|cabg|pci|stemi|nstemi|revascular|aortic|aorta|arrhythm|atrial|valve|vein graft|radial artery/.test(text)) {
    return "cardiovascular";
  }
  if (/cerebral|stroke|brain|neurolog|spinal cord|carotid|vertebral/.test(text)) return "neurology";
  if (/renal|kidney|aki|nephro/.test(text)) return "renal";
  if (/colorectal|colon|rectal|bowel|intestinal|liver|hepatic|spleen|gastric|abdomen|abdominal/.test(text)) return "gastrointestinal-surgery";
  if (/anest|anaest|hypothermia|perfusion|transfusion|blood management|operating room|perioperative|postoperative|preoperative|surgery/.test(text)) {
    return "perioperative-surgery";
  }
  if (/icu|critical care|ventilat|hemodynamic|haemodynamic/.test(text)) return "critical-care";
  if (/drug|atc|aspirin|ticagrelor|clopidogrel|heparin|antithrombotic|pharmac/.test(text)) return "pharmacology";
  if (/oncology|cancer|neoplasm|tumou?r/.test(text)) return "oncology";
  return "general-clinical";
}

function inferRouteRelevance(label, meta = {}) {
  const text = normalizeSearch([label, meta.semanticType, meta.sourceField, meta.sourceSystem].join(" "));
  if (meta.icicsoStatus === "route-ready") return "critical-pathway-anchor";
  if (/eo|execution|route|trigger|cpo|pathway|clinical_topic/.test(text) && /^ICICSO/.test(meta.sourceSystem ?? "")) {
    return "critical-pathway-anchor";
  }
  if (/myocardial infarction|infarto|stemi|nstemi|cabg|coronary revascular|aortic dissection|aortic aneurysm|stroke|cerebral infarction|keratoconus|acute kidney injury|aki|sepsis/.test(text)) {
    return "route-anchor";
  }
  if (["diagnosis", "procedure", "intervention", "outcome", "route-trigger", "clinical-criterion"].includes(meta.semanticType)) {
    return "possible-trigger";
  }
  return "terminology-context";
}

function localizedAliases(label, meta = {}) {
  const text = normalizeSearch(label);
  const aliases = [];

  if (/keratoconus/.test(text)) aliases.push("queratocono");

  if (/myocardial infarction/.test(text)) {
    aliases.push("infarto de miocardio", "infarto agudo de miocardio", "IAM", "MI");
    if (/non-st|non st|subendocardial|nontransmural/.test(text)) aliases.push("NSTEMI", "infarto sin elevacion del ST");
    if (/transmural|anterior wall|inferior wall/.test(text)) aliases.push("STEMI", "infarto con elevacion del ST");
    if (/anterior wall/.test(text)) aliases.push("infarto de pared anterior");
    if (/inferior wall/.test(text)) aliases.push("infarto de pared inferior");
    if (/old|healed|past/.test(text)) aliases.push("infarto previo de miocardio", "infarto antiguo");
  }

  if (/cerebral infarction/.test(text)) aliases.push("infarto cerebral", "ictus isquemico", "EVC isquemico");
  if (/infarction of spleen/.test(text)) aliases.push("infarto esplenico", "infarto de bazo");
  if (/infarction of liver/.test(text)) aliases.push("infarto hepatico", "infarto de higado");
  if (/renal infarct|infarction of kidney|kidney infarction/.test(text)) aliases.push("infarto renal", "infarto de rinon");
  if (/acute infarction of spinal cord/.test(text)) aliases.push("infarto medular", "infarto de medula espinal");

  if (/coronary artery bypass|coronary artery bypass graft|cabg/.test(text)) {
    aliases.push("CABG", "bypass coronario", "puente coronario", "revascularizacion coronaria quirurgica");
  }
  if (/percutaneous coronary intervention|pci/.test(text)) aliases.push("PCI", "intervencion coronaria percutanea");
  if (/left main coronary artery disease|left main cad/.test(text)) aliases.push("enfermedad de tronco coronario izquierdo", "tronco coronario izquierdo");
  if (/multivessel coronary artery disease|multivessel cad/.test(text)) aliases.push("enfermedad coronaria multivaso", "CAD multivaso");
  if (/atrial fibrillation|afib/.test(text)) aliases.push("fibrilacion auricular", "FA");
  if (/acute kidney injury|aki/.test(text)) aliases.push("lesion renal aguda", "injuria renal aguda", "LRA");
  if (/elective colorectal resection|colorectal resection/.test(text)) aliases.push("reseccion colorrectal electiva");
  if (/early oral intake/.test(text)) aliases.push("ingesta oral temprana");
  if (/heart team/.test(text)) aliases.push("equipo cardiaco", "heart team");

  if (meta.code === "I21") aliases.push("infarto de miocardio agudo", "IAM agudo");
  if (meta.code === "I63") aliases.push("infarto cerebral");

  return unique(aliases);
}

function routeStatusForSource(sourceSystem, routeRelevance) {
  if (sourceSystem === "ICICSO_EO_ENGINE" || routeRelevance === "critical-pathway-anchor") return "route-ready";
  if (sourceSystem?.startsWith("ICICSO_")) return "icicso-generated";
  if (sourceSystem === "ICICSO_ONTOLOGY") return "icicso-canonical";
  return "terminology-only";
}

function addConcept(raw) {
  const label = cleanLabel(raw.label);
  if (shouldSkipLabel(label)) return;

  const sourceSystem = raw.sourceSystem ?? "ICICSO_REPO";
  const semanticType = raw.semanticType ?? "clinical-concept";
  const aliases = unique([...(raw.aliases ?? []), ...localizedAliases(label, raw)]).filter((alias) => normalizeSearch(alias) !== normalizeSearch(label));
  const clinicalFamily = raw.clinicalFamily ?? inferClinicalFamily(label, { ...raw, semanticType, sourceSystem });
  const routeRelevance = raw.routeRelevance ?? inferRouteRelevance(label, { ...raw, semanticType, sourceSystem });
  const icicsoStatus = raw.icicsoStatus ?? routeStatusForSource(sourceSystem, routeRelevance);
  const code = raw.code ? cleanLabel(raw.code) : null;
  const id = raw.id ?? `${sourceSystem}:${semanticType}:${code ? slug(code) : slug(label)}`;

  const source = {
    path: raw.sourcePath ?? null,
    line: raw.sourceLine ?? null,
    field: raw.sourceField ?? null,
  };

  const existing = concepts.get(id);
  if (existing) {
    existing.aliases = unique([...existing.aliases, ...aliases]).slice(0, 24);
    existing.inputTokens = tokensFor(existing.label, existing.aliases, label, aliases, existing.code, code);
    existing.evidenceLinks = unique([...(existing.evidenceLinks ?? []), ...(raw.evidenceLinks ?? [])]).slice(0, 16);
    existing.mentions = [...(existing.mentions ?? []), source]
      .filter((mention) => mention.path || mention.field)
      .slice(0, 10);
    if (!existing.longDefinition && raw.longDefinition) existing.longDefinition = cleanLabel(raw.longDefinition);
    if (existing.routeRelevance !== "critical-pathway-anchor" && routeRelevance === "critical-pathway-anchor") existing.routeRelevance = routeRelevance;
    if (existing.icicsoStatus !== "route-ready" && icicsoStatus === "route-ready") existing.icicsoStatus = icicsoStatus;
    return;
  }

  concepts.set(id, {
    id,
    label,
    normalizedLabel: normalizeSearch(label),
    aliases,
    semanticType,
    clinicalFamily,
    sourceSystem,
    code,
    parentCode: raw.parentCode ?? null,
    sourcePath: source.path,
    sourceLine: source.line,
    sourceField: source.field,
    shortDefinition: cleanLabel(raw.shortDefinition ?? `${label}${code ? ` (${code})` : ""}`),
    longDefinition: raw.longDefinition ? cleanLabel(raw.longDefinition) : null,
    routeRelevance,
    inputTokens: tokensFor(label, aliases, code, semanticType, clinicalFamily),
    icicsoStatus,
    evidenceLinks: unique(raw.evidenceLinks ?? []).slice(0, 16),
    mentions: source.path || source.field ? [source] : [],
  });
}

async function safeRead(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    sourceStatus.push({
      source: toRepoPath(filePath),
      status: "missing",
      detail: error.message,
    });
    return null;
  }
}

async function extractIcd10() {
  const text = await safeRead(paths.icd10);
  if (!text) return;

  const lineIndex = makeLineIndex(text);
  const classPattern = /<Class\b[^>]*code="([^"]+)"[^>]*>([\s\S]*?)<\/Class>/g;
  let count = 0;

  for (const match of text.matchAll(classPattern)) {
    const code = match[1];
    const body = match[2];
    const preferred = body.match(/<Rubric\b[^>]*kind="preferred"[\s\S]*?<Label\b[^>]*>([\s\S]*?)<\/Label>/);
    const fallback = body.match(/<Label\b[^>]*>([\s\S]*?)<\/Label>/);
    const label = stripXml(preferred?.[1] ?? fallback?.[1] ?? "");
    if (!label) continue;

    const parentCode = body.match(/<SuperClass\b[^>]*code="([^"]+)"/)?.[1] ?? null;
    const aliases = [];
    const rubricPattern = /<Rubric\b[^>]*kind="([^"]+)"[\s\S]*?<Label\b[^>]*>([\s\S]*?)<\/Label>[\s\S]*?<\/Rubric>/g;
    for (const rubric of body.matchAll(rubricPattern)) {
      if (rubric[1] !== "preferred") aliases.push(stripXml(rubric[2]));
      if (aliases.length >= 6) break;
    }

    addConcept({
      id: `ICD10:diagnosis:${code}`,
      label,
      aliases,
      semanticType: "diagnosis",
      sourceSystem: "ICD10",
      code,
      parentCode,
      sourcePath: toRepoPath(paths.icd10),
      sourceLine: lineNumberAt(lineIndex, match.index ?? 0),
      sourceField: "Class/Rubric[kind=preferred]/Label",
      shortDefinition: `${label} en ICD-10 (${code}).`,
      longDefinition: parentCode
        ? `Concepto diagnostico ICD-10 con codigo ${code}, hijo de ${parentCode}.`
        : `Concepto diagnostico ICD-10 con codigo ${code}.`,
    });
    count += 1;
  }

  sourceStatus.push({ source: toRepoPath(paths.icd10), status: "processed", concepts: count });
}

async function extractPcs() {
  const text = await safeRead(paths.pcs);
  if (!text) return;

  let count = 0;
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const match = line.match(/^([A-HJ-NP-Z0-9]{7})\s+(.+)$/);
    if (!match) continue;
    const [, code, description] = match;
    const approach = description.match(/,\s*([^,]+ Approach)$/)?.[1] ?? null;
    const rootOperation = description.match(/^([A-Za-z]+)/)?.[1] ?? null;

    addConcept({
      id: `ICD10_PCS:procedure:${code}`,
      label: description,
      aliases: rootOperation ? [rootOperation] : [],
      semanticType: "procedure",
      sourceSystem: "ICD10_PCS",
      code,
      sourcePath: toRepoPath(paths.pcs),
      sourceLine: index + 1,
      sourceField: "code description",
      shortDefinition: `Procedimiento ICD-10-PCS ${code}.`,
      longDefinition: approach
        ? `Procedimiento codificado en ICD-10-PCS; abordaje extraido: ${approach}.`
        : "Procedimiento codificado en ICD-10-PCS.",
    });
    count += 1;
  }

  sourceStatus.push({ source: toRepoPath(paths.pcs), status: "processed", concepts: count });
}

async function extractAtc() {
  const text = await safeRead(paths.atc);
  if (!text) return;

  const rows = parseCsv(text);
  const header = rows.shift() ?? [];
  const codeIndex = header.indexOf("code");
  const nameIndex = header.indexOf("name");
  let count = 0;

  rows.forEach((row, index) => {
    const code = row[codeIndex];
    const label = row[nameIndex];
    if (!code || !label) return;
    addConcept({
      id: `ATC_DDD:medication-class:${code}`,
      label,
      semanticType: "medication-class",
      clinicalFamily: "pharmacology",
      sourceSystem: "ATC_DDD",
      code,
      sourcePath: toRepoPath(paths.atc),
      sourceLine: index + 2,
      sourceField: "code,name",
      shortDefinition: `Clase ATC/DDD ${code}.`,
      longDefinition: "Clase farmacologica ATC/DDD disponible como binding terminologico.",
    });
    count += 1;
  });

  sourceStatus.push({ source: toRepoPath(paths.atc), status: "processed", concepts: count });
}

async function extractMeshStatus() {
  const text = await safeRead(paths.mesh);
  if (!text) return;
  if (!/<DescriptorRecord\b/.test(text)) {
    sourceStatus.push({
      source: toRepoPath(paths.mesh),
      status: "skipped",
      detail: "MeSH local es placeholder; no contiene DescriptorRecord.",
    });
    return;
  }
  sourceStatus.push({
    source: toRepoPath(paths.mesh),
    status: "pending-parser",
    detail: "DescriptorRecord detectado; parser MeSH pendiente.",
  });
}

async function listFiles(root, extensions) {
  const files = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (extensions.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }
  await walk(root);
  return files;
}

function semanticTypeForOntologyFile(filePath) {
  const parent = basename(dirname(filePath));
  const mapping = new Map([
    ["clinical-functions", "clinical-function"],
    ["interventions", "intervention-class"],
    ["outcomes", "outcome"],
    ["applicability-dimensions", "applicability-dimension"],
    ["implementation-complexity", "operational-dimension"],
    ["operational-relevance", "operational-dimension"],
    ["evidence-types", "evidence-governance"],
    ["evidence-levels", "evidence-governance"],
    ["certainty-levels", "evidence-governance"],
    ["time-horizons", "time-window"],
  ]);
  return mapping.get(parent) ?? "icicso-ontology";
}

async function extractOntologyCatalogs() {
  const files = await listFiles(paths.ontologyDir, new Set([".json"]));
  let count = 0;
  for (const filePath of files) {
    const text = await safeRead(filePath);
    if (!text) continue;
    const lineIndex = makeLineIndex(text);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    const entries = Array.isArray(data.entries) ? data.entries : [];
    for (const entry of entries) {
      const label = entry.label ?? entry.code ?? entry.id;
      addConcept({
        id: `ICICSO_ONTOLOGY:${entry.id ?? entry.code ?? slug(label)}`,
        label,
        aliases: [entry.code, ...(entry.usageNotes ?? [])].filter(Boolean),
        semanticType: semanticTypeForOntologyFile(filePath),
        sourceSystem: "ICICSO_ONTOLOGY",
        code: entry.code ?? entry.id ?? null,
        sourcePath: toRepoPath(filePath),
        sourceLine: findLineForValue(text, lineIndex, label),
        sourceField: "entries[]",
        shortDefinition: entry.description ?? `Entrada canonica ${label}.`,
        longDefinition: Array.isArray(entry.usageNotes) ? entry.usageNotes.join(" ") : entry.description ?? null,
      });
      count += 1;
    }
  }
  sourceStatus.push({ source: toRepoPath(paths.ontologyDir), status: "processed", concepts: count });
}

async function extractJsonClinicalFiles(root, sourceSystem) {
  const files = await listFiles(root, new Set([".json"]));
  let countBefore = concepts.size;
  for (const filePath of files) {
    const text = await safeRead(filePath);
    if (!text) continue;
    const lineIndex = makeLineIndex(text);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    traverseJsonForClinicalFields(data, [], {
      sourcePath: toRepoPath(filePath),
      sourceText: text,
      lineIndex,
      sourceSystem,
    });
  }
  sourceStatus.push({
    source: toRepoPath(root),
    status: "processed",
    concepts: concepts.size - countBefore,
  });
}

function traverseJsonForClinicalFields(node, pathParts, context) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => traverseJsonForClinicalFields(item, [...pathParts, String(index)], context));
    return;
  }
  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node)) {
    const fieldPath = [...pathParts, key];
    if (FIELD_TYPES.has(key)) {
      addFieldValue(value, key, fieldPath.join("."), context, node);
    }
    if (key === "interoperability" && Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && item.display) {
          addConcept({
            label: item.display,
            aliases: [item.system, item.code],
            semanticType: "terminology-binding",
            sourceSystem: context.sourceSystem,
            code: item.code ?? null,
            sourcePath: context.sourcePath,
            sourceLine: findLineForValue(context.sourceText, context.lineIndex, item.display),
            sourceField: fieldPath.join("."),
            shortDefinition: `${item.display} vinculado a ${item.system ?? "sistema externo"}.`,
            longDefinition: item.mapStatus ? `Map status: ${item.mapStatus}.` : null,
          });
        }
      }
    }
    traverseJsonForClinicalFields(value, fieldPath, context);
  }
}

function addFieldValue(value, key, fieldPath, context, owner) {
  const semanticType = FIELD_TYPES.get(key) ?? "clinical-concept";
  if (Array.isArray(value)) {
    value.forEach((item) => addFieldValue(item, key, fieldPath, context, owner));
    return;
  }
  if (value && typeof value === "object") {
    const label = value.label ?? value.outcomeCode ?? value.outcome_class ?? value.resourceType ?? value.resource_type ?? value.code ?? value.summary;
    if (label) {
      addFieldValue(label, key, fieldPath, context, owner);
    }
    if (value.note) {
      addConcept({
        label: value.note,
        semanticType: "clinical-note",
        sourceSystem: context.sourceSystem,
        sourcePath: context.sourcePath,
        sourceLine: findLineForValue(context.sourceText, context.lineIndex, value.note),
        sourceField: fieldPath,
        shortDefinition: value.note,
      });
    }
    return;
  }

  const label = cleanLabel(value);
  if (shouldSkipLabel(label)) return;
  const routeReady = owner?.decisionReadiness === "ready-for-execution" || owner?.expectedDecisionVerb || owner?.expectedReviewState;

  addConcept({
    label,
    semanticType,
    sourceSystem: context.sourceSystem,
    sourcePath: context.sourcePath,
    sourceLine: findLineForValue(context.sourceText, context.lineIndex, label),
    sourceField: fieldPath,
    shortDefinition: `${label} extraido de ${fieldPath}.`,
    longDefinition: owner?.summary ?? owner?.rationale ?? owner?.description ?? null,
    routeRelevance: routeReady ? "critical-pathway-anchor" : undefined,
    icicsoStatus: routeReady ? "route-ready" : undefined,
  });
}

async function extractDashboardEoCandidates() {
  const text = await safeRead(paths.dashboardSummary);
  if (!text) return;
  let summary;
  try {
    summary = JSON.parse(text);
  } catch {
    return;
  }

  for (const result of summary.results ?? []) {
    const label = [result.document_group, result.sub_specialty, result.document_type].filter(Boolean).join(" ");
    addConcept({
      id: `ICICSO_EO_ENGINE:document:${result.document_id}`,
      label,
      aliases: [result.specialty, result.sub_specialty, result.file_name],
      semanticType: "clinical-document",
      sourceSystem: "ICICSO_EO_ENGINE",
      code: result.document_id,
      sourcePath: toRepoPath(paths.dashboardSummary),
      sourceField: "results[]",
      shortDefinition: `${result.recommendations ?? 0} recomendaciones y ${result.eo_candidates ?? 0} candidatos EO materializados.`,
      longDefinition: result.vrn ?? null,
      routeRelevance: "critical-pathway-anchor",
      icicsoStatus: "route-ready",
      evidenceLinks: [result.vrn, result.html, result.csv].filter(Boolean),
    });

    if (result.csv) {
      const csvPath = resolve(repoRoot, result.csv);
      await extractEoCsv(csvPath, result);
    }
  }

  sourceStatus.push({
    source: toRepoPath(paths.dashboardSummary),
    status: "processed",
    documents: summary.documents_materialized,
    eoCandidates: summary.eo_candidates_total,
  });
}

async function extractEoCsv(csvPath, documentResult) {
  const text = await safeRead(csvPath);
  if (!text) return;
  const rows = parseCsv(text);
  const headers = rows.shift() ?? [];
  const headerMap = new Map(headers.map((name, index) => [name, index]));

  rows.forEach((row, rowIndex) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    const recommendationId = record.recommendation_id || `${documentResult.document_id}:${rowIndex + 1}`;
    const recommendationText = cleanLabel(record.recommendation_text);
    const topic = cleanLabel(record.clinical_topic || documentResult.sub_specialty || documentResult.specialty);
    const label = recommendationText
      ? `${topic}: ${recommendationText.slice(0, 180)}${recommendationText.length > 180 ? "..." : ""}`
      : `${topic} ${recommendationId}`;

    addConcept({
      id: `ICICSO_EO_ENGINE:eo-candidate:${recommendationId}`,
      label,
      aliases: [record.statement_key, record.recommendation_class, record.level_of_evidence, topic],
      semanticType: "eo-candidate",
      sourceSystem: "ICICSO_EO_ENGINE",
      code: recommendationId,
      sourcePath: toRepoPath(csvPath),
      sourceLine: rowIndex + 2,
      sourceField: "recommendation_text",
      shortDefinition: `Candidato EO extraido del documento ${documentResult.document_id}.`,
      longDefinition: recommendationText,
      routeRelevance: "critical-pathway-anchor",
      icicsoStatus: "route-ready",
      evidenceLinks: [documentResult.document_id, documentResult.vrn, record.statement_key, record.source_locator].filter(Boolean),
    });

    for (const [field, semanticType] of FIELD_TYPES.entries()) {
      if (!headerMap.has(field)) continue;
      splitClinicalCell(record[field]).forEach((item) => {
        addConcept({
          label: item,
          semanticType,
          sourceSystem: "ICICSO_EO_ENGINE",
          sourcePath: toRepoPath(csvPath),
          sourceLine: rowIndex + 2,
          sourceField: field,
          shortDefinition: `${item} extraido del campo ${field}.`,
          longDefinition: recommendationText,
          routeRelevance: ["route-trigger", "route-action", "diagnosis", "procedure", "intervention", "outcome"].includes(semanticType)
            ? "critical-pathway-anchor"
            : undefined,
          icicsoStatus: "route-ready",
          evidenceLinks: [recommendationId, documentResult.document_id, record.statement_key].filter(Boolean),
        });
      });
    }

    splitClinicalEntities(record.clinical_entities).forEach(({ type, value }) => {
      addConcept({
        label: value,
        semanticType: FIELD_TYPES.get(type) ?? (type.replace(/_/g, "-") || "clinical-entity"),
        sourceSystem: "ICICSO_EO_ENGINE",
        sourcePath: toRepoPath(csvPath),
        sourceLine: rowIndex + 2,
        sourceField: `clinical_entities.${type}`,
        shortDefinition: `${value} extraido de clinical_entities.`,
        longDefinition: recommendationText,
        routeRelevance: "critical-pathway-anchor",
        icicsoStatus: "route-ready",
        evidenceLinks: [recommendationId, documentResult.document_id, record.statement_key].filter(Boolean),
      });
    });
  });
}

function splitClinicalCell(value) {
  const clean = cleanLabel(value);
  if (!clean) return [];
  return unique(
    clean
      .split(/\s*(?:;|\||\n|(?:\s+-\s+))\s*/)
      .map((part) => part.replace(/^[a-z_ ]+:/i, "").replace(/\s+\[[^\]]+\]$/g, ""))
      .filter((part) => part.length <= 260)
  );
}

function splitClinicalEntities(value) {
  const clean = cleanLabel(value);
  if (!clean) return [];
  const acceptedTypes = new Set([
    "comparator",
    "condition",
    "diagnosis",
    "disease",
    "intervention",
    "numeric_threshold",
    "outcome",
    "population",
    "procedure",
    "state",
  ]);
  return unique(clean.split(/\s*;\s*/))
    .map((part) => {
      const match = part.match(/^([a-z_ -]+):(.+)$/i);
      if (!match) return null;
      const type = normalizeSearch(match[1]).replace(/\s+/g, "_");
      if (!acceptedTypes.has(type)) return null;
      const typeAlias = {
        condition: "conditions",
        numeric_threshold: "numeric_thresholds",
        state: "clinical_state",
      };
      return { type: typeAlias[type] ?? type, value: cleanLabel(match[2]) };
    })
    .filter(Boolean);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function extractGhlService() {
  const text = await safeRead(paths.ghlService);
  if (!text) return;
  const lineIndex = makeLineIndex(text);
  const objectPattern = /\{[^{}]*code:\s*"([^"]+)"[^{}]*name:\s*"([^"]+)"[^{}]*description:\s*"([^"]+)"[^{}]*\}/g;
  let count = 0;
  for (const match of text.matchAll(objectPattern)) {
    const objectText = match[0];
    const [, code, name, description] = match;
    const semanticType = /specialtyCode/.test(objectText) || /icd10Codes/.test(objectText) ? "clinical-condition" : "clinical-domain";
    const icdCodes = [...objectText.matchAll(/"([A-Z][0-9][0-9.]+)"/g)].map((item) => item[1]);
    addConcept({
      id: `ICICSO_GHL:${semanticType}:${code}`,
      label: name,
      aliases: [code, ...icdCodes],
      semanticType,
      sourceSystem: "ICICSO_GHL",
      code,
      sourcePath: toRepoPath(paths.ghlService),
      sourceLine: lineNumberAt(lineIndex, match.index ?? 0),
      sourceField: semanticType === "clinical-condition" ? "CLINICAL_CONDITIONS" : "MEDICAL_SPECIALTIES",
      shortDefinition: description,
      routeRelevance: semanticType === "clinical-condition" ? "critical-pathway-anchor" : "possible-trigger",
      icicsoStatus: "route-ready",
      evidenceLinks: icdCodes,
    });
    count += 1;
  }
  sourceStatus.push({ source: toRepoPath(paths.ghlService), status: "processed", concepts: count });
}

async function extractCpoCase() {
  const text = await safeRead(paths.cpoCase);
  if (!text) return;
  const lineIndex = makeLineIndex(text);
  const fields = [
    ["diagnosis", "diagnosis", /diagnosis:\s*\[([^\]]+)\]/],
    ["procedure", "procedure", /procedure:\s*"([^"]+)"/],
    ["comorbidities", "comorbidity", /comorbidities:\s*\[([^\]]+)\]/],
    ["ejectionFraction", "biomarker", /ejectionFraction:\s*"([^"]+)"/],
    ["renalStatus", "clinical-state", /renalStatus:\s*"([^"]+)"/],
  ];
  let count = 0;
  for (const [field, semanticType, pattern] of fields) {
    const match = text.match(pattern);
    if (!match) continue;
    const values = field === "procedure" || field === "ejectionFraction" || field === "renalStatus"
      ? [match[1]]
      : [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
    values.forEach((value) => {
      addConcept({
        label: value,
        semanticType,
        sourceSystem: "ICICSO_CPO_CASE",
        sourcePath: toRepoPath(paths.cpoCase),
        sourceLine: findLineForValue(text, lineIndex, value),
        sourceField: field,
        shortDefinition: `${value} en caso de referencia CABG x3 NSTEMI.`,
        routeRelevance: "critical-pathway-anchor",
        icicsoStatus: "route-ready",
        evidenceLinks: ["case-cabg-x3-nstemi", "cpo-cabg-x3-nstemi"],
      });
      count += 1;
    });
  }
  sourceStatus.push({ source: toRepoPath(paths.cpoCase), status: "processed", concepts: count });
}

async function extractCabgEvidencePack() {
  const exists = await stat(paths.cabgEvidenceDir).then(() => true).catch(() => false);
  if (!exists) return;
  const files = await listFiles(paths.cabgEvidenceDir, new Set([".md"]));
  let count = 0;
  for (const filePath of files) {
    const text = await safeRead(filePath);
    if (!text) continue;
    const lineIndex = makeLineIndex(text);
    for (const match of text.matchAll(/^#{1,3}\s+(.+)$/gm)) {
      const heading = cleanLabel(match[1].replace(/^\d+\.\s*/, ""));
      if (shouldSkipLabel(heading)) continue;
      addConcept({
        label: heading,
        semanticType: "clinical-evidence-source",
        sourceSystem: "ICICSO_CABG_EVIDENCE_PACK",
        sourcePath: toRepoPath(filePath),
        sourceLine: lineNumberAt(lineIndex, match.index ?? 0),
        sourceField: "markdown-heading",
        shortDefinition: `Entrada del paquete de evidencia CABG: ${heading}.`,
        routeRelevance: /cabg|acs|aki|transfusion|eras|freedom|stich|revascular/i.test(heading)
          ? "critical-pathway-anchor"
          : "possible-trigger",
        icicsoStatus: "route-ready",
      });
      count += 1;
    }
  }
  sourceStatus.push({ source: toRepoPath(paths.cabgEvidenceDir), status: "processed", concepts: count });
}

function scoreConceptForQuery(concept, query) {
  const tokens = tokensFor(query);
  if (tokens.length === 0) return 0;
  const haystack = normalizeSearch([
    concept.label,
    concept.aliases?.join(" "),
    concept.code,
    concept.semanticType,
    concept.clinicalFamily,
    concept.sourceSystem,
  ].join(" "));

  let score = 0;
  let matched = false;
  for (const token of tokens) {
    if (normalizeSearch(concept.label).startsWith(token)) {
      score += 12;
      matched = true;
    }
    if (haystack.includes(token)) {
      score += 4;
      matched = true;
    }
    if (concept.inputTokens?.includes(token)) {
      score += 6;
      matched = true;
    }
  }
  if (!matched) return 0;
  if (concept.routeRelevance === "critical-pathway-anchor") score += 8;
  if (concept.routeRelevance === "route-anchor") score += 5;
  if (concept.icicsoStatus === "route-ready") score += 6;
  if (concept.sourceSystem?.startsWith("ICICSO")) score += 3;
  if (["diagnosis", "outcome", "clinical-condition"].includes(concept.semanticType)) score += 10;
  if (concept.semanticType === "eo-candidate") score -= 8;
  if ((concept.label?.length ?? 0) > 180) score -= 4;
  return Math.max(score, 1);
}

function topMatches(allConcepts, query, limit = 12) {
  return allConcepts
    .map((concept) => ({ concept, score: scoreConceptForQuery(concept, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.concept.label.localeCompare(b.concept.label))
    .slice(0, limit)
    .map((item) => item.concept);
}

function countBy(allConcepts, field) {
  const counts = new Map();
  allConcepts.forEach((concept) => counts.set(concept[field] ?? "unknown", (counts.get(concept[field] ?? "unknown") ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function buildMetadata(allConcepts) {
  return {
    generatedAt: new Date().toISOString(),
    conceptCount: allConcepts.length,
    sources: sourceStatus,
    counts: {
      bySourceSystem: Object.fromEntries(countBy(allConcepts, "sourceSystem")),
      bySemanticType: Object.fromEntries(countBy(allConcepts, "semanticType")),
      byClinicalFamily: Object.fromEntries(countBy(allConcepts, "clinicalFamily")),
      byRouteRelevance: Object.fromEntries(countBy(allConcepts, "routeRelevance")),
      byIcicsoStatus: Object.fromEntries(countBy(allConcepts, "icicsoStatus")),
    },
    schema: {
      id: "stable concept id",
      label: "human label",
      aliases: "synonyms, Spanish local aliases or source aliases",
      semanticType: "diagnosis | procedure | intervention | outcome | eo-candidate | route-trigger | ...",
      clinicalFamily: "coarse clinical family inferred for routing",
      sourceSystem: "ICD10 | ICD10_PCS | ATC_DDD | ICICSO_EO_ENGINE | ICICSO_ONTOLOGY | ...",
      routeRelevance: "critical-pathway-anchor | route-anchor | possible-trigger | terminology-context",
      icicsoStatus: "route-ready | icicso-generated | icicso-canonical | terminology-only",
    },
  };
}

async function writeClinicalJson(allConcepts, metadata) {
  await mkdir(paths.generatedDir, { recursive: true });
  await writeFile(
    paths.outputJson,
    `${JSON.stringify({ metadata, concepts: allConcepts })}\n`,
    "utf8"
  );
  const searchConcepts = allConcepts.map((concept) => ({
    id: concept.id,
    label: concept.label,
    aliases: concept.aliases,
    semanticType: concept.semanticType,
    clinicalFamily: concept.clinicalFamily,
    sourceSystem: concept.sourceSystem,
    code: concept.code,
    sourcePath: concept.sourcePath,
    sourceLine: concept.sourceLine,
    sourceField: concept.sourceField,
    shortDefinition: concept.shortDefinition,
    routeRelevance: concept.routeRelevance,
    inputTokens: concept.inputTokens,
    icicsoStatus: concept.icicsoStatus,
    evidenceLinks: concept.evidenceLinks,
  }));
  await writeFile(
    paths.outputSearchJson,
    `${JSON.stringify({ metadata: { ...metadata, searchIndex: true }, concepts: searchConcepts })}\n`,
    "utf8"
  );
}

async function writeClinicalMarkdown(allConcepts, metadata) {
  const infarto = topMatches(allConcepts, "infarto de", 14);
  const queratocono = topMatches(allConcepts, "queratocono", 8);
  const seenRouteReady = new Set();
  const routeReady = allConcepts
    .filter((concept) => concept.icicsoStatus === "route-ready")
    .sort((a, b) => {
      const aScore = scoreConceptForQuery(a, "cabg revascularizacion infarto aorta");
      const bScore = scoreConceptForQuery(b, "cabg revascularizacion infarto aorta");
      return bScore - aScore || a.label.localeCompare(b.label);
    })
    .filter((concept) => {
      const key = normalizeSearch(displayLabelForConcept(concept));
      if (!key || seenRouteReady.has(key)) return false;
      seenRouteReady.add(key);
      return true;
    })
    .slice(0, 24);

  const lines = [];
  lines.push("# Indice clinico ICICSO");
  lines.push("");
  lines.push("Estado del documento: generado automaticamente.");
  lines.push("");
  lines.push("Este indice no reemplaza el glosario curado. Es la capa amplia y machine-readable para busqueda clinica, autocomplete medico, binding terminologico y futuros motores de rutas criticas.");
  lines.push("");
  lines.push("## Salidas");
  lines.push("");
  lines.push("- `docs/generated/clinical-concepts.json`: indice completo para motores.");
  lines.push("- `docs/generated/clinical-concepts-search.json`: indice ligero para busqueda/autocomplete.");
  lines.push("- `docs/clinical-concepts.html`: explorador dark con busqueda/autocomplete.");
  lines.push("- `docs/clinical-concepts.md`: resumen humano del barrido.");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`- Generado: ${metadata.generatedAt}`);
  lines.push(`- Conceptos totales: ${metadata.conceptCount}`);
  lines.push(`- Route-ready ICICSO: ${metadata.counts.byIcicsoStatus["route-ready"] ?? 0}`);
  lines.push(`- Terminology-only: ${metadata.counts.byIcicsoStatus["terminology-only"] ?? 0}`);
  lines.push(`- Diagnosticos: ${metadata.counts.bySemanticType.diagnosis ?? 0}`);
  lines.push(`- Procedimientos: ${metadata.counts.bySemanticType.procedure ?? 0}`);
  lines.push(`- Candidatos EO: ${metadata.counts.bySemanticType["eo-candidate"] ?? 0}`);
  lines.push("");
  lines.push("## Fuentes procesadas");
  lines.push("");
  for (const source of metadata.sources) {
    const detail = [
      source.concepts != null ? `${source.concepts} conceptos` : null,
      source.documents != null ? `${source.documents} documentos` : null,
      source.eoCandidates != null ? `${source.eoCandidates} candidatos EO` : null,
      source.detail ?? null,
    ].filter(Boolean).join("; ");
    lines.push(`- ${source.source}: ${source.status}${detail ? ` (${detail})` : ""}`);
  }
  lines.push("");
  lines.push("## Ejemplo de autocomplete: `infarto de`");
  lines.push("");
  for (const concept of infarto) {
    lines.push(`- ${concept.label}${concept.code ? ` (${concept.code})` : ""} - ${concept.semanticType}, ${concept.sourceSystem}, ${concept.routeRelevance}`);
    if (concept.aliases?.length) lines.push(`  Alias: ${concept.aliases.slice(0, 5).join(", ")}`);
  }
  lines.push("");
  lines.push("## Queratocono");
  lines.push("");
  for (const concept of queratocono) {
    lines.push(`- ${concept.label}${concept.code ? ` (${concept.code})` : ""} - ${concept.semanticType}, ${concept.sourceSystem}, ${concept.routeRelevance}`);
    if (concept.aliases?.length) lines.push(`  Alias: ${concept.aliases.slice(0, 5).join(", ")}`);
  }
  lines.push("");
  lines.push("## Anchors route-ready desde informacion ICICSO");
  lines.push("");
  for (const concept of routeReady) {
    lines.push(`- ${concept.label}${concept.code ? ` (${concept.code})` : ""} - ${concept.semanticType}, ${concept.sourceSystem}`);
  }
  lines.push("");
  lines.push("## Politica");
  lines.push("");
  lines.push("- `terminology-only`: viene de ICD-10, ICD-10-PCS o ATC/DDD y sirve como vocabulario/binding.");
  lines.push("- `icicso-generated`: viene de seeds, ontologias, casos o paquetes de evidencia creados en el repo.");
  lines.push("- `route-ready`: viene de candidatos EO, CPO/casos o artefactos que ya tienen forma de decision, trigger, poblacion, intervencion u outcome.");
  lines.push("- El glosario curado solo debe promover entradas desde esta capa cuando exista valor conceptual, fuente y definicion.");
  lines.push("");

  await writeFile(paths.outputMarkdown, `${lines.join("\n")}\n`, "utf8");
}

function displayLabelForConcept(concept) {
  const label = cleanLabel(concept.label);
  if (concept.semanticType !== "eo-candidate") return label;
  return cleanLabel(label.replace(/^[^:]{3,90}:\s*/, ""));
}

function isNoisyVisualConcept(concept, label) {
  const normalized = normalizeSearch(label);
  if (!normalized || normalized.length < 3) return true;
  if (normalized === "hide text from guidelines") return true;
  if (["appropriate", "continued", "general coronary revascularization", "other", "require", "required"].includes(normalized)) return true;
  if (/^[ivx]+ [abc](?:-[a-z]+)?$/.test(normalized)) return true;
  return false;
}

function visualPriority(concept) {
  const text = normalizeSearch([concept.label, concept.aliases?.join(" "), concept.code, concept.semanticType, concept.clinicalFamily].join(" "));
  let score = 0;
  if (concept.icicsoStatus === "route-ready") score += 900;
  if (concept.sourceSystem?.startsWith("ICICSO")) score += 360;
  if (concept.sourceSystem !== "ICD10_PCS") score += 140;
  if (concept.semanticType === "diagnosis") score += 260;
  if (concept.semanticType === "procedure") score += 210;
  if (concept.semanticType === "intervention") score += 230;
  if (concept.semanticType === "outcome") score += 220;
  if (concept.semanticType === "eo-candidate") score += 120;
  if (concept.routeRelevance === "critical-pathway-anchor") score += 160;
  if (concept.routeRelevance === "route-anchor") score += 100;
  if (/infarto|infarction|cabg|revascular|keratoconus|queratocono|aortic|aorta|stroke|cerebral|aki|colorectal|coronary|heart|cardiac|valve|bypass|repair|replacement|resection|excision|drainage|transplant/.test(text)) score += 120;
  if ((concept.label?.length ?? 0) > 220) score -= 30;
  return score;
}

function dominantValue(values, priority) {
  for (const item of priority) {
    if (values.has(item)) return item;
  }
  return [...values].sort()[0] ?? "";
}

function buildBrowserIndex(allConcepts, metadata) {
  const maxEmbeddedPcs = 18_000;
  const maxEmbeddedConcepts = 30_000;
  const aggregates = new Map();
  const selectedPcs = allConcepts
    .filter((concept) => concept.sourceSystem === "ICD10_PCS")
    .sort((a, b) => visualPriority(b) - visualPriority(a))
    .slice(0, maxEmbeddedPcs);
  const selectedPcsIds = new Set(selectedPcs.map((concept) => concept.id));

  for (const concept of allConcepts) {
    if (concept.sourceSystem === "ICD10_PCS" && !selectedPcsIds.has(concept.id)) continue;
    const label = displayLabelForConcept(concept);
    if (isNoisyVisualConcept(concept, label)) continue;
    const key = normalizeSearch(label);
    if (!key) continue;

    if (!aggregates.has(key)) {
      aggregates.set(key, {
        id: `clinical-${slug(label)}`,
        label,
        aliases: new Set(),
        roles: new Set(),
        sourceSystems: new Set(),
        codes: new Set(),
        families: new Set(),
        statuses: new Set(),
        routeRelevance: new Set(),
        definitions: new Set(),
        evidenceLinks: new Set(),
        sourcePaths: new Set(),
        priority: 0,
        count: 0,
      });
    }

    const aggregate = aggregates.get(key);
    aggregate.count += 1;
    aggregate.priority = Math.max(aggregate.priority, visualPriority(concept));
    (concept.aliases ?? []).forEach((alias) => aggregate.aliases.add(cleanLabel(alias)));
    aggregate.roles.add(concept.semanticType);
    aggregate.sourceSystems.add(concept.sourceSystem);
    if (concept.code) aggregate.codes.add(concept.code);
    if (concept.clinicalFamily) aggregate.families.add(concept.clinicalFamily);
    if (concept.icicsoStatus) aggregate.statuses.add(concept.icicsoStatus);
    if (concept.routeRelevance) aggregate.routeRelevance.add(concept.routeRelevance);
    const definition = concept.longDefinition && !/extraido del campo/i.test(concept.longDefinition)
      ? concept.longDefinition
      : concept.shortDefinition;
    if (definition) aggregate.definitions.add(cleanLabel(definition));
    (concept.evidenceLinks ?? []).slice(0, 8).forEach((link) => aggregate.evidenceLinks.add(cleanLabel(link)));
    if (concept.sourcePath) aggregate.sourcePaths.add(concept.sourceLine ? `${concept.sourcePath}:${concept.sourceLine}` : concept.sourcePath);
  }

  const typePriority = ["diagnosis", "clinical-condition", "procedure", "intervention", "route-action", "route-trigger", "outcome", "eo-candidate", "medication-class"];
  const statusPriority = ["route-ready", "icicso-generated", "icicso-canonical", "terminology-only"];
  const routePriority = ["critical-pathway-anchor", "route-anchor", "possible-trigger", "terminology-context"];
  const browserConcepts = [...aggregates.values()]
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label))
    .slice(0, maxEmbeddedConcepts)
    .map((aggregate) => {
      const sourceSystems = [...aggregate.sourceSystems].sort();
      const isIcicso = sourceSystems.some((source) => source.startsWith("ICICSO"));
      const definitions = [...aggregate.definitions]
        .filter(Boolean)
        .map((definition) => cleanLabel(definition).slice(0, isIcicso ? 420 : 220))
        .slice(0, isIcicso ? 4 : 2);
      return {
        id: aggregate.id,
        label: aggregate.label,
        aliases: [...aggregate.aliases].filter((alias) => normalizeSearch(alias) !== normalizeSearch(aggregate.label)).slice(0, isIcicso ? 16 : 8),
        primaryType: dominantValue(aggregate.roles, typePriority),
        roles: [...aggregate.roles].sort(),
        sourceSystems,
        codes: [...aggregate.codes].sort().slice(0, isIcicso ? 14 : 8),
        family: dominantValue(aggregate.families, ["cardiovascular", "ophthalmology", "neurology", "gastrointestinal-surgery", "perioperative-surgery", "critical-care", "renal", "pharmacology", "general-clinical"]),
        families: [...aggregate.families].sort(),
        status: dominantValue(aggregate.statuses, statusPriority),
        statuses: [...aggregate.statuses].sort(),
        route: dominantValue(aggregate.routeRelevance, routePriority),
        routes: [...aggregate.routeRelevance].sort(),
        definitions,
        evidenceLinks: isIcicso ? [...aggregate.evidenceLinks].slice(0, 10) : [],
        sourcePaths: isIcicso ? [...aggregate.sourcePaths].slice(0, 8) : [],
        count: aggregate.count,
        priority: aggregate.priority,
      };
    });

  return {
    metadata: {
      generatedAt: metadata.generatedAt,
      conceptCount: metadata.conceptCount,
      visualConceptCount: browserConcepts.length,
      maxEmbeddedConcepts,
      dedupedFrom: allConcepts.length,
      counts: metadata.counts,
    },
    concepts: browserConcepts,
  };
}

async function writeClinicalHtml(allConcepts, metadata) {
  const browserIndex = buildBrowserIndex(allConcepts, metadata);
  const browserFields = [
    "id",
    "label",
    "aliases",
    "primaryType",
    "roles",
    "sourceSystems",
    "codes",
    "family",
    "families",
    "status",
    "statuses",
    "route",
    "routes",
    "definitions",
    "evidenceLinks",
    "sourcePaths",
    "count",
    "priority",
  ];
  const compactBrowserIndex = {
    metadata: browserIndex.metadata,
    fields: browserFields,
    rows: browserIndex.concepts.map((concept) => browserFields.map((field) => concept[field] ?? null)),
  };
  const browserJson = JSON.stringify(compactBrowserIndex).replace(/</g, "\\u003c");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Indice clinico ICICSO</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #080b0c;
      --panel: #101517;
      --panel-2: #151b1e;
      --panel-3: #0c1112;
      --line: #263238;
      --line-soft: #1d2729;
      --text: #edf4f1;
      --muted: #9aa9a6;
      --faint: #6f7d7a;
      --green: #35d08b;
      --green-soft: rgba(53, 208, 139, 0.14);
      --blue: #62a6ff;
      --amber: #f2c15f;
      --red: #ff736a;
      --shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    a { color: var(--blue); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell { min-height: 100vh; display: grid; grid-template-rows: auto auto 1fr; }
    header {
      border-bottom: 1px solid var(--line);
      background: rgba(8, 11, 12, 0.96);
      position: sticky;
      top: 0;
      z-index: 20;
      backdrop-filter: blur(14px);
    }
    .header-inner {
      width: min(1560px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 16px 0 14px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
    }
    h1 { margin: 0; font-size: clamp(24px, 2.8vw, 40px); line-height: 1; font-weight: 760; }
    .subtitle { margin: 8px 0 0; color: var(--muted); max-width: 920px; line-height: 1.45; }
    .top-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .linkbtn, button {
      border: 1px solid var(--line);
      background: #0e1415;
      color: var(--text);
      border-radius: 8px;
      min-height: 36px;
      padding: 8px 10px;
      font: inherit;
      cursor: pointer;
    }
    .linkbtn.primary { border-color: rgba(53, 208, 139, 0.62); background: #12382b; color: #c9ffe2; font-weight: 700; }
    button:hover, .linkbtn:hover { border-color: #3b4b4e; background: #141c1e; text-decoration: none; }
    button.active, button[aria-pressed="true"] { border-color: var(--green); background: #12382b; color: #c9ffe2; }
    .stats {
      width: min(1560px, calc(100vw - 32px));
      margin: 16px auto 0;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
    }
    .stat {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 11px;
      min-width: 0;
    }
    .stat strong { display: block; font-size: 21px; line-height: 1; }
    .stat span { display: block; margin-top: 7px; color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .workspace {
      width: min(1560px, calc(100vw - 32px));
      margin: 14px auto 28px;
      display: grid;
      grid-template-columns: 310px minmax(520px, 1fr) 430px;
      min-height: calc(100vh - 190px);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: var(--panel-3);
      box-shadow: var(--shadow);
    }
    aside, main, .detail { min-width: 0; }
    aside {
      border-right: 1px solid var(--line);
      background: #0d1213;
      padding: 14px;
      display: grid;
      align-content: start;
      gap: 13px;
    }
    main { padding: 0; border-right: 1px solid var(--line); background: #0a0f10; }
    .detail { background: var(--panel); padding: 15px; overflow: auto; }
    label { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; margin-bottom: 7px; font-weight: 700; }
    input, select {
      width: 100%;
      min-height: 42px;
      border: 1px solid #314043;
      background: #080d0e;
      color: var(--text);
      border-radius: 8px;
      padding: 9px 10px;
      font: inherit;
      outline: none;
    }
    input:focus, select:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(53, 208, 139, 0.12); }
    .quick { display: flex; flex-wrap: wrap; gap: 7px; }
    .quick button { min-height: 30px; padding: 5px 8px; color: var(--muted); font-size: 13px; }
    .filter-grid { display: grid; gap: 9px; }
    .switch-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .switch-row button { font-size: 13px; color: var(--muted); }
    .status { color: var(--faint); font-size: 12px; line-height: 1.35; }
    .results-head {
      min-height: 54px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      background: #0d1213;
    }
    .results-title { display: grid; gap: 2px; }
    .results-title strong { font-size: 15px; }
    .results-title span { color: var(--muted); font-size: 12px; }
    .table {
      display: grid;
      max-height: calc(100vh - 245px);
      overflow: auto;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(210px, 1.35fr) 145px 135px 118px;
      gap: 12px;
      align-items: center;
      min-height: 62px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--line-soft);
      background: transparent;
      color: var(--text);
      text-align: left;
      width: 100%;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      border-radius: 0;
    }
    .row:hover, .row.selected { background: #11191b; }
    .row.selected { box-shadow: inset 3px 0 0 var(--green); }
    .name { min-width: 0; }
    .name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
    .name span { display: block; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; margin-top: 5px; }
    .cell { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pill {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      border: 1px solid #344347;
      border-radius: 999px;
      padding: 4px 7px;
      background: #0a0f10;
      color: var(--muted);
      font-size: 11px;
      line-height: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pill.green { color: #c6ffe0; border-color: rgba(53, 208, 139, 0.42); background: rgba(53, 208, 139, 0.08); }
    .pill.blue { color: #cfe4ff; border-color: rgba(98, 166, 255, 0.42); background: rgba(98, 166, 255, 0.08); }
    .pill.amber { color: #ffe2a1; border-color: rgba(242, 193, 95, 0.42); background: rgba(242, 193, 95, 0.08); }
    .pill.red { color: #ffc8c4; border-color: rgba(255, 115, 106, 0.42); background: rgba(255, 115, 106, 0.08); }
    .empty { padding: 34px; color: var(--muted); text-align: center; }
    .detail h2 { margin: 0; font-size: 26px; line-height: 1.08; overflow-wrap: anywhere; }
    .detail .summary { color: var(--muted); line-height: 1.52; margin: 12px 0 0; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0 14px; }
    .section { border-top: 1px solid var(--line); padding-top: 13px; margin-top: 13px; }
    .section-title { color: var(--muted); font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .kv { display: grid; gap: 9px; }
    .kv div { display: grid; gap: 3px; }
    .kv dt { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .kv dd { margin: 0; line-height: 1.4; overflow-wrap: anywhere; }
    @media (max-width: 1260px) {
      .workspace { grid-template-columns: 290px minmax(0, 1fr); }
      .detail { grid-column: 1 / -1; border-top: 1px solid var(--line); max-height: none; }
      main { border-right: 0; }
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 760px) {
      .header-inner, .stats, .workspace { width: min(100vw - 18px, 1560px); }
      .header-inner { grid-template-columns: 1fr; }
      .top-actions { justify-content: flex-start; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .workspace { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--line); }
      .row { grid-template-columns: 1fr; gap: 6px; }
      .table { max-height: none; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="header-inner">
        <div>
          <h1>Indice clinico ICICSO</h1>
          <p class="subtitle">Explorador deduplicado para conceptos medicos, procedimientos, candidatos EO, triggers y bindings. Una etiqueta clinica visible agrupa sus roles y fuentes.</p>
        </div>
        <nav class="top-actions" aria-label="Navegacion">
          <a class="linkbtn primary" href="glossary.html">Glosario</a>
          <a class="linkbtn" href="clinical-concepts.md">Resumen</a>
          <a class="linkbtn" href="generated/clinical-concepts-search.json">JSON</a>
        </nav>
      </div>
    </header>

    <section class="stats" id="stats"></section>

    <section class="workspace">
      <aside>
        <div>
          <label for="query">Buscar</label>
          <input id="query" value="infarto de" autocomplete="off" spellcheck="false">
        </div>
        <div class="quick" aria-label="Busquedas rapidas">
          <button type="button" data-query="infarto de">Infarto</button>
          <button type="button" data-query="queratocono">Queratocono</button>
          <button type="button" data-query="CABG">CABG</button>
          <button type="button" data-query="aorta">Aorta</button>
          <button type="button" data-query="revascularizacion">Revascularizacion</button>
          <button type="button" data-query="valve repair">Valve repair</button>
        </div>
        <div class="filter-grid">
          <div>
            <label for="typeFilter">Tipo</label>
            <select id="typeFilter"></select>
          </div>
          <div>
            <label for="familyFilter">Familia clinica</label>
            <select id="familyFilter"></select>
          </div>
          <div>
            <label for="sourceFilter">Fuente</label>
            <select id="sourceFilter"></select>
          </div>
          <div>
            <label for="statusFilter">Estado</label>
            <select id="statusFilter"></select>
          </div>
          <div>
            <label for="routeFilter">Ruta</label>
            <select id="routeFilter"></select>
          </div>
        </div>
        <div class="switch-row">
          <button id="routeReadyOnly" type="button" aria-pressed="false">Route-ready</button>
          <button id="icicsoOnly" type="button" aria-pressed="false">Solo ICICSO</button>
        </div>
        <div class="status" id="loadStatus"></div>
      </aside>

      <main>
        <div class="results-head">
          <div class="results-title">
            <strong id="resultCount">Resultados</strong>
            <span id="resultHint">Sin duplicados visuales</span>
          </div>
          <span class="pill green" id="modePill">Indice local</span>
        </div>
        <div class="table" id="results"></div>
      </main>

      <section class="detail" id="detail" aria-live="polite"></section>
    </section>
  </div>

  <script>
    window.ICICSO_BROWSER_INDEX = ${browserJson};
  </script>
  <script>
    const TYPE_LABELS = {
      "clinical-condition": "Condicion",
      "clinical-domain": "Dominio",
      "clinical-evidence-source": "Evidencia",
      "clinical-topic": "Topico",
      "diagnosis": "Diagnostico",
      "eo-candidate": "EO candidate",
      "intervention": "Intervencion",
      "medication-class": "Medicamento",
      "outcome": "Outcome",
      "procedure": "Procedimiento",
      "route-action": "Accion",
      "route-trigger": "Trigger",
    };
    const STATUS_LABELS = {
      "icicso-canonical": "ICICSO canonico",
      "icicso-generated": "ICICSO generado",
      "route-ready": "Route-ready",
      "terminology-only": "Terminologia",
    };
    function inflateIndex(index) {
      if (Array.isArray(index.concepts)) return index;
      const fields = index.fields || [];
      const concepts = (index.rows || []).map((row) => {
        const concept = {};
        fields.forEach((field, position) => {
          concept[field] = row[position];
        });
        return concept;
      });
      return { metadata: index.metadata || {}, concepts };
    }
    const BROWSER_INDEX = inflateIndex(window.ICICSO_BROWSER_INDEX || {});
    const state = {
      index: BROWSER_INDEX,
      concepts: BROWSER_INDEX.concepts || [],
      selectedId: null,
      query: "infarto de",
      type: "",
      family: "",
      source: "",
      status: "",
      route: "",
      routeReadyOnly: false,
      icicsoOnly: false,
      loadedFull: false,
    };
    const el = {
      query: document.getElementById("query"),
      type: document.getElementById("typeFilter"),
      family: document.getElementById("familyFilter"),
      source: document.getElementById("sourceFilter"),
      status: document.getElementById("statusFilter"),
      route: document.getElementById("routeFilter"),
      routeReadyOnly: document.getElementById("routeReadyOnly"),
      icicsoOnly: document.getElementById("icicsoOnly"),
      results: document.getElementById("results"),
      detail: document.getElementById("detail"),
      stats: document.getElementById("stats"),
      resultCount: document.getElementById("resultCount"),
      resultHint: document.getElementById("resultHint"),
      loadStatus: document.getElementById("loadStatus"),
      modePill: document.getElementById("modePill"),
    };
    function normalize(value) {
      return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
    }
    function tokens(value) {
      const stop = new Set(["de", "del", "la", "el", "los", "las", "y", "and", "of", "the", "in", "for", "with"]);
      return normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !stop.has(token));
    }
    function conceptText(concept) {
      return normalize([
        concept.label,
        (concept.aliases || []).join(" "),
        (concept.codes || []).join(" "),
        (concept.roles || []).join(" "),
        (concept.sourceSystems || []).join(" "),
        (concept.families || []).join(" "),
        (concept.definitions || []).join(" "),
      ].join(" "));
    }
    function scoreConcept(concept, query) {
      const queryTokens = tokens(query);
      if (!queryTokens.length) return concept.priority || 1;
      const text = conceptText(concept);
      const label = normalize(concept.label);
      const exactQuery = normalize(query);
      let score = 0;
      for (const token of queryTokens) {
        if (!text.includes(token)) return 0;
        if (label.startsWith(token)) score += 55;
        else if (label.includes(token)) score += 34;
        else score += 16;
        if ((concept.codes || []).some((code) => normalize(code) === token)) score += 35;
        if ((concept.aliases || []).some((alias) => normalize(alias).includes(token))) score += 26;
      }
      if (label === exactQuery) score += 180;
      else if (label.startsWith(exactQuery)) score += 30;
      if ((concept.aliases || []).some((alias) => normalize(alias) === exactQuery)) score += 30;
      if (concept.status === "route-ready") score += 30;
      if ((concept.sourceSystems || []).some((source) => source.startsWith("ICICSO"))) score += 18;
      if (concept.primaryType === "diagnosis") score += 58;
      else if (concept.primaryType === "procedure") score += 42;
      else if (concept.primaryType === "intervention") score += 30;
      else if (["clinical-condition", "outcome"].includes(concept.primaryType)) score += 18;
      if (concept.primaryType === "eo-candidate") score -= 52;
      if (label.length > 90) score -= 22;
      if (label.length > 160) score -= 28;
      return score + Math.min(concept.priority || 0, 200) / 20;
    }
    function hasSourceGroup(concept, source) {
      if (!source) return true;
      if (source === "ICICSO") return (concept.sourceSystems || []).some((item) => item.startsWith("ICICSO"));
      return (concept.sourceSystems || []).includes(source);
    }
    function filtered() {
      return state.concepts
        .filter((concept) => !state.type || concept.primaryType === state.type || (concept.roles || []).includes(state.type))
        .filter((concept) => !state.family || concept.family === state.family || (concept.families || []).includes(state.family))
        .filter((concept) => hasSourceGroup(concept, state.source))
        .filter((concept) => !state.status || concept.status === state.status || (concept.statuses || []).includes(state.status))
        .filter((concept) => !state.route || concept.route === state.route || (concept.routes || []).includes(state.route))
        .filter((concept) => !state.routeReadyOnly || concept.status === "route-ready")
        .filter((concept) => !state.icicsoOnly || (concept.sourceSystems || []).some((source) => source.startsWith("ICICSO")))
        .map((concept) => ({ concept, score: scoreConcept(concept, state.query) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.concept.label.localeCompare(b.concept.label, "es"));
    }
    function optionLabel(value) {
      return TYPE_LABELS[value] || STATUS_LABELS[value] || value || "Todos";
    }
    function fillSelect(select, values, allLabel) {
      const current = select.value;
      select.replaceChildren(new Option(allLabel, ""));
      values.filter(Boolean).sort((a, b) => optionLabel(a).localeCompare(optionLabel(b), "es")).forEach((value) => {
        select.append(new Option(optionLabel(value), value));
      });
      select.value = current;
    }
    function renderFilters() {
      const concepts = state.concepts;
      fillSelect(el.type, Array.from(new Set(concepts.flatMap((concept) => concept.roles || [concept.primaryType]))), "Todos los tipos");
      fillSelect(el.family, Array.from(new Set(concepts.flatMap((concept) => concept.families || [concept.family]))), "Todas las familias");
      fillSelect(el.source, ["ICICSO", ...Array.from(new Set(concepts.flatMap((concept) => concept.sourceSystems || [])))], "Todas las fuentes");
      fillSelect(el.status, Array.from(new Set(concepts.flatMap((concept) => concept.statuses || [concept.status]))), "Todos los estados");
      fillSelect(el.route, Array.from(new Set(concepts.flatMap((concept) => concept.routes || [concept.route]))), "Todas las rutas");
    }
    function pill(text, tone) {
      const span = document.createElement("span");
      span.className = "pill" + (tone ? " " + tone : "");
      span.textContent = text;
      return span;
    }
    function tone(concept) {
      if (concept.status === "route-ready") return "green";
      if (concept.status === "terminology-only") return "amber";
      if ((concept.sourceSystems || []).some((source) => source.startsWith("ICICSO"))) return "blue";
      return "";
    }
    function renderStats() {
      const meta = state.index.metadata || {};
      const counts = meta.counts || {};
      const byType = counts.bySemanticType || {};
      const byStatus = counts.byIcicsoStatus || {};
      const items = [
        ["Conceptos repo", meta.conceptCount || 0],
        ["Vista dedup", state.concepts.length],
        ["Diagnosticos", byType.diagnosis || 0],
        ["Procedimientos", byType.procedure || 0],
        ["EO candidates", byType["eo-candidate"] || 0],
        ["Route-ready", byStatus["route-ready"] || 0],
      ];
      el.stats.replaceChildren();
      items.forEach(([label, value]) => {
        const node = document.createElement("div");
        node.className = "stat";
        node.innerHTML = "<strong>" + Number(value || 0).toLocaleString("es-MX") + "</strong><span>" + label + "</span>";
        el.stats.append(node);
      });
    }
    function renderRows(matches) {
      const visible = matches.slice(0, 220);
      el.results.replaceChildren();
      if (!visible.length) {
        el.results.innerHTML = '<div class="empty">Sin resultados. Afloja un filtro o cambia la busqueda.</div>';
        renderDetail(null);
        return;
      }
      if (!visible.some((item) => item.concept.id === state.selectedId)) state.selectedId = visible[0].concept.id;
      visible.forEach(({ concept }) => {
        const button = document.createElement("button");
        button.className = "row" + (concept.id === state.selectedId ? " selected" : "");
        button.type = "button";
        button.dataset.id = concept.id;
        const alias = (concept.aliases || []).slice(0, 3).join(" · ");
        button.innerHTML =
          '<div class="name"><strong>' + escapeHtml(concept.label) + '</strong><span>' + escapeHtml(alias || (concept.definitions || [])[0] || "") + '</span></div>' +
          '<div class="cell">' + escapeHtml(optionLabel(concept.primaryType)) + '</div>' +
          '<div class="cell">' + escapeHtml(concept.family || "general") + '</div>' +
          '<div class="cell"></div>';
        button.lastElementChild.append(pill(concept.status || "sin estado", tone(concept)));
        button.addEventListener("click", () => {
          state.selectedId = concept.id;
          render();
        });
        el.results.append(button);
      });
    }
    function escapeHtml(value) {
      return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function renderChipList(values, empty = "sin datos") {
      const list = (values || []).filter(Boolean);
      if (!list.length) return '<span class="pill">' + empty + '</span>';
      return list.slice(0, 18).map((value) => '<span class="pill">' + escapeHtml(optionLabel(value)) + '</span>').join("");
    }
    function renderDetail(concept) {
      el.detail.replaceChildren();
      if (!concept) {
        el.detail.innerHTML = '<div class="empty">Selecciona un concepto.</div>';
        return;
      }
      const summary = (concept.definitions || [])[0] || "Concepto agregado desde una o mas fuentes del repo.";
      el.detail.innerHTML =
        '<h2>' + escapeHtml(concept.label) + '</h2>' +
        '<div class="badge-row">' +
          '<span class="pill ' + tone(concept) + '">' + escapeHtml(optionLabel(concept.primaryType)) + '</span>' +
          '<span class="pill">' + escapeHtml(concept.status || "sin estado") + '</span>' +
          '<span class="pill">' + escapeHtml(concept.route || "sin ruta") + '</span>' +
          '<span class="pill">' + Number(concept.count || 1).toLocaleString("es-MX") + ' menciones agrupadas</span>' +
        '</div>' +
        '<p class="summary">' + escapeHtml(summary) + '</p>' +
        '<div class="section"><div class="section-title">Roles agrupados</div><div class="chips">' + renderChipList(concept.roles) + '</div></div>' +
        '<div class="section"><div class="section-title">Codigos</div><div class="chips">' + renderChipList(concept.codes, "sin codigo") + '</div></div>' +
        '<div class="section"><div class="section-title">Alias</div><div class="chips">' + renderChipList(concept.aliases, "sin alias") + '</div></div>' +
        '<div class="section"><div class="section-title">Fuentes</div><div class="chips">' + renderChipList(concept.sourceSystems) + '</div></div>' +
        '<div class="section"><div class="section-title">Familias clinicas</div><div class="chips">' + renderChipList(concept.families, "sin familia") + '</div></div>' +
        '<div class="section"><div class="section-title">Evidencia / rutas</div><dl class="kv">' +
          '<div><dt>Links</dt><dd>' + escapeHtml((concept.evidenceLinks || []).slice(0, 8).join(" | ") || "sin enlace directo") + '</dd></div>' +
          '<div><dt>Archivos</dt><dd>' + escapeHtml((concept.sourcePaths || []).slice(0, 6).join(" | ") || "sin archivo") + '</dd></div>' +
        '</dl></div>';
    }
    function render() {
      const matches = filtered();
      el.resultCount.textContent = matches.length.toLocaleString("es-MX") + " conceptos visibles";
      el.resultHint.textContent = matches.length > 220 ? "Mostrando 220 mejor rankeados; afina la busqueda para reducir." : "Vista deduplicada.";
      renderRows(matches);
      renderDetail((matches.find((item) => item.concept.id === state.selectedId) || matches[0] || {}).concept || null);
      el.routeReadyOnly.setAttribute("aria-pressed", String(state.routeReadyOnly));
      el.icicsoOnly.setAttribute("aria-pressed", String(state.icicsoOnly));
      el.modePill.textContent = "Indice local dedup";
      el.loadStatus.textContent = "Vista file:// lista: conceptos agrupados sin duplicados visuales. El JSON completo queda disponible en docs/generated para engines.";
    }
    function wire() {
      let timer = null;
      el.query.addEventListener("input", (event) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          state.query = event.target.value;
          state.selectedId = null;
          render();
        }, 90);
      });
      [["type", el.type], ["family", el.family], ["source", el.source], ["status", el.status], ["route", el.route]].forEach(([key, node]) => {
        node.addEventListener("change", () => {
          state[key] = node.value;
          state.selectedId = null;
          render();
        });
      });
      el.routeReadyOnly.addEventListener("click", () => {
        state.routeReadyOnly = !state.routeReadyOnly;
        state.selectedId = null;
        render();
      });
      el.icicsoOnly.addEventListener("click", () => {
        state.icicsoOnly = !state.icicsoOnly;
        state.selectedId = null;
        render();
      });
      document.querySelectorAll("[data-query]").forEach((button) => {
        button.addEventListener("click", () => {
          state.query = button.dataset.query;
          el.query.value = state.query;
          state.selectedId = null;
          render();
        });
      });
    }
    async function loadFullIndex() {
      render();
    }
    renderStats();
    renderFilters();
    wire();
    render();
    loadFullIndex();
  </script>
</body>
</html>
`;

  await writeFile(paths.outputHtml, html, "utf8");
}

async function main() {
  await extractIcd10();
  await extractPcs();
  await extractAtc();
  await extractMeshStatus();
  await extractOntologyCatalogs();
  await extractJsonClinicalFiles(paths.seedDir, "ICICSO_SEED");
  await extractJsonClinicalFiles(paths.examplesDir, "ICICSO_EXAMPLE");
  await extractDashboardEoCandidates();
  await extractGhlService();
  await extractCpoCase();
  await extractCabgEvidencePack();

  const allConcepts = [...concepts.values()].sort((a, b) => {
    const sourceCompare = a.sourceSystem.localeCompare(b.sourceSystem);
    if (sourceCompare !== 0) return sourceCompare;
    return a.label.localeCompare(b.label);
  });
  const metadata = buildMetadata(allConcepts);

  await writeClinicalJson(allConcepts, metadata);
  await writeClinicalMarkdown(allConcepts, metadata);
  await writeClinicalHtml(allConcepts, metadata);

  console.log(`Generated ${toRepoPath(paths.outputJson)} with ${allConcepts.length} clinical concepts.`);
  console.log(`Generated ${toRepoPath(paths.outputSearchJson)} for autocomplete/search.`);
  console.log(`Generated ${toRepoPath(paths.outputMarkdown)}.`);
  console.log(`Generated ${toRepoPath(paths.outputHtml)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
