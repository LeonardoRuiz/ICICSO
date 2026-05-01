# Terminology Downloader

Persistent local downloader for clinical terminologies into `ICICSO_TERMINOLOGIAS/01_RAW`.

## Files

- `downloader.py`: dataset download functions + logging + retries + resume + persistent state
- `run_all.py`: executes the manifest, retries failed cycles, and prints summary
- `manual_ingest.py`: copies manual downloads into canonical target names and logs them
- `../../00_METADATA/download_manifest.json`: declarative source manifest
- `../../00_METADATA/download_state.json`: persistent state per dataset
- `../../00_METADATA/sources_catalog.tsv`: official source/version/license registry consumed by report and source lookup
- `requirements.txt`: runtime dependencies
- `.env.example`: optional environment variables

## Install

```powershell
py -m pip install -r ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/requirements.txt
```

## Run Full Pipeline

```powershell
py ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/run_all.py --cycles 3 --sleep-seconds 30 --non-interactive
```

```powershell
py ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/run_all.py --dataset RXNORM --dataset UCUM
```

## Persistent Runner

```powershell
.\scripts\start-terminology-sync.ps1 -Cycles 3 -SleepSeconds 30 -NonInteractive
```

```powershell
.\scripts\start-terminology-sync.ps1 -LoopForever -Dataset RXNORM,UCUM,HL7_THO
```

The downloader also auto-loads `ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/.env` if present.

## Windows Scheduled Task

Register a recurring Windows task:

```powershell
.\scripts\register-terminology-sync-task.ps1 -RepeatMinutes 360 -Cycles 3 -SleepSeconds 30 -Dataset RXNORM,UCUM,HL7_THO
```

Remove it:

```powershell
.\scripts\unregister-terminology-sync-task.ps1
```

## Manual Ingest

```powershell
py ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/manual_ingest.py --dataset ICD11 --source "C:\Descargas\SimpleTabulation-ICD-11-MMS-en.zip"
```

Manual ingest now updates persistent state as well as TSV logs.

## Outputs

- Raw files:
  - `ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml.xml`
  - `ICICSO_TERMINOLOGIAS/01_RAW/ICD11/icd11_mms.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/ICD10_TO_ICD11/icd10_to_icd11_mapping.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/ICD10_CM/icd10cm_codes.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/ICD10_PCS/icd10pcs_codes.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/LOINC/loinc.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/RXNORM/rxnorm.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/RXNORM_PRESCRIBABLE/rxnorm_prescribable.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/UCUM/ucum.xml`
  - `ICICSO_TERMINOLOGIAS/01_RAW/HL7_THO/tho.tgz`
  - `ICICSO_TERMINOLOGIAS/01_RAW/HL7_FHIR_R5/fhir_r5_definitions.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/ATC_DDD/atc_index.csv`
  - `ICICSO_TERMINOLOGIAS/01_RAW/HCPCS_LEVEL_II/hcpcs_level_ii.zip`
  - `ICICSO_TERMINOLOGIAS/01_RAW/MESH/mesh.xml`
  - `ICICSO_TERMINOLOGIAS/01_RAW/SNOMED_CT/README.txt`
- Logs:
  - `logs/download_log.tsv`
  - `logs/error_log.tsv`
- State:
  - `ICICSO_TERMINOLOGIAS/00_METADATA/download_state.json`

## Operational Policy

- Public sources are retried and resumed with `.part` files before replacing the final artifact.
- Credentialed sources are marked `awaiting_credentials` when run in non-interactive mode without secrets.
- Licensed/manual sources such as `SNOMED_CT` are registered as `manual_required`; the engine does not attempt to bypass licenses or access controls.
