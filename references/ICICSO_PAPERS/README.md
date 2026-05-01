# ICICSO Papers Pipeline

Local Python pipeline for legally compliant acquisition of clinical research literature metadata, abstracts, identifiers, and open-access full text from official public sources.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Edit `00_CONFIG/queries.yaml` or copy from `00_CONFIG/queries.yaml.example`.

Each collection supports:

- `name`
- `query`
- `date_from`
- `date_to`
- `max_results`
- `topics`
- `study_types`
- `languages`

## Run

```bash
python run_pipeline.py
```

## Legal / Full-Text Policy

- Searches use PubMed/NCBI E-utilities, Europe PMC, OpenAlex, and Crossref.
- PDFs or XML are downloaded only when the source explicitly exposes open-access or otherwise legally available files from official/public endpoints.
- Paywalled content is never bypassed.
- Non-open-access records are retained as metadata/abstract only and marked with `full_text_status=restricted`.
- Source provenance is preserved in raw metadata records and normalized outputs.

## Output Structure

- `01_RAW/metadata/`: per-paper raw JSON metadata snapshots
- `01_RAW/abstracts/`: per-paper abstract text
- `01_RAW/pdf/`: open-access PDFs
- `01_RAW/xml/`: open-access XML/NXML
- `02_STAGING/`: per-source staged search results
- `03_NORMALIZED/`: normalized TSV tables
- `04_COLLECTIONS/`: topic/domain/year/study-type subsets
- `05_LOGS/`: download, error, and skipped logs
- `06_DOCS/`: local documentation and data dictionary

## Deduplication

Records are deduplicated using DOI, PMID, PMCID, and normalized title. Merged records prefer richer title, abstract, journal, identifier, and license fields while preserving combined provenance and download candidates.
