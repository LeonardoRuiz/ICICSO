from __future__ import annotations

import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

PAPERS_COLUMNS = ["internal_paper_id", "title", "abstract", "year", "journal", "publication_type", "study_design", "evidence_level", "language", "doi", "pmid", "pmcid", "open_access_status", "full_text_status", "license", "source_database", "source_url", "query_collection", "retrieval_date"]
AUTHORS_COLUMNS = ["internal_paper_id", "author_order", "author_name", "affiliation"]
IDENTIFIERS_COLUMNS = ["internal_paper_id", "id_type", "id_value"]
MESH_COLUMNS = ["internal_paper_id", "mesh_term"]
LICENSES_COLUMNS = ["internal_paper_id", "license_name", "license_url"]
FILES_COLUMNS = ["internal_paper_id", "file_type", "local_path", "download_url", "checksum", "status"]
CLASSIFICATION_RULES = [("guideline", [r"\bguideline\b", r"\bguidelines\b", r"\bpractice advisory\b"]), ("randomized trial", [r"\brandomized\b", r"\brandomised\b", r"\brct\b", r"\bclinical trial\b"]), ("meta-analysis", [r"\bmeta-analysis\b", r"\bmeta analysis\b"]), ("systematic review", [r"\bsystematic review\b"]), ("cohort", [r"\bcohort\b"]), ("registry", [r"\bregistry\b"]), ("case-control", [r"\bcase-control\b", r"\bcase control\b"]), ("case report", [r"\bcase report\b"]), ("review", [r"\breview\b"]), ("editorial", [r"\beditorial\b", r"\bcommentary\b"]), ("consensus statement", [r"\bconsensus statement\b", r"\bconsensus\b"])]
DOMAIN_RULES = {"coronary disease": [r"\bcabg\b", r"\bpci\b", r"\bcoronary\b", r"\bmyocardial infarction\b", r"\bischemic heart\b"], "valvular disease": [r"\bvalvular\b", r"\baortic stenosis\b", r"\bmitral\b", r"\btricuspid\b", r"\bvalve\b"], "heart failure": [r"\bheart failure\b", r"\bhfpef\b", r"\bhfref\b", r"\bcardiomyopathy\b"], "arrhythmia": [r"\barrhythmia\b", r"\batrial fibrillation\b", r"\bventricular tachycardia\b", r"\bablation\b"], "vascular": [r"\bvascular\b", r"\bperipheral artery\b", r"\baortic aneurysm\b", r"\bcarotid\b"], "thoracic": [r"\bthoracic\b", r"\blung\b", r"\besophagectomy\b"], "ICU": [r"\bicu\b", r"\bcritical care\b", r"\bintensive care\b"], "perioperative": [r"\bperioperative\b", r"\beras\b", r"\benhanced recovery\b", r"\banesthesia\b", r"\bsurgery\b"], "rehabilitation": [r"\brehabilitation\b", r"\bcardiac rehab\b", r"\bexercise training\b"], "imaging": [r"\bechocardiography\b", r"\bmri\b", r"\bct\b", r"\bpet\b", r"\bultrasound\b", r"\bimaging\b"], "biomarkers": [r"\bbiomarker\b", r"\btroponin\b", r"\bbnp\b", r"\bnt-probnp\b"], "genomics": [r"\bgenomic\b", r"\bgenetics\b", r"\btranscriptomic\b", r"\bsequencing\b"]}


def utc_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def normalize_title(value: str | None) -> str:
    return re.sub(r"[^a-z0-9 ]+", "", re.sub(r"\s+", " ", (value or "").strip().lower()))


def build_internal_paper_id(record: dict[str, Any]) -> str:
    seed = record.get("doi") or record.get("pmid") or record.get("pmcid") or normalize_title(record.get("title"))
    return "paper_" + hashlib.sha1(str(seed).encode("utf-8")).hexdigest()[:16]


def _merge(values: Iterable[list[Any]]) -> list[Any]:
    out: list[Any] = []
    for value_list in values:
        for item in value_list:
            if item not in out:
                out.append(item)
    return out


def _better_text(current: str | None, incoming: str | None) -> str | None:
    current, incoming = current or "", incoming or ""
    return incoming if len(incoming.strip()) > len(current.strip()) else current


def classify_record(record: dict[str, Any]) -> dict[str, Any]:
    content = " ".join([record.get("title") or "", record.get("abstract") or "", " ".join(record.get("publication_type") or []), " ".join(record.get("mesh_terms") or []), " ".join(record.get("topics") or [])]).lower()
    study_design = next((label for label, patterns in CLASSIFICATION_RULES if any(re.search(p, content, re.I) for p in patterns)), "observational")
    evidence = "guideline" if study_design == "guideline" else "high" if study_design in {"meta-analysis", "systematic review", "randomized trial"} else "moderate" if study_design in {"cohort", "case-control", "registry", "observational"} else "low" if study_design == "case report" else "narrative"
    domains = _merge([[domain for domain, patterns in DOMAIN_RULES.items() if any(re.search(p, content, re.I) for p in patterns)], record.get("topics") or []])
    record["study_design"], record["evidence_level"], record["publication_type_text"], record["domain_tags"] = study_design, evidence, "; ".join(x for x in record.get("publication_type") or [] if x), domains
    return record


def _combine(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    a["title"], a["abstract"], a["journal"] = _better_text(a.get("title"), b.get("title")), _better_text(a.get("abstract"), b.get("abstract")), _better_text(a.get("journal"), b.get("journal"))
    for key in ["publication_year", "language", "doi", "pmid", "pmcid", "license", "license_url"]:
        a[key] = a.get(key) or b.get(key)
    a["open_access_status"] = "open" if "open" in {a.get("open_access_status"), b.get("open_access_status")} else "unknown" if "unknown" in {a.get("open_access_status"), b.get("open_access_status")} else "restricted"
    for key in ["publication_type", "mesh_terms", "authors", "download_candidates", "topics", "study_types", "identifiers_extra", "licenses_extra", "provenance"]:
        a[key] = _merge([a.get(key) or [], b.get(key) or []])
    for key in ["source_database", "source_url", "query_collection"]:
        a[key] = "; ".join(sorted(set((a.get(key) or "").split("; ") + [b.get(key) or ""]).difference({""})))
    return a


def deduplicate_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged, index = [], {}
    for raw in records:
        record = dict(raw)
        title_year = f"title_year:{normalize_title(record.get('title'))}|{record.get('publication_year') or ''}" if normalize_title(record.get("title")) else ""
        keys = [f"doi:{record['doi']}" if record.get("doi") else "", f"pmid:{record['pmid']}" if record.get("pmid") else "", f"pmcid:{record['pmcid']}" if record.get("pmcid") else "", title_year]
        keys = [k for k in keys if k]
        existing = next((index[k] for k in keys if k in index), None)
        if existing is None:
            merged.append(record)
            existing = len(merged) - 1
        else:
            merged[existing] = _combine(merged[existing], record)
        for key in keys:
            index[key] = existing
    out = []
    for record in merged:
        record["internal_paper_id"], record["retrieval_date"], record["full_text_status"] = build_internal_paper_id(record), utc_today(), record.get("full_text_status") or "restricted"
        out.append(classify_record(record))
    return out


def persist_raw_record_artifacts(records: list[dict[str, Any]], root_dir: Path) -> None:
    (root_dir / "01_RAW" / "metadata").mkdir(parents=True, exist_ok=True)
    (root_dir / "01_RAW" / "abstracts").mkdir(parents=True, exist_ok=True)
    for record in records:
        (root_dir / "01_RAW" / "metadata" / f"{record['internal_paper_id']}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        (root_dir / "01_RAW" / "abstracts" / f"{record['internal_paper_id']}.txt").write_text(((record.get("abstract") or "").strip() + "\n"), encoding="utf-8")


def _papers_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"internal_paper_id": r["internal_paper_id"], "title": r.get("title", ""), "abstract": r.get("abstract", ""), "year": r.get("publication_year"), "journal": r.get("journal", ""), "publication_type": r.get("publication_type_text", ""), "study_design": r.get("study_design", ""), "evidence_level": r.get("evidence_level", ""), "language": r.get("language", ""), "doi": r.get("doi", ""), "pmid": r.get("pmid", ""), "pmcid": r.get("pmcid", ""), "open_access_status": r.get("open_access_status", ""), "full_text_status": r.get("full_text_status", ""), "license": (r.get("license") or r.get("license_url") or ""), "source_database": r.get("source_database", ""), "source_url": r.get("source_url", ""), "query_collection": r.get("query_collection", ""), "retrieval_date": r.get("retrieval_date", "")} for r in records]


def _authors_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"internal_paper_id": r["internal_paper_id"], "author_order": i, "author_name": a.get("name", ""), "affiliation": a.get("affiliation", "")} for r in records for i, a in enumerate(r.get("authors") or [], start=1)]


def _identifier_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [{"internal_paper_id": r["internal_paper_id"], "id_type": key.upper(), "id_value": r.get(key)} for r in records for key in ["doi", "pmid", "pmcid"] if r.get(key)]
    rows.extend([{"internal_paper_id": r["internal_paper_id"], "id_type": str(x.get("id_type", "")).upper(), "id_value": str(x.get("id_value", ""))} for r in records for x in r.get("identifiers_extra") or [] if x.get("id_type") and x.get("id_value")])
    return rows


def _mesh_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"internal_paper_id": r["internal_paper_id"], "mesh_term": m} for r in records for m in r.get("mesh_terms") or []]


def _license_rows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for r in records:
        if r.get("license") or r.get("license_url"):
            rows.append({"internal_paper_id": r["internal_paper_id"], "license_name": r.get("license") or r.get("license_url") or "", "license_url": r.get("license_url") or ""})
        rows.extend([{"internal_paper_id": r["internal_paper_id"], "license_name": x.get("license_name", ""), "license_url": x.get("license_url", "")} for x in r.get("licenses_extra") or []])
    return rows


def write_normalized_outputs(records: list[dict[str, Any]], files_rows: list[dict[str, Any]], root_dir: Path) -> None:
    normalized = root_dir / "03_NORMALIZED"
    normalized.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(_papers_rows(records), columns=PAPERS_COLUMNS).to_csv(normalized / "papers.tsv", sep="\t", index=False)
    pd.DataFrame(_authors_rows(records), columns=AUTHORS_COLUMNS).to_csv(normalized / "authors.tsv", sep="\t", index=False)
    pd.DataFrame(_identifier_rows(records), columns=IDENTIFIERS_COLUMNS).to_csv(normalized / "identifiers.tsv", sep="\t", index=False)
    pd.DataFrame(_mesh_rows(records), columns=MESH_COLUMNS).to_csv(normalized / "mesh_terms.tsv", sep="\t", index=False)
    pd.DataFrame(_license_rows(records), columns=LICENSES_COLUMNS).to_csv(normalized / "licenses.tsv", sep="\t", index=False)
    pd.DataFrame(files_rows, columns=FILES_COLUMNS).to_csv(normalized / "files.tsv", sep="\t", index=False)
    _write_collection_views(records, root_dir)


def _write_collection_views(records: list[dict[str, Any]], root_dir: Path) -> None:
    collections = {"by_topic": lambda r: r.get("topics") or [], "by_domain": lambda r: r.get("domain_tags") or [], "by_year": lambda r: [str(r.get("publication_year") or "unknown")], "by_study_type": lambda r: [r.get("study_design") or "unclassified"]}
    paper_rows = {row["internal_paper_id"]: row for row in _papers_rows(records)}
    base = root_dir / "04_COLLECTIONS"
    for folder in collections:
        path = base / folder
        path.mkdir(parents=True, exist_ok=True)
        for existing in path.glob("*.tsv"):
            existing.unlink()
    for folder, key_fn in collections.items():
        buckets: dict[str, list[dict[str, Any]]] = {}
        for record in records:
            for key in key_fn(record):
                slug = re.sub(r"[^a-z0-9_]+", "_", key.strip().lower()).strip("_") or "unknown"
                buckets.setdefault(slug, []).append(paper_rows[record["internal_paper_id"]])
        for slug, rows in buckets.items():
            pd.DataFrame(rows, columns=PAPERS_COLUMNS).to_csv(base / folder / f"{slug}.tsv", sep="\t", index=False)
