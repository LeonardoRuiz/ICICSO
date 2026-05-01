from __future__ import annotations

import csv
import json
import os
import sys
import time
import zipfile
from collections import deque
from datetime import datetime, timezone
from getpass import getpass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from requests import Response, Session
from tqdm import tqdm


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"


def _find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "ICICSO_TERMINOLOGIAS" / "01_RAW").exists():
            return candidate
    return start.resolve()


REPO_ROOT = _find_repo_root(BASE_DIR)
TERMINOLOGY_ROOT = REPO_ROOT / "ICICSO_TERMINOLOGIAS"
DATA_ROOT = TERMINOLOGY_ROOT / "01_RAW"
METADATA_DIR = TERMINOLOGY_ROOT / "00_METADATA"
LOGS_DIR = REPO_ROOT / "logs"
DOWNLOAD_LOG = LOGS_DIR / "download_log.tsv"
ERROR_LOG = LOGS_DIR / "error_log.tsv"
STATE_PATH = METADATA_DIR / "download_state.json"
MANIFEST_PATH = METADATA_DIR / "download_manifest.json"

DATASET_DIRS = {
    "ICD10": DATA_ROOT / "ICD10",
    "ICD11": DATA_ROOT / "ICD11",
    "ICD10_TO_ICD11": DATA_ROOT / "ICD10_TO_ICD11",
    "ICD10_CM": DATA_ROOT / "ICD10_CM",
    "ICD10_PCS": DATA_ROOT / "ICD10_PCS",
    "LOINC": DATA_ROOT / "LOINC",
    "RXNORM": DATA_ROOT / "RXNORM",
    "RXNORM_FULL": DATA_ROOT / "RXNORM_FULL",
    "RXNORM_PRESCRIBABLE": DATA_ROOT / "RXNORM_PRESCRIBABLE",
    "UCUM": DATA_ROOT / "UCUM",
    "HL7_THO": DATA_ROOT / "HL7_THO",
    "HL7_FHIR_R5": DATA_ROOT / "HL7_FHIR_R5",
    "ATC_DDD": DATA_ROOT / "ATC_DDD",
    "SNOMED_CT": DATA_ROOT / "SNOMED_CT",
    "SNOMED_CT_INTERNATIONAL": DATA_ROOT / "SNOMED_CT_INTERNATIONAL",
    "SNOMED_CT_SPANISH": DATA_ROOT / "SNOMED_CT_SPANISH",
    "HCPCS_LEVEL_II": DATA_ROOT / "HCPCS_LEVEL_II",
    "CPT": DATA_ROOT / "CPT",
    "MESH": DATA_ROOT / "MESH",
    "UNII_GSRS": DATA_ROOT / "UNII_GSRS",
    "FHIR_IMPLEMENTATION_REGISTRY": DATA_ROOT / "FHIR_IMPLEMENTATION_REGISTRY",
    "CDA_R2_CORE": DATA_ROOT / "CDA_R2_CORE",
    "CDA_VALUE_SETS": DATA_ROOT / "CDA_VALUE_SETS",
    "CCDA_ON_FHIR": DATA_ROOT / "CCDA_ON_FHIR",
    "US_CORE": DATA_ROOT / "US_CORE",
    "SMART_APP_LAUNCH": DATA_ROOT / "SMART_APP_LAUNCH",
}

EXPECTED_FILES = {
    "ICD10": "icd10_claml.xml",
    "ICD11": "icd11_mms.zip",
    "ICD10_TO_ICD11": "icd10_to_icd11_mapping.zip",
    "ICD10_CM": "icd10cm_codes.zip",
    "ICD10_PCS": "icd10pcs_codes.zip",
    "LOINC": "loinc.zip",
    "RXNORM": "rxnorm.zip",
    "RXNORM_FULL": "rxnorm_full.zip",
    "RXNORM_PRESCRIBABLE": "rxnorm_prescribable.zip",
    "UCUM": "ucum.xml",
    "HL7_THO": "tho.tgz",
    "HL7_FHIR_R5": "fhir_r5_definitions.zip",
    "ATC_DDD": "atc_index.csv",
    "SNOMED_CT": "README.txt",
    "SNOMED_CT_INTERNATIONAL": "README.txt",
    "SNOMED_CT_SPANISH": "README.txt",
    "HCPCS_LEVEL_II": "hcpcs_level_ii.zip",
    "CPT": "README.txt",
    "MESH": "mesh.xml",
    "UNII_GSRS": "README.txt",
    "FHIR_IMPLEMENTATION_REGISTRY": "README.txt",
    "CDA_R2_CORE": "README.txt",
    "CDA_VALUE_SETS": "README.txt",
    "CCDA_ON_FHIR": "README.txt",
    "US_CORE": "README.txt",
    "SMART_APP_LAUNCH": "README.txt",
}

DEFAULT_MANIFEST: dict[str, Any] = {
    "datasets": [
        {
            "dataset": "ICD10",
            "mode": "public",
            "handler": "download_icd10",
            "target_file": EXPECTED_FILES["ICD10"],
            "notes": "Discovers current WHO ICD-10 ClaML package from the official index page.",
            "official_url": "https://icdcdn.who.int/icd10/claml/icd102019en.xml.zip",
        },
        {
            "dataset": "ICD11",
            "mode": "public",
            "handler": "download_icd11",
            "target_file": EXPECTED_FILES["ICD11"],
            "urls": ["https://icdcdn.who.int/static/releasefiles/2026-01/SimpleTabulation-ICD-11-MMS-en.zip"],
            "official_url": "https://icd.who.int/browse/2026-01/mms/en",
            "notes": "Primero intenta la SimpleTabulation publica 2026-01; fallback opcional por API WHO con credenciales.",
        },
        {
            "dataset": "ICD10_TO_ICD11",
            "mode": "public",
            "handler": "download_manifest_urls",
            "target_file": EXPECTED_FILES["ICD10_TO_ICD11"],
            "urls": ["https://icdcdn.who.int/static/releasefiles/2026-01/mapping.zip"],
            "official_url": "https://icd.who.int/browse/2026-01/mms/en",
            "notes": "Mapeo oficial WHO ICD-10 a ICD-11 release 2026-01.",
        },
        {
            "dataset": "ICD10_CM",
            "mode": "public",
            "handler": "download_icd10_cm",
            "target_file": EXPECTED_FILES["ICD10_CM"],
            "official_url": "https://www.cdc.gov/nchs/icd/icd-10-cm/files.html",
            "notes": "Fuente oficial CDC/NCHS para ICD-10-CM FY 2026 y actualizaciones de abril 2026.",
        },
        {
            "dataset": "ICD10_PCS",
            "mode": "public",
            "handler": "download_icd10_pcs",
            "target_file": EXPECTED_FILES["ICD10_PCS"],
            "official_url": "https://www.cms.gov/medicare/coding-billing/icd-10-codes",
            "notes": "Fuente oficial CMS para ICD-10-PCS FY 2026.",
        },
        {
            "dataset": "LOINC",
            "mode": "credentialed",
            "handler": "download_loinc",
            "target_file": EXPECTED_FILES["LOINC"],
            "official_url": "https://loinc.org/downloads/",
            "notes": "Requiere cuenta/licencia LOINC y login valido. Version objetivo LOINC 2.82.",
        },
        {
            "dataset": "RXNORM",
            "mode": "credentialed",
            "handler": "download_rxnorm",
            "target_file": EXPECTED_FILES["RXNORM"],
            "urls": [
                "https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip",
                "https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_04062026.zip",
            ],
            "notes": "Alias local legacy para RxNorm full; puede redirigir a UMLS/UTS.",
        },
        {
            "dataset": "RXNORM_FULL",
            "mode": "credentialed",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["RXNORM_FULL"],
            "official_url": "https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip",
            "notes": "RxNorm Full Monthly Release 2026-04-06 requiere acceso UMLS/UTS.",
        },
        {
            "dataset": "RXNORM_PRESCRIBABLE",
            "mode": "public",
            "handler": "download_rxnorm_prescribable",
            "target_file": EXPECTED_FILES["RXNORM_PRESCRIBABLE"],
            "official_url": "https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_prescribe_current.zip",
            "notes": "RxNorm Prescribable Content 2026-04-06.",
        },
        {
            "dataset": "UCUM",
            "mode": "public",
            "handler": "download_ucum",
            "target_file": EXPECTED_FILES["UCUM"],
            "urls": ["https://ucum.org/ucum-essence.xml"],
        },
        {
            "dataset": "HL7_THO",
            "mode": "public",
            "handler": "download_hl7_tho",
            "target_file": EXPECTED_FILES["HL7_THO"],
            "official_url": "https://terminology.hl7.org/",
            "notes": "HL7 Terminology package, current target THO 7.1.0.",
        },
        {
            "dataset": "HL7_FHIR_R5",
            "mode": "public",
            "handler": "download_hl7_fhir_r5",
            "target_file": EXPECTED_FILES["HL7_FHIR_R5"],
            "official_url": "https://www.hl7.org/fhir/definitions.json.zip",
            "notes": "HL7 FHIR R5 5.0.0 definitions package.",
        },
        {
            "dataset": "ATC_DDD",
            "mode": "public",
            "handler": "download_atc_ddd",
            "target_file": EXPECTED_FILES["ATC_DDD"],
            "official_url": "https://atcddd.fhi.no/atc_ddd_index/",
        },
        {
            "dataset": "SNOMED_CT",
            "mode": "manual",
            "handler": "create_snomed_placeholder",
            "target_file": EXPECTED_FILES["SNOMED_CT"],
            "official_url": "https://www.snomed.org/releases",
            "notes": "No se automatiza evasion de licencia; se deja pendiente de descarga autorizada.",
        },
        {
            "dataset": "SNOMED_CT_INTERNATIONAL",
            "mode": "manual",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["SNOMED_CT_INTERNATIONAL"],
            "official_url": "https://www.snomed.org/releases",
            "notes": "SNOMED CT International Edition requiere MLDS/licencia.",
        },
        {
            "dataset": "SNOMED_CT_SPANISH",
            "mode": "manual",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["SNOMED_CT_SPANISH"],
            "official_url": "https://www.snomed.org/releases",
            "notes": "SNOMED CT Spanish Edition requiere MLDS o espacio de pais miembro.",
        },
        {
            "dataset": "HCPCS_LEVEL_II",
            "mode": "public",
            "handler": "download_hcpcs_level_ii",
            "target_file": EXPECTED_FILES["HCPCS_LEVEL_II"],
            "official_url": "https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system/quarterly-update",
            "notes": "April 2026 Alpha-Numeric HCPCS File.",
        },
        {
            "dataset": "CPT",
            "mode": "manual",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["CPT"],
            "official_url": "https://www.ama-assn.org/practice-management/cpt/cpt-code-set-overview",
            "notes": "CPT 2026 es propietario AMA; registrar enlace/licencia, no descarga libre completa.",
        },
        {
            "dataset": "MESH",
            "mode": "public",
            "handler": "download_mesh",
            "target_file": EXPECTED_FILES["MESH"],
            "official_url": "https://www.nlm.nih.gov/databases/download/mesh.html",
            "notes": "MeSH 2026 XML oficial NLM.",
        },
        {
            "dataset": "UNII_GSRS",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["UNII_GSRS"],
            "official_url": "https://www.fda.gov/industry/fda-data-standards-advisory-board/fdas-global-substance-registration-system",
            "notes": "UNII/GSRS queda trazado; implementar fuente publica concreta antes de descargar.",
        },
        {
            "dataset": "FHIR_IMPLEMENTATION_REGISTRY",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["FHIR_IMPLEMENTATION_REGISTRY"],
            "official_url": "https://build.fhir.org/registry/index.html",
            "notes": "Registro web de IGs FHIR; no es un binario unico.",
        },
        {
            "dataset": "CDA_R2_CORE",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["CDA_R2_CORE"],
            "official_url": "https://www.hl7.org/cda/",
            "notes": "HL7 CDA R2.0 Core y artefactos asociados.",
        },
        {
            "dataset": "CDA_VALUE_SETS",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["CDA_VALUE_SETS"],
            "official_url": "https://terminology.hl7.org/2.0.0/valuesets-cda.html",
            "notes": "CDA Value Sets referenciados desde HL7 Terminology; preferir THO actual donde aplique.",
        },
        {
            "dataset": "CCDA_ON_FHIR",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["CCDA_ON_FHIR"],
            "official_url": "https://hl7.org/fhir/us/ccda/",
            "notes": "C-CDA on FHIR IG 1.2.0 STU1.",
        },
        {
            "dataset": "US_CORE",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["US_CORE"],
            "official_url": "https://www.hl7.org/fhir/us/core/",
            "notes": "US Core IG 8.0.1 STU8.",
        },
        {
            "dataset": "SMART_APP_LAUNCH",
            "mode": "public",
            "handler": "create_tracking_placeholder",
            "target_file": EXPECTED_FILES["SMART_APP_LAUNCH"],
            "official_url": "https://build.fhir.org/ig/HL7/smart-app-launch/",
            "notes": "SMART App Launch IG 2.2.0.",
        },
    ]
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_session() -> Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update({"User-Agent": "ICICSO-TermDownloader/1.1"})
    return session


def load_env_file(path: Path = ENV_PATH) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def ensure_directories() -> None:
    load_env_file()
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    for directory in DATASET_DIRS.values():
        directory.mkdir(parents=True, exist_ok=True)
    _ensure_log_headers()
    if not MANIFEST_PATH.exists():
        MANIFEST_PATH.write_text(json.dumps(DEFAULT_MANIFEST, indent=2), encoding="utf-8")
    if not STATE_PATH.exists():
        save_state({"updated_at": _utc_now_iso(), "datasets": {}})


def _ensure_log_headers() -> None:
    if not DOWNLOAD_LOG.exists():
        DOWNLOAD_LOG.write_text(
            "timestamp\tdataset\turl\tdestination\tbytes\tstatus\tmessage\n",
            encoding="utf-8",
        )
    if not ERROR_LOG.exists():
        ERROR_LOG.write_text(
            "timestamp\tdataset\turl\tdestination\terror\n",
            encoding="utf-8",
        )


def _append_tsv(path: Path, columns: list[str]) -> None:
    with path.open("a", encoding="utf-8", newline="") as handle:
        handle.write("\t".join(columns) + "\n")


def log_download(
    dataset: str,
    url: str,
    destination: Path,
    size_bytes: int,
    status: str,
    message: str = "",
) -> None:
    _append_tsv(
        DOWNLOAD_LOG,
        [
            _utc_now_iso(),
            dataset,
            url,
            str(destination),
            str(size_bytes),
            status,
            message.replace("\t", " "),
        ],
    )


def log_error(dataset: str, url: str, destination: Path, error: str) -> None:
    _append_tsv(
        ERROR_LOG,
        [
            _utc_now_iso(),
            dataset,
            url,
            str(destination),
            error.replace("\t", " "),
        ],
    )


def load_manifest() -> dict[str, Any]:
    ensure_directories()
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def load_state() -> dict[str, Any]:
    ensure_directories()
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def save_state(state: dict[str, Any]) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def record_state(
    dataset: str,
    result: dict[str, Any],
    *,
    mode: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    state = load_state()
    datasets = state.setdefault("datasets", {})
    entry = datasets.setdefault(dataset, {"attempts": 0})
    entry["attempts"] = int(entry.get("attempts", 0)) + 1
    entry["status"] = result.get("status", "unknown")
    entry["updated_at"] = _utc_now_iso()
    entry["path"] = result.get("path")
    entry["url"] = result.get("url")
    entry["bytes"] = result.get("bytes", 0)
    if mode:
        entry["mode"] = mode
    if note:
        entry["note"] = note
    if result.get("status") == "success":
        entry["last_success_at"] = entry["updated_at"]
        entry["last_error"] = None
    else:
        entry["last_error"] = result.get("error") or result.get("message")
    state["updated_at"] = _utc_now_iso()
    save_state(state)
    return result


def summarize_state(datasets: list[str] | None = None) -> dict[str, int]:
    state = load_state().get("datasets", {})
    summary = {"success": 0, "failed": 0, "manual_required": 0, "awaiting_credentials": 0, "skipped": 0}
    selected = set(datasets or state.keys())
    for dataset, entry in state.items():
        if dataset not in selected:
            continue
        status = entry.get("status", "skipped")
        summary[status] = summary.get(status, 0) + 1
    return summary


def _request_with_retries(
    session: Session,
    method: str,
    url: str,
    *,
    retries: int = 3,
    timeout: int = 60,
    **kwargs: Any,
) -> Response:
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = session.request(method, url, timeout=timeout, **kwargs)
            response.raise_for_status()
            return response
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(1.5 * attempt)
    assert last_exc is not None
    raise last_exc


def _is_login_redirect(response: Response, *, expected_host_fragment: str) -> bool:
    final_url = str(getattr(response, "url", "") or "")
    final_host = urlparse(final_url).netloc.lower()
    return expected_host_fragment.lower() not in final_host and "login" in final_url.lower()


def _validate_download_signature(destination: Path) -> tuple[bool, str]:
    suffixes = [suffix.lower() for suffix in destination.suffixes]
    suffix = suffixes[-1] if suffixes else ""
    if suffix == ".part" and len(suffixes) >= 2:
        suffix = suffixes[-2]
    with destination.open("rb") as handle:
        head = handle.read(4096)

    if suffix == ".zip":
        if not head.startswith(b"PK"):
            return False, "Invalid ZIP signature"
    elif suffix in {".tgz", ".gz"}:
        if len(head) < 2 or head[:2] != b"\x1f\x8b":
            return False, "Invalid GZIP signature"
    elif suffix in {".xml"}:
        sample = head.decode("utf-8", errors="ignore").lstrip()
        if "<" not in sample:
            return False, "Invalid XML content"
    elif suffix in {".json"}:
        sample = head.decode("utf-8", errors="ignore").lstrip()
        if not (sample.startswith("{") or sample.startswith("[")):
            return False, "Invalid JSON content"
    elif suffix in {".csv", ".tsv"}:
        sample = head.decode("utf-8", errors="ignore")
        if "," not in sample and "\t" not in sample:
            return False, "Invalid CSV/TSV content"

    return True, "ok"


def _temp_download_path(destination: Path) -> Path:
    return destination.with_suffix(destination.suffix + ".part")


def _finalize_download(temp_path: Path, destination: Path) -> int:
    final_size = temp_path.stat().st_size if temp_path.exists() else 0
    if final_size <= 0:
        raise ValueError("Downloaded file size is 0 bytes")
    is_valid, validation_message = _validate_download_signature(temp_path)
    if not is_valid:
        raise ValueError(validation_message)
    temp_path.replace(destination)
    return final_size


def download_file(
    dataset: str,
    url: str,
    destination: Path,
    *,
    session: Session | None = None,
    retries: int = 3,
    timeout: int = 90,
) -> dict[str, Any]:
    session = session or create_session()
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_path = _temp_download_path(destination)

    for attempt in range(1, retries + 1):
        try:
            partial_size = temp_path.stat().st_size if temp_path.exists() else 0
            headers: dict[str, str] = {}
            if partial_size > 0:
                headers["Range"] = f"bytes={partial_size}-"

            with session.get(url, stream=True, timeout=timeout, headers=headers) as response:
                if response.status_code not in (200, 206):
                    response.raise_for_status()
                if _is_login_redirect(response, expected_host_fragment="download.nlm.nih.gov"):
                    raise PermissionError(f"Redirected to login page for {url}")

                if response.status_code == 200 and partial_size > 0:
                    partial_size = 0
                    mode = "wb"
                else:
                    mode = "ab" if partial_size > 0 else "wb"

                content_length = int(response.headers.get("Content-Length", "0") or "0")
                total_size = (
                    partial_size + content_length
                    if response.status_code == 206
                    else content_length or None
                )

                progress_desc = f"{dataset:<8} -> {destination.name}"
                with temp_path.open(mode) as out_handle:
                    with tqdm(
                        total=total_size,
                        initial=partial_size,
                        unit="B",
                        unit_scale=True,
                        desc=progress_desc,
                        ascii=True,
                    ) as progress:
                        for chunk in response.iter_content(chunk_size=1024 * 1024):
                            if not chunk:
                                continue
                            out_handle.write(chunk)
                            progress.update(len(chunk))

            final_size = _finalize_download(temp_path, destination)
            log_download(dataset, url, destination, final_size, "success", "downloaded")
            return {
                "dataset": dataset,
                "status": "success",
                "path": str(destination),
                "bytes": final_size,
                "url": url,
            }
        except Exception as exc:
            if attempt >= retries:
                log_error(dataset, url, destination, str(exc))
                log_download(dataset, url, destination, 0, "failed", str(exc))
                return {
                    "dataset": dataset,
                    "status": "failed",
                    "path": str(destination),
                    "error": str(exc),
                    "url": url,
                }
            time.sleep(2 * attempt)

    return {"dataset": dataset, "status": "failed", "path": str(destination), "error": "unknown", "url": url}


def _try_download_from_candidates(
    dataset: str,
    candidates: list[str],
    destination: Path,
    *,
    session: Session | None = None,
) -> dict[str, Any]:
    last_error = "all candidate URLs failed"
    for url in candidates:
        result = download_file(dataset, url, destination, session=session)
        if result["status"] == "success":
            return result
        last_error = str(result.get("error", last_error))
    return {
        "dataset": dataset,
        "status": "failed",
        "path": str(destination),
        "error": last_error,
    }


def download_manifest_urls(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = entry or {}
    dataset = str(payload.get("dataset", "")).upper().strip()
    if dataset not in DATASET_DIRS:
        return {"dataset": dataset, "status": "failed", "path": "", "error": f"Dataset no soportado: {dataset}"}

    destination = DATASET_DIRS[dataset] / EXPECTED_FILES[dataset]
    env_key = f"{dataset}_URL"
    candidates = [os.getenv(env_key, "").strip(), *payload.get("urls", [])]
    candidates = [candidate for candidate in candidates if candidate]
    if not candidates:
        return _status_only(dataset, destination, "skipped", f"No URLs configured for {dataset}.")
    return _try_download_from_candidates(dataset, candidates, destination)


def _extract_xml_from_zip(zip_path: Path, destination: Path) -> int:
    with zipfile.ZipFile(zip_path) as archive:
        xml_names = [
            name for name in archive.namelist()
            if not name.endswith("/") and Path(name).suffix.lower() in {".xml", ".claml"}
        ]
        if not xml_names:
            raise ValueError("No XML/ClaML file found inside ICD10 ZIP package")

        preferred = None
        for name in xml_names:
            lowered = name.lower()
            if "claml" in lowered or "icd10" in lowered:
                preferred = name
                break
        selected = preferred or sorted(xml_names)[0]
        with archive.open(selected) as source_handle, destination.open("wb") as target_handle:
            target_handle.write(source_handle.read())

    final_size = destination.stat().st_size if destination.exists() else 0
    if final_size <= 0:
        raise ValueError("Extracted ICD10 XML size is 0 bytes")
    is_valid, validation_message = _validate_download_signature(destination)
    if not is_valid:
        raise ValueError(validation_message)
    return final_size


def _discover_icd10_candidates(session: Session) -> list[str]:
    index_url = "https://icdcdn.who.int/icd10/index.html"
    response = _request_with_retries(session, "GET", index_url, retries=3, timeout=60)
    soup = BeautifulSoup(response.text, "html.parser")

    ranked: list[tuple[int, str]] = []
    for anchor in soup.find_all("a", href=True):
        href = urljoin(index_url, anchor["href"])
        href_lower = href.lower()
        text = anchor.get_text(" ", strip=True).lower()
        row_text = anchor.parent.get_text(" ", strip=True).lower() if anchor.parent else text
        if ".zip" not in href_lower:
            continue
        if "2019" in row_text:
            priority = 0
        elif "2016" in row_text:
            priority = 1
        elif "2015" in row_text:
            priority = 2
        elif "2014" in row_text:
            priority = 3
        elif "2010" in row_text:
            priority = 4
        elif "2008" in row_text:
            priority = 5
        elif "icd-10" in text or "icd10" in href_lower:
            priority = 6
        else:
            continue
        ranked.append((priority, href))

    deduped: list[str] = []
    for _, href in sorted(ranked, key=lambda item: item[0]):
        if href not in deduped:
            deduped.append(href)
    return deduped


def _status_only(dataset: str, destination: Path, status: str, message: str) -> dict[str, Any]:
    log_download(dataset, "N/A", destination, destination.stat().st_size if destination.exists() else 0, status, message)
    return {
        "dataset": dataset,
        "status": status,
        "path": str(destination),
        "message": message,
        "error": message if status in {"failed", "manual_required", "awaiting_credentials"} else None,
    }


def _is_auth_error(exc: Exception) -> bool:
    response = getattr(exc, "response", None)
    if response is not None and getattr(response, "status_code", None) in {401, 403}:
        return True
    message = str(exc).lower()
    return "401" in message or "403" in message or "unauthorized" in message or "forbidden" in message


def download_icd10(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["ICD10"] / EXPECTED_FILES["ICD10"]
    session = create_session()
    manifest_urls = (entry or {}).get("urls", [])
    override = os.getenv("ICD10_URL", "").strip()
    candidates: list[str] = [override] if override else []
    try:
        candidates.extend(_discover_icd10_candidates(session))
    except Exception:
        pass
    candidates.extend(url for url in manifest_urls if url)

    xml_candidates = [url for url in candidates if Path(url.split("?")[0]).suffix.lower() in {".xml", ".claml"}]
    zip_candidates = [url for url in candidates if url not in xml_candidates]

    if xml_candidates:
        result = _try_download_from_candidates("ICD10", xml_candidates, destination, session=session)
        if result["status"] == "success":
            return result

    zip_destination = DATASET_DIRS["ICD10"] / "icd10_claml_package.zip"
    last_error = "No ICD10 candidate URLs resolved"
    for url in zip_candidates:
        zip_result = download_file("ICD10", url, zip_destination, session=session)
        if zip_result["status"] != "success":
            last_error = str(zip_result.get("error", last_error))
            continue
        try:
            final_size = _extract_xml_from_zip(zip_destination, destination)
            log_download("ICD10", url, destination, final_size, "success", "downloaded_and_extracted")
            return {
                "dataset": "ICD10",
                "status": "success",
                "path": str(destination),
                "bytes": final_size,
                "url": url,
            }
        except Exception as exc:
            last_error = str(exc)
            log_error("ICD10", url, destination, last_error)

    if not candidates:
        return {
            "dataset": "ICD10",
            "status": "failed",
            "path": str(destination),
            "error": last_error,
        }
    return {
        "dataset": "ICD10",
        "status": "failed",
        "path": str(destination),
        "error": last_error,
    }


def _get_icd11_token(session: Session) -> str | None:
    direct_token = os.getenv("WHO_ICD_API_TOKEN", "").strip()
    if direct_token:
        return direct_token

    client_id = os.getenv("WHO_ICD_CLIENT_ID", "").strip()
    client_secret = os.getenv("WHO_ICD_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return None

    token_url = "https://icdaccessmanagement.who.int/connect/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "icdapi_access",
    }
    response = _request_with_retries(session, "POST", token_url, data=payload, retries=3, timeout=60)
    token = response.json().get("access_token")
    return str(token) if token else None


def _crawl_icd11_tree(
    session: Session,
    start_url: str,
    headers: dict[str, str],
    max_nodes: int,
) -> dict[str, Any]:
    visited: set[str] = set()
    queue: deque[str] = deque([start_url])
    nodes: dict[str, Any] = {}

    while queue and len(visited) < max_nodes:
        url = queue.popleft()
        if url in visited:
            continue

        response = _request_with_retries(
            session,
            "GET",
            url,
            headers=headers,
            retries=3,
            timeout=90,
        )
        payload = response.json()
        visited.add(url)
        nodes[url] = payload

        children = payload.get("child", []) if isinstance(payload, dict) else []
        if isinstance(children, list):
            for child in children:
                child_url = str(child)
                if child_url.startswith("/"):
                    child_url = urljoin(start_url, child_url)
                elif child_url.startswith("http://"):
                    child_url = child_url.replace("http://", "https://", 1)
                if child_url and child_url not in visited:
                    queue.append(child_url)

    return {"root": start_url, "node_count": len(nodes), "nodes": nodes}


def download_icd11(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["ICD11"] / EXPECTED_FILES["ICD11"]
    session = create_session()
    manifest_urls = (entry or {}).get("urls", [])
    public_candidates = [
        os.getenv("ICD11_MMS_URL", "").strip(),
        *manifest_urls,
    ]
    public_candidates = [candidate for candidate in public_candidates if candidate]
    if public_candidates:
        public_result = _try_download_from_candidates("ICD11", public_candidates, destination)
        if public_result["status"] == "success":
            return public_result

    api_root = os.getenv("ICD11_ENTITY_URL", "https://id.who.int/icd/entity").strip()
    max_nodes = int(os.getenv("ICD11_MAX_NODES", "5000"))

    headers = {
        "Accept": "application/json",
        "Accept-Language": "en",
        "API-Version": "v2",
    }
    token = _get_icd11_token(session)
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif not os.getenv("WHO_ICD_CLIENT_ID", "").strip() and not os.getenv("WHO_ICD_API_TOKEN", "").strip():
        return _status_only(
            "ICD11",
            destination,
            "awaiting_credentials",
            "ICD-11 public ZIP unavailable in this run and WHO ICD API credentials missing",
        )

    try:
        tree = _crawl_icd11_tree(session, api_root, headers, max_nodes=max_nodes)
        api_destination = DATASET_DIRS["ICD11"] / "icd11_mms_api_tree.json"
        temp_path = _temp_download_path(api_destination)
        temp_path.write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")
        final_size = _finalize_download(temp_path, api_destination)
        log_download("ICD11", api_root, api_destination, final_size, "success", f"nodes={tree['node_count']}")
        return {"dataset": "ICD11", "status": "success", "path": str(api_destination), "bytes": final_size, "url": api_root}
    except Exception as exc:
        if _is_auth_error(exc):
            return _status_only("ICD11", destination, "awaiting_credentials", "WHO ICD credentials rejected or missing")
        log_error("ICD11", api_root, destination, str(exc))
        log_download("ICD11", api_root, destination, 0, "failed", str(exc))
        return {"dataset": "ICD11", "status": "failed", "path": str(destination), "error": str(exc), "url": api_root}


def _extract_hidden_inputs(soup: BeautifulSoup) -> dict[str, str]:
    data: dict[str, str] = {}
    for field in soup.select("input[type='hidden']"):
        name = field.get("name")
        value = field.get("value", "")
        if name:
            data[name] = value
    return data


def _discover_loinc_zip_url(session: Session) -> str | None:
    override = os.getenv("LOINC_DOWNLOAD_URL", "").strip()
    if override:
        return override

    pages = [
        "https://loinc.org/downloads/",
        "https://loinc.org/downloads/loinc",
    ]

    candidates: list[str] = []
    for page in pages:
        try:
            response = _request_with_retries(session, "GET", page, retries=3, timeout=60)
        except Exception:
            continue
        soup = BeautifulSoup(response.text, "html.parser")
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            href_lower = href.lower()
            if ".zip" in href_lower and "loinc" in href_lower:
                candidates.append(urljoin(page, href))

    candidates = sorted(set(candidates), reverse=True)
    return candidates[0] if candidates else None


def download_loinc(entry: dict[str, Any] | None = None, *, allow_prompt: bool = True) -> dict[str, Any]:
    destination = DATASET_DIRS["LOINC"] / EXPECTED_FILES["LOINC"]
    session = create_session()
    login_url = os.getenv("LOINC_LOGIN_URL", "https://loinc.org/user/login").strip()

    username = os.getenv("LOINC_USERNAME", "").strip()
    password = os.getenv("LOINC_PASSWORD", "").strip()
    if not username and not allow_prompt:
        return _status_only("LOINC", destination, "awaiting_credentials", "LOINC_USERNAME missing")
    if not password and not allow_prompt:
        return _status_only("LOINC", destination, "awaiting_credentials", "LOINC_PASSWORD missing")
    if not username:
        try:
            username = input("LOINC username: ").strip()
        except EOFError:
            return _status_only("LOINC", destination, "awaiting_credentials", "LOINC username not provided")
    if not password:
        try:
            password = getpass("LOINC password: ")
        except EOFError:
            return _status_only("LOINC", destination, "awaiting_credentials", "LOINC password not provided")

    try:
        login_page = _request_with_retries(session, "GET", login_url, retries=3, timeout=60)
        soup = BeautifulSoup(login_page.text, "html.parser")
        payload = _extract_hidden_inputs(soup)
        payload.update(
            {
                "name": username,
                "pass": password,
                "op": payload.get("op", "Log in"),
                "form_id": payload.get("form_id", "user_login_form"),
            }
        )
        auth_resp = _request_with_retries(
            session,
            "POST",
            login_url,
            data=payload,
            allow_redirects=True,
            retries=3,
            timeout=60,
        )

        if "log out" not in auth_resp.text.lower() and "/user/login" in auth_resp.url:
            raise PermissionError("LOINC login failed. Check credentials or login flow.")

        zip_url = _discover_loinc_zip_url(session)
        if not zip_url:
            raise RuntimeError("Could not discover LOINC ZIP URL after login.")

        return download_file("LOINC", zip_url, destination, session=session)
    except Exception as exc:
        log_error("LOINC", login_url, destination, str(exc))
        log_download("LOINC", login_url, destination, 0, "failed", str(exc))
        return {"dataset": "LOINC", "status": "failed", "path": str(destination), "error": str(exc), "url": login_url}


def download_rxnorm(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["RXNORM"] / EXPECTED_FILES["RXNORM"]
    manifest_urls = (entry or {}).get("urls", [])
    candidates = [
        os.getenv("RXNORM_URL", "").strip(),
        *manifest_urls,
    ]
    candidates = [c for c in candidates if c]
    result = _try_download_from_candidates("RXNORM", candidates, destination)
    if result["status"] == "failed":
        error_text = str(result.get("error", "")).lower()
        if "redirected to login page" in error_text or "uts/login" in error_text:
            return _status_only(
                "RXNORM",
                destination,
                "awaiting_credentials",
                "UMLS/UTS login required for RxNorm download",
            )
    return result


def _discover_rxnorm_prescribable_url(session: Session) -> str | None:
    override = os.getenv("RXNORM_PRESCRIBABLE_URL", "").strip()
    if override:
        return override

    candidates = [
        "https://www.nlm.nih.gov/research/umls/rxnorm/docs/prescribe.html",
        "https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html",
    ]
    for page_url in candidates:
        try:
            response = _request_with_retries(session, "GET", page_url, retries=3, timeout=60)
        except Exception:
            continue
        soup = BeautifulSoup(response.text, "html.parser")
        hrefs = []
        for anchor in soup.find_all("a", href=True):
            href = urljoin(str(response.url), anchor["href"])
            text = anchor.get_text(" ", strip=True).lower()
            href_lower = href.lower()
            if "prescribable" in text or "prescribable" in href_lower:
                hrefs.append(href)
        for href in hrefs:
            if href.lower().endswith(".zip"):
                return href
            if "rxnorm" in href.lower() and "zip" in href.lower():
                return href
    return None


def download_rxnorm_prescribable(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["RXNORM_PRESCRIBABLE"] / EXPECTED_FILES["RXNORM_PRESCRIBABLE"]
    session = create_session()
    manifest_urls = (entry or {}).get("urls", [])
    direct_candidates = [
        os.getenv("RXNORM_PRESCRIBABLE_URL", "").strip(),
        *manifest_urls,
        str((entry or {}).get("official_url", "")).strip(),
    ]
    direct_candidates = [candidate for candidate in direct_candidates if candidate]
    if direct_candidates:
        result = _try_download_from_candidates("RXNORM_PRESCRIBABLE", direct_candidates, destination, session=session)
        if result["status"] == "success":
            return result

    url = _discover_rxnorm_prescribable_url(session)
    if not url:
        return _status_only(
            "RXNORM_PRESCRIBABLE",
            destination,
            "skipped",
            "No se pudo resolver aún la URL pública de RxNorm Prescribable Content.",
        )
    return download_file("RXNORM_PRESCRIBABLE", url, destination, session=session)


def download_ucum(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["UCUM"] / EXPECTED_FILES["UCUM"]
    manifest_urls = (entry or {}).get("urls", [])
    url = os.getenv("UCUM_URL", "").strip() or (manifest_urls[0] if manifest_urls else "https://ucum.org/ucum-essence.xml")
    return download_file("UCUM", url, destination)


def _discover_hl7_fhir_r5_url(session: Session) -> str | None:
    override = os.getenv("HL7_FHIR_R5_URL", "").strip()
    if override:
        return override

    pages = [
        "https://www.hl7.org/fhir/R5/downloads.html",
        "https://www.hl7.org/fhir/downloads.html",
    ]
    patterns = [
        "definitions.xml.zip",
        "definitions.json.zip",
        "definition.xml.zip",
        "definition.json.zip",
    ]
    for page_url in pages:
        try:
            response = _request_with_retries(session, "GET", page_url, retries=3, timeout=60)
        except Exception:
            continue
        soup = BeautifulSoup(response.text, "html.parser")
        candidates: list[str] = []
        for anchor in soup.find_all("a", href=True):
            href = urljoin(str(response.url), anchor["href"])
            href_lower = href.lower()
            text = anchor.get_text(" ", strip=True).lower()
            if any(pattern in href_lower for pattern in patterns):
                candidates.append(href)
                continue
            if "definitions" in text and href_lower.endswith(".zip"):
                candidates.append(href)
        if candidates:
            for candidate in candidates:
                if candidate.lower().endswith("definitions.xml.zip"):
                    return candidate
            return candidates[0]
    return None


def download_hl7_fhir_r5(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["HL7_FHIR_R5"] / EXPECTED_FILES["HL7_FHIR_R5"]
    session = create_session()
    url = _discover_hl7_fhir_r5_url(session)
    if not url:
        return _status_only(
            "HL7_FHIR_R5",
            destination,
            "skipped",
            "No se pudo resolver aún la URL oficial de FHIR R5 Definitions.",
        )
    return download_file("HL7_FHIR_R5", url, destination, session=session)


def _discover_hl7_tho_url(session: Session) -> str | None:
    override = os.getenv("HL7_THO_URL", "").strip()
    if override:
        return override

    metadata_candidates = [
        "https://packages2.fhir.org/packages/hl7.terminology",
        "https://packages.fhir.org/hl7.terminology",
    ]
    for url in metadata_candidates:
        try:
            response = _request_with_retries(session, "GET", url, retries=3, timeout=60)
        except Exception:
            continue
        try:
            payload = response.json()
            dist_tags = payload.get("dist-tags", {})
            versions = payload.get("versions", {})
            latest = dist_tags.get("latest")
            if latest and latest in versions:
                tarball = versions[latest].get("dist", {}).get("tarball")
                if tarball:
                    return str(tarball)
            if isinstance(versions, dict) and versions:
                latest_version = sorted(versions.keys(), reverse=True)[0]
                tarball = versions[latest_version].get("dist", {}).get("tarball")
                if tarball:
                    return str(tarball)
        except Exception:
            pass

    fallback_candidates = [
        "https://build.fhir.org/ig/HL7/UTG/package.tgz",
        "https://github.com/HL7/UTG/releases/latest/download/hl7.terminology.tgz",
    ]
    for candidate in fallback_candidates:
        return candidate
    return None


def download_hl7_tho(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["HL7_THO"] / EXPECTED_FILES["HL7_THO"]
    session = create_session()
    url = _discover_hl7_tho_url(session)
    if not url:
        message = "Could not resolve HL7 THO package URL"
        log_error("HL7_THO", "", destination, message)
        log_download("HL7_THO", "", destination, 0, "failed", message)
        return {"dataset": "HL7_THO", "status": "failed", "path": str(destination), "error": message}
    return download_file("HL7_THO", url, destination, session=session)


def _discover_cms_zip_url(
    session: Session,
    *,
    page_url: str,
    include_terms: list[str],
    exclude_terms: list[str] | None = None,
) -> str | None:
    exclude_terms = [term.lower() for term in (exclude_terms or [])]
    response = _request_with_retries(session, "GET", page_url, retries=3, timeout=60)
    soup = BeautifulSoup(response.text, "html.parser")
    matches: list[str] = []
    for anchor in soup.find_all("a", href=True):
        text = anchor.get_text(" ", strip=True).lower()
        href = urljoin(str(response.url), anchor["href"])
        href_lower = href.lower()
        if not href_lower.endswith(".zip"):
            continue
        haystack = f"{text} {href_lower}"
        if not all(term.lower() in haystack for term in include_terms):
            continue
        if any(term in haystack for term in exclude_terms):
            continue
        matches.append(href)
    return matches[0] if matches else None


def download_icd10_cm(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["ICD10_CM"] / EXPECTED_FILES["ICD10_CM"]
    session = create_session()
    page_url = os.getenv("ICD10_CM_PAGE_URL", "https://www.cms.gov/medicare/coding-billing/icd-10-codes").strip()
    try:
        url = _discover_cms_zip_url(
            session,
            page_url=page_url,
            include_terms=["icd-10-cm", "code tables", "tabular", "index"],
            exclude_terms=["addendum", "conversion", "poa", "guidelines"],
        )
    except Exception as exc:
        return {"dataset": "ICD10_CM", "status": "failed", "path": str(destination), "error": str(exc), "url": page_url}
    if not url:
        return _status_only("ICD10_CM", destination, "skipped", "No se pudo resolver aún la URL oficial de ICD-10-CM.")
    return download_file("ICD10_CM", url, destination, session=session)


def download_icd10_pcs(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["ICD10_PCS"] / EXPECTED_FILES["ICD10_PCS"]
    session = create_session()
    page_url = os.getenv("ICD10_PCS_PAGE_URL", "https://www.cms.gov/medicare/coding-billing/icd-10-codes").strip()
    try:
        url = _discover_cms_zip_url(
            session,
            page_url=page_url,
            include_terms=["icd-10-pcs", "codes file"],
            exclude_terms=["guidelines", "summary", "addendum", "conversion"],
        )
    except Exception as exc:
        return {"dataset": "ICD10_PCS", "status": "failed", "path": str(destination), "error": str(exc), "url": page_url}
    if not url:
        return _status_only("ICD10_PCS", destination, "skipped", "No se pudo resolver aún la URL oficial de ICD-10-PCS.")
    return download_file("ICD10_PCS", url, destination, session=session)


def download_hcpcs_level_ii(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["HCPCS_LEVEL_II"] / EXPECTED_FILES["HCPCS_LEVEL_II"]
    session = create_session()
    page_url = os.getenv(
        "HCPCS_LEVEL_II_PAGE_URL",
        "https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system/quarterly-update",
    ).strip()
    try:
        url = _discover_cms_zip_url(
            session,
            page_url=page_url,
            include_terms=["hcpcs"],
            exclude_terms=["application", "drug", "dme"],
        )
    except Exception as exc:
        return {"dataset": "HCPCS_LEVEL_II", "status": "failed", "path": str(destination), "error": str(exc), "url": page_url}
    if not url:
        return _status_only("HCPCS_LEVEL_II", destination, "skipped", "No se pudo resolver aún la URL oficial de HCPCS Level II.")
    return download_file("HCPCS_LEVEL_II", url, destination, session=session)


def _discover_mesh_xml_url(session: Session) -> str | None:
    override = os.getenv("MESH_XML_URL", "").strip()
    if override:
        return override

    landing = "https://www.nlm.nih.gov/databases/download/mesh.html"
    response = _request_with_retries(session, "GET", landing, retries=3, timeout=60)
    soup = BeautifulSoup(response.text, "html.parser")
    first_hop = None
    for anchor in soup.find_all("a", href=True):
        text = anchor.get_text(" ", strip=True).lower()
        if "current production year mesh in xml format" in text:
            first_hop = urljoin(str(response.url), anchor["href"])
            break
    if not first_hop:
        return None
    if first_hop.lower().endswith((".zip", ".xml")):
        return first_hop

    second = _request_with_retries(session, "GET", first_hop, retries=3, timeout=60)
    second_soup = BeautifulSoup(second.text, "html.parser")
    for anchor in second_soup.find_all("a", href=True):
        href = urljoin(str(second.url), anchor["href"])
        href_lower = href.lower()
        text = anchor.get_text(" ", strip=True).lower()
        if ("desc" in href_lower or "mesh" in href_lower or "descriptor" in text) and href_lower.endswith((".xml", ".zip")):
            return href
    return first_hop


def download_mesh(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["MESH"] / EXPECTED_FILES["MESH"]
    session = create_session()
    try:
        url = _discover_mesh_xml_url(session)
    except Exception as exc:
        return {"dataset": "MESH", "status": "failed", "path": str(destination), "error": str(exc)}
    if not url:
        return _status_only("MESH", destination, "skipped", "No se pudo resolver aún la URL oficial de MeSH XML.")
    return download_file("MESH", url, destination, session=session)


def download_atc_ddd(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["ATC_DDD"] / EXPECTED_FILES["ATC_DDD"]
    session = create_session()
    url = os.getenv("ATC_DDD_INDEX_URL", "https://atcddd.fhi.no/atc_ddd_index/").strip()
    fallback = "https://www.whocc.no/atc_ddd_index/"

    last_error = "No ATC index entries found."
    for index_url in [url, fallback]:
        try:
            rows = _crawl_atc_index(session, index_url)
            if not rows:
                raise RuntimeError("No ATC index entries found.")

            temp_path = _temp_download_path(destination)
            with temp_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(["code", "name"])
                writer.writerows(rows)

            final_size = _finalize_download(temp_path, destination)
            log_download("ATC_DDD", index_url, destination, final_size, "success", f"rows={len(rows)}")
            return {"dataset": "ATC_DDD", "status": "success", "path": str(destination), "bytes": final_size, "url": index_url}
        except Exception as exc:
            last_error = str(exc)
            log_error("ATC_DDD", index_url, destination, last_error)
            continue

    log_download("ATC_DDD", url, destination, 0, "failed", last_error)
    return {"dataset": "ATC_DDD", "status": "failed", "path": str(destination), "error": last_error, "url": url}


def _crawl_atc_index(session: Session, index_url: str) -> list[tuple[str, str]]:
    max_code_length = int(os.getenv("ATC_DDD_MAX_CODE_LENGTH", "4"))
    max_pages = int(os.getenv("ATC_DDD_MAX_PAGES", "120"))
    queue: deque[str] = deque(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
    visited: set[str] = set()
    rows: dict[str, str] = {}

    while queue and len(visited) < max_pages:
        code = queue.popleft()
        if code in visited:
            continue
        visited.add(code)
        response = _request_with_retries(
            session,
            "GET",
            index_url,
            params={"code": code},
            retries=3,
            timeout=60,
        )
        soup = BeautifulSoup(response.text, "html.parser")
        found_on_page = 0
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            if "?code=" not in href:
                continue
            linked_code = href.split("?code=", 1)[1].split("&", 1)[0].strip().upper()
            label = anchor.get_text(" ", strip=True)
            if not linked_code or not label:
                continue
            rows.setdefault(linked_code, label)
            found_on_page += 1
            if (
                linked_code not in visited
                and linked_code not in queue
                and linked_code.startswith(code)
                and len(linked_code) <= max_code_length
            ):
                queue.append(linked_code)
        if found_on_page == 0 and len(code) > 1:
            continue

    return sorted(rows.items(), key=lambda item: (item[0], item[1]))


def create_snomed_placeholder(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    destination = DATASET_DIRS["SNOMED_CT"] / EXPECTED_FILES["SNOMED_CT"]
    message = (entry or {}).get("notes", "Download via MLDS (license required)")
    destination.write_text(message + "\n", encoding="utf-8")
    return _status_only("SNOMED_CT", destination, "manual_required", message)


def create_tracking_placeholder(entry: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = entry or {}
    dataset = str(payload.get("dataset", "")).upper().strip()
    destination = DATASET_DIRS[dataset] / EXPECTED_FILES[dataset]
    mode = str(payload.get("mode", "manual")).strip().lower()
    message = str(payload.get("notes", "Tracked in manifest; implementation pending")).strip()
    tracking_destination = destination
    if destination.suffix.lower() in {".zip", ".tgz", ".gz", ".xml", ".json", ".xlsx"}:
        tracking_destination = DATASET_DIRS[dataset] / "README.txt"
    tracking_destination.write_text(message + "\n", encoding="utf-8")
    if mode == "credentialed":
        status = "awaiting_credentials"
    elif mode == "public":
        status = "skipped"
    else:
        status = "manual_required"
    return _status_only(dataset, tracking_destination, status, message)


HANDLERS = {
    "download_manifest_urls": download_manifest_urls,
    "download_icd10": download_icd10,
    "download_icd11": download_icd11,
    "download_icd10_cm": download_icd10_cm,
    "download_icd10_pcs": download_icd10_pcs,
    "download_hcpcs_level_ii": download_hcpcs_level_ii,
    "download_loinc": download_loinc,
    "download_rxnorm": download_rxnorm,
    "download_rxnorm_prescribable": download_rxnorm_prescribable,
    "download_ucum": download_ucum,
    "download_hl7_tho": download_hl7_tho,
    "download_hl7_fhir_r5": download_hl7_fhir_r5,
    "download_atc_ddd": download_atc_ddd,
    "download_mesh": download_mesh,
    "create_snomed_placeholder": create_snomed_placeholder,
    "create_tracking_placeholder": create_tracking_placeholder,
}


def run_manifest_entry(entry: dict[str, Any], *, non_interactive: bool = False) -> dict[str, Any]:
    dataset = str(entry.get("dataset", "")).upper().strip()
    mode = str(entry.get("mode", "public")).strip().lower()
    handler_name = str(entry.get("handler", "")).strip()
    note = str(entry.get("notes", "")).strip()

    if dataset not in DATASET_DIRS:
        result = {"dataset": dataset, "status": "failed", "path": "", "error": f"Dataset no soportado: {dataset}"}
        return record_state(dataset, result, mode=mode, note=note)

    handler = HANDLERS.get(handler_name)
    if handler is None:
        result = {"dataset": dataset, "status": "failed", "path": str(DATASET_DIRS[dataset]), "error": f"Handler no encontrado: {handler_name}"}
        return record_state(dataset, result, mode=mode, note=note)

    if mode == "manual" and handler_name == "create_snomed_placeholder":
        result = create_snomed_placeholder(entry)
        return record_state(dataset, result, mode=mode, note=note)

    if handler_name == "download_loinc":
        result = handler(entry, allow_prompt=not non_interactive)
    else:
        result = handler(entry)
    return record_state(dataset, result, mode=mode, note=note)


def run_manifest(
    *,
    datasets: list[str] | None = None,
    cycles: int = 1,
    sleep_seconds: int = 15,
    non_interactive: bool = False,
) -> list[dict[str, Any]]:
    manifest = load_manifest()
    selected = {name.upper() for name in datasets} if datasets else None
    entries = [
        entry
        for entry in manifest.get("datasets", [])
        if selected is None or str(entry.get("dataset", "")).upper() in selected
    ]

    results: list[dict[str, Any]] = []
    for cycle in range(1, max(cycles, 1) + 1):
        cycle_results: list[dict[str, Any]] = []
        for entry in entries:
            result = run_manifest_entry(entry, non_interactive=non_interactive)
            cycle_results.append(result)
        results.extend(cycle_results)

        retryable = any(result.get("status") == "failed" for result in cycle_results)
        if cycle < cycles and retryable:
            time.sleep(max(sleep_seconds, 0))
    return results


def print_status_line(result: dict[str, Any]) -> None:
    dataset = result.get("dataset", "UNKNOWN")
    status = result.get("status", "unknown").upper()
    path = result.get("path", "")
    error = result.get("error", "") or result.get("message", "")
    if error:
        print(f"[{status}] {dataset}: {path} | {error}")
    else:
        print(f"[{status}] {dataset}: {path}")


if __name__ == "__main__":
    ensure_directories()
    print("Use run_all.py to execute complete pipeline.")
    sys.exit(0)
