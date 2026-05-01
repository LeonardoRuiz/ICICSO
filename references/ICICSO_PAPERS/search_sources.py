from __future__ import annotations

import csv, json, re, time
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
PUBMED_ELINK_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi"
EUROPE_PMC_SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
PMC_OA_URL = "https://pmc.ncbi.nlm.nih.gov/utils/oa/oa.fcgi"
OPENALEX_WORKS_URL = "https://api.openalex.org/works"
CROSSREF_WORKS_URL = "https://api.crossref.org/works"
USER_AGENT = "ICICSO-Papers/2.0 (legal biomedical acquisition pipeline)"
REQUEST_TIMEOUT = 45
MAX_RETRIES = 5
BACKOFF_SECONDS = 1.7


def create_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json, application/xml, text/xml;q=0.9, */*;q=0.8"})
    return s


def _request(session: requests.Session, method: str, url: str, *, params: dict[str, Any] | None = None) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = session.request(method=method, url=url, params=params, timeout=REQUEST_TIMEOUT)
            if r.status_code in {429, 500, 502, 503, 504} and attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            r.raise_for_status()
            return r
        except requests.HTTPError as exc:
            last_error = exc
            if exc.response is not None and exc.response.status_code in {403, 404}:
                raise
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            raise
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            raise
    raise last_error if last_error else RuntimeError(url)


def _json(session: requests.Session, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return _request(session, "GET", url, params=params).json()


def _text(session: requests.Session, url: str, params: dict[str, Any] | None = None) -> str:
    return _request(session, "GET", url, params=params).text


def append_search_log(path: Path, collection_name: str, source: str, query_text: str, page_marker: str, records_retrieved: int, status: str, detail: str = "") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as h:
        csv.writer(h, delimiter="\t").writerow([time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), collection_name, source, query_text, page_marker, records_retrieved, status, detail])


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as h:
        for row in rows:
            h.write(json.dumps(row, ensure_ascii=False) + "\n")


def _safe_filename(text: str) -> str:
    return (re.sub(r"[^a-z0-9_]+", "", re.sub(r"\s+", "_", text.strip().lower()))[:100] or "collection")


def _year(value: str | None) -> int | None:
    m = re.search(r"(19|20)\d{2}", value or "")
    return int(m.group(0)) if m else None


def _doi(v: str | None) -> str | None:
    if not v:
        return None
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", v.strip(), flags=re.I).lower() or None


def _pmid(v: str | None) -> str | None:
    if not v:
        return None
    return re.sub(r"^.*/", "", str(v).strip()) or None


def _pmcid(v: str | None) -> str | None:
    if not v:
        return None
    c = re.sub(r"^.*/", "", str(v).strip().upper())
    return c if c.startswith("PMC") else f"PMC{c}"


def _record_base(collection_name: str, source_database: str, source_url: str, title: str, abstract: str, publication_year: int | None, journal: str, authors: list[dict[str, str]], doi: str | None, pmid: str | None, pmcid: str | None, publication_type: list[str], mesh_terms: list[str], language: str | None, open_access_status: str, license_name: str | None, license_url: str | None, topics: list[str] | None = None, study_types: list[str] | None = None, extra: dict[str, Any] | None = None, extra_identifiers: list[dict[str, str]] | None = None, extra_licenses: list[dict[str, str]] | None = None) -> dict[str, Any]:
    record = {
        "title": title.strip(),
        "abstract": abstract.strip(),
        "publication_year": publication_year,
        "journal": journal.strip(),
        "authors": authors,
        "doi": _doi(doi),
        "pmid": _pmid(pmid),
        "pmcid": _pmcid(pmcid),
        "source_database": source_database,
        "publication_type": [x for x in publication_type if x],
        "mesh_terms": [x for x in mesh_terms if x],
        "language": language.strip() if isinstance(language, str) and language.strip() else None,
        "open_access_status": open_access_status,
        "license": license_name,
        "license_url": license_url,
        "source_url": source_url,
        "query_collection": collection_name,
        "topics": topics or [],
        "study_types": study_types or [],
        "download_candidates": [],
        "provenance": [{"source_database": source_database, "source_url": source_url}],
        "identifiers_extra": extra_identifiers or [],
        "licenses_extra": extra_licenses or [],
    }
    if extra:
        record.update(extra)
    return record


def _authors_from_pubmed(nodes: list[Any]) -> list[dict[str, str]]:
    out = []
    for node in nodes:
        collective = node.find("CollectiveName")
        last_name = node.find("LastName")
        fore_name = node.find("ForeName")
        name = collective.get_text(" ", strip=True) if collective else " ".join(x for x in [(fore_name.get_text(" ", strip=True) if fore_name else ""), (last_name.get_text(" ", strip=True) if last_name else "")] if x)
        if name:
            out.append({"name": name, "affiliation": " | ".join(a.get_text(" ", strip=True) for a in node.find_all("Affiliation"))})
    return out


def _build_pubmed_query(cfg: dict[str, Any]) -> str:
    clauses = [f"({cfg['query']})"]
    if cfg.get("languages"):
        clauses.append("(" + " OR ".join(f"{x}[Language]" for x in cfg["languages"]) + ")")
    if cfg.get("date_from") and cfg.get("date_to"):
        clauses.append(f'("{cfg["date_from"]}"[Date - Publication] : "{cfg["date_to"]}"[Date - Publication])')
    if cfg.get("study_types"):
        clauses.append("(" + " OR ".join(f'"{x}"[Publication Type]' for x in cfg["study_types"]) + ")")
    return " AND ".join(clauses)


def _pubmed_pmc_map(session: requests.Session, pmids: list[str], error_logger: Callable[[str, str, str, str, str], None] | None) -> dict[str, str]:
    if not pmids:
        return {}
    try:
        soup = BeautifulSoup(_text(session, PUBMED_ELINK_URL, {"dbfrom": "pubmed", "db": "pmc", "id": ",".join(pmids), "retmode": "xml", "linkname": "pubmed_pmc"}), "xml")
    except Exception as exc:
        if error_logger:
            error_logger("search", "pubmed_elink", ",".join(pmids), type(exc).__name__, str(exc))
        return {}
    out: dict[str, str] = {}
    for linkset in soup.find_all("LinkSet"):
        idlist = linkset.find("IdList")
        pmid = idlist.find("Id").get_text(" ", strip=True) if idlist and idlist.find("Id") else None
        text = " ".join(x.get_text(" ", strip=True) for x in linkset.find_all("Link"))
        m = re.search(r"\b\d+\b", text)
        if pmid and m:
            out[pmid] = f"PMC{m.group(0)}"
    return out


def search_pubmed(session: requests.Session, query_config: dict[str, Any], staging_dir: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    name = query_config["name"]
    term = _build_pubmed_query(query_config)
    try:
        payload = _json(session, PUBMED_ESEARCH_URL, {"db": "pubmed", "term": term, "retmode": "json", "retmax": min(int(query_config.get("max_results", 200)), 10000), "sort": "pub date"})
        ids = payload.get("esearchresult", {}).get("idlist", [])
        append_search_log(search_log_path, name, "pubmed", term, "retstart=0", len(ids), "ok")
    except Exception as exc:
        append_search_log(search_log_path, name, "pubmed", term, "retstart=0", 0, "error", str(exc))
        if error_logger:
            error_logger("search", "pubmed", name, type(exc).__name__, str(exc))
        return []
    pmc_map = _pubmed_pmc_map(session, ids, error_logger)
    rows: list[dict[str, Any]] = []
    for start in range(0, len(ids), 200):
        chunk = ids[start : start + 200]
        try:
            soup = BeautifulSoup(_text(session, PUBMED_EFETCH_URL, {"db": "pubmed", "id": ",".join(chunk), "retmode": "xml"}), "xml")
            append_search_log(search_log_path, name, "pubmed_efetch", term, f"chunk={start}", len(chunk), "ok")
        except Exception as exc:
            append_search_log(search_log_path, name, "pubmed_efetch", term, f"chunk={start}", 0, "error", str(exc))
            if error_logger:
                error_logger("fetch", "pubmed", ",".join(chunk), type(exc).__name__, str(exc))
            continue
        for article in soup.find_all("PubmedArticle"):
            medline = article.find("MedlineCitation")
            article_node = medline.find("Article") if medline else None
            pubmed_data = article.find("PubmedData")
            if not medline or not article_node:
                continue
            pmid = _pmid(medline.find("PMID").get_text(" ", strip=True) if medline.find("PMID") else None)
            journal_node = article_node.find("Journal")
            journal = journal_node.find("Title").get_text(" ", strip=True) if journal_node and journal_node.find("Title") else ""
            pub_date = article_node.find("PubDate")
            year = _year(pub_date.get_text(" ", strip=True) if pub_date else None)
            abstract = " ".join((" ".join(x for x in [f"{node.get('Label')}:" if node.get("Label") else "", node.get_text(" ", strip=True)] if x) for node in article_node.find_all("AbstractText") if node.get_text(strip=True)))
            doi = None
            pmcid = None
            identifiers = []
            for node in pubmed_data.find_all("ArticleId") if pubmed_data else []:
                id_type = node.get("IdType", "").lower()
                id_value = node.get_text(" ", strip=True)
                if id_type == "doi":
                    doi = id_value
                elif id_type == "pmc":
                    pmcid = id_value
                if id_value:
                    identifiers.append({"id_type": id_type.upper(), "id_value": id_value})
            rows.append(_record_base(name, "pubmed", f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "https://pubmed.ncbi.nlm.nih.gov/", article_node.find("ArticleTitle").get_text(" ", strip=True) if article_node.find("ArticleTitle") else "", abstract, year, journal, _authors_from_pubmed(article_node.find_all("Author")), doi, pmid, pmcid or pmc_map.get(pmid), [x.get_text(" ", strip=True) for x in article_node.find_all("PublicationType") if x.get_text(strip=True)], [x.find("DescriptorName").get_text(" ", strip=True) for x in medline.find_all("MeshHeading") if x.find("DescriptorName")], article_node.find("Language").get_text(" ", strip=True) if article_node.find("Language") else None, "unknown", None, None, query_config.get("topics"), query_config.get("study_types"), extra_identifiers=identifiers))
    _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", rows)
    return rows


def _epmc_candidates(full_text_url_list: dict[str, Any] | None) -> list[dict[str, str]]:
    out = []
    raw = (full_text_url_list or {}).get("fullTextUrl") or []
    if isinstance(raw, dict):
        raw = [raw]
    for entry in raw:
        url = entry.get("url")
        if not url:
            continue
        style = (entry.get("documentStyle") or entry.get("availability") or "").lower()
        file_type = "xml" if "xml" in style else "pdf" if "pdf" in style else "html"
        out.append({"file_type": file_type, "url": url, "source": "europepmc"})
    return out


def search_europe_pmc(session: requests.Session, query_config: dict[str, Any], staging_dir: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    name = query_config["name"]
    clauses = [query_config["query"]]
    if query_config.get("date_from"):
        clauses.append(f"FIRST_PDATE:[{query_config['date_from']} TO *]")
    if query_config.get("date_to"):
        clauses.append(f"FIRST_PDATE:[* TO {query_config['date_to']}]")
    query = " AND ".join(f"({x})" for x in clauses)
    cursor, rows, max_results = "*", [], int(query_config.get("max_results", 200))
    while len(rows) < max_results:
        try:
            payload = _json(session, EUROPE_PMC_SEARCH_URL, {"query": query, "format": "json", "resultType": "core", "pageSize": min(max_results, 1000), "cursorMark": cursor})
            batch = payload.get("resultList", {}).get("result", []) or []
            append_search_log(search_log_path, name, "europepmc", query, cursor, len(batch), "ok")
        except Exception as exc:
            append_search_log(search_log_path, name, "europepmc", query, cursor, 0, "error", str(exc))
            if error_logger:
                error_logger("search", "europepmc", name, type(exc).__name__, str(exc))
            break
        if not batch:
            break
        for result in batch:
            if len(rows) >= max_results:
                break
            candidates = _epmc_candidates(result.get("fullTextUrlList"))
            row = _record_base(name, "europepmc", result.get("sourceUrl") or (f"https://europepmc.org/article/MED/{result['pmid']}" if result.get("pmid") else "https://europepmc.org/"), result.get("title", ""), result.get("abstractText", "") or "", _year(str(result.get("pubYear") or "")), result.get("journalTitle", "") or "", [{"name": a.strip().rstrip("."), "affiliation": ""} for a in (result.get("authorString") or "").split(",") if a.strip()], result.get("doi"), result.get("pmid"), result.get("pmcid"), [x for x in [result.get("pubType"), result.get("citationType")] if x], [], result.get("language"), "open" if result.get("isOpenAccess") == "Y" else "restricted", result.get("license"), None, query_config.get("topics"), query_config.get("study_types"), extra={"europepmc_is_open_access": result.get("isOpenAccess") == "Y", "europepmc_has_pdf": result.get("hasPDF") == "Y", "europepmc_has_book": result.get("hasBook") == "Y", "europepmc_source": result.get("source"), "europepmc_fulltext_urls": candidates}, extra_identifiers=[{"id_type": "EPMC_ID", "id_value": str(result.get("id"))}] if result.get("id") else [])
            row["download_candidates"].extend(candidates)
            rows.append(row)
        next_cursor = payload.get("nextCursorMark")
        if not next_cursor or next_cursor == cursor:
            break
        cursor = next_cursor
    _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", rows)
    return rows


def search_pmc_oa(session: requests.Session, query_config: dict[str, Any], staging_dir: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    name = query_config["name"]
    query = f"({query_config['query']}) AND OPEN ACCESS[filter]"
    out: list[dict[str, Any]] = []
    try:
        payload = _json(session, PUBMED_ESEARCH_URL, {"db": "pmc", "term": query, "retmode": "json", "retmax": min(int(query_config.get("max_results", 200)), 5000)})
        ids = payload.get("esearchresult", {}).get("idlist", [])
        append_search_log(search_log_path, name, "pmc", query, "retstart=0", len(ids), "ok")
    except Exception as exc:
        append_search_log(search_log_path, name, "pmc", query, "retstart=0", 0, "error", str(exc))
        if error_logger:
            error_logger("search", "pmc", name, type(exc).__name__, str(exc))
        _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", [])
        return []
    for pmc_numeric in ids:
        pmcid = _pmcid(pmc_numeric)
        if not pmcid:
            continue
        try:
            soup = BeautifulSoup(_text(session, PMC_OA_URL, {"id": pmcid}), "xml")
            out.append({"pmcid": pmcid, "pmc_oa_links": [{"href": (x.get("href") or "").replace("ftp://ftp.ncbi.nlm.nih.gov/", "https://ftp.ncbi.nlm.nih.gov/"), "format": x.get("format")} for x in soup.find_all("link") if x.get("href")]})
        except Exception as exc:
            if error_logger:
                error_logger("fetch", "pmc_oa", pmcid, type(exc).__name__, str(exc))
    _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", out)
    return out


def _abstract_from_inverted(index: dict[str, list[int]] | None) -> str:
    if not index:
        return ""
    tokens = []
    for token, positions in index.items():
        for position in positions:
            tokens.append((position, token))
    return " ".join(token for _, token in sorted(tokens))


def search_openalex(session: requests.Session, query_config: dict[str, Any], staging_dir: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    name, max_results, cursor, rows = query_config["name"], int(query_config.get("max_results", 200)), "*", []
    filters = []
    if query_config.get("date_from"):
        filters.append(f"from_publication_date:{query_config['date_from']}")
    if query_config.get("date_to"):
        filters.append(f"to_publication_date:{query_config['date_to']}")
    while len(rows) < max_results:
        params = {"search": query_config["query"], "per-page": min(max_results, 200), "cursor": cursor, "mailto": "local-repository@example.invalid"}
        if filters:
            params["filter"] = ",".join(filters)
        try:
            payload = _json(session, OPENALEX_WORKS_URL, params)
            batch = payload.get("results", []) or []
            append_search_log(search_log_path, name, "openalex", query_config["query"], cursor, len(batch), "ok")
        except Exception as exc:
            append_search_log(search_log_path, name, "openalex", query_config["query"], cursor, 0, "error", str(exc))
            if error_logger:
                error_logger("search", "openalex", name, type(exc).__name__, str(exc))
            break
        if not batch:
            break
        for item in batch:
            if len(rows) >= max_results:
                break
            ids = item.get("ids") or {}
            oa = item.get("open_access") or {}
            best = item.get("best_oa_location") or {}
            primary = item.get("primary_location") or {}
            source = (primary.get("source") or {}) if isinstance(primary, dict) else {}
            candidates = []
            if oa.get("is_oa") and best.get("pdf_url"):
                candidates.append({"file_type": "pdf", "url": best["pdf_url"], "source": "openalex_pdf"})
            if oa.get("is_oa") and best.get("landing_page_url"):
                candidates.append({"file_type": "html", "url": best["landing_page_url"], "source": "openalex_landing"})
            row = _record_base(name, "openalex", item.get("id", OPENALEX_WORKS_URL), item.get("display_name", ""), _abstract_from_inverted(item.get("abstract_inverted_index")), item.get("publication_year"), source.get("display_name", "") if isinstance(source, dict) else "", [{"name": (a.get("author") or {}).get("display_name", ""), "affiliation": " | ".join(i.get("display_name", "") for i in a.get("institutions") or [] if i.get("display_name"))} for a in item.get("authorships") or [] if (a.get("author") or {}).get("display_name")], ids.get("doi") or item.get("doi"), ids.get("pmid"), ids.get("pmcid"), [x for x in [item.get("type"), item.get("type_crossref")] if x], [], item.get("language"), "open" if oa.get("is_oa") else "restricted", best.get("license"), None, query_config.get("topics"), query_config.get("study_types"), extra={"openalex_primary_location": primary, "openalex_best_oa_location": best, "openalex_concepts": [c.get("display_name", "") for c in item.get("concepts") or [] if c.get("display_name")], "openalex_cited_by_count": item.get("cited_by_count")}, extra_identifiers=[{"id_type": "OPENALEX", "id_value": item.get("id")}] if item.get("id") else [])
            row["download_candidates"].extend(candidates)
            rows.append(row)
        next_cursor = (payload.get("meta") or {}).get("next_cursor")
        if not next_cursor or next_cursor == cursor:
            break
        cursor = next_cursor
    _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", rows)
    return rows


def search_crossref(session: requests.Session, query_config: dict[str, Any], staging_dir: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    name, cursor, rows, max_results = query_config["name"], "*", [], int(query_config.get("max_results", 200))
    while len(rows) < max_results:
        params = {"query.bibliographic": query_config["query"], "rows": min(max_results, 1000), "cursor": cursor, "select": ",".join(["DOI", "title", "abstract", "author", "issued", "container-title", "type", "link", "URL", "language", "license", "subject"])}
        filters = []
        if query_config.get("date_from"):
            filters.append(f"from-pub-date:{query_config['date_from']}")
        if query_config.get("date_to"):
            filters.append(f"until-pub-date:{query_config['date_to']}")
        if filters:
            params["filter"] = ",".join(filters)
        try:
            payload = _json(session, CROSSREF_WORKS_URL, params)
            batch = payload.get("message", {}).get("items", []) or []
            append_search_log(search_log_path, name, "crossref", query_config["query"], cursor, len(batch), "ok")
        except Exception as exc:
            append_search_log(search_log_path, name, "crossref", query_config["query"], cursor, 0, "error", str(exc))
            if error_logger:
                error_logger("search", "crossref", name, type(exc).__name__, str(exc))
            break
        if not batch:
            break
        for item in batch:
            if len(rows) >= max_results:
                break
            authors = []
            for author in item.get("author") or []:
                name_bits = [author.get("given"), author.get("family")]
                full_name = " ".join(x for x in name_bits if x)
                if full_name:
                    authors.append({"name": full_name, "affiliation": " | ".join(a.get("name", "") for a in author.get("affiliation") or [] if a.get("name"))})
            date_parts = item.get("issued", {}).get("date-parts") or []
            year = int(date_parts[0][0]) if date_parts and date_parts[0] and str(date_parts[0][0]).isdigit() else None
            license_entries = item.get("license") or []
            license_url = license_entries[0].get("URL") if license_entries else None
            candidates = []
            for link in item.get("link") or []:
                url = link.get("URL")
                ctype = (link.get("content-type") or "").lower()
                if url and "pdf" in ctype:
                    candidates.append({"file_type": "pdf", "url": url, "source": "crossref"})
                elif url and "xml" in ctype:
                    candidates.append({"file_type": "xml", "url": url, "source": "crossref"})
            abstract = BeautifulSoup(item.get("abstract") or "", "lxml").get_text(" ", strip=True)
            row = _record_base(name, "crossref", item.get("URL") or (f"https://doi.org/{quote_plus(item['DOI'])}" if item.get("DOI") else CROSSREF_WORKS_URL), (item.get("title") or [""])[0], abstract, year, (item.get("container-title") or [""])[0], authors, item.get("DOI"), None, None, [item.get("type", "")], [], item.get("language"), "open" if license_url else "unknown", license_url, license_url, query_config.get("topics"), query_config.get("study_types"), extra={"crossref_subjects": item.get("subject") or []}, extra_licenses=[{"license_name": x.get("URL"), "license_url": x.get("URL")} for x in license_entries if x.get("URL")])
            row["download_candidates"].extend(candidates)
            rows.append(row)
        next_cursor = payload.get("message", {}).get("next-cursor")
        if not next_cursor or next_cursor == cursor:
            break
        cursor = next_cursor
    _write_jsonl(staging_dir / f"{_safe_filename(name)}.jsonl", rows)
    return rows


def run_all_searches(session: requests.Session, query_config: dict[str, Any], project_root: Path, search_log_path: Path, error_logger: Callable[[str, str, str, str, str], None] | None = None) -> list[dict[str, Any]]:
    staging_root = project_root / "02_STAGING"
    rows: list[dict[str, Any]] = []
    rows.extend(search_pubmed(session, query_config, staging_root / "pubmed", search_log_path, error_logger))
    rows.extend(search_europe_pmc(session, query_config, staging_root / "europepmc", search_log_path, error_logger))
    search_pmc_oa(session, query_config, staging_root / "pmc", search_log_path, error_logger)
    rows.extend(search_openalex(session, query_config, staging_root / "openalex", search_log_path, error_logger))
    rows.extend(search_crossref(session, query_config, staging_root / "crossref", search_log_path, error_logger))
    return rows
