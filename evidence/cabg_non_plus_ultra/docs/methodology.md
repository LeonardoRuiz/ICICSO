# Methodology

1. Load structured seed records from YAML.
2. Query PubMed, Europe PMC, Crossref, DOI resolver, and official society or publisher pages.
3. Merge candidate metadata and score the best match using title similarity, year proximity, and context hints.
4. Persist normalized registry records with source-of-truth provenance.
5. Attempt legal acquisition of publisher or society PDFs, then PMC resources, then landing pages plus abstracts.
6. Deduplicate by DOI, PMID, normalized title, and canonical publisher URL.
7. Build a ranked operational matrix tailored to the index case.
8. Run a quality audit over critical outputs.
