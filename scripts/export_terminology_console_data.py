from __future__ import annotations

import csv
from html import escape
import json
import re
import tarfile
import xml.etree.ElementTree as ET
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = REPO_ROOT / "ICICSO_TERMINOLOGIAS" / "01_RAW"
STATE_PATH = REPO_ROOT / "ICICSO_TERMINOLOGIAS" / "00_METADATA" / "download_state.json"
SOURCE_CATALOG_PATH = REPO_ROOT / "ICICSO_TERMINOLOGIAS" / "00_METADATA" / "sources_catalog.tsv"
OUTPUT_PATH = REPO_ROOT / "dashboard" / "generated" / "terminology_console_data.js"
REPORT_PATH = REPO_ROOT / "dashboard" / "generated" / "terminology_sync_report_latest.html"

CATALOG: dict[str, dict[str, object]] = {
    "ICD10": {
        "short_desc": "Clasificacion internacional de enfermedades para diagnosticos y causas.",
        "domain": "diagnosticos",
        "scope": "codificacion clinica y estadistica",
        "future_role": "base diagnostica historica y comparativa",
    },
    "ICD11": {
        "short_desc": "Version mas reciente de la clasificacion internacional de enfermedades de WHO.",
        "domain": "diagnosticos",
        "scope": "clasificacion clinica moderna y analitica",
        "future_role": "migracion diagnostica y analitica futura",
    },
    "ICD10_TO_ICD11": {
        "short_desc": "Tabla de mapeo o transición entre ICD-10 e ICD-11.",
        "domain": "diagnosticos",
        "scope": "migracion, equivalencias y analitica longitudinal",
        "future_role": "puente de transición entre clasificaciones",
    },
    "ICD10_CM": {
        "short_desc": "Modificación clínica de ICD-10 usada en Estados Unidos para diagnósticos.",
        "domain": "diagnosticos",
        "scope": "billing, claims y documentación diagnóstica en EEUU",
        "future_role": "cobertura de codificación clínica estadounidense",
    },
    "ICD10_PCS": {
        "short_desc": "Sistema de codificación de procedimientos hospitalarios de Estados Unidos.",
        "domain": "procedimientos",
        "scope": "procedimientos inpatient y analítica hospitalaria en EEUU",
        "future_role": "cobertura de procedimientos hospitalarios",
    },
    "LOINC": {
        "short_desc": "Nomenclatura universal para observaciones, laboratorio, encuestas y mediciones.",
        "domain": "observacionales",
        "scope": "laboratorio, signos, cuestionarios y resultados",
        "future_role": "pieza central para observacionales y resultados",
    },
    "SNOMED_CT": {
        "short_desc": "Terminologia clinica amplia para conceptos, hallazgos, procedimientos y contexto.",
        "domain": "clinica",
        "scope": "semantica clinica fina y modelado conceptual",
        "future_role": "normalizacion semantica transversal",
    },
    "SNOMED_CT_INTERNATIONAL": {
        "short_desc": "Edición internacional base de SNOMED CT.",
        "domain": "clinica",
        "scope": "núcleo semántico clínico internacional",
        "future_role": "base autorizada de normalización clínica",
    },
    "SNOMED_CT_SPANISH": {
        "short_desc": "Edición en español de SNOMED CT publicada por SNOMED International.",
        "domain": "clinica",
        "scope": "uso clínico y terminológico en español",
        "future_role": "capa semántica clínica multilingüe",
    },
    "RXNORM": {
        "short_desc": "Normalizacion de medicamentos clinicos y sus variantes prescribibles.",
        "domain": "medicacion",
        "scope": "farmacos, ingredientes, presentaciones y relaciones",
        "future_role": "interoperabilidad farmacologica",
    },
    "RXNORM_FULL": {
        "short_desc": "Liberación mensual completa de RxNorm.",
        "domain": "medicacion",
        "scope": "farmacos, relaciones y fuentes suplementarias",
        "future_role": "normalización farmacológica completa",
    },
    "RXNORM_PRESCRIBABLE": {
        "short_desc": "Subconjunto prescribible de RxNorm con contenido actualmente comercializado.",
        "domain": "medicacion",
        "scope": "prescripción y consumo farmacéutico en EEUU",
        "future_role": "perfil farmacológico operativo",
    },
    "UCUM": {
        "short_desc": "Sistema de codigos de unidades de medida computables.",
        "domain": "observacionales",
        "scope": "unidades y magnitudes medibles",
        "future_role": "soporte para resultados observacionales consistentes",
    },
    "ATC_DDD": {
        "short_desc": "Clasificacion terapeutica de medicamentos y dosis diaria definida.",
        "domain": "medicacion",
        "scope": "agrupacion farmacoepidemiologica y analitica",
        "future_role": "analisis de consumo y agrupacion terapeutica",
    },
    "HL7_THO": {
        "short_desc": "Paquete de artefactos terminologicos compartidos por HL7 y FHIR.",
        "domain": "interoperabilidad",
        "scope": "CodeSystems, ValueSets y artefactos de intercambio",
        "future_role": "base de interoperabilidad y bindings",
    },
    "HL7_FHIR_R5": {
        "short_desc": "Definiciones oficiales del estándar HL7 FHIR Release 5.",
        "domain": "interoperabilidad",
        "scope": "profiles, value sets y recursos base de FHIR R5",
        "future_role": "motor de validación y bindings FHIR",
    },
    "HCPCS_LEVEL_II": {
        "short_desc": "Código estadounidense para suministros, equipo, drogas y servicios no cubiertos por CPT.",
        "domain": "billing",
        "scope": "claims, DMEPOS, suministros y servicios",
        "future_role": "codificación administrativa y de facturación",
    },
    "CPT": {
        "short_desc": "Terminología de procedimientos y servicios médicos mantenida por AMA.",
        "domain": "billing",
        "scope": "procedimientos, servicios médicos y reclamaciones en EEUU",
        "future_role": "cobertura de facturación profesional",
    },
    "MESH": {
        "short_desc": "Tesauro biomédico de NLM usado para indexación e investigación.",
        "domain": "conocimiento",
        "scope": "indexación bibliográfica y enriquecimiento semántico",
        "future_role": "puente entre clínica, búsqueda y evidencia",
    },
    "UNII_GSRS": {
        "short_desc": "Identificadores únicos de sustancias reguladas bajo GSRS/UNII.",
        "domain": "sustancias",
        "scope": "ingredientes, sustancias reguladas y productos",
        "future_role": "normalización de sustancias e ingredientes",
    },
    "FHIR_IMPLEMENTATION_REGISTRY": {
        "short_desc": "Registro oficial de IGs FHIR publicados y artefactos de conformidad.",
        "domain": "interoperabilidad",
        "scope": "implementation guides, conformance y artefactos publicados",
        "future_role": "hub de descubrimiento para perfiles FHIR",
    },
    "CDA_R2_CORE": {
        "short_desc": "Arquitectura documental clinica CDA R2.0 y extensiones oficiales.",
        "domain": "interoperabilidad",
        "scope": "documentos clinicos CDA, schemas y StructureDefinitions",
        "future_role": "soporte documental CDA y migracion hacia FHIR",
    },
    "CDA_VALUE_SETS": {
        "short_desc": "Value sets de la familia CDA publicados en HL7 Terminology.",
        "domain": "interoperabilidad",
        "scope": "vocabularios CDA y codificaciones V3 heredadas",
        "future_role": "bindings CDA y compatibilidad documental",
    },
    "CCDA_ON_FHIR": {
        "short_desc": "IG de mapeo entre C-CDA y FHIR.",
        "domain": "interoperabilidad",
        "scope": "mapeos C-CDA to FHIR y FHIR to C-CDA",
        "future_role": "coexistencia documental y recursos FHIR",
    },
    "US_CORE": {
        "short_desc": "Perfiles FHIR US Core para USCDI e interoperabilidad minima en EEUU.",
        "domain": "interoperabilidad",
        "scope": "profiles, terminology, capability statements y downloads",
        "future_role": "base de integracion FHIR regulada en EEUU",
    },
    "SMART_APP_LAUNCH": {
        "short_desc": "Guia de autorizacion y lanzamiento de apps SMART on FHIR.",
        "domain": "interoperabilidad",
        "scope": "OAuth, launch context, scopes y .well-known/smart-configuration",
        "future_role": "lanzamiento seguro de apps clinicas sobre FHIR",
    },
}

OPERATIONS = [
    {
        "id": "sync_once",
        "label": "Correr sync 1 ciclo",
        "description": "Ejecuta un ciclo no interactivo del downloader.",
        "command": r"powershell -ExecutionPolicy Bypass -File .\scripts\start-terminology-sync.ps1 -Cycles 1 -SleepSeconds 1 -NonInteractive",
    },
    {
        "id": "sync_full",
        "label": "Correr sync 3 ciclos",
        "description": "Hace varios intentos seguidos para refrescar fuentes y estado.",
        "command": r"powershell -ExecutionPolicy Bypass -File .\scripts\start-terminology-sync.ps1 -Cycles 3 -SleepSeconds 30 -NonInteractive",
    },
    {
        "id": "export_console",
        "label": "Regenerar consola",
        "description": "Reconstruye el dataset JS que consume la consola HTML.",
        "command": r"py .\scripts\export_terminology_console_data.py",
    },
]

ROADMAP = [
    {
        "track": "observacionales",
        "summary": "LOINC y UCUM seran el nucleo para laboratorios, signos vitales, cuestionarios y resultados.",
    },
    {
        "track": "diagnosticos",
        "summary": "ICD10 e ICD11 cubriran clasificacion diagnostica y comparacion longitudinal.",
    },
    {
        "track": "clinica_semantica",
        "summary": "SNOMED CT ampliara expresividad para hallazgos, procedimientos y contexto clinico.",
    },
    {
        "track": "medicacion",
        "summary": "RXNORM y ATC_DDD cubriran normalizacion clinica y analitica de medicamentos.",
    },
    {
        "track": "interoperabilidad",
        "summary": "HL7 THO servira para bindings, ValueSets y CodeSystems en flujos FHIR.",
    },
    {
        "track": "billing_eeuu",
        "summary": "ICD-10-CM, ICD-10-PCS, HCPCS Level II y CPT cubriran el frente administrativo y de claims de Estados Unidos.",
    },
    {
        "track": "sustancias_y_evidencia",
        "summary": "UNII/GSRS y MeSH ampliaran trazabilidad de ingredientes, sustancias y conocimiento biomédico.",
    },
]


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def load_source_catalog() -> dict[str, dict[str, str]]:
    if not SOURCE_CATALOG_PATH.exists():
        return {}

    with SOURCE_CATALOG_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))

    catalog: dict[str, dict[str, str]] = {}
    for row in rows:
        dataset_id = (row.get("dataset_id") or "").strip()
        if not dataset_id:
            continue
        catalog[dataset_id] = {
            "source_id": row.get("source_id", ""),
            "title": row.get("estandar", "") or dataset_id,
            "family": row.get("familia", ""),
            "specialty": row.get("especialidad", ""),
            "subtopic": row.get("subtema", ""),
            "standard": row.get("estandar", ""),
            "principal_file": row.get("archivo_principal", ""),
            "version_or_date": row.get("version_o_fecha", ""),
            "format": row.get("formato", ""),
            "official_source": row.get("fuente_oficial", ""),
            "official_url": row.get("enlace_oficial", ""),
            "access_license": row.get("acceso_o_licencia", ""),
            "priority": row.get("prioridad", ""),
            "source_notes": row.get("notas", ""),
            "operational_status": row.get("estado_operativo", ""),
            "download_observation": row.get("observacion_de_descarga", ""),
            "db_target": row.get("db_target", ""),
            "ingest_strategy": row.get("ingest_strategy", ""),
        }
    return catalog


def enrich(dataset: dict) -> dict:
    source_catalog = load_source_catalog()
    dataset_id = str(dataset.get("id"))
    source_meta = source_catalog.get(dataset_id, {})
    meta = CATALOG.get(dataset_id, {})
    return {**source_meta, **meta, **dataset}


def build_icd10_dataset() -> dict:
    path = RAW_ROOT / "ICD10" / "icd10_claml.xml"
    rows: list[dict[str, str]] = []
    total = 0
    if path.exists():
        tree = ET.parse(path)
        root = tree.getroot()
        for cls in root.findall(".//{*}Class"):
            code = (cls.attrib.get("code") or "").strip()
            if not code:
                continue
            preferred = ""
            kind = ""
            for rub in cls.findall(".//{*}Rubric"):
                label = " ".join("".join(rub.itertext()).split())
                if label:
                    preferred = label
                    kind = (rub.attrib.get("kind") or "").strip()
                    break
            rows.append(
                {
                    "code": code,
                    "label": preferred,
                    "rubric_kind": kind,
                    "parent": (cls.attrib.get("superclass") or "").strip(),
                    "usage": (cls.attrib.get("usage") or "").strip(),
                }
            )
        total = len(rows)
    return enrich({
        "id": "ICD10",
        "title": "WHO ICD-10 ClaML",
        "kind": "downloaded",
        "columns": ["code", "label", "rubric_kind", "parent", "usage"],
        "rows": rows,
        "row_count": total,
        "path": str(path),
    })


def build_atc_dataset() -> dict:
    path = RAW_ROOT / "ATC_DDD" / "atc_index.csv"
    rows: list[dict[str, str]] = []
    if path.exists():
      with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return enrich({
        "id": "ATC_DDD",
        "title": "ATC/DDD Index",
        "kind": "downloaded",
        "columns": ["code", "name"],
        "rows": rows,
        "row_count": len(rows),
        "path": str(path),
    })


def infer_hl7_type(name: str) -> str:
    stem = Path(name).name
    if stem.startswith("CodeSystem-"):
        return "CodeSystem"
    if stem.startswith("ValueSet-"):
        return "ValueSet"
    if stem.startswith("ConceptMap-"):
        return "ConceptMap"
    if stem.startswith("NamingSystem-"):
        return "NamingSystem"
    if stem.startswith("StructureDefinition-"):
        return "StructureDefinition"
    if stem.startswith("ImplementationGuide-"):
        return "ImplementationGuide"
    if stem.startswith("List-"):
        return "List"
    return Path(name).suffix.lstrip(".").upper() or "FILE"


def build_hl7_dataset() -> dict:
    path = RAW_ROOT / "HL7_THO" / "tho.tgz"
    rows: list[dict[str, str]] = []
    package_meta: dict[str, object] = {}
    if path.exists():
        with tarfile.open(path, "r:gz") as archive:
            for member_name in archive.getnames():
                if member_name.endswith("/"):
                    continue
                rows.append(
                    {
                        "member": member_name,
                        "resource_hint": infer_hl7_type(member_name),
                        "folder": str(Path(member_name).parent),
                    }
                )
            package_member = archive.extractfile("package/package.json")
            if package_member is not None:
                package_data = json.load(package_member)
                package_meta = {
                    "name": package_data.get("name"),
                    "version": package_data.get("version"),
                    "description": package_data.get("description"),
                    "fhirVersions": package_data.get("fhirVersions"),
                }
    return enrich({
        "id": "HL7_THO",
        "title": "HL7 Terminology Package",
        "kind": "downloaded",
        "columns": ["member", "resource_hint", "folder"],
        "rows": rows,
        "row_count": len(rows),
        "path": str(path),
        "package": package_meta,
    })


def build_ucum_dataset() -> dict:
    path = RAW_ROOT / "UCUM" / "ucum.xml"
    preview: list[dict[str, str]] = []
    classification = "missing"
    if path.exists():
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "<!DOCTYPE html" in text or "<html" in text.lower():
            classification = "html_payload"
            preview = [
                {"signal": "<!DOCTYPE html>", "meaning": "payload HTML, no XML semántico"},
                {"signal": "<title>UCUM / UCUM Specification</title>", "meaning": "snapshot de página web"},
                {"signal": "wp-json / jquery / theme", "meaning": "marcas CMS detectadas en el payload"},
            ]
        else:
            classification = "xml_payload"
            matches = re.finditer(r"<(base-unit|unit)\b[^>]*Code=\"([^\"]+)\"[^>]*>", text)
            for idx, match in enumerate(matches):
                preview.append(
                    {
                        "signal": match.group(1),
                        "meaning": match.group(2),
                    }
                )
                if idx >= 24:
                    break
    return enrich({
        "id": "UCUM",
        "title": "UCUM Payload Review",
        "kind": "qa",
        "columns": ["signal", "meaning"],
        "rows": preview,
        "row_count": len(preview),
        "path": str(path),
        "classification": classification,
    })


def build_payload() -> dict:
    state = load_state().get("datasets", {})
    source_catalog = load_source_catalog()
    datasets = [
        build_icd10_dataset(),
        build_atc_dataset(),
        build_hl7_dataset(),
        build_ucum_dataset(),
    ]
    dataset_ids = sorted(
        set(source_catalog.keys()) | set(state.keys()),
        key=lambda item: source_catalog.get(item, {}).get("source_id", item),
    )
    enriched_state = {}
    for dataset_id in dataset_ids:
        existing = state.get(dataset_id, {})
        source_meta = source_catalog.get(dataset_id, {})
        base_meta = CATALOG.get(dataset_id, {})
        if existing:
            value = existing
        else:
            value = {
                "attempts": 0,
                "status": "skipped",
                "path": "",
                "url": source_meta.get("official_url"),
                "bytes": 0,
                "mode": "public",
                "note": source_meta.get("download_observation") or source_meta.get("source_notes"),
                "last_error": source_meta.get("download_observation") or None,
            }
        enriched_state[dataset_id] = {**source_meta, **base_meta, **value}
    return {
        "generated_from": "scripts/export_terminology_console_data.py",
        "source_catalog_path": str(SOURCE_CATALOG_PATH),
        "report_path": str(REPORT_PATH),
        "state": enriched_state,
        "datasets": datasets,
        "operations": OPERATIONS,
        "roadmap": ROADMAP,
    }


def status_label(value: str) -> str:
    return (value or "skipped").replace("_", " ").upper()


def status_class(value: str) -> str:
    if value == "success":
        return "success"
    if value == "awaiting_credentials":
        return "awaiting_credentials"
    if value == "manual_required":
        return "manual_required"
    if value == "failed":
        return "failed"
    return "skipped"


def local_uri(path: Path) -> str:
    try:
        return path.resolve().as_uri()
    except ValueError:
        return str(path)


def render_report(payload: dict) -> str:
    state = payload.get("state", {})
    entries = list(state.items())
    counts: dict[str, int] = {}
    for _, value in entries:
        status = str(value.get("status", "skipped"))
        counts[status] = counts.get(status, 0) + 1

    rows = []
    for dataset_id, value in entries:
        status = str(value.get("status", "skipped"))
        detail_bits = [
            value.get("download_observation") or value.get("note") or value.get("last_error") or "",
            value.get("source_notes") or "",
        ]
        detail = " ".join(bit for bit in detail_bits if bit).strip()
        url = value.get("official_url") or value.get("url") or ""
        if url:
            link = f'<a href="{escape(str(url))}">{escape(str(url))}</a>'
        else:
            link = "N/A"
        rows.append(
            "<tr>"
            f"<td><strong>{escape(dataset_id)}</strong><span>{escape(str(value.get('title') or value.get('standard') or dataset_id))}</span></td>"
            f"<td><span class=\"status {status_class(status)}\">{status_label(status)}</span></td>"
            f"<td>{escape(str(value.get('attempts', 0)))}</td>"
            f"<td>{escape(str(value.get('version_or_date') or 'N/A'))}</td>"
            f"<td>{escape(str(value.get('bytes', 0)))}</td>"
            f"<td>{link}</td>"
            f"<td>{escape(detail or 'Sin observacion adicional.')}</td>"
            "</tr>"
        )

    metrics = [
        ("datasets monitoreados", len(entries)),
        ("success", counts.get("success", 0)),
        ("awaiting_credentials", counts.get("awaiting_credentials", 0)),
        ("manual_required", counts.get("manual_required", 0)),
        ("skipped/tracked", counts.get("skipped", 0)),
        ("failed", counts.get("failed", 0)),
    ]
    metric_html = "\n".join(
        f'<div class="metric"><strong>{value}</strong>{escape(label)}</div>'
        for label, value in metrics
    )
    rows_html = "\n".join(rows)
    generated_at = "2026-04-26"
    console_uri = local_uri(OUTPUT_PATH.parent / "terminology_content_showcase.html")
    state_uri = local_uri(STATE_PATH)
    catalog_uri = local_uri(SOURCE_CATALOG_PATH)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte de Sync de Terminologias ICICSO</title>
  <link rel="stylesheet" href="../assets/icicso-palette.css">
  <style>
    :root {{
      --bg: var(--icicso-bg);
      --card: var(--icicso-panel);
      --text: var(--icicso-ink);
      --muted: var(--icicso-ink-soft);
      --line: var(--icicso-line);
      --accent: var(--icicso-accent);
      --success: var(--icicso-ok);
      --warning: var(--icicso-warn);
      --manual: #8a6ac8;
      --danger: var(--icicso-bad);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: linear-gradient(180deg, #08161a 0%, #041015 100%);
      color: var(--text);
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: 18px;
      line-height: 1.55;
    }}
    .page {{ max-width: 1480px; margin: 0 auto; padding: 28px 20px 52px; }}
    .hero, .card {{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
    }}
    .hero {{ padding: 30px; margin-bottom: 22px; }}
    h1, h2 {{ margin: 0 0 12px; line-height: 1.22; }}
    h1 {{ font-size: 2rem; }}
    h2 {{ font-size: 1.25rem; }}
    p {{ margin: 0; color: var(--muted); max-width: 1040px; }}
    a {{ color: var(--accent); text-decoration: none; word-break: break-word; }}
    a:hover {{ text-decoration: underline; }}
    .actions {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }}
    .btn {{
      display: inline-flex; align-items: center; min-height: 42px; padding: 9px 14px;
      border: 1px solid var(--line); border-radius: 999px; color: var(--text);
      background: rgba(255,255,255,0.04); font-weight: 700;
    }}
    .btn.primary {{ border-color: rgba(95, 201, 187, 0.42); color: #9de9de; background: rgba(95, 201, 187, 0.14); }}
    .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 22px; }}
    .metric {{ border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: rgba(255,255,255,0.03); color: var(--muted); }}
    .metric strong {{ display: block; color: var(--text); font-size: 1.8rem; line-height: 1.1; margin-bottom: 4px; }}
    .card {{ padding: 22px; }}
    .table-wrap {{ overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }}
    table {{ border-collapse: collapse; width: 100%; min-width: 1260px; }}
    th, td {{ padding: 13px 12px; border-bottom: 1px solid #e7e0d5; vertical-align: top; text-align: left; }}
    th {{ color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.035); }}
    td span {{ display: block; color: var(--muted); font-size: 0.88rem; margin-top: 4px; }}
    tr:last-child td {{ border-bottom: 0; }}
    .status {{ display: inline-block; padding: 6px 9px; border-radius: 999px; color: #fff; font-size: 0.78rem; font-weight: 800; white-space: nowrap; }}
    .success {{ background: var(--success); }}
    .awaiting_credentials {{ background: var(--warning); color: #1d1600; }}
    .manual_required {{ background: var(--manual); }}
    .failed {{ background: var(--danger); }}
    .skipped {{ background: #5f6b75; }}
    .note {{ margin-top: 14px; color: var(--muted); }}
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>Reporte de Sync de Terminologias ICICSO</h1>
      <p>Estado consolidado al {generated_at}. El reporte cruza el estado operativo local con el catalogo oficial de fuentes, versiones, licencias y rutas de ingestion para medir que falta para bajar e integrar las terminologias en bases utilizables.</p>
      <div class="actions">
        <a class="btn primary" href="{console_uri}">Abrir consola/buscador</a>
        <a class="btn" href="{state_uri}">Ver estado JSON</a>
        <a class="btn" href="{catalog_uri}">Ver catalogo TSV</a>
      </div>
      <div class="summary">
        {metric_html}
      </div>
    </section>
    <section class="card">
      <h2>Resultado por fuente</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Status</th>
              <th>Intentos</th>
              <th>Version/fecha objetivo</th>
              <th>Bytes</th>
              <th>Fuente oficial</th>
              <th>Observacion</th>
            </tr>
          </thead>
          <tbody>
            {rows_html}
          </tbody>
        </table>
      </div>
      <p class="note">Los datasets con licencia o cuenta requerida quedan trazados, pero no se descargan intentando saltar autorizaciones. Los web registries e IGs sin binario unico se reportan como tracked/skipped hasta implementar un importador especifico.</p>
    </section>
  </div>
</body>
</html>
"""


def main() -> int:
    payload = build_payload()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        "window.TERMINOLOGY_CONSOLE_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    REPORT_PATH.write_text(render_report(payload), encoding="utf-8")
    print(f"written={OUTPUT_PATH}")
    print(f"written={REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
