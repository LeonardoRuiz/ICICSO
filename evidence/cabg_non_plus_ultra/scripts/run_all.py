from __future__ import annotations

import json
import logging
import math
import re
import sys
import time
import ast
from html import escape
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urljoin, urlparse
from xml.etree import ElementTree as ET

import pandas as pd
import requests
import yaml
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_DIR = BASE_DIR / "input"
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"
PDF_DIR = RAW_DIR / "pdf"
LANDING_DIR = RAW_DIR / "landing_pages"
ABSTRACTS_DIR = RAW_DIR / "abstracts"
PMC_XML_DIR = RAW_DIR / "pmc_xml"
REGISTRY_CSV = PROCESSED_DIR / "papers_registry.csv"
REGISTRY_PARQUET = PROCESSED_DIR / "papers_registry.parquet"
MATRIX_CSV = PROCESSED_DIR / "cabg_matrix_non_plus_ultra.csv"
MATRIX_XLSX = PROCESSED_DIR / "cabg_matrix_non_plus_ultra.xlsx"
MATRIX_MD = PROCESSED_DIR / "cabg_matrix_non_plus_ultra.md"
MASTER_LIST_MD = PROCESSED_DIR / "vancouver_master_list.md"
MISSING_CSV = PROCESSED_DIR / "missing_or_paywalled.csv"
DEDUP_MD = PROCESSED_DIR / "dedup_report.md"
VALIDATION_MD = PROCESSED_DIR / "validation_report.md"
TOP10_MD = PROCESSED_DIR / "top10_absolute_core_for_surgeon.md"
TOP20_BOARD_MD = PROCESSED_DIR / "top20_heart_team_board.md"
READING_SEQUENCE_MD = PROCESSED_DIR / "cabg_case_reading_sequence.md"
MATRIX_HTML = PROCESSED_DIR / "cabg_matrix_non_plus_ultra.html"
TOP10_HTML = PROCESSED_DIR / "top10_absolute_core_for_surgeon.html"
TOP20_BOARD_HTML = PROCESSED_DIR / "top20_heart_team_board.html"
READING_SEQUENCE_HTML = PROCESSED_DIR / "cabg_case_reading_sequence.html"
PRESENTATION_INDEX_HTML = PROCESSED_DIR / "cabg_non_plus_ultra_presentation.html"
ACQ_LOG = PROCESSED_DIR / "acquisition_log.jsonl"
SEED_PATH = INPUT_DIR / "seed_papers_cabg50.yaml"
TIMEOUT = 25
RETRIES = 3
USER_AGENT = "ICICSO-CABG-Evidence/1.0 (mailto:local-operator@example.com)"

ABSOLUTE_CORE_SEEDS = {"A01", "A02", "A03", "B16", "B17", "C27", "C28", "A11", "A12", "A10", "E48", "E47"}
HIGH_CORE_SEEDS = {"A04", "A06", "A07", "A08", "D38", "D39", "D40", "D41", "D43", "D44", "D45", "D46", "E50"}
ADVANCED_CORE_SEEDS = {"B21", "B22", "B23", "B24", "B25", "C31", "C32", "C33", "D42", "E49"}


class SeedPaper(BaseModel):
    seed_id: str
    group: str
    subdomain: str
    priority_rank_1_to_50: int
    short_label: str
    target_title: str
    query: str
    year_hint: int | None = None
    publication_type: str
    guideline_body: str | None = ""
    clinical_phase: str
    scenario_relevance: str
    index_case_fit: str


class ResolvedPaper(BaseModel):
    seed_id: str
    paper_id: str
    domain_group: str
    subdomain: str
    clinical_phase: str
    scenario_relevance: str
    short_label: str
    target_title: str
    full_title: str | None = None
    authors: list[str] = Field(default_factory=list)
    authors_vancouver: str = ""
    year: int | None = None
    journal: str | None = None
    volume: str | None = None
    issue: str | None = None
    pages: str | None = None
    doi: str | None = None
    pmid: str | None = None
    pmcid: str | None = None
    publisher_url: str | None = None
    pdf_url: str | None = None
    guideline_body: str | None = None
    publication_type: str
    source_of_truth: str | None = None
    validation_status: str
    access_status: str = "unattempted"
    abstract_text: str | None = None
    pdf_local_path: str | None = None
    landing_page_local_path: str | None = None
    pmc_xml_local_path: str | None = None
    abstract_local_path: str | None = None
    acquisition_result: str | None = None
    index_case_fit: str
    priority_rank_1_to_50: int
    must_know_tier: str
    notes: str = ""


def setup_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[logging.StreamHandler(sys.stdout)])


def ensure_dirs() -> None:
    for path in [INPUT_DIR, PDF_DIR, LANDING_DIR, ABSTRACTS_DIR, PMC_XML_DIR, PROCESSED_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_spaces(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_title(text: str | None) -> str:
    text = normalize_spaces(text).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return normalize_spaces(text)


def sanitize_filename(text: str, max_len: int = 80) -> str:
    text = normalize_spaces(text)
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("._")
    return text[:max_len] or "file"


def assigned_tier(seed_id: str) -> str:
    if seed_id in ABSOLUTE_CORE_SEEDS:
        return "absolute_core"
    if seed_id in HIGH_CORE_SEEDS:
        return "high_core"
    if seed_id in ADVANCED_CORE_SEEDS:
        return "advanced_core"
    return "extension"


def similarity(a: str, b: str | None) -> float:
    a_norm = set(normalize_title(a).split())
    b_norm = set(normalize_title(b).split())
    if not a_norm or not b_norm:
        return 0.0
    overlap = len(a_norm & b_norm)
    return (2 * overlap) / (len(a_norm) + len(b_norm))


def candidate_penalty(title: str | None) -> float:
    normalized = normalize_title(title)
    penalty = 0.0
    for token in ["correction", "erratum", "comment", "comments", "interpretation", "editorial", "perspectives", "key perspectives", "journal scan", "implications"]:
        if token in normalized:
            penalty -= 0.4
    return penalty


def request_json(session: requests.Session, url: str, *, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    for attempt in range(RETRIES):
        try:
            response = session.get(url, params=params, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
            if response.status_code == 200:
                return response.json()
            if response.status_code in {404, 410}:
                return None
        except requests.RequestException:
            if attempt + 1 == RETRIES:
                return None
        time.sleep((attempt + 1) * 1.5)
    return None


def request_text(session: requests.Session, url: str) -> tuple[int | None, str | None, str | None]:
    for attempt in range(RETRIES):
        try:
            response = session.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
            return response.status_code, response.text, response.url
        except requests.RequestException:
            if attempt + 1 == RETRIES:
                return None, None, None
        time.sleep((attempt + 1) * 1.5)
    return None, None, None


def request_binary(session: requests.Session, url: str) -> tuple[int | None, bytes | None, str | None, str | None]:
    for attempt in range(RETRIES):
        try:
            response = session.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT}, stream=True)
            return response.status_code, response.content, response.url, response.headers.get("content-type")
        except requests.RequestException:
            if attempt + 1 == RETRIES:
                return None, None, None, None
        time.sleep((attempt + 1) * 1.5)
    return None, None, None, None


def load_seed_records() -> list[SeedPaper]:
    with SEED_PATH.open("r", encoding="utf-8") as fh:
        payload = yaml.safe_load(fh) or []
    return [SeedPaper.model_validate(item) for item in payload]


def vancouver_authors(authors: list[str]) -> str:
    if not authors:
        return ""
    return ", ".join(authors[:6]) + (", et al." if len(authors) > 6 else ".")


def write_abstract(record: ResolvedPaper) -> None:
    if not record.abstract_text:
        return
    abstract_path = ABSTRACTS_DIR / f"{record.paper_id}.txt"
    abstract_path.write_text(record.abstract_text.strip() + "\n", encoding="utf-8")
    record.abstract_local_path = str(abstract_path.relative_to(BASE_DIR))


def write_landing_html(record: ResolvedPaper, html: str | None) -> None:
    if not html:
        return
    landing_path = LANDING_DIR / f"{record.paper_id}.html"
    landing_path.write_text(html, encoding="utf-8")
    record.landing_page_local_path = str(landing_path.relative_to(BASE_DIR))


def manual_override(seed_id: str) -> dict[str, Any] | None:
    overrides: dict[str, dict[str, Any]] = {
        "A01": {
            "manual_curated": True,
            "full_title": "2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization: Executive Summary",
            "authors": ["Lawton JS", "Tamis-Holland JE", "Bangalore S"],
            "journal": "Circulation",
            "year": 2022,
            "volume": "145",
            "issue": "3",
            "pages": "e4-e17",
            "doi": "10.1161/CIR.0000000000001038".lower(),
            "pmid": "34882435",
            "publisher_url": "https://doi.org/10.1161/CIR.0000000000001038",
            "source_of_truth": "pubmed",
        },
        "A02": {
            "manual_curated": True,
            "full_title": "2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes",
            "authors": ["Rao SV", "O'Donoghue ML", "Ruel M"],
            "journal": "Circulation",
            "year": 2025,
            "volume": "151",
            "issue": "11",
            "pages": "e1010-e1138",
            "doi": "10.1161/CIR.0000000000001309".lower(),
            "pmid": "40014670",
            "publisher_url": "https://doi.org/10.1161/CIR.0000000000001309",
            "source_of_truth": "pubmed",
        },
        "A03": {
            "manual_curated": True,
            "full_title": "2023 ESC Guidelines for the management of acute coronary syndromes",
            "authors": ["Byrne RA", "Rossello X", "Coughlan JJ"],
            "journal": "European Heart Journal",
            "year": 2023,
            "volume": "44",
            "issue": "38",
            "pages": "3720-3826",
            "doi": "10.1093/eurheartj/ehad191",
            "publisher_url": "https://doi.org/10.1093/eurheartj/ehad191",
            "source_of_truth": "official_society",
        },
        "A04": {
            "manual_curated": True,
            "full_title": "2018 ESC/EACTS Guidelines on myocardial revascularization",
            "authors": ["Neumann FJ", "Sousa-Uva M", "Ahlsson A"],
            "journal": "European Heart Journal",
            "year": 2019,
            "volume": "40",
            "issue": "2",
            "pages": "87-165",
            "doi": "10.1093/eurheartj/ehy394",
            "pmid": "30165437",
            "publisher_url": "https://doi.org/10.1093/eurheartj/ehy394",
            "source_of_truth": "pubmed",
        },
        "A06": {
            "manual_curated": True,
            "full_title": "10. Cardiovascular Disease and Risk Management: Standards of Care in Diabetes-2026",
            "authors": ["American Diabetes Association Professional Practice Committee for Diabetes"],
            "journal": "Diabetes Care",
            "year": 2026,
            "volume": "49",
            "issue": "Supplement_1",
            "pages": "S216-S245",
            "doi": "10.2337/dc26-S010".lower(),
            "pmid": "41358899",
            "pmcid": "PMC12690187",
            "publisher_url": "https://doi.org/10.2337/dc26-S010",
            "source_of_truth": "pubmed",
        },
        "A07": {
            "manual_curated": True,
            "full_title": "11. Chronic Kidney Disease and Risk Management: Standards of Care in Diabetes-2026",
            "authors": ["American Diabetes Association Professional Practice Committee for Diabetes"],
            "journal": "Diabetes Care",
            "year": 2026,
            "volume": "49",
            "issue": "Supplement_1",
            "pages": "S246-S260",
            "doi": "10.2337/dc26-S011".lower(),
            "pmid": "41358881",
            "pmcid": "PMC12690176",
            "publisher_url": "https://doi.org/10.2337/dc26-S011",
            "source_of_truth": "pubmed",
        },
        "A08": {
            "manual_curated": True,
            "full_title": "16. Diabetes Care in the Hospital: Standards of Care in Diabetes-2026",
            "authors": ["American Diabetes Association Professional Practice Committee for Diabetes"],
            "journal": "Diabetes Care",
            "year": 2026,
            "volume": "49",
            "issue": "Supplement_1",
            "pages": "S339-S355",
            "doi": "10.2337/dc26-S016".lower(),
            "pmid": "41358892",
            "pmcid": "PMC12690180",
            "publisher_url": "https://doi.org/10.2337/dc26-S016",
            "source_of_truth": "pubmed",
        },
        "A09": {
            "manual_curated": True,
            "full_title": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease",
            "authors": ["Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group"],
            "journal": "Kidney International",
            "year": 2024,
            "volume": "105",
            "issue": "4S",
            "pages": "S117-S314",
            "doi": "10.1016/j.kint.2023.10.018".lower(),
            "pmid": "38490803",
            "publisher_url": "https://doi.org/10.1016/j.kint.2023.10.018",
            "source_of_truth": "pubmed",
        },
        "A10": {
            "manual_curated": True,
            "full_title": "KDIGO Clinical Practice Guideline for Acute Kidney Injury",
            "authors": ["Kidney Disease: Improving Global Outcomes Acute Kidney Injury Work Group"],
            "journal": "Kidney International Supplements",
            "year": 2012,
            "volume": "2",
            "issue": "1",
            "pages": "1-138",
            "doi": "10.1038/kisup.2012.1",
            "publisher_url": "https://doi.org/10.1038/kisup.2012.1",
            "source_of_truth": "official_society",
        },
        "A13": {
            "manual_curated": True,
            "full_title": "2024 EACTS/EACTAIC Guidelines on patient blood management in adult cardiac surgery in collaboration with EBCP",
            "authors": ["Casselman FPA", "Lance MD", "Ahmed A"],
            "journal": "European Journal of Cardio-Thoracic Surgery",
            "year": 2025,
            "volume": "67",
            "issue": "5",
            "pages": "ezae352",
            "doi": "10.1093/ejcts/ezae352",
            "pmid": "39385500",
            "pmcid": "PMC12257489",
            "publisher_url": "https://doi.org/10.1093/ejcts/ezae352",
            "pdf_url": "https://academic.oup.com/ejcts/advance-article-pdf/doi/10.1093/ejcts/ezae352/59653060/ezae352.pdf",
            "source_of_truth": "publisher",
        },
        "A15": {
            "manual_curated": True,
            "full_title": "Expert systematic review on the choice of conduits for coronary artery bypass grafting: endorsed by the European Association for Cardio-Thoracic Surgery (EACTS) and The Society of Thoracic Surgeons (STS)",
            "authors": ["Gaudino M", "Bakaeen FG", "Sandner S"],
            "journal": "Journal of Thoracic and Cardiovascular Surgery",
            "year": 2023,
            "volume": "166",
            "issue": "4",
            "pages": "1099-1114",
            "doi": "10.1016/j.jtcvs.2023.06.017",
            "pmid": "37542480",
            "publisher_url": "https://doi.org/10.1016/j.jtcvs.2023.06.017",
            "source_of_truth": "publisher",
        },
        "B20": {
            "manual_curated": True,
            "full_title": "Outcomes after fractional flow reserve-guided percutaneous coronary intervention versus coronary artery bypass grafting (FAME 3): 5-year follow-up of a multicentre, open-label, randomised trial",
            "authors": ["Fearon WF", "Zimmermann FM", "Ding VY"],
            "journal": "Lancet",
            "year": 2025,
            "volume": "406",
            "issue": "10493",
            "pages": "1287-1294",
            "doi": "10.1016/S0140-6736(25)00505-7".lower(),
            "publisher_url": "https://doi.org/10.1016/S0140-6736(25)00505-7",
            "source_of_truth": "publisher",
        },
        "B21": {
            "manual_curated": True,
            "full_title": "Everolimus-Eluting Stents or Bypass Surgery for Left Main Coronary Artery Disease",
            "authors": ["Stone GW", "Kappetein AP", "Sabik JF"],
            "journal": "New England Journal of Medicine",
            "year": 2016,
            "volume": "375",
            "issue": "23",
            "pages": "2223-2235",
            "doi": "10.1056/NEJMoa1610227".lower(),
            "pmid": "27797291",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1610227",
            "source_of_truth": "pubmed",
        },
        "B22": {
            "manual_curated": True,
            "full_title": "Five-Year Outcomes after PCI or CABG for Left Main Coronary Disease",
            "authors": ["Stone GW", "Kappetein AP", "Sabik JF"],
            "journal": "New England Journal of Medicine",
            "year": 2019,
            "volume": "381",
            "issue": "19",
            "pages": "1820-1830",
            "doi": "10.1056/NEJMoa1909406".lower(),
            "pmid": "31562798",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1909406",
            "source_of_truth": "pubmed",
        },
        "B26": {
            "manual_curated": True,
            "full_title": "Initial Invasive or Conservative Strategy for Stable Coronary Disease",
            "authors": ["Maron DJ", "Hochman JS", "Reynolds HR"],
            "journal": "New England Journal of Medicine",
            "year": 2020,
            "volume": "382",
            "issue": "15",
            "pages": "1395-1407",
            "doi": "10.1056/NEJMoa1915922".lower(),
            "pmid": "32227755",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1915922",
            "source_of_truth": "pubmed",
        },
        "C28": {
            "manual_curated": True,
            "full_title": "Coronary-Artery Bypass Surgery in Patients with Ischemic Cardiomyopathy",
            "authors": ["Velazquez EJ", "Lee KL", "Jones RH"],
            "journal": "New England Journal of Medicine",
            "year": 2016,
            "volume": "374",
            "issue": "16",
            "pages": "1511-1520",
            "doi": "10.1056/NEJMoa1602001".lower(),
            "pmid": "27040723",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1602001",
            "source_of_truth": "pubmed",
        },
        "D38": {
            "manual_curated": True,
            "full_title": "Radial-Artery or Saphenous-Vein Grafts in Coronary-Artery Bypass Surgery",
            "authors": ["Gaudino M", "Benedetto U", "Fremes S"],
            "journal": "New England Journal of Medicine",
            "year": 2018,
            "volume": "378",
            "issue": "22",
            "pages": "2069-2077",
            "doi": "10.1056/NEJMoa1716026".lower(),
            "pmid": "29708851",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1716026",
            "source_of_truth": "pubmed",
        },
        "D46": {
            "manual_curated": True,
            "full_title": "Five-Year Outcomes of Off-Pump Versus On-Pump Coronary Artery Bypass Grafting: The Randomized Department of Veterans Affairs ROOBY-FS Trial",
            "authors": ["Shroyer ALW", "Hattler B", "Wagner TH"],
            "journal": "Circulation",
            "year": 2016,
            "volume": "134",
            "issue": "16",
            "pages": "1139-1148",
            "doi": "10.1161/CIRCULATIONAHA.116.021861".lower(),
            "pmid": "27777257",
            "publisher_url": "https://doi.org/10.1161/CIRCULATIONAHA.116.021861",
            "source_of_truth": "pubmed",
        },
        "E47": {
            "manual_curated": True,
            "full_title": "Restrictive or Liberal Red-Cell Transfusion for Cardiac Surgery",
            "authors": ["Mazer CD", "Whitlock RP", "Fergusson DA"],
            "journal": "New England Journal of Medicine",
            "year": 2017,
            "volume": "377",
            "issue": "22",
            "pages": "2133-2144",
            "doi": "10.1056/NEJMoa1711818".lower(),
            "pmid": "29130845",
            "publisher_url": "https://doi.org/10.1056/NEJMoa1711818",
            "source_of_truth": "pubmed",
        },
        "E48": {
            "manual_curated": True,
            "full_title": "Prevention of cardiac surgery-associated AKI by implementing the KDIGO guidelines in high risk patients identified by biomarkers: the PrevAKI randomized controlled trial",
            "authors": ["Meersch M", "Schmidt C", "Hoffmeier A"],
            "journal": "Intensive Care Medicine",
            "year": 2017,
            "volume": "43",
            "issue": "11",
            "pages": "1551-1561",
            "doi": "10.1007/s00134-016-4670-3",
            "pmid": "28110412",
            "pmcid": "PMC5633630",
            "publisher_url": "https://doi.org/10.1007/s00134-016-4670-3",
            "source_of_truth": "pubmed",
        },
    }
    return overrides.get(seed_id)


def parse_pubmed_article(article_node: ET.Element) -> dict[str, Any]:
    title = normalize_spaces("".join(article_node.findtext(".//ArticleTitle", default="")))
    abstract_nodes = article_node.findall(".//Abstract/AbstractText")
    abstract_parts = [normalize_spaces("".join(node.itertext())) for node in abstract_nodes]
    abstract = "\n".join(part for part in abstract_parts if part)
    authors: list[str] = []
    for author in article_node.findall(".//AuthorList/Author"):
        last = normalize_spaces(author.findtext("LastName"))
        initials = normalize_spaces(author.findtext("Initials"))
        collective = normalize_spaces(author.findtext("CollectiveName"))
        if collective:
            authors.append(collective)
        elif last:
            authors.append(f"{last} {initials}".strip())
    journal = normalize_spaces(article_node.findtext(".//Journal/Title"))
    year = article_node.findtext(".//PubDate/Year")
    medline_date = normalize_spaces(article_node.findtext(".//PubDate/MedlineDate"))
    if not year and medline_date:
        match = re.search(r"(19|20)\d{2}", medline_date)
        year = match.group(0) if match else None
    volume = normalize_spaces(article_node.findtext(".//JournalIssue/Volume"))
    issue = normalize_spaces(article_node.findtext(".//JournalIssue/Issue"))
    pages = normalize_spaces(article_node.findtext(".//Pagination/MedlinePgn"))
    pmid = normalize_spaces(article_node.findtext(".//PMID"))
    doi = None
    pmcid = None
    for article_id in article_node.findall(".//ArticleIdList/ArticleId"):
        id_type = article_id.attrib.get("IdType", "").lower()
        value = normalize_spaces("".join(article_id.itertext()))
        if id_type == "doi":
            doi = value.lower()
        if id_type == "pmc":
            pmcid = value
    return {
        "full_title": title,
        "abstract_text": abstract,
        "authors": authors,
        "journal": journal,
        "year": int(year) if year and year.isdigit() else None,
        "volume": volume or None,
        "issue": issue or None,
        "pages": pages or None,
        "pmid": pmid or None,
        "doi": doi,
        "pmcid": pmcid,
        "source_of_truth": "pubmed",
    }


def search_pubmed(session: requests.Session, seed: SeedPaper) -> dict[str, Any] | None:
    search_payload = request_json(
        session,
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
        params={"db": "pubmed", "retmode": "json", "retmax": 5, "term": seed.query},
    )
    id_list = (((search_payload or {}).get("esearchresult") or {}).get("idlist")) or []
    if not id_list:
        return None
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={','.join(id_list)}&retmode=xml"
    status, text, _ = request_text(session, url)
    if status != 200 or not text:
        return None
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return None
    best: tuple[float, dict[str, Any]] | None = None
    for article in root.findall(".//PubmedArticle"):
        candidate = parse_pubmed_article(article)
        score = similarity(seed.target_title, candidate.get("full_title")) + candidate_penalty(candidate.get("full_title"))
        if seed.year_hint and candidate.get("year"):
            score += 0.15 if seed.year_hint == candidate["year"] else max(0, 0.1 - abs(seed.year_hint - candidate["year"]) * 0.03)
        if not best or score > best[0]:
            best = (score, candidate)
    return best[1] if best and best[0] >= 0.25 else None


def search_crossref(session: requests.Session, seed: SeedPaper) -> dict[str, Any] | None:
    payload = request_json(
        session,
        "https://api.crossref.org/works",
        params={"query.bibliographic": seed.query, "rows": 5, "select": "DOI,title,author,container-title,issued,volume,issue,page,URL,link"},
    )
    items = (((payload or {}).get("message") or {}).get("items")) or []
    best: tuple[float, dict[str, Any]] | None = None
    for item in items:
        title = normalize_spaces(" ".join(item.get("title") or []))
        year_parts = (((item.get("issued") or {}).get("date-parts")) or [[None]])
        year = year_parts[0][0] if year_parts and year_parts[0] else None
        authors: list[str] = []
        for author in item.get("author") or []:
            family = normalize_spaces(author.get("family"))
            given = normalize_spaces(author.get("given"))
            if family:
                initials = "".join(part[0] for part in given.split() if part)
                authors.append(f"{family} {initials}".strip())
        pdf_url = None
        for link in item.get("link") or []:
            if (link.get("content-type") or "").lower() == "application/pdf":
                pdf_url = link.get("URL")
                break
        candidate = {
            "full_title": title,
            "authors": authors,
            "journal": normalize_spaces(" ".join(item.get("container-title") or [])) or None,
            "year": int(year) if year else None,
            "volume": normalize_spaces(str(item.get("volume") or "")) or None,
            "issue": normalize_spaces(str(item.get("issue") or "")) or None,
            "pages": normalize_spaces(str(item.get("page") or "")) or None,
            "doi": normalize_spaces(item.get("DOI") or "").lower() or None,
            "publisher_url": item.get("URL"),
            "pdf_url": pdf_url,
            "source_of_truth": "crossref",
        }
        score = similarity(seed.target_title, title) + candidate_penalty(title)
        if seed.year_hint and candidate.get("year"):
            score += 0.15 if seed.year_hint == candidate["year"] else max(0, 0.1 - abs(seed.year_hint - candidate["year"]) * 0.03)
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best and best[0] >= 0.2 else None


def search_europe_pmc(session: requests.Session, seed: SeedPaper) -> dict[str, Any] | None:
    payload = request_json(
        session,
        "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
        params={"query": seed.query, "format": "json", "pageSize": 5},
    )
    results = (((payload or {}).get("resultList") or {}).get("result")) or []
    best: tuple[float, dict[str, Any]] | None = None
    for item in results:
        title = normalize_spaces(item.get("title"))
        author_string = normalize_spaces(item.get("authorString"))
        authors = [normalize_spaces(part) for part in re.split(r",\s*", author_string) if part][:8]
        candidate = {
            "full_title": title,
            "authors": authors,
            "journal": normalize_spaces(item.get("journalTitle")) or None,
            "year": int(item["pubYear"]) if str(item.get("pubYear", "")).isdigit() else None,
            "volume": normalize_spaces(item.get("journalVolume")) or None,
            "issue": normalize_spaces(item.get("issue")) or None,
            "pages": normalize_spaces(item.get("pageInfo")) or None,
            "doi": normalize_spaces(item.get("doi")).lower() if item.get("doi") else None,
            "pmid": normalize_spaces(item.get("pmid")) or None,
            "pmcid": normalize_spaces(item.get("pmcid")) or None,
            "publisher_url": normalize_spaces(item.get("fullTextUrl")) or None,
            "source_of_truth": "europe_pmc",
        }
        score = similarity(seed.target_title, title) + candidate_penalty(title)
        if seed.year_hint and candidate.get("year"):
            score += 0.15 if seed.year_hint == candidate["year"] else max(0, 0.1 - abs(seed.year_hint - candidate["year"]) * 0.03)
        if best is None or score > best[0]:
            best = (score, candidate)
    return best[1] if best and best[0] >= 0.2 else None


def enrich_from_doi_landing(session: requests.Session, doi: str | None) -> dict[str, Any]:
    if not doi:
        return {}
    url = f"https://doi.org/{quote(doi)}"
    status, html, final_url = request_text(session, url)
    if status != 200 or not html:
        return {}
    soup = BeautifulSoup(html, "lxml")
    title = None
    for key in ["citation_title", "dc.title", "og:title"]:
        node = soup.find("meta", attrs={"name": key}) or soup.find("meta", attrs={"property": key})
        if node and node.get("content"):
            title = node["content"]
            break
    pdf_url = None
    for key in ["citation_pdf_url", "wkhealth_pdf_url", "pdf_url"]:
        node = soup.find("meta", attrs={"name": key}) or soup.find("meta", attrs={"property": key})
        if node and node.get("content"):
            pdf_url = urljoin(final_url or url, node["content"])
            break
    return {"publisher_url": final_url or url, "full_title": normalize_spaces(title) or None, "pdf_url": pdf_url, "source_of_truth": "doi_landing", "landing_html": html}


def official_society_hint(seed: SeedPaper) -> dict[str, Any] | None:
    mapping = {
        "A01": {"publisher_url": "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001038", "source_of_truth": "official_society"},
        "A03": {"publisher_url": "https://academic.oup.com/eurheartj/article/44/38/3720/7243210", "source_of_truth": "official_society"},
        "A04": {"publisher_url": "https://academic.oup.com/eurheartj/article/40/2/87/5079120", "source_of_truth": "official_society"},
        "A09": {"publisher_url": "https://kdigo.org/guidelines/ckd-evaluation-and-management/", "source_of_truth": "official_society"},
        "A10": {"publisher_url": "https://kdigo.org/guidelines/acute-kidney-injury/", "source_of_truth": "official_society"},
    }
    return mapping.get(seed.seed_id)


def merge_candidates(seed: SeedPaper, candidates: list[dict[str, Any] | None]) -> ResolvedPaper:
    merged: dict[str, Any] = {
        "seed_id": seed.seed_id,
        "paper_id": seed.seed_id.lower(),
        "domain_group": seed.group,
        "subdomain": seed.subdomain,
        "clinical_phase": seed.clinical_phase,
        "scenario_relevance": seed.scenario_relevance,
        "short_label": seed.short_label,
        "target_title": seed.target_title,
        "publication_type": seed.publication_type,
        "guideline_body": seed.guideline_body,
        "validation_status": "unresolved_partial",
        "index_case_fit": seed.index_case_fit,
        "priority_rank_1_to_50": seed.priority_rank_1_to_50,
        "must_know_tier": assigned_tier(seed.seed_id),
        "notes": "",
    }
    primary_sources = {"doi_landing", "pubmed", "publisher", "official_society"}
    used_sources: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        for key, value in candidate.items():
            if value in [None, "", [], {}]:
                continue
            if key == "authors" and value:
                merged[key] = value
            elif key == "source_of_truth":
                used_sources.append(str(value))
            elif key not in merged or merged.get(key) in [None, "", [], {}]:
                merged[key] = value
    merged["authors_vancouver"] = vancouver_authors(merged.get("authors") or [])
    merged["source_of_truth"] = list(dict.fromkeys(used_sources))[0] if used_sources else None
    if merged.get("doi") and merged.get("full_title") and merged.get("journal"):
        merged["validation_status"] = "validated_primary" if merged.get("source_of_truth") in primary_sources else "validated_secondary"
    elif merged.get("pmid") and merged.get("full_title"):
        merged["validation_status"] = "validated_secondary"
    title_similarity = similarity(seed.target_title, merged.get("full_title"))
    if not any(candidate and candidate.get("manual_curated") for candidate in candidates):
        if title_similarity < 0.6:
            merged["validation_status"] = "unresolved_partial"
            merged["notes"] = f"Low title similarity to seed ({title_similarity:.2f}); manual review required."
    if not merged.get("full_title"):
        merged["full_title"] = seed.target_title
    return ResolvedPaper.model_validate(merged)


def resolve_metadata() -> list[ResolvedPaper]:
    ensure_dirs()
    setup_logging()
    seeds = load_seed_records()
    session = requests.Session()
    records: list[ResolvedPaper] = []
    for seed in seeds:
        logging.info("Resolving %s %s", seed.seed_id, seed.short_label)
        override = manual_override(seed.seed_id)
        pubmed = search_pubmed(session, seed)
        crossref = search_crossref(session, seed)
        europe_pmc = search_europe_pmc(session, seed)
        doi_landing = enrich_from_doi_landing(session, (override or {}).get("doi") or (pubmed or {}).get("doi") or (crossref or {}).get("doi") or (europe_pmc or {}).get("doi"))
        official = official_society_hint(seed)
        record = merge_candidates(seed, [override, doi_landing, pubmed, europe_pmc, crossref, official])
        write_abstract(record)
        write_landing_html(record, doi_landing.get("landing_html") if doi_landing else None)
        records.append(record)
    return records


def log_acquisition(entry: dict[str, Any]) -> None:
    with ACQ_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def pdf_filename(record: ResolvedPaper) -> str:
    first_author = sanitize_filename((record.authors[0].split()[0] if record.authors else "Unknown"))
    short_title = sanitize_filename(record.short_label.replace("/", "_"))
    year = str(record.year or "0000")
    return f"{year}__{first_author}__{short_title}.pdf"


def acquire_fulltext(records: list[ResolvedPaper]) -> list[ResolvedPaper]:
    session = requests.Session()
    ACQ_LOG.write_text("", encoding="utf-8")
    for record in records:
        urls_to_try: list[tuple[str, str]] = []
        if record.pdf_url:
            urls_to_try.append(("publisher_pdf", record.pdf_url))
        if record.pmcid:
            pmc_clean = record.pmcid.replace("PMC", "")
            urls_to_try.append(("pmc_pdf", f"https://pmc.ncbi.nlm.nih.gov/articles/PMC{pmc_clean}/pdf"))
        if record.publisher_url:
            urls_to_try.append(("landing_page", record.publisher_url))
        acquired = False
        landing_saved = bool(record.landing_page_local_path)
        for label, url in urls_to_try:
            status_code, payload, _, content_type = request_binary(session, url)
            local_path = None
            result = "failed"
            if status_code == 200 and payload:
                if label.endswith("pdf") and (content_type or "").lower().startswith("application/pdf"):
                    target = PDF_DIR / pdf_filename(record)
                    target.write_bytes(payload)
                    record.pdf_local_path = str(target.relative_to(BASE_DIR))
                    record.access_status = "open"
                    record.acquisition_result = "pdf_downloaded"
                    local_path = str(target.relative_to(BASE_DIR))
                    result = "pdf_downloaded"
                    acquired = True
                elif "html" in (content_type or "").lower() or label == "landing_page":
                    text = payload.decode("utf-8", errors="ignore")
                    landing_path = LANDING_DIR / f"{record.paper_id}.html"
                    landing_path.write_text(text, encoding="utf-8")
                    record.landing_page_local_path = str(landing_path.relative_to(BASE_DIR))
                    if not acquired:
                        record.access_status = "abstract-only"
                        record.acquisition_result = "landing_page_saved"
                    local_path = str(landing_path.relative_to(BASE_DIR))
                    result = "landing_page_saved"
                    landing_saved = True
            log_acquisition({"seed_id": record.seed_id, "title": record.full_title, "doi": record.doi, "url_attempted": url, "status_code": status_code, "acquisition_result": result, "local_path": local_path, "timestamp": now_iso()})
            if acquired:
                break
        if not acquired:
            if record.abstract_local_path and landing_saved:
                record.access_status = "abstract-only"
                record.acquisition_result = "abstract_saved_no_legal_pdf"
            elif landing_saved:
                record.access_status = "paywalled"
                record.acquisition_result = "not_downloaded_legal_restriction"
            else:
                record.access_status = "not_downloaded_legal_restriction"
                record.acquisition_result = "not_downloaded_legal_restriction"
    return records


def canonical_url(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")


def deduplicate_records(records: list[ResolvedPaper]) -> tuple[list[ResolvedPaper], str]:
    seen: dict[str, ResolvedPaper] = {}
    duplicates: list[str] = []
    conflicts: list[str] = []
    for record in records:
        keys = [record.doi or "", record.pmid or "", normalize_title(record.full_title), canonical_url(record.publisher_url) or ""]
        usable = [key for key in keys if key]
        unique_key = usable[0] if usable else f"seed:{record.seed_id}"
        existing = seen.get(unique_key)
        if not existing:
            seen[unique_key] = record
            continue
        prev_score = int(existing.validation_status.startswith("validated")) + int(bool(existing.pdf_local_path))
        new_score = int(record.validation_status.startswith("validated")) + int(bool(record.pdf_local_path))
        if new_score > prev_score:
            seen[unique_key] = record
            duplicates.append(f"Replaced {existing.seed_id} with {record.seed_id} on key `{unique_key}`.")
        elif new_score == prev_score and existing.full_title != record.full_title:
            conflicts.append(f"Conflict preserved between {existing.seed_id} and {record.seed_id} on key `{unique_key}`.")
        else:
            duplicates.append(f"Removed duplicate {record.seed_id} merged into {existing.seed_id} on key `{unique_key}`.")
    deduped = sorted(seen.values(), key=lambda item: item.priority_rank_1_to_50)
    report = ["# Deduplication report", "", "## Duplicates removed", *(duplicates or ["None."]), "", "## Conflicts preserved", *(conflicts or ["None."]), "", "## References merged", f"Final registry size: {len(deduped)} from {len(records)} resolved records."]
    return deduped, "\n".join(report) + "\n"


def publication_to_study_type(publication_type: str) -> str:
    mapping = {
        "guideline": "Guideline",
        "consensus": "Consensus statement",
        "RCT": "Randomized clinical trial",
        "follow-up": "Follow-up analysis",
        "meta-analysis": "Meta-analysis",
        "review": "Review",
        "substudy": "Substudy",
    }
    return mapping.get(publication_type, publication_type.title())


def split_sentences(text: str) -> list[str]:
    text = normalize_spaces(text)
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


def summarize_record(record: ResolvedPaper) -> dict[str, str]:
    sentences = split_sentences(record.abstract_text or "")
    if not sentences:
        summary = "Abstract not available. Matrix annotations are restricted to validated metadata and domain relevance."
        takeaway = f"{record.short_label} remains clinically relevant for {record.subdomain.replace('_', ' ')} in the index CABG case."
    else:
        summary = "\n".join(sentences[: min(6, len(sentences))])
        takeaway = sentences[-1]
    limitations = {
        "Guideline": "Applicability depends on local resources, exact perioperative phenotype, and update cycle.",
        "Randomized clinical trial": "Trial era, crossover, and enrolled population may limit direct transfer to contemporary surgical practice.",
        "Follow-up analysis": "Interpretation depends on survivor bias, crossover, and evolving background therapy over time.",
        "Meta-analysis": "Pooled estimates inherit heterogeneity from source trials and variable endpoint definitions.",
        "Review": "Narrative or synthesized evidence depends on included studies and may not replace trial-level data.",
        "Substudy": "Substudy findings may be underpowered or hypothesis-generating relative to the parent trial.",
        "Consensus statement": "Consensus guidance may outpace high-quality randomized evidence in some operative decisions.",
    }.get(publication_to_study_type(record.publication_type), "Use with the context and limits of the underlying source.")
    case_line = {
        "revascularization": "Directly informs CABG versus PCI choice in complex multivessel disease, especially when diabetes and ACS coexist.",
        "lv_dysfunction": "Directly informs expected benefit and framing of CABG in ischemic cardiomyopathy with reduced EF.",
        "conduits_technique": "Shapes graft choice and operative technique in a diabetic patient with elevated wound and long-term patency considerations.",
        "perioperative_safety": "Supports risk mitigation for AKI, transfusion, glycemic control, and postoperative atrial fibrillation.",
        "guideline_trunk": "Provides the reference frame for indication, timing, perioperative standards, and multidisciplinary planning.",
    }.get(record.domain_group, "Relevant to the longitudinal management of the index surgical case.")
    return {"summary_lines": summary, "core_takeaway": takeaway, "why_it_matters_for_this_case": case_line, "limitations": limitations}


def phase_flag(record: ResolvedPaper, wanted: str) -> str:
    return "yes" if record.clinical_phase in {wanted, "transversal"} else ""


def axis_bundle(record: ResolvedPaper) -> dict[str, Any]:
    primary = {
        "A01": "indication", "A02": "timing", "A03": "timing", "A04": "indication", "A05": "glycemia", "A06": "outcomes",
        "A07": "renal", "A08": "glycemia", "A09": "renal", "A10": "renal", "A11": "eras", "A12": "transfusion",
        "A13": "transfusion", "A14": "conduit", "A15": "conduit", "B16": "indication", "B17": "outcomes", "B18": "indication",
        "B19": "indication", "B20": "outcomes", "B21": "indication", "B22": "outcomes", "B23": "outcomes", "B24": "outcomes",
        "B25": "indication", "B26": "indication", "C27": "indication", "C28": "outcomes", "C29": "outcomes", "C30": "outcomes",
        "C31": "indication", "C32": "outcomes", "C33": "outcomes", "C34": "outcomes", "D35": "conduit", "D36": "conduit",
        "D37": "conduit", "D38": "conduit", "D39": "conduit", "D40": "conduit", "D41": "conduit", "D42": "technique",
        "D43": "technique", "D44": "outcomes", "D45": "technique", "D46": "outcomes", "E47": "transfusion", "E48": "renal",
        "E49": "glycemia", "E50": "poaf",
    }
    secondary = {
        "A01": "timing", "A02": "indication", "A03": "indication", "A04": "conduit", "A05": "outcomes", "A06": "indication",
        "A07": "glycemia", "A08": "glycemia", "A09": "outcomes", "A10": "renal", "A11": "outcomes", "A12": "transfusion", "A13": "transfusion",
        "A14": "technique", "A15": "technique", "B16": "outcomes", "B17": "indication", "B18": "outcomes", "B19": "technique",
        "B20": "indication", "B21": "outcomes", "B22": "indication", "B23": "indication", "B24": "indication", "B25": "outcomes",
        "B26": "outcomes", "C27": "outcomes", "C28": "indication", "C29": "indication", "C30": "outcomes", "C31": "outcomes",
        "C32": "indication", "C33": "outcomes", "C34": "indication", "D35": "outcomes", "D36": "transfusion", "D37": "outcomes",
        "D38": "outcomes", "D39": "outcomes", "D40": "outcomes", "D41": "technique", "D42": "conduit", "D43": "renal",
        "D44": "renal", "D45": "outcomes", "D46": "technique", "E47": "transfusion", "E48": "glycemia", "E49": "glycemia", "E50": "poaf",
    }
    yes = "yes"
    partial = "partial"
    no = "no"
    changes = {
        "changes_indication": yes if record.seed_id in {"A01", "A02", "A03", "A04", "B16", "B18", "B19", "B21", "B25", "B26", "C27", "C31", "C34"} else partial if record.seed_id in {"B17", "B20", "B22", "B23", "B24", "C28", "C29", "C32"} else no,
        "changes_timing": yes if record.seed_id in {"A02", "A03"} else partial if record.seed_id in {"A01", "B19", "B20"} else no,
        "changes_conduit_choice": yes if record.seed_id in {"A14", "A15", "D35", "D38", "D39", "D40", "D41", "D42"} else partial if record.seed_id in {"A04", "D36", "D37"} else no,
        "changes_pump_strategy": yes if record.seed_id in {"D43", "D45"} else partial if record.seed_id in {"D44", "D46", "D42"} else no,
        "changes_renal_strategy": yes if record.seed_id in {"A07", "A09", "A10", "E48"} else partial if record.seed_id in {"D43", "D44", "E49"} else no,
        "changes_glucose_strategy": yes if record.seed_id in {"A05", "A08", "E49"} else partial if record.seed_id in {"A06", "A07", "E48"} else no,
        "changes_transfusion_strategy": yes if record.seed_id in {"A12", "A13", "E47"} else partial if record.seed_id in {"D36", "D37"} else no,
        "changes_poaf_strategy": yes if record.seed_id in {"E50"} else partial if record.seed_id in {"A11"} else no,
        "changes_icu_strategy": yes if record.seed_id in {"A08", "A10", "A11", "A12", "A13", "E47", "E48", "E49", "E50"} else partial if record.seed_id in {"D43", "D44", "C30", "C33"} else no,
        "changes_discharge_strategy": yes if record.seed_id in {"A11"} else partial if record.seed_id in {"D36", "D37", "E50"} else no,
    }
    role = {
        "surgeon_preop_relevance": 3 if record.seed_id in {"A01","A02","A03","A04","A14","A15","B16","B18","B19","C27","D38","D39","D41","D42"} else 2 if record.domain_group in {"revascularization","lv_dysfunction","conduits_technique"} else 1,
        "anesthesia_relevance": 3 if record.seed_id in {"A08","A10","A11","A12","A13","E47","E48","E49","E50"} else 2 if record.seed_id in {"D43","D44","D45","D46"} else 1,
        "perfusion_relevance": 3 if record.seed_id in {"A10","A12","A13","D43","D44","D45","D46","E47","E48"} else 2 if record.seed_id in {"A09","D42"} else 1,
        "icu_relevance": 3 if record.seed_id in {"A08","A10","A11","E47","E48","E49","E50"} else 2 if record.seed_id in {"A12","A13","D43","D44","C30","C33"} else 1,
        "nursing_relevance": 3 if record.seed_id in {"A08","A11","E49","E50"} else 2 if record.seed_id in {"A12","A13","E47","E48","D36","D37"} else 1,
    }
    return {
        "decision_axis_primary": primary.get(record.seed_id, "outcomes"),
        "decision_axis_secondary": secondary.get(record.seed_id, "outcomes"),
        **changes,
        "board_presentation_value": "high" if record.seed_id in {"A01","A02","A03","A04","B16","B18","B19","B20","C27","C28","D38","E48"} else "medium",
        **role,
        "heart_team_slide_worthy": yes if record.seed_id in {"A01","A02","A03","A04","B16","B18","B19","B20","B21","B22","B25","C27","C28","C34"} else no,
        "preop_night_before_worthy": yes if record.seed_id in {"A01","A02","A03","A04","A09","A10","A12","A13","A14","A15","B16","B18","B19","B20","C27","C28","D38","D39","D42","E47","E48","E50"} else no,
        "day_of_surgery_worthy": yes if record.seed_id in {"A02","A03","A10","A12","A13","A14","A15","D42","D43","D45","E47","E48","E49","E50"} else no,
        "postop_day0_worthy": yes if record.seed_id in {"A08","A10","A11","A12","A13","D43","D44","E47","E48","E49","E50"} else no,
        "postop_day1_3_worthy": yes if record.seed_id in {"A08","A11","D36","D37","E47","E49","E50"} else no,
    }


def make_matrix(records: list[ResolvedPaper]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for record in sorted(records, key=lambda item: item.priority_rank_1_to_50):
        summary = summarize_record(record)
        study_type = publication_to_study_type(record.publication_type)
        axes = axis_bundle(record)
        rows.append(
            {
                "paper_id": record.paper_id,
                "domain_group": record.domain_group,
                "subdomain": record.subdomain,
                "clinical_phase": record.clinical_phase,
                "scenario_relevance": record.scenario_relevance,
                "short_label": record.short_label,
                "full_title": record.full_title,
                "authors_vancouver": record.authors_vancouver,
                "year": record.year,
                "journal": record.journal,
                "study_type": study_type,
                "guideline_body": record.guideline_body,
                "population_key": "Urgent CABG x3 phenotype with DM2, NSTEMI, LVEF 35%, CKD3, and complex multivessel disease",
                "index_case_fit": record.index_case_fit,
                "main_question": f"What does {record.short_label} add to decisions for {record.subdomain.replace('_', ' ')}?",
                "core_takeaway": summary["core_takeaway"],
                "why_it_matters_for_this_case": summary["why_it_matters_for_this_case"],
                **axes,
                "operational_impact_preop": phase_flag(record, "preop"),
                "operational_impact_intraop": phase_flag(record, "intraop"),
                "operational_impact_icu": phase_flag(record, "icu"),
                "operational_impact_ward": phase_flag(record, "ward"),
                "heart_team_impact": "high" if record.domain_group in {"guideline_trunk", "revascularization", "lv_dysfunction"} else "medium",
                "graft_strategy_impact": "high" if record.domain_group == "conduits_technique" else "",
                "dm2_impact": "high" if "diabetes" in normalize_title(record.full_title) or record.seed_id in {"A05", "A06", "A07", "B16", "B17"} else "",
                "nstemi_timing_impact": "high" if record.seed_id in {"A02", "A03"} else "",
                "lv_dysfunction_impact": "high" if record.domain_group == "lv_dysfunction" else "",
                "ckd_aki_impact": "high" if record.seed_id in {"A07", "A09", "A10", "E48"} else "",
                "transfusion_pbm_impact": "high" if record.seed_id in {"A12", "A13", "E47"} else "",
                "glycemic_control_impact": "high" if record.seed_id in {"A05", "A08", "E49"} else "",
                "poaf_impact": "high" if record.seed_id == "E50" else "",
                "infection_impact": "high" if record.seed_id == "D42" else "",
                "eras_impact": "high" if record.seed_id == "A11" else "",
                "evidence_level_note": summary["limitations"],
                "priority_rank_1_to_50": record.priority_rank_1_to_50,
                "must_know_tier": record.must_know_tier,
                "doi": record.doi,
                "pmid": record.pmid,
                "pmcid": record.pmcid,
                "publisher_url": record.publisher_url,
                "pdf_local_path": record.pdf_local_path,
                "access_status": record.access_status,
                "validation_status": record.validation_status,
                "notes": summary["summary_lines"],
            }
        )
    return pd.DataFrame(rows)


def build_vancouver_entry(record: ResolvedPaper) -> str:
    parts = [record.authors_vancouver.rstrip("."), record.full_title or record.target_title, record.journal or "Unknown journal"]
    year_part = str(record.year) if record.year else "n.d."
    issue_part = ""
    if record.volume:
        issue_part = record.volume
        if record.issue:
            issue_part += f"({record.issue})"
    page_part = record.pages or ""
    citation = ". ".join(part for part in parts if part)
    trailer = ";".join(part for part in [year_part, issue_part] if part)
    if page_part:
        trailer = f"{trailer}:{page_part}" if trailer else page_part
    if trailer:
        citation = f"{citation}. {trailer}."
    if record.doi:
        citation += f" doi:{record.doi}."
    if record.pmid:
        citation += f" PMID:{record.pmid}."
    if record.pmcid:
        citation += f" PMCID:{record.pmcid}."
    return citation


def html_document(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <style>
    :root {{
      --bg: #f4efe6;
      --paper: #fffdf8;
      --ink: #1d2a32;
      --muted: #5c6b73;
      --line: #d9cfbf;
      --accent: #8a3d12;
      --accent-soft: #efe0d2;
      --good: #1f6f5f;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, #f8f2e9 0, transparent 28%),
        linear-gradient(180deg, #efe6d7 0%, var(--bg) 28%, #e8ded0 100%);
    }}
    .wrap {{ max-width: 1220px; margin: 0 auto; padding: 32px 20px 64px; }}
    .hero {{
      background: linear-gradient(135deg, rgba(138,61,18,.96), rgba(47,71,79,.94));
      color: #fff8f0;
      border-radius: 22px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 18px 40px rgba(43, 32, 23, .16);
    }}
    h1, h2, h3 {{ margin: 0 0 12px; line-height: 1.12; }}
    h1 {{ font-size: 2.2rem; }}
    h2 {{ font-size: 1.35rem; color: var(--accent); margin-top: 24px; }}
    h3 {{ font-size: 1.05rem; }}
    p, li {{ line-height: 1.55; }}
    .card {{
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 16px;
      box-shadow: 0 10px 24px rgba(59, 44, 31, .06);
    }}
    .grid {{ display: grid; gap: 16px; }}
    .grid.two {{ grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }}
    .pill {{
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: .86rem;
      margin: 0 8px 8px 0;
    }}
    .metric {{
      display: inline-block;
      min-width: 110px;
      padding: 10px 12px;
      border-left: 4px solid var(--accent);
      background: #f6f0e7;
      border-radius: 10px;
      margin: 0 10px 10px 0;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--paper);
      border-radius: 16px;
      overflow: hidden;
      font-size: .94rem;
    }}
    th, td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }}
    th {{ background: #eadfce; color: #3d2d22; position: sticky; top: 0; }}
    .table-wrap {{ overflow: auto; border: 1px solid var(--line); border-radius: 18px; }}
    a {{ color: var(--accent); }}
    .muted {{ color: var(--muted); }}
    .ok {{ color: var(--good); font-weight: 700; }}
  </style>
</head>
<body>
  <div class="wrap">
    {body}
  </div>
</body>
</html>
"""


def save_registry(records: list[ResolvedPaper]) -> pd.DataFrame:
    frame = pd.DataFrame([record.model_dump() for record in records])
    frame.to_csv(REGISTRY_CSV, index=False, encoding="utf-8")
    frame.to_parquet(REGISTRY_PARQUET, index=False)
    return frame


def save_matrix(frame: pd.DataFrame) -> None:
    frame.to_csv(MATRIX_CSV, index=False, encoding="utf-8")
    frame.to_excel(MATRIX_XLSX, index=False)
    top10 = frame.sort_values("priority_rank_1_to_50").head(10)
    lines = ["# CABG non plus ultra matrix", "", "## Top 10 absoluto", ""]
    for _, row in top10.iterrows():
        lines.append(f"{int(row['priority_rank_1_to_50'])}. **{row['short_label']}** - {row['full_title']}")
    lines += ["", "## Full matrix", ""]
    for _, row in frame.sort_values("priority_rank_1_to_50").iterrows():
        lines.append(f"### {int(row['priority_rank_1_to_50'])}. {row['short_label']}")
        lines.append(f"- Título: {row['full_title']}")
        lines.append(f"- Estudio: {row['study_type']}")
        lines.append(f"- Relevancia: {row['scenario_relevance']} | Fit: {row['index_case_fit']} | Tier: {row['must_know_tier']}")
        lines.append(f"- Eje principal/secundario: {row['decision_axis_primary']} / {row['decision_axis_secondary']}")
        lines.append(f"- Takeaway: {row['core_takeaway']}")
        lines.append(f"- Impacto en el caso: {row['why_it_matters_for_this_case']}")
        lines.append(f"- Criterio de priorización: cuánto cambia la conducta, cuánto protege al paciente, cuánto reduce error serio y cuánto afecta este fenotipo concreto.")
        lines.append(f"- Cambios conductuales: indicación={row['changes_indication']}, timing={row['changes_timing']}, conductos={row['changes_conduit_choice']}, bomba={row['changes_pump_strategy']}, renal={row['changes_renal_strategy']}, glucosa={row['changes_glucose_strategy']}, transfusión={row['changes_transfusion_strategy']}, POAF={row['changes_poaf_strategy']}")
        lines.append(f"- Notas técnicas: {row['notes']}")
        lines.append(f"- Acceso: {row['access_status']} | Validación: {row['validation_status']}")
        lines.append("")
    MATRIX_MD.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def save_html_outputs(records: list[ResolvedPaper], frame: pd.DataFrame) -> None:
    top10 = frame[frame["must_know_tier"] == "absolute_core"].sort_values("priority_rank_1_to_50").head(10)
    top20 = frame.sort_values(["heart_team_slide_worthy", "priority_rank_1_to_50"], ascending=[False, True]).head(20)
    top10_cards = []
    for _, row in top10.iterrows():
        citation = build_vancouver_entry(next(record for record in records if record.paper_id == row["paper_id"]))
        top10_cards.append(
            f"""
            <section class="card">
              <h3>{int(row['priority_rank_1_to_50'])}. {escape(str(row['short_label']))}</h3>
              <p class="muted">{escape(citation)}</p>
              <p><strong>Por qué entra:</strong> cambia conducta real en <span class="pill">{escape(str(row['decision_axis_primary']))}</span> y reduce error serio en este fenotipo.</p>
              <p><strong>Qué cambia:</strong> indicación={escape(str(row['changes_indication']))}, timing={escape(str(row['changes_timing']))}, conductos={escape(str(row['changes_conduit_choice']))}, bomba={escape(str(row['changes_pump_strategy']))}, renal={escape(str(row['changes_renal_strategy']))}, transfusión={escape(str(row['changes_transfusion_strategy']))}.</p>
              <p><strong>Qué error evita:</strong> evita una decisión de alto impacto mal calibrada antes o durante CABG urgente.</p>
            </section>
            """
        )
    TOP10_HTML.write_text(
        html_document(
            "Top 10 Absolute Core for Surgeon",
            f"""
            <section class="hero">
              <h1>Top 10 Absolute Core for Surgeon</h1>
              <p>CABG x3 urgente con DM2, NSTEMI, FEVI 35%, ERC3 y anatomía multivaso compleja.</p>
            </section>
            {''.join(top10_cards)}
            """,
        ),
        encoding="utf-8",
    )

    board_cards = []
    for _, row in top20.iterrows():
        board_cards.append(
            f"""
            <section class="card">
              <h3>{escape(str(row['short_label']))}</h3>
              <p><strong>Paper:</strong> {escape(str(row['full_title']))}</p>
              <p><strong>Mensaje de una línea:</strong> {escape(str(row['core_takeaway']))}</p>
              <p><strong>Utilidad en Heart Team:</strong> alinea discusión de <span class="pill">{escape(str(row['decision_axis_primary']))}</span> con cambio de conducta, protección del paciente y reducción de error grave.</p>
              <p><strong>Diapositiva sugerida:</strong> {escape(str(row['decision_axis_primary']))} con foco en {escape(str(row['why_it_matters_for_this_case']))}.</p>
            </section>
            """
        )
    TOP20_BOARD_HTML.write_text(
        html_document(
            "Top 20 Heart Team Board",
            f"""
            <section class="hero">
              <h1>Top 20 Heart Team Board</h1>
              <p>Selección de papers con mayor valor para la discusión multidisciplinaria del caso índice.</p>
            </section>
            {''.join(board_cards)}
            """,
        ),
        encoding="utf-8",
    )

    sequence_blocks = {
        "Bloque 1: indicación y revascularización": ["A01","A02","A03","A04","B16","B18","B19","B20","B21","B22","B25","B26"],
        "Bloque 2: LV dysfunction": ["C27","C28","C34","C31","C30","C33","C29","C32"],
        "Bloque 3: injertos y técnica": ["A14","A15","D38","D39","D40","D41","D42","D43","D44","D45","D46","D35","D36","D37"],
        "Bloque 4: safety bundle": ["A09","A10","A12","A13","E48","E47","E49","E50"],
        "Bloque 5: ICU / ERAS / discharge": ["A08","A11","A05","A06","A07"],
    }
    by_seed = {record.seed_id: record for record in records}
    reading_sections = []
    for title, seeds in sequence_blocks.items():
        items = []
        for sid in seeds:
            record = by_seed.get(sid)
            if record:
                items.append(f"<li><strong>{escape(record.seed_id)} {escape(record.short_label)}</strong>: fijar <span class='pill'>{escape(axis_bundle(record)['decision_axis_primary'])}</span> y traducirlo a conducta inmediata.</li>")
        reading_sections.append(f"<section class='card'><h2>{escape(title)}</h2><ul>{''.join(items)}</ul></section>")
    READING_SEQUENCE_HTML.write_text(
        html_document(
            "CABG Case Reading Sequence",
            f"""
            <section class="hero">
              <h1>Secuencia de lectura para el caso CABG</h1>
              <p>Ordenada para que un cirujano llegue mejor preparado en el menor tiempo posible.</p>
            </section>
            {''.join(reading_sections)}
            """,
        ),
        encoding="utf-8",
    )

    summary_metrics = "".join(
        [
            f"<div class='metric'><strong>{escape(label)}</strong><br>{value}</div>"
            for label, value in [
                ("Papers", len(frame)),
                ("Absolute core", int((frame["must_know_tier"] == "absolute_core").sum())),
                ("High core", int((frame["must_know_tier"] == "high_core").sum())),
                ("Advanced core", int((frame["must_know_tier"] == "advanced_core").sum())),
                ("Open full text", int((frame["access_status"] == "open").sum())),
            ]
        ]
    )
    top_rows = []
    for _, row in frame.sort_values("priority_rank_1_to_50").iterrows():
        top_rows.append(
            "<tr>"
            f"<td>{int(row['priority_rank_1_to_50'])}</td>"
            f"<td>{escape(str(row['short_label']))}</td>"
            f"<td>{escape(str(row['must_know_tier']))}</td>"
            f"<td>{escape(str(row['decision_axis_primary']))}</td>"
            f"<td>{escape(str(row['changes_indication']))}</td>"
            f"<td>{escape(str(row['changes_timing']))}</td>"
            f"<td>{escape(str(row['changes_conduit_choice']))}</td>"
            f"<td>{escape(str(row['changes_renal_strategy']))}</td>"
            f"<td>{escape(str(row['access_status']))}</td>"
            f"<td>{escape(str(row['validation_status']))}</td>"
            "</tr>"
        )
    MATRIX_HTML.write_text(
        html_document(
            "CABG Non Plus Ultra Matrix",
            f"""
            <section class="hero">
              <h1>Matriz CABG Non Plus Ultra</h1>
              <p>Priorizada por cambio de conducta, protección del paciente, reducción de error serio y relevancia para el fenotipo concreto.</p>
              <div>{summary_metrics}</div>
            </section>
            <section class="card">
              <h2>Top 10 absoluto</h2>
              <div class="grid two">
                {''.join([f"<div class='card'><h3>{int(r['priority_rank_1_to_50'])}. {escape(str(r['short_label']))}</h3><p>{escape(str(r['core_takeaway']))}</p><span class='pill'>{escape(str(r['decision_axis_primary']))}</span><span class='pill'>{escape(str(r['must_know_tier']))}</span></div>" for _, r in top10.iterrows()])}
              </div>
            </section>
            <section class="card">
              <h2>Matriz resumida</h2>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Paper</th><th>Tier</th><th>Axis</th><th>Indication</th><th>Timing</th><th>Conduit</th><th>Renal</th><th>Access</th><th>Validation</th></tr>
                  </thead>
                  <tbody>{''.join(top_rows)}</tbody>
                </table>
              </div>
            </section>
            """,
        ),
        encoding="utf-8",
    )

    PRESENTATION_INDEX_HTML.write_text(
        html_document(
            "CABG Presentation Index",
            """
            <section class="hero">
              <h1>CABG Non Plus Ultra Presentation</h1>
              <p>HTML package listo para presentar lo elaborado en formato clínico-operativo.</p>
            </section>
            <div class="grid two">
              <a class="card" href="cabg_matrix_non_plus_ultra.html"><h2>Matriz HTML</h2><p>Vista general de la matriz clínica y priorización.</p></a>
              <a class="card" href="top10_absolute_core_for_surgeon.html"><h2>Top 10 para cirujano</h2><p>Resumen de máxima utilidad preoperatoria.</p></a>
              <a class="card" href="top20_heart_team_board.html"><h2>Heart Team Board</h2><p>Selección de papers para discusión multidisciplinaria.</p></a>
              <a class="card" href="cabg_case_reading_sequence.html"><h2>Secuencia de lectura</h2><p>Ruta rápida de preparación del caso.</p></a>
            </div>
            """,
        ),
        encoding="utf-8",
    )


def save_clinical_outputs(records: list[ResolvedPaper], frame: pd.DataFrame) -> None:
    top10 = frame[frame["must_know_tier"] == "absolute_core"].sort_values("priority_rank_1_to_50").head(10)
    lines = ["# Top 10 absolute core for surgeon", ""]
    for _, row in top10.iterrows():
        lines.append(f"## {int(row['priority_rank_1_to_50'])}. {row['short_label']}")
        lines.append(f"- Referencia Vancouver: {build_vancouver_entry(next(record for record in records if record.paper_id == row['paper_id']))}")
        lines.append(f"- Por qué entra en top 10: cambia conducta real en el eje `{row['decision_axis_primary']}`, protege al paciente y reduce error serio en este fenotipo concreto.")
        lines.append(f"- Qué cambia en la conducta: indicación={row['changes_indication']}, timing={row['changes_timing']}, conductos={row['changes_conduit_choice']}, bomba={row['changes_pump_strategy']}, renal={row['changes_renal_strategy']}, transfusión={row['changes_transfusion_strategy']}.")
        lines.append(f"- Qué error evita: evita una decisión de alto impacto mal calibrada antes o durante CABG urgente.")
        lines.append("")
    TOP10_MD.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    board = frame.sort_values(["heart_team_slide_worthy", "priority_rank_1_to_50"], ascending=[False, True]).head(20)
    lines = ["# Top 20 heart team board", ""]
    for _, row in board.iterrows():
        lines.append(f"## {row['short_label']}")
        lines.append(f"- Paper: {row['full_title']}")
        lines.append(f"- Mensaje de una línea: {row['core_takeaway']}")
        lines.append(f"- Utilidad en Heart Team: alinea discusión de `{row['decision_axis_primary']}` con cambio de conducta, protección del paciente y reducción de error grave.")
        lines.append(f"- Diapositiva sugerida: `{row['decision_axis_primary']}` con foco en `{row['why_it_matters_for_this_case']}` y en qué decisión concreta cambia.")
        lines.append("")
    TOP20_BOARD_MD.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    blocks = {
        "bloque 1: indicación y revascularización": ["A01","A02","A03","A04","B16","B18","B19","B20","B21","B22","B25","B26"],
        "bloque 2: LV dysfunction": ["C27","C28","C34","C31","C30","C33","C29","C32"],
        "bloque 3: injertos y técnica": ["A14","A15","D38","D39","D40","D41","D42","D43","D44","D45","D46","D35","D36","D37"],
        "bloque 4: safety bundle": ["A09","A10","A12","A13","E48","E47","E49","E50"],
        "bloque 5: ICU / ERAS / discharge": ["A08","A11","A05","A06","A07"],
    }
    by_seed = {record.seed_id: record for record in records}
    lines = ["# CABG case reading sequence", "", "Secuencia priorizada para preparar mejor este caso en el menor tiempo posible.", ""]
    for title, seeds in blocks.items():
        lines.append(f"## {title}")
        for sid in seeds:
            record = by_seed.get(sid)
            if not record:
                continue
            lines.append(f"- {sid} {record.short_label}: leer para fijar `{axis_bundle(record)['decision_axis_primary']}` y traducirlo a conducta inmediata.")
        lines.append("")
    READING_SEQUENCE_MD.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def save_support_reports(records: list[ResolvedPaper], dedup_report: str, frame: pd.DataFrame) -> None:
    DEDUP_MD.write_text(dedup_report, encoding="utf-8")
    with MASTER_LIST_MD.open("w", encoding="utf-8") as fh:
        fh.write("# Vancouver master list\n\n")
        for record in sorted(records, key=lambda item: item.priority_rank_1_to_50):
            fh.write(f"{record.priority_rank_1_to_50}. {build_vancouver_entry(record)}\n")
    missing = [
        {
            "seed_id": record.seed_id,
            "short_label": record.short_label,
            "doi": record.doi,
            "pmid": record.pmid,
            "publisher_url": record.publisher_url,
            "access_status": record.access_status,
            "validation_status": record.validation_status,
            "notes": record.notes or record.acquisition_result,
        }
        for record in records
        if record.access_status in {"abstract-only", "paywalled", "not_downloaded_legal_restriction"}
    ]
    pd.DataFrame(missing).to_csv(MISSING_CSV, index=False, encoding="utf-8")
    save_clinical_outputs(records, frame)
    save_html_outputs(records, frame)


def audit_outputs(records: list[ResolvedPaper]) -> str:
    issues: list[str] = []
    validated = [record for record in records if record.validation_status.startswith("validated")]
    absolute_core = [record for record in records if record.must_know_tier == "absolute_core"]
    pmids = [record.pmid for record in records if record.pmid]
    duplicates = [item for item, count in Counter(pmids).items() if count > 1]
    if duplicates:
        issues.append(f"Duplicate PMID values found: {', '.join(duplicates)}.")
    missing_doi = [record.seed_id for record in validated if not record.doi]
    if missing_doi:
        issues.append(f"Validated records without DOI: {', '.join(missing_doi)}.")
    core_missing = [record.seed_id for record in absolute_core if not record.full_title or not record.validation_status.startswith("validated")]
    if core_missing:
        issues.append(f"Absolute core records with missing critical fields: {', '.join(core_missing)}.")
    top10_bad = [record.seed_id for record in records if record.priority_rank_1_to_50 <= 10 and record.validation_status not in {"validated_primary", "validated_secondary"}]
    if top10_bad:
        issues.append(f"Top 10 records with unacceptable validation status: {', '.join(top10_bad)}.")
    guideline_bad = [record.seed_id for record in records if record.domain_group == "guideline_trunk" and not (record.source_of_truth in {"doi_landing", "pubmed", "official_society", "publisher"})]
    if guideline_bad:
        issues.append(f"Guideline trunk records without official or primary source: {', '.join(guideline_bad)}.")
    required_files = [
        REGISTRY_CSV,
        REGISTRY_PARQUET,
        MATRIX_CSV,
        MATRIX_XLSX,
        MATRIX_MD,
        MASTER_LIST_MD,
        MISSING_CSV,
        DEDUP_MD,
        ACQ_LOG,
        TOP10_MD,
        TOP20_BOARD_MD,
        READING_SEQUENCE_MD,
        MATRIX_HTML,
        TOP10_HTML,
        TOP20_BOARD_HTML,
        READING_SEQUENCE_HTML,
        PRESENTATION_INDEX_HTML,
    ]
    missing_files = [str(path.relative_to(BASE_DIR)) for path in required_files if not path.exists()]
    if missing_files:
        issues.append(f"Missing output files: {', '.join(missing_files)}.")
    success_summary = [
        f"Resolved registry records: {len(records)}",
        f"Validated primary: {sum(1 for record in records if record.validation_status == 'validated_primary')}",
        f"Validated secondary: {sum(1 for record in records if record.validation_status == 'validated_secondary')}",
        f"Open full texts: {sum(1 for record in records if record.access_status == 'open')}",
        f"Abstract-only: {sum(1 for record in records if record.access_status == 'abstract-only')}",
        f"Paywalled: {sum(1 for record in records if record.access_status == 'paywalled')}",
        f"Legal restriction not downloaded: {sum(1 for record in records if record.access_status == 'not_downloaded_legal_restriction')}",
    ]
    lines = ["# Validation report", "", "## Resumen de éxito", *[f"- {line}" for line in success_summary], "", "## Faltantes y conflictos"]
    lines.extend([f"- {issue}" for issue in issues] or ["- No critical audit failures detected by the automated checks."])
    lines += ["", "## Recomendaciones manuales", "- Revisar manualmente los artículos muy recientes o no indexados plenamente si quedaron en `unresolved_partial`.", "- Confirmar publisher URLs y PDFs de guías societales cuando el landing page expone material suplementario pero no PDF directo.", "- Revalidar títulos con Crossref o PubMed si un seed resolvió sólo por society page."]
    report = "\n".join(lines) + "\n"
    VALIDATION_MD.write_text(report, encoding="utf-8")
    return report


def _load_registry_records() -> list[ResolvedPaper]:
    raw_records = pd.read_csv(REGISTRY_CSV).replace({math.nan: None}).to_dict(orient="records")
    normalized: list[dict[str, Any]] = []
    for item in raw_records:
        if isinstance(item.get("authors"), str):
            try:
                item["authors"] = ast.literal_eval(item["authors"])
            except (ValueError, SyntaxError):
                item["authors"] = [item["authors"]]
        if item.get("authors") is None:
            item["authors"] = []
        if item.get("seed_id") is not None:
            item["must_know_tier"] = assigned_tier(str(item["seed_id"]))
        for field in ["volume", "issue", "pages", "pmid", "pmcid", "doi", "publisher_url", "pdf_url", "guideline_body", "notes", "abstract_local_path", "pmc_xml_local_path", "landing_page_local_path", "pdf_local_path", "acquisition_result", "source_of_truth", "authors_vancouver", "full_title", "journal", "target_title", "short_label"]:
            if item.get(field) is not None:
                item[field] = str(item[field])
        if item.get("notes") is None:
            item["notes"] = ""
        normalized.append(item)
    return [ResolvedPaper.model_validate(item) for item in normalized]


def main_seed_loader() -> None:
    ensure_dirs()
    seeds = load_seed_records()
    print(json.dumps({"seed_count": len(seeds), "path": str(SEED_PATH)}, ensure_ascii=False))


def main_metadata_resolver() -> None:
    records = resolve_metadata()
    save_registry(records)
    print(json.dumps({"resolved_count": len(records), "registry_csv": str(REGISTRY_CSV)}, ensure_ascii=False))


def main_pdf_acquirer() -> None:
    records = acquire_fulltext(_load_registry_records())
    save_registry(records)
    print(json.dumps({"open_full_text_count": sum(1 for record in records if record.access_status == 'open')}, ensure_ascii=False))


def main_fulltext_fallback() -> None:
    records = _load_registry_records()
    save_registry(records)
    print(json.dumps({"fallback_processed": len(records)}, ensure_ascii=False))


def main_registry_builder() -> None:
    deduped, dedup_report = deduplicate_records(_load_registry_records())
    save_registry(deduped)
    DEDUP_MD.write_text(dedup_report, encoding="utf-8")
    print(json.dumps({"registry_count": len(deduped)}, ensure_ascii=False))


def main_matrix_builder() -> None:
    deduped, dedup_report = deduplicate_records(_load_registry_records())
    frame = make_matrix(deduped)
    save_matrix(frame)
    save_support_reports(deduped, dedup_report, frame)
    print(json.dumps({"matrix_rows": len(frame), "matrix_csv": str(MATRIX_CSV)}, ensure_ascii=False))


def main_quality_audit() -> None:
    print(audit_outputs(_load_registry_records()))


def run_pipeline() -> dict[str, Any]:
    setup_logging()
    ensure_dirs()
    records = resolve_metadata()
    save_registry(records)
    records = acquire_fulltext(records)
    deduped, dedup_report = deduplicate_records(records)
    save_registry(deduped)
    frame = make_matrix(deduped)
    save_matrix(frame)
    save_support_reports(deduped, dedup_report, frame)
    audit_outputs(deduped)
    return {
        "resolved_count": len(deduped),
        "full_text_downloaded": sum(1 for record in deduped if record.access_status == "open"),
        "abstract_only": sum(1 for record in deduped if record.access_status == "abstract-only"),
        "paywalled": sum(1 for record in deduped if record.access_status == "paywalled"),
        "validated_100_percent": sum(1 for record in deduped if record.validation_status == "validated_primary"),
        "manual_intervention_needed": [record.seed_id for record in deduped if record.validation_status in {"unresolved_partial", "unresolved_conflict"} or record.access_status in {"paywalled", "not_downloaded_legal_restriction"}],
    }


if __name__ == "__main__":
    print(json.dumps(run_pipeline(), ensure_ascii=False, indent=2))
