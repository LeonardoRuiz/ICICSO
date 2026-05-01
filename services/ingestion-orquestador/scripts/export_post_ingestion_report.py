from __future__ import annotations

import argparse
import csv
import html
import sys
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.config import get_settings
from app.persistence.database import initialize_database
from app.services.audit_report_service import AuditReportService
from app.services.document_ingestion_service import DocumentIngestionService


def _format_weight_label(weight: str | None, score: float | None) -> str:
    if weight and score is not None:
        return f"{weight} ({score:.2f})"
    return weight or "-"


def _format_trigger_constraints(rec) -> str | None:
    constraints = rec.execution_model.trigger_model.constraints
    if not constraints:
        return None
    return " | ".join(
        f"{item.constraint_type}:{item.label}"
        + (f" [{item.operator}]" if item.operator else "")
        + (f" -> {item.value}" if item.value and item.value != item.label else "")
        for item in constraints
    )


def _format_entities(rec) -> str | None:
    if not rec.clinical_entities:
        return None
    return " | ".join(f"{entity.entity_type}:{entity.label}" for entity in rec.clinical_entities)


def _format_numeric_thresholds(rec) -> str | None:
    if not rec.numeric_thresholds:
        return None
    return " | ".join(
        f"{item.label}"
        + (f" ({item.metric})" if item.metric else "")
        for item in rec.numeric_thresholds
    )


def _format_trigger_model(rec) -> str | None:
    bits = [
        f"population={rec.execution_model.trigger_model.population}" if rec.execution_model.trigger_model.population else None,
        f"state={rec.execution_model.trigger_model.clinical_state}" if rec.execution_model.trigger_model.clinical_state else None,
        f"disease={rec.execution_model.trigger_model.disease}" if rec.execution_model.trigger_model.disease else None,
        f"time={rec.execution_model.trigger_model.time_constraint}" if rec.execution_model.trigger_model.time_constraint else None,
        f"anchor={rec.execution_model.trigger_model.event_anchor}" if rec.execution_model.trigger_model.event_anchor else None,
        f"exclusions={'; '.join(rec.execution_model.trigger_model.exclusions)}" if rec.execution_model.trigger_model.exclusions else None,
        f"numeric={'; '.join(item.label for item in rec.execution_model.trigger_model.numeric_constraints)}" if rec.execution_model.trigger_model.numeric_constraints else None,
        f"qualifiers={'; '.join(rec.execution_model.trigger_model.qualifiers)}" if rec.execution_model.trigger_model.qualifiers else None,
    ]
    return " | ".join(bit for bit in bits if bit) or None


def _html_attr(value: str | None) -> str:
    if value is None:
        return ""
    return html.escape(value, quote=True)


def _slug(value: str | None) -> str:
    raw = (value or "unknown").strip().lower()
    return "".join(char if char.isalnum() else "-" for char in raw).strip("-") or "unknown"


def _count_chart(title: str, counts: Counter[str], *, limit: int = 8) -> str:
    items = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]
    if not items:
        return (
            f'<div class="chart-card"><h3>{html.escape(title)}</h3>'
            '<p class="muted">Sin datos estructurados.</p></div>'
        )
    max_count = max(count for _, count in items) or 1
    rows = "".join(
        '<div class="chart-row">'
        f'<span>{html.escape(label)}</span>'
        f'<div class="chart-track"><i style="width:{max(6, round((count / max_count) * 100))}%"></i></div>'
        f'<strong>{count}</strong>'
        '</div>'
        for label, count in items
    )
    return f'<div class="chart-card"><h3>{html.escape(title)}</h3>{rows}</div>'


def build_html(document_id: str) -> tuple[str, int, int]:
    settings = get_settings()
    initialize_database(settings.sqlite_path)
    ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
    audit = AuditReportService(settings=settings, database_path=settings.sqlite_path)

    materialized = ingestion.materialize_continuum(document_id)
    if materialized is None:
        raise ValueError(f"Document not found: {document_id}")
    report = audit.get_report(document_id)
    topic_ranking = ingestion.build_clinical_topic_ranking(document_id)
    topic_conflicts = ingestion.build_clinical_topic_conflicts(document_id)
    recommendation_weight_counts = Counter(rec.information_weight or "unknown" for rec in materialized.guideline_recommendations)
    candidate_type_counts = Counter(candidate.eo_type or "unknown" for candidate in materialized.eo_candidates)
    candidate_weight_counts = Counter(candidate.information_weight or "unknown" for candidate in materialized.eo_candidates)
    recommendation_topic_counts = Counter(rec.clinical_topic or "General Coronary Revascularization" for rec in materialized.guideline_recommendations)
    recommendation_weight_chart = _count_chart("Recomendaciones por peso", recommendation_weight_counts)
    candidate_type_chart = _count_chart("EO candidates por tipo", candidate_type_counts)
    recommendation_topic_chart = _count_chart("Temas clinicos dominantes", recommendation_topic_counts)

    recommendation_rows: list[str] = []
    for rec in materialized.guideline_recommendations:
        clinical_topic = rec.clinical_topic or "General Coronary Revascularization"
        recommendation_rows.append(
            f"""<tr class="recommendation-row"
data-cor="{_html_attr(rec.recommendation_class or '')}"
data-loe="{_html_attr(rec.level_of_evidence or '')}"
data-weight="{_html_attr(rec.information_weight or '')}"
data-confidence="{_html_attr(f'{rec.extraction_confidence:.2f}' if rec.extraction_confidence is not None else '')}"
data-disease="{_html_attr(rec.disease or '')}"
data-topic="{_html_attr(clinical_topic)}"
data-family="{_html_attr(rec.document_family or '')}"
data-text="{_html_attr(' '.join(filter(None, [rec.statement_key, rec.recommendation_text, rec.population, rec.disease, rec.intervention, rec.source_locator, _format_trigger_constraints(rec), _format_entities(rec)])))}"
data-key="{_html_attr(rec.statement_key)}"
data-title="{_html_attr(rec.canonical_title)}"
data-recommendation="{_html_attr(rec.recommendation_text)}"
data-population="{_html_attr(rec.population or '')}"
data-clinical-state="{_html_attr(rec.clinical_state or '')}"
data-disease-full="{_html_attr(rec.disease or '')}"
data-time-window="{_html_attr(rec.time_window or '')}"
data-event-anchor="{_html_attr(rec.event_anchor or '')}"
data-thresholds="{_html_attr(_format_numeric_thresholds(rec) or '')}"
data-intervention="{_html_attr(rec.intervention or '')}"
data-outcome="{_html_attr(rec.outcome or '')}"
data-conditions="{_html_attr('; '.join(rec.conditions) if rec.conditions else '')}"
data-exclusions="{_html_attr('; '.join(rec.exclusions) if rec.exclusions else '')}"
data-trigger="{_html_attr(rec.execution_model.trigger or '')}"
data-trigger-model="{_html_attr(_format_trigger_model(rec) or '')}"
data-trigger-constraints="{_html_attr(_format_trigger_constraints(rec) or '')}"
data-execution-action="{_html_attr(rec.execution_model.action or '')}"
data-execution-prerequisites="{_html_attr('; '.join(rec.execution_model.prerequisites) if rec.execution_model.prerequisites else '')}"
data-execution-contraindications="{_html_attr('; '.join(rec.execution_model.contraindications) if rec.execution_model.contraindications else '')}"
data-execution-outcome="{_html_attr(rec.execution_model.intended_outcome or '')}"
data-entities="{_html_attr(_format_entities(rec) or '')}"
data-locator="{_html_attr(rec.source_locator or '')}"
data-weight-rationale="{_html_attr(rec.weight_rationale or '')}"
data-confidence-rationale="{_html_attr('; '.join(rec.confidence_rationale) if rec.confidence_rationale else '')}">
<td>{html.escape(rec.statement_key)}</td>
<td>{html.escape(clinical_topic)}</td>
<td>{html.escape(" / ".join(bit for bit in [rec.recommendation_class, rec.level_of_evidence] if bit) or "-")}</td>
<td>{html.escape(" / ".join(bit for bit in [rec.population, rec.disease, rec.clinical_state] if bit) or "-")}</td>
<td>{html.escape(" / ".join(bit for bit in [rec.intervention, rec.outcome] if bit) or "-")}</td>
<td>{html.escape(" / ".join(bit for bit in [_format_numeric_thresholds(rec), rec.time_window, rec.event_anchor] if bit) or "-")}</td>
<td>{html.escape(_format_weight_label(rec.information_weight, rec.weight_score))}</td>
<td>{html.escape(f"{rec.extraction_confidence:.2f}" if rec.extraction_confidence is not None else "-")}</td>
<td>{html.escape(rec.recommendation_text)}</td>
</tr>"""
        )

    candidate_rows: list[str] = []
    topic_ranking_rows: list[str] = []
    topic_conflict_rows: list[str] = []
    for candidate in materialized.eo_candidates:
        candidate_rows.append(
            f"""<tr class="candidate-row"
data-completion="{_html_attr(candidate.completion_level)}"
data-review="{_html_attr(candidate.review_state)}"
data-clinical="{_html_attr(candidate.clinical_audit_state)}"
data-surgical="{_html_attr(candidate.surgical_audit_state)}"
data-weight="{_html_attr(candidate.information_weight or '')}"
data-eo-type="{_html_attr(candidate.eo_type or '')}"
data-eo-subtype="{_html_attr(candidate.eo_subtype or '')}"
data-text="{_html_attr(' '.join(filter(None, [candidate.statement_key, candidate.candidate_id, candidate.statement_text, candidate.source_locator, candidate.finalization_status])))}"
data-key="{_html_attr(candidate.statement_key)}"
data-candidate-id="{_html_attr(candidate.candidate_id)}"
data-statement="{_html_attr(candidate.statement_text)}"
data-finalization="{_html_attr(candidate.finalization_status)}"
data-strength="{_html_attr(candidate.evidence_strength or '')}"
data-locator="{_html_attr(candidate.source_locator or '')}"
data-rationale="{_html_attr(candidate.weight_rationale or '')}">
<td>{html.escape(candidate.statement_key)}</td>
<td>{html.escape(" / ".join(bit for bit in [candidate.eo_type, candidate.eo_subtype] if bit) or "-")}</td>
<td>{html.escape(candidate.completion_level)} / {html.escape(candidate.review_state)}</td>
<td>{html.escape(candidate.clinical_audit_state)} / {html.escape(candidate.surgical_audit_state)}</td>
<td>{html.escape(" / ".join(bit for bit in [candidate.finalization_status, candidate.evidence_strength] if bit) or "-")}</td>
<td>{html.escape(_format_weight_label(candidate.information_weight, candidate.weight_score))}</td>
<td>{html.escape(candidate.statement_text)}</td>
</tr>"""
        )

    for entry in topic_ranking:
        topic_ranking_rows.append(
            f"""<tr>
<td>{html.escape(entry.clinical_topic)}</td>
<td>{html.escape(entry.document_id)}</td>
<td>{html.escape(entry.file_name or "-")}</td>
<td>{html.escape(entry.document_group or "-")}</td>
<td>{html.escape(entry.document_type or "-")}</td>
<td>{html.escape(entry.specialty or "-")}</td>
<td>{html.escape(entry.vrn or "-")}</td>
<td>{entry.recommendation_count}</td>
<td>{html.escape(f"{entry.average_weight_score:.2f}" if entry.average_weight_score is not None else "-")}</td>
<td>{html.escape(f"{entry.average_confidence:.2f}" if entry.average_confidence is not None else "-")}</td>
<td>{html.escape('; '.join(entry.eo_type_summary) if entry.eo_type_summary else "-")}</td>
</tr>"""
        )
    for entry in topic_conflicts:
        topic_conflict_rows.append(
            f"""<tr>
<td>{html.escape(entry.clinical_topic)}</td>
<td>{html.escape(entry.conflict_level)}</td>
<td>{html.escape(entry.preferred_document_id)}</td>
<td>{html.escape(entry.preferred_file_name or "-")}</td>
<td>{html.escape(entry.preferred_stance or "-")}</td>
<td>{html.escape(f"{entry.preferred_score:.2f}" if entry.preferred_score is not None else "-")}</td>
<td>{html.escape(entry.challenger_document_id)}</td>
<td>{html.escape(entry.challenger_file_name or "-")}</td>
<td>{html.escape(entry.challenger_stance or "-")}</td>
<td>{html.escape(f"{entry.challenger_score:.2f}" if entry.challenger_score is not None else "-")}</td>
<td>{html.escape(entry.rationale or "-")}</td>
</tr>"""
        )

    html_doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Post ingesta | {html.escape(report.file_name or document_id)}</title>
<style>
:root {{ --bg:#071015; --panel:#0d171d; --ink:#edf7f4; --muted:#a9c0bc; --line:#21343d; --accent:#68d6b0; }}
* {{ box-sizing:border-box }}
body {{ margin:0; font-family:Segoe UI,Arial,sans-serif; background:linear-gradient(180deg,#081116,#061017); color:var(--ink) }}
main {{ width:min(1600px,calc(100vw - clamp(12px,4vw,40px))); margin:clamp(12px,3vw,24px) auto clamp(24px,4vw,48px); display:grid; gap:clamp(12px,2vw,18px) }}
section,.card {{ background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:clamp(14px,2.2vw,18px) }}
h1,h2,h3 {{ margin:0 0 8px }}
h1 {{ font-size:clamp(1.55rem, 2.4vw, 2.2rem) }}
h2 {{ font-size:clamp(1.15rem, 1.8vw, 1.5rem) }}
h3 {{ font-size:clamp(1rem, 1.5vw, 1.15rem) }}
p,li {{ line-height:1.5 }}
.grid {{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)) }}
.filters {{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr)); margin-top:14px }}
.filter-box {{ display:grid; gap:6px }}
.filter-box label {{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em }}
.filter-box input,.filter-box select {{ width:100%; background:#0a1318; color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px }}
.stats {{ display:flex; gap:10px; flex-wrap:wrap; margin-top:12px }}
.stat {{ background:#0a1318; border:1px solid var(--line); border-radius:999px; padding:8px 12px; color:var(--muted); font-size:13px }}
.toolbar {{ display:flex; gap:10px; flex-wrap:wrap; margin-top:12px }}
.btn {{ background:#0a1318; color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px; cursor:pointer }}
.btn:hover {{ border-color:var(--accent) }}
.btn.active {{ border-color:var(--accent); background:#102821 }}
.modebar,.preset-row {{ display:flex; gap:10px; flex-wrap:wrap; margin-top:14px }}
[data-mode-panel] {{ display:none }}
body[data-view-mode="clinical"] [data-mode-panel~="clinical"],
body[data-view-mode="audit"] [data-mode-panel~="audit"],
body[data-view-mode="data"] [data-mode-panel~="data"] {{ display:block }}
.mobile-nav {{ display:none; gap:8px; overflow:auto; padding-bottom:4px }}
.mobile-nav a {{ white-space:nowrap; text-decoration:none }}
.chart-grid {{ display:grid; gap:12px; grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:14px }}
.chart-card {{ background:#0a1318; border:1px solid var(--line); border-radius:12px; padding:14px }}
.chart-row {{ display:grid; grid-template-columns:minmax(92px,.9fr) minmax(120px,1.4fr) 48px; gap:10px; align-items:center; margin-top:8px; font-size:13px }}
.chart-track {{ height:8px; border-radius:999px; overflow:hidden; background:#13252d }}
.chart-track i {{ display:block; height:100%; border-radius:inherit; background:var(--accent) }}
.workbench-grid {{ display:grid; grid-template-columns:minmax(0,1.55fr) minmax(320px,.85fr); gap:14px; align-items:start }}
.workbench-detail {{ position:sticky; top:12px }}
.table-wrap {{ overflow:visible; border:1px solid var(--line); border-radius:14px; background:#091219; max-width:100% }}
table {{ width:100%; border-collapse:collapse; min-width:0 }}
table.desktop-table {{ min-width:0 }}
th,td {{ padding:12px 10px; text-align:left; vertical-align:top; border-bottom:1px solid var(--line); font-size:clamp(12px,1.3vw,14px); line-height:1.45; overflow-wrap:anywhere; word-break:break-word }}
th {{ position:sticky; top:0; background:#0b151b; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; font-size:12px }}
th.sortable {{ cursor:pointer }}
th.sortable:hover {{ color:var(--ink) }}
tbody tr:nth-child(even) {{ background:#0a1318 }}
tbody tr.active-row {{ outline:2px solid var(--accent); outline-offset:-2px; background:#102127 }}
.kv {{ background:#0a1318; border:1px solid var(--line); border-radius:12px; padding:12px }}
.label {{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px }}
.value {{ word-break:break-word }}
.pill {{ display:inline-flex; margin:2px 6px 2px 0; padding:6px 10px; border-radius:999px; border:1px solid var(--line); background:#0a1318; color:var(--ink); font-size:12px }}
.row {{ display:flex; gap:12px; align-items:center; flex-wrap:wrap }}
.spread {{ justify-content:space-between }}
.muted {{ color:var(--muted); font-size:14px }}
.detail-box {{ background:#0a1318; border:1px solid var(--line); border-radius:12px; padding:14px }}
.detail-box h3 {{ margin-bottom:10px }}
.section-body[hidden] {{ display:none }}
table.responsive-stack thead {{ display:none }}
table.responsive-stack tbody {{ display:grid; gap:10px; padding:10px }}
table.responsive-stack tbody tr {{
  display:grid;
  grid-template-columns:1fr;
  border:1px solid var(--line);
  border-radius:12px;
  background:#0a1318;
  overflow:hidden;
}}
table.responsive-stack tbody tr:nth-child(even) {{ background:#0a1318 }}
table.responsive-stack td {{
  display:grid;
  grid-template-columns:minmax(120px, 28%) 1fr;
  gap:10px;
  align-items:start;
  padding:10px 12px;
  border-bottom:1px solid var(--line);
}}
table.responsive-stack td:last-child {{ border-bottom:none }}
table.responsive-stack td::before {{
  content:attr(data-label);
  color:var(--muted);
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.08em;
}}
@media (min-width: 1700px) {{
  main {{ width:min(1880px, calc(100vw - 56px)) }}
}}
@media (max-width: 1440px) and (min-width: 961px) {{
  main {{ width:min(100vw - 24px, 100%) }}
  .workbench-grid {{ grid-template-columns:1fr }}
  .workbench-detail {{ position:static }}
  th,td {{ padding:10px 8px; font-size:13px }}
}}
@media (max-width: 1700px) {{
  .row.spread {{ align-items:flex-start }}
  .toolbar, .stats, .row {{ gap:8px }}
  .pill {{ max-width:100%; word-break:break-word }}
  .table-wrap {{ border-radius:12px }}
}}
@media (max-width: 760px) {{
  main {{ width:min(100vw - 12px, 100%); margin:10px auto 24px }}
  section,.card {{ border-radius:14px }}
  .filters {{ grid-template-columns:1fr }}
  .chart-grid,.workbench-grid {{ grid-template-columns:1fr }}
  .workbench-detail {{ position:static }}
  .btn {{ width:100% }}
  .detail-box, .kv {{ padding:12px }}
  .mobile-nav {{ display:flex }}
  table.responsive-stack td {{
    grid-template-columns:1fr;
    gap:6px;
  }}
  table.responsive-stack td::before {{ margin-bottom:2px }}
}}
</style>
</head>
<body data-view-mode="clinical">
<main>
<section>
<h1>Post ingesta del PDF</h1>
<p>Extraccion estructurada de guideline recommendations, modelo ejecutable, constraints clinicos, entidades y EO candidates derivadas, generada desde el repo ICICSO.</p>
<div class="modebar" aria-label="Modo de export">
<button class="btn active" type="button" data-view-mode-button="clinical">Vista clinica</button>
<button class="btn" type="button" data-view-mode-button="audit">Auditoria</button>
<button class="btn" type="button" data-view-mode-button="data">Datos</button>
</div>
<div class="mobile-nav">
<a class="btn" href="#summary-section">Resumen</a>
<a class="btn" href="#priority-section">Prioridad</a>
<a class="btn" href="#clinical-workbench">Workbench</a>
<a class="btn" href="#candidates-section">EOs</a>
<a class="btn" href="#reconciliation-section">Cruce</a>
</div>
<div class="row">
<span class="pill">document_id: {html.escape(document_id)}</span>
<span class="pill">guideline_recommendations: {len(materialized.guideline_recommendations)}</span>
<span class="pill">eo_candidates: {len(materialized.eo_candidates)}</span>
<span class="pill">document_group: {html.escape(materialized.document.document_group)}</span>
<span class="pill">specialty: {html.escape(materialized.document.specialty or "-")}</span>
<span class="pill">vrn: {html.escape(materialized.document.vrn or "-")}</span>
<span class="pill">institutional_version: {html.escape(materialized.document.institutional_version or "-")}</span>
</div>
</section>
<section id="summary-section" data-mode-panel="clinical audit data">
<h2>Resumen</h2>
<div class="grid">
<div class="kv"><div class="label">Documento</div><div class="value">{html.escape(report.file_name or document_id)}</div></div>
<div class="kv"><div class="label">VRN</div><div class="value">{html.escape(materialized.document.vrn or "-")}</div></div>
<div class="kv"><div class="label">Tipo</div><div class="value">{html.escape(materialized.document.document_type)}</div></div>
<div class="kv"><div class="label">Grupo</div><div class="value">{html.escape(materialized.document.document_group)}</div></div>
<div class="kv"><div class="label">Especialidad</div><div class="value">{html.escape(materialized.document.specialty or "-")}</div></div>
<div class="kv"><div class="label">Subespecialidad</div><div class="value">{html.escape(materialized.document.sub_specialty or "-")}</div></div>
<div class="kv"><div class="label">Version</div><div class="value">{html.escape(materialized.document.institutional_version or "-")}</div></div>
<div class="kv"><div class="label">Lineage</div><div class="value">{html.escape(materialized.document.lineage_key or "-")}</div></div>
<div class="kv"><div class="label">Path</div><div class="value">{html.escape(materialized.document.relative_path)}</div></div>
</div>
</section>
<section id="priority-section" data-mode-panel="clinical audit data">
<div class="row spread"><h2>Prioridad Institucional</h2><button class="btn section-toggle" data-target="priority-body">Colapsar</button></div>
<div class="section-body" id="priority-body">
<p class="muted">Resumen compacto para orientar revision clinica sin duplicar tablas ni tarjetas extensas.</p>
<div class="stats">
<span class="stat">Recomendaciones: {len(materialized.guideline_recommendations)}</span>
<span class="stat">EO candidates: {len(materialized.eo_candidates)}</span>
<span class="stat">Temas clinicos: {len(recommendation_topic_counts)}</span>
</div>
<div class="chart-grid">
{recommendation_weight_chart}
{candidate_type_chart}
{recommendation_topic_chart}
</div>
</div>
</section>
<section id="reconciliation-section" data-mode-panel="audit data">
<div class="row spread"><h2>Reconciliacion Entre Documentos</h2><button class="btn section-toggle" data-target="reconciliation-body">Colapsar</button></div>
<div class="section-body" id="reconciliation-body">
<p class="muted">Comparativo del documento actual contra el corpus institucional por <code>clinical_topic</code>, para detectar densidad, peso promedio y tipos de EO por tema.</p>
<div class="table-wrap">
<table id="reconciliation-table" class="desktop-table responsive-stack">
<thead>
<tr>
<th class="sortable">Tema Clinico</th>
<th class="sortable">Document ID</th>
<th class="sortable">Archivo</th>
<th class="sortable">Grupo</th>
<th class="sortable">Tipo</th>
<th class="sortable">Especialidad</th>
<th class="sortable">VRN</th>
<th class="sortable">Recomendaciones</th>
<th class="sortable">Peso Promedio</th>
<th class="sortable">Confianza Promedio</th>
<th class="sortable">Tipos de EO</th>
</tr>
</thead>
<tbody>
{''.join(topic_ranking_rows) or '<tr><td colspan="11" class="muted">Sin ranking multi-paper disponible.</td></tr>'}
</tbody>
</table>
</div>
</div>
</section>
<section id="conflicts-section" data-mode-panel="audit data">
<div class="row spread"><h2>Conflictos y Precedencia</h2><button class="btn section-toggle" data-target="conflicts-body">Colapsar</button></div>
<div class="section-body" id="conflicts-body">
<p class="muted">Deteccion simple de conflicto documental por <code>clinical_topic</code>. La precedencia se estima con tipo documental, peso y confianza promedio.</p>
<div class="table-wrap">
<table id="conflicts-table" class="desktop-table responsive-stack">
<thead>
<tr>
<th class="sortable">Tema Clinico</th>
<th class="sortable">Nivel</th>
<th class="sortable">Documento Preferido</th>
<th class="sortable">Archivo Preferido</th>
<th class="sortable">Postura Preferida</th>
<th class="sortable">Score Preferido</th>
<th class="sortable">Documento Retador</th>
<th class="sortable">Archivo Retador</th>
<th class="sortable">Postura Retadora</th>
<th class="sortable">Score Retador</th>
<th class="sortable">Rationale</th>
</tr>
</thead>
<tbody>
{''.join(topic_conflict_rows) or '<tr><td colspan="11" class="muted">Sin conflictos detectados para los temas clinicos del documento.</td></tr>'}
</tbody>
</table>
</div>
</div>
</section>
<section id="clinical-workbench" data-mode-panel="clinical data">
<div class="row spread"><h2>Workbench clinico</h2><button class="btn section-toggle" data-target="workbench-body">Colapsar</button></div>
<div class="section-body" id="workbench-body">
<p class="muted">Vista principal unica: filtra recomendaciones, abre presets clinicos y revisa el detalle seleccionado en el panel lateral.</p>
<div class="workbench-grid">
<aside class="workbench-detail">
<div class="detail-box">
<h3 id="detail-title">Sin seleccion</h3>
<p id="detail-summary" class="muted">Selecciona una recomendacion o candidate para ver su desglose completo.</p>
<div class="grid">
<div class="kv"><div class="label">Clave del Statement</div><div class="value" id="detail-key">-</div></div>
<div class="kv"><div class="label">Tipo</div><div class="value" id="detail-kind">-</div></div>
<div class="kv"><div class="label">COR / LOE</div><div class="value" id="detail-cor-loe">-</div></div>
<div class="kv"><div class="label">Peso / Confianza</div><div class="value" id="detail-weight-confidence">-</div></div>
<div class="kv"><div class="label">Poblacion / Enfermedad</div><div class="value" id="detail-population-disease">-</div></div>
<div class="kv"><div class="label">Tema Clinico</div><div class="value" id="detail-topic">-</div></div>
<div class="kv"><div class="label">Estado / Tiempo / Ancla</div><div class="value" id="detail-state-time">-</div></div>
<div class="kv"><div class="label">Intervencion / Desenlace</div><div class="value" id="detail-intervention-outcome">-</div></div>
<div class="kv"><div class="label">Localizador Fuente</div><div class="value" id="detail-locator">-</div></div>
</div>
</div>
<div class="detail-box">
<h3>Modelo y Estado</h3>
<div class="grid">
<div class="kv"><div class="label">Activador</div><div class="value" id="detail-trigger">-</div></div>
<div class="kv"><div class="label">Modelo de Activacion</div><div class="value" id="detail-trigger-model">-</div></div>
<div class="kv"><div class="label">Restricciones de Activacion</div><div class="value" id="detail-trigger-constraints">-</div></div>
<div class="kv"><div class="label">Action</div><div class="value" id="detail-action">-</div></div>
<div class="kv"><div class="label">Prerequisites</div><div class="value" id="detail-prerequisites">-</div></div>
<div class="kv"><div class="label">Contraindications</div><div class="value" id="detail-contraindications">-</div></div>
<div class="kv"><div class="label">Conditions / Exclusions</div><div class="value" id="detail-conditions-exclusions">-</div></div>
<div class="kv"><div class="label">Entities</div><div class="value" id="detail-entities">-</div></div>
<div class="kv"><div class="label">EO Candidate State</div><div class="value" id="detail-candidate-state">-</div></div>
<div class="kv"><div class="label">Rationale</div><div class="value" id="detail-rationale">-</div></div>
</div>
</div>
</aside>
<div class="workbench-main">
<div class="row spread"><h3>Recomendaciones filtrables</h3><button class="btn section-toggle" data-target="recommendations-body">Colapsar</button></div>
<div class="section-body" id="recommendations-body">
<p class="muted">Vista maestra de recomendaciones con contexto clinico, semantica ejecutable, peso, confianza y trazabilidad.</p>
<div class="filters" id="recommendation-filters">
<div class="filter-box"><label for="rec-search">Busqueda</label><input id="rec-search" type="text" placeholder="statement, enfermedad, activador, localizador" /></div>
<div class="filter-box"><label for="rec-cor">COR</label><select id="rec-cor"><option value="">Todos</option><option>I</option><option>IIa</option><option>IIb</option><option>III</option></select></div>
<div class="filter-box"><label for="rec-loe">LOE</label><select id="rec-loe"><option value="">Todos</option><option>A</option><option>B-R</option><option>B-NR</option><option>C-LD</option><option>C-EO</option></select></div>
<div class="filter-box"><label for="rec-weight">Peso</label><select id="rec-weight"><option value="">Todos</option><option>critical</option><option>high</option><option>moderate</option><option>emerging</option></select></div>
<div class="filter-box"><label for="rec-confidence">Confianza minima</label><select id="rec-confidence"><option value="">Todas</option><option value="0.90">0.90</option><option value="0.80">0.80</option><option value="0.70">0.70</option><option value="0.60">0.60</option></select></div>
<div class="filter-box"><label for="rec-disease">Enfermedad</label><input id="rec-disease" type="text" placeholder="STEMI, SIHD, CAD..." /></div>
<div class="filter-box"><label for="rec-topic">Tema Clinico</label><input id="rec-topic" type="text" placeholder="Left Main, STEMI, Heart Team..." /></div>
</div>
<div class="preset-row" aria-label="Presets de filtros">
<button class="btn" type="button" data-filter-preset="clear">Todo</button>
<button class="btn" type="button" data-filter-preset="critical">Critico confiable</button>
<button class="btn" type="button" data-filter-preset="stemi">STEMI / shock</button>
<button class="btn" type="button" data-filter-preset="cabg">CABG</button>
<button class="btn" type="button" data-filter-preset="timing">Timing rules</button>
<button class="btn" type="button" data-filter-preset="audit">Pendiente auditoria</button>
</div>
<div class="stats"><span class="stat" id="rec-visible-count">0 visibles</span><span class="stat" id="rec-total-count">{len(materialized.guideline_recommendations)} totales</span></div>
<div class="toolbar"><button class="btn" id="export-rec-visible">Exportar recomendaciones visibles CSV</button></div>
<div class="table-wrap">
<table id="recommendations-table" class="desktop-table responsive-stack">
<thead>
<tr>
<th class="sortable">Statement</th>
<th class="sortable">Tema Clinico</th>
<th class="sortable">COR / LOE</th>
<th class="sortable">Contexto Clinico</th>
<th class="sortable">Intervencion / Desenlace</th>
<th class="sortable">Tiempo / Umbral</th>
<th class="sortable">Peso</th>
<th class="sortable">Confianza</th>
<th class="sortable">Recomendacion</th>
</tr>
</thead>
<tbody>
{''.join(recommendation_rows) or '<tr><td colspan="9" class="muted">Sin recomendaciones estructuradas.</td></tr>'}
</tbody>
</table>
</div>
</div>
</div>
</div>
</div>
</section>
<section id="candidates-section" data-mode-panel="audit data">
<div class="row spread"><h2>Tabla de Candidatos EO</h2><button class="btn section-toggle" data-target="candidates-body">Colapsar</button></div>
<div class="section-body" id="candidates-body">
<p class="muted">Estado institucional y avance de auditoria de cada EO candidate derivado.</p>
<div class="filters" id="candidate-filters">
<div class="filter-box"><label for="cand-search">Busqueda</label><input id="cand-search" type="text" placeholder="statement, candidate id, localizador" /></div>
<div class="filter-box"><label for="cand-completion">Terminacion</label><select id="cand-completion"><option value="">Todos</option><option>L1_structured</option><option>L2_audited_clinical</option><option>L3_audited_surgical</option><option>L5_executable</option></select></div>
<div class="filter-box"><label for="cand-type">Tipo de EO</label><input id="cand-type" type="text" placeholder="recommendation, timing_rule..." /></div>
<div class="filter-box"><label for="cand-review">Revision</label><select id="cand-review"><option value="">Todos</option><option>pending</option><option>approved</option><option>changes_requested</option><option>rejected</option><option>under_clinical_review</option><option>under_surgical_review</option></select></div>
<div class="filter-box"><label for="cand-clinical">Clinical Audit</label><select id="cand-clinical"><option value="">Todos</option><option>pending</option><option>approved</option><option>changes_requested</option><option>rejected</option></select></div>
<div class="filter-box"><label for="cand-surgical">Surgical Audit</label><select id="cand-surgical"><option value="">Todos</option><option>pending</option><option>approved</option><option>changes_requested</option><option>rejected</option></select></div>
<div class="filter-box"><label for="cand-weight">Peso</label><select id="cand-weight"><option value="">Todos</option><option>critical</option><option>high</option><option>moderate</option><option>emerging</option></select></div>
</div>
<div class="stats"><span class="stat" id="cand-visible-count">0 visibles</span><span class="stat" id="cand-total-count">{len(materialized.eo_candidates)} totales</span></div>
<div class="toolbar"><button class="btn" id="export-cand-visible">Exportar candidates visibles CSV</button></div>
<div class="table-wrap">
<table id="candidates-table" class="desktop-table responsive-stack">
<thead>
<tr>
<th class="sortable">Statement</th>
<th class="sortable">Tipo / Subtipo</th>
<th class="sortable">Nivel / Revision</th>
<th class="sortable">Auditoria Clinica / Quirurgica</th>
<th class="sortable">Finalizacion / Fuerza</th>
<th class="sortable">Peso</th>
<th class="sortable">Texto del Statement</th>
</tr>
</thead>
<tbody>
{''.join(candidate_rows) or '<tr><td colspan="7" class="muted">Sin EO candidates.</td></tr>'}
</tbody>
</table>
</div>
</div>
</section>
</main>
<script>
const normalize = (value) => (value || '').toLowerCase().trim();
const sortState = new Map();
const recommendationFilterIds = ['rec-search','rec-cor','rec-loe','rec-weight','rec-confidence','rec-disease','rec-topic'];
const candidateFilterIds = ['cand-search','cand-completion','cand-type','cand-review','cand-clinical','cand-surgical','cand-weight'];

function setViewMode(mode) {{
  document.body.dataset.viewMode = mode;
  document.querySelectorAll('[data-view-mode-button]').forEach((button) => {{
    button.classList.toggle('active', button.dataset.viewModeButton === mode);
  }});
}}

function setFieldValue(id, value) {{
  const field = document.getElementById(id);
  if (field) field.value = value;
}}

function clearWorkbenchFilters() {{
  recommendationFilterIds.concat(candidateFilterIds).forEach((id) => setFieldValue(id, ''));
}}

function applyFilterPreset(preset) {{
  clearWorkbenchFilters();
  if (preset === 'critical') {{
    setFieldValue('rec-weight', 'critical');
    setFieldValue('cand-weight', 'critical');
    setFieldValue('rec-confidence', '0.80');
  }}
  if (preset === 'stemi') {{
    setFieldValue('rec-search', 'STEMI');
    setFieldValue('cand-search', 'STEMI');
  }}
  if (preset === 'cabg') {{
    setFieldValue('rec-search', 'CABG');
    setFieldValue('cand-search', 'CABG');
  }}
  if (preset === 'timing') {{
    setFieldValue('rec-search', 'hours');
    setFieldValue('cand-type', 'timing_rule');
  }}
  if (preset === 'audit') {{
    setFieldValue('cand-review', 'pending');
    setFieldValue('cand-clinical', 'pending');
    setFieldValue('cand-surgical', 'pending');
    setViewMode('audit');
  }}
  filterRecommendations();
  filterCandidates();
  document.querySelectorAll('[data-filter-preset]').forEach((button) => {{
    button.classList.toggle('active', button.dataset.filterPreset === preset);
  }});
}}

function filterRecommendations() {{
  const search = normalize(document.getElementById('rec-search')?.value);
  const cor = normalize(document.getElementById('rec-cor')?.value);
  const loe = normalize(document.getElementById('rec-loe')?.value);
  const weight = normalize(document.getElementById('rec-weight')?.value);
  const disease = normalize(document.getElementById('rec-disease')?.value);
  const topic = normalize(document.getElementById('rec-topic')?.value);
  const minConfidence = parseFloat(document.getElementById('rec-confidence')?.value || '');
  let visible = 0;

  document.querySelectorAll('.recommendation-row').forEach((row) => {{
    const rowText = normalize(row.dataset.text);
    const rowCor = normalize(row.dataset.cor);
    const rowLoe = normalize(row.dataset.loe);
    const rowWeight = normalize(row.dataset.weight);
    const rowDisease = normalize(row.dataset.disease);
    const rowTopic = normalize(row.dataset.topic);
    const rowConfidence = parseFloat(row.dataset.confidence || '');

    const matches =
      (!search || rowText.includes(search)) &&
      (!cor || rowCor === cor) &&
      (!loe || rowLoe === loe) &&
      (!weight || rowWeight === weight) &&
      (!disease || rowDisease.includes(disease)) &&
      (!topic || rowTopic.includes(topic)) &&
      (Number.isNaN(minConfidence) || (!Number.isNaN(rowConfidence) && rowConfidence >= minConfidence));

    row.style.display = matches ? '' : 'none';
    if (matches) visible += 1;
  }});

  const counter = document.getElementById('rec-visible-count');
  if (counter) counter.textContent = `${{visible}} visibles`;
}}

function filterCandidates() {{
  const search = normalize(document.getElementById('cand-search')?.value);
  const completion = normalize(document.getElementById('cand-completion')?.value);
  const eoType = normalize(document.getElementById('cand-type')?.value);
  const review = normalize(document.getElementById('cand-review')?.value);
  const clinical = normalize(document.getElementById('cand-clinical')?.value);
  const surgical = normalize(document.getElementById('cand-surgical')?.value);
  const weight = normalize(document.getElementById('cand-weight')?.value);
  let visible = 0;

  document.querySelectorAll('.candidate-row').forEach((row) => {{
    const matches =
      (!search || normalize(row.dataset.text).includes(search)) &&
      (!completion || normalize(row.dataset.completion) === completion) &&
      (!eoType || normalize(row.dataset.eoType).includes(eoType) || normalize(row.dataset.eoSubtype).includes(eoType)) &&
      (!review || normalize(row.dataset.review) === review) &&
      (!clinical || normalize(row.dataset.clinical) === clinical) &&
      (!surgical || normalize(row.dataset.surgical) === surgical) &&
      (!weight || normalize(row.dataset.weight) === weight);

    row.style.display = matches ? '' : 'none';
    if (matches) visible += 1;
  }});

  const counter = document.getElementById('cand-visible-count');
  if (counter) counter.textContent = `${{visible}} visibles`;
}}

function downloadCsv(filename, rows) {{
  const csv = rows.map((row) => row.map((cell) => {{
    const text = `${{cell ?? ''}}`.replaceAll('"', '""');
    return `"${{text}}"`;
  }}).join(',')).join('\\n');
  const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}}

function hydrateResponsiveTables() {{
  document.querySelectorAll('table.responsive-stack').forEach((table) => {{
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach((row) => {{
      Array.from(row.children).forEach((cell, index) => {{
        if (cell instanceof HTMLElement) {{
          cell.setAttribute('data-label', headers[index] || '');
        }}
      }});
    }});
  }});
}}

function exportVisibleTable(tableId, filename) {{
  const table = document.getElementById(tableId);
  if (!table) return;
  const header = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  const bodyRows = Array.from(table.querySelectorAll('tbody tr')).filter((row) => row.style.display !== 'none');
  const rows = [header];
  bodyRows.forEach((row) => {{
    rows.push(Array.from(row.children).map((cell) => cell.textContent.trim()));
  }});
  downloadCsv(filename, rows);
}}

function makeTableSortable(tableId) {{
  const table = document.getElementById(tableId);
  if (!table) return;
  const headers = Array.from(table.querySelectorAll('thead th'));
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  headers.forEach((header, index) => {{
    header.addEventListener('click', () => {{
      const key = `${{tableId}}:${{index}}`;
      const current = sortState.get(key) === 'asc' ? 'desc' : 'asc';
      sortState.clear();
      sortState.set(key, current);

      headers.forEach((th) => th.textContent = th.textContent.replace(/\\s+[▲▼]$/, ''));
      header.textContent = `${{header.textContent.replace(/\\s+[▲▼]$/, '')}} ${{current === 'asc' ? '▲' : '▼'}}`;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.sort((a, b) => {{
        const aText = (a.children[index]?.textContent || '').trim();
        const bText = (b.children[index]?.textContent || '').trim();
        const aNum = Number.parseFloat(aText);
        const bNum = Number.parseFloat(bText);
        const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);
        const comparison = bothNumeric ? aNum - bNum : aText.localeCompare(bText, undefined, {{ numeric: true, sensitivity: 'base' }});
        return current === 'asc' ? comparison : -comparison;
      }});
      rows.forEach((row) => tbody.appendChild(row));
    }});
  }});
}}

function setText(id, value) {{
  const el = document.getElementById(id);
  if (el) el.textContent = value && value.trim() ? value : '-';
}}

function clearActiveRows() {{
  document.querySelectorAll('.active-row').forEach((row) => row.classList.remove('active-row'));
}}

function findCandidateByKey(statementKey) {{
  return Array.from(document.querySelectorAll('.candidate-row')).find((row) => row.dataset.key === statementKey);
}}

function renderRecommendationDetail(row) {{
  clearActiveRows();
  row.classList.add('active-row');
  const candidate = findCandidateByKey(row.dataset.key);

  setText('detail-title', row.dataset.title || row.dataset.key);
  setText('detail-summary', row.dataset.recommendation);
  setText('detail-key', row.dataset.key);
  setText('detail-kind', 'Guideline Recommendation');
  setText('detail-cor-loe', [row.dataset.cor, row.dataset.loe].filter(Boolean).join(' / '));
  setText('detail-weight-confidence', [row.dataset.weight, row.dataset.confidence].filter(Boolean).join(' / '));
  setText('detail-population-disease', [row.dataset.population, row.dataset.diseaseFull].filter(Boolean).join(' / '));
  setText('detail-topic', row.dataset.topic);
  setText('detail-state-time', [row.dataset.clinicalState, row.dataset.timeWindow, row.dataset.eventAnchor].filter(Boolean).join(' / '));
  setText('detail-intervention-outcome', [row.dataset.intervention, row.dataset.outcome].filter(Boolean).join(' / '));
  setText('detail-locator', row.dataset.locator);
  setText('detail-trigger', row.dataset.trigger);
  setText('detail-trigger-model', row.dataset.triggerModel);
  setText('detail-trigger-constraints', row.dataset.triggerConstraints);
  setText('detail-action', row.dataset.executionAction);
  setText('detail-prerequisites', row.dataset.executionPrerequisites);
  setText('detail-contraindications', row.dataset.executionContraindications);
  setText('detail-conditions-exclusions', [row.dataset.conditions, row.dataset.exclusions].filter(Boolean).join(' | '));
  setText('detail-entities', row.dataset.entities);
  setText(
    'detail-candidate-state',
    candidate
      ? [candidate.dataset.completion, candidate.dataset.review, candidate.dataset.clinical, candidate.dataset.surgical, candidate.dataset.finalization].filter(Boolean).join(' / ')
      : 'Sin EO candidate enlazado'
  );
  setText('detail-rationale', [row.dataset.weightRationale, row.dataset.confidenceRationale].filter(Boolean).join(' | '));
}}

function renderCandidateDetail(row) {{
  clearActiveRows();
  row.classList.add('active-row');

  setText('detail-title', row.dataset.candidateId);
  setText('detail-summary', row.dataset.statement);
  setText('detail-key', row.dataset.key);
  setText('detail-kind', 'EO Candidate');
  setText('detail-cor-loe', '-');
  setText('detail-weight-confidence', [row.dataset.weight].filter(Boolean).join(' / '));
  setText('detail-population-disease', '-');
  setText('detail-topic', '-');
  setText('detail-state-time', '-');
  setText('detail-intervention-outcome', [row.dataset.eoType, row.dataset.eoSubtype, row.dataset.strength].filter(Boolean).join(' / '));
  setText('detail-locator', row.dataset.locator);
  setText('detail-trigger', '-');
  setText('detail-trigger-model', '-');
  setText('detail-trigger-constraints', '-');
  setText('detail-action', '-');
  setText('detail-prerequisites', '-');
  setText('detail-contraindications', '-');
  setText('detail-conditions-exclusions', '-');
  setText('detail-entities', '-');
  setText('detail-candidate-state', [row.dataset.eoType, row.dataset.eoSubtype, row.dataset.completion, row.dataset.review, row.dataset.clinical, row.dataset.surgical, row.dataset.finalization].filter(Boolean).join(' / '));
  setText('detail-rationale', row.dataset.rationale);
}}

document.querySelectorAll('.section-toggle').forEach((button) => {{
  button.addEventListener('click', () => {{
    const target = document.getElementById(button.dataset.target);
    if (!target) return;
    const hidden = target.hasAttribute('hidden');
    if (hidden) {{
      target.removeAttribute('hidden');
      button.textContent = 'Colapsar';
    }} else {{
      target.setAttribute('hidden', '');
      button.textContent = 'Expandir';
    }}
  }});
}});

function setMobileSectionDefaults() {{
  if (!window.matchMedia('(max-width: 760px)').matches) return;
  const keepOpen = new Set(['priority-body', 'workbench-body']);
  document.querySelectorAll('.section-toggle').forEach((button) => {{
    const target = document.getElementById(button.dataset.target);
    if (!target || keepOpen.has(button.dataset.target)) return;
    target.setAttribute('hidden', '');
    button.textContent = 'Expandir';
  }});
}}

recommendationFilterIds.forEach((id) => {{
  document.getElementById(id)?.addEventListener('input', filterRecommendations);
  document.getElementById(id)?.addEventListener('change', filterRecommendations);
}});
candidateFilterIds.forEach((id) => {{
  document.getElementById(id)?.addEventListener('input', filterCandidates);
  document.getElementById(id)?.addEventListener('change', filterCandidates);
}});
document.querySelectorAll('[data-view-mode-button]').forEach((button) => {{
  button.addEventListener('click', () => setViewMode(button.dataset.viewModeButton || 'clinical'));
}});
document.querySelectorAll('[data-filter-preset]').forEach((button) => {{
  button.addEventListener('click', () => applyFilterPreset(button.dataset.filterPreset || 'clear'));
}});

document.querySelectorAll('.recommendation-row').forEach((row) => {{
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => renderRecommendationDetail(row));
}});
document.querySelectorAll('.candidate-row').forEach((row) => {{
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => renderCandidateDetail(row));
}});

document.getElementById('export-rec-visible')?.addEventListener('click', () => exportVisibleTable('recommendations-table', 'recommendaciones_visibles.csv'));
document.getElementById('export-cand-visible')?.addEventListener('click', () => exportVisibleTable('candidates-table', 'eo_candidates_visibles.csv'));

makeTableSortable('recommendations-table');
makeTableSortable('candidates-table');
makeTableSortable('reconciliation-table');
makeTableSortable('conflicts-table');
hydrateResponsiveTables();
setMobileSectionDefaults();
filterRecommendations();
filterCandidates();
document.querySelector('.recommendation-row') && renderRecommendationDetail(document.querySelector('.recommendation-row'));
</script>
</body>
</html>"""
    return html_doc, len(materialized.guideline_recommendations), len(materialized.eo_candidates)


def export_csv(document_id: str, output_path: Path) -> None:
    settings = get_settings()
    initialize_database(settings.sqlite_path)
    ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
    recommendations = ingestion.list_guideline_recommendations(document_id)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "recommendation_id",
                "statement_key",
                "recommendation_class",
                "level_of_evidence",
                "document_family",
                "clinical_topic",
                "recommendation_text",
                "population",
                "disease",
                "clinical_state",
                "severity",
                "time_window",
                "event_anchor",
                "numeric_thresholds",
                "care_phase",
                "intervention",
                "comparator",
                "outcome",
                "conditions",
                "exclusions",
                "clinical_temporality",
                "temporal_qualifiers",
                "guidance_temporality",
                "care_setting",
                "specialty",
                "sub_specialty",
                "source_locator",
                "information_weight",
                "weight_score",
                "weight_rationale",
                "extraction_confidence",
                "confidence_rationale",
                "clinical_entities",
                "execution_trigger",
                "execution_trigger_population",
                "execution_trigger_state",
                "execution_trigger_disease",
                "execution_trigger_time",
                "execution_trigger_anchor",
                "execution_trigger_exclusions",
                "execution_trigger_numeric_constraints",
                "execution_trigger_qualifiers",
                "execution_trigger_constraints",
                "execution_action",
                "execution_prerequisites",
                "execution_contraindications",
                "execution_outcome",
            ],
        )
        writer.writeheader()
        for rec in recommendations:
            writer.writerow(
                {
                    "recommendation_id": rec.recommendation_id,
                    "statement_key": rec.statement_key,
                    "recommendation_class": rec.recommendation_class,
                    "level_of_evidence": rec.level_of_evidence,
                    "document_family": rec.document_family,
                    "clinical_topic": rec.clinical_topic,
                    "recommendation_text": rec.recommendation_text,
                    "population": rec.population,
                    "disease": rec.disease,
                    "clinical_state": rec.clinical_state,
                    "severity": rec.severity,
                    "time_window": rec.time_window,
                    "event_anchor": rec.event_anchor,
                    "numeric_thresholds": "; ".join(item.label for item in rec.numeric_thresholds),
                    "care_phase": rec.care_phase,
                    "intervention": rec.intervention,
                    "comparator": rec.comparator,
                    "outcome": rec.outcome,
                    "conditions": "; ".join(rec.conditions),
                    "exclusions": "; ".join(rec.exclusions),
                    "clinical_temporality": rec.clinical_temporality,
                    "temporal_qualifiers": "; ".join(rec.temporal_qualifiers),
                    "guidance_temporality": rec.guidance_temporality,
                    "care_setting": rec.care_setting,
                    "specialty": rec.specialty,
                    "sub_specialty": rec.sub_specialty,
                    "source_locator": rec.source_locator,
                    "information_weight": rec.information_weight,
                    "weight_score": rec.weight_score,
                    "weight_rationale": rec.weight_rationale,
                    "extraction_confidence": rec.extraction_confidence,
                    "confidence_rationale": "; ".join(rec.confidence_rationale),
                    "clinical_entities": "; ".join(f"{entity.entity_type}:{entity.label}" for entity in rec.clinical_entities),
                    "execution_trigger": rec.execution_model.trigger,
                    "execution_trigger_population": rec.execution_model.trigger_model.population,
                    "execution_trigger_state": rec.execution_model.trigger_model.clinical_state,
                    "execution_trigger_disease": rec.execution_model.trigger_model.disease,
                    "execution_trigger_time": rec.execution_model.trigger_model.time_constraint,
                    "execution_trigger_anchor": rec.execution_model.trigger_model.event_anchor,
                    "execution_trigger_exclusions": "; ".join(rec.execution_model.trigger_model.exclusions),
                    "execution_trigger_numeric_constraints": "; ".join(item.label for item in rec.execution_model.trigger_model.numeric_constraints),
                    "execution_trigger_qualifiers": "; ".join(rec.execution_model.trigger_model.qualifiers),
                    "execution_trigger_constraints": _format_trigger_constraints(rec),
                    "execution_action": rec.execution_model.action,
                    "execution_prerequisites": "; ".join(rec.execution_model.prerequisites),
                    "execution_contraindications": "; ".join(rec.execution_model.contraindications),
                    "execution_outcome": rec.execution_model.intended_outcome,
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta el post-ingesta estructurado de un documento ICICSO.")
    parser.add_argument("document_id", help="Document ID institucional, por ejemplo UPL-CE02A6AB5E49")
    parser.add_argument(
        "--output-dir",
        default=str(REPO_ROOT / "dashboard" / "generated"),
        help="Directorio destino para HTML y CSV.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    html_doc, recommendations_count, candidates_count = build_html(args.document_id)
    html_path = output_dir / f"post_ingesta_{args.document_id.lower()}.html"
    csv_path = output_dir / f"post_ingesta_{args.document_id.lower()}.csv"
    html_path.write_text(html_doc, encoding="utf-8")
    export_csv(args.document_id, csv_path)

    print(
        {
            "document_id": args.document_id,
            "guideline_recommendations": recommendations_count,
            "eo_candidates": candidates_count,
            "html": str(html_path),
            "csv": str(csv_path),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
