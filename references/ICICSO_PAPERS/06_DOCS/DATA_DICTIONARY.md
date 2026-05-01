# Data Dictionary

## `papers.tsv`

- `internal_paper_id`: stable local identifier derived from DOI, PMID, PMCID, or normalized title
- `title`: best merged article title
- `abstract`: best merged abstract text
- `year`: publication year
- `journal`: journal or source title
- `publication_type`: merged publication type labels
- `study_design`: rule-based inferred study design
- `evidence_level`: lightweight evidence tier
- `language`: source language
- `doi`: DOI when available
- `pmid`: PubMed identifier when available
- `pmcid`: PubMed Central identifier when available
- `open_access_status`: merged OA status
- `full_text_status`: local acquisition status
- `license`: detected license label or URL
- `source_database`: merged provenance sources
- `source_url`: merged source URLs
- `query_collection`: originating query collection names
- `retrieval_date`: UTC retrieval date

## `authors.tsv`

- `internal_paper_id`
- `author_order`
- `author_name`
- `affiliation`

## `identifiers.tsv`

- `internal_paper_id`
- `id_type`
- `id_value`

## `mesh_terms.tsv`

- `internal_paper_id`
- `mesh_term`

## `licenses.tsv`

- `internal_paper_id`
- `license_name`
- `license_url`

## `files.tsv`

- `internal_paper_id`
- `file_type`
- `local_path`
- `download_url`
- `checksum`
- `status`
