# Software Orquestador ICICSO

Base operativa para convertir el corpus documental ICICSO en un software orquestador gobernado, trazable, versionable y utilizable como base de construccion de motores.

## Estructura

- `docs/`
  Documentacion conceptual, continuum canonico, modelo de entidades, maquinas de estado, contratos de entrada/salida, fronteras de servicio, planes, auditoria tecnica y contexto operativo del modulo.
- `schemas/`
  Contratos canonicos del dominio ICICSO para documentos, evidencia y runtime.
- `scripts/`
  Automatizaciones locales, incluyendo la generacion e importacion del manifest.
- `manifest/`
  Artefactos generados para indexar el corpus documental local, incluyendo `icicso_manifest.json`.
- `app/`
  Backend FastAPI para exponer el corpus gobernado.
- `data/`
  Persistencia local SQLite. Se crea automaticamente al iniciar la aplicacion.
- `tests/`
  Pruebas del backend y de la persistencia.
- `build/` y `*.egg-info/`
  Artefactos generados de empaquetado; no forman parte del codigo fuente canonico.
- `data/`, `.pytest_cache/` y bases locales
  Artefactos regenerables de ejecucion y prueba.

## Script principal

Para regenerar el manifest local:

```powershell
powershell -ExecutionPolicy Bypass -File .\software_orquestador\scripts\generar_manifest.ps1
```

## Backend actual

El backend actual expone:

- `GET /`
- `GET /health`
- `GET /api/docs-context`
- `GET /api/source-documents/summary`
- `GET /api/source-documents/vrn-policy`
- `GET /api/source-documents/nomenclature`
- `GET /api/source-documents`
- `POST /api/source-documents/ingestions`
- `GET /api/source-documents/ingestions`
- `GET /api/source-documents/ingestions/feed`
- `GET /api/source-documents/ingestions/{document_id}/continuum`
- `POST /api/source-documents/ingestions/{document_id}/materialize`
- `GET /api/source-documents/ingestions/materialized`
- `PATCH /api/source-documents/ingestions/{document_id}/classification`
- `PATCH /api/source-documents/ingestions/{document_id}/metadata`
- `POST /api/source-documents/ingestions/{document_id}/governance`
- `GET /api/source-documents/governance/records`
- `GET /api/source-documents/governance/feed`
- `GET /api/source-documents/audit/feed`
- `GET /api/source-documents/ingestions/{document_id}/audit`
- `POST /api/source-documents/import`
- `GET /api/source-documents/import-runs`
- `GET /api/source-documents/catalog`
- `GET /api/source-documents/{document_id}`

### Ejecutar localmente

1. Crear entorno virtual.
2. Instalar dependencias:

```powershell
py -m pip install -e .
```

3. Levantar la API:

```powershell
py -m uvicorn app.main:app --reload
```

4. Abrir la consola HTML de ingesta:

- `dashboard/document-ingestion.html`

La consola usa la API local para:

- subir documento en base64;
- persistir el archivo en `data/uploaded_documents/`;
- registrar metadata en SQLite;
- calcular `VRN`, `ING artifact` y `SER preview`;
- materializar `SER`, `EO` y `EL` persistidos para el mismo documento;
- registrar `GovernanceRecord` (GCL) y activar VRN;
- persistir eventos auditables por documento en SQLite;
- sincronizar el feed compartido en:
- `config/runtime/document-ingestion-feed.json`
- `dashboard/data/document-ingestion-feed.json`
- `icicso/apps/emulator/src/data/documentIngestionFeed.generated.js`
- `config/runtime/document-audit-feed.json`
- `dashboard/data/document-audit-feed.json`
- `icicso/apps/emulator/src/data/documentAuditFeed.generated.js`
- aplicar la política gobernada de `VRN` definida en `config/runtime/vrn-policy.json`

### Evidence Object Extraction Engine

El extractor de candidatos `EO` vive como engine reutilizable en:

- `app/engines/evidence_object_extraction_engine.py`

El runner operativo re-materializa documentos, persiste `SER`, `EO`, `EL`, `guideline_recommendations` y `eo_candidates`, y exporta HTML/CSV post-ingesta:

```powershell
py .\services\ingestion-orquestador\scripts\run_eo_extraction_engine.py
```

Para correrlo sobre documentos concretos:

```powershell
py .\services\ingestion-orquestador\scripts\run_eo_extraction_engine.py --document-id UPL-CE02A6AB5E49 --document-id UPL-A05533AE4192
```

La salida queda en `dashboard/generated/eo_extraction_engine_summary.json` y los feeds compartidos se sincronizan en `config/runtime`, `dashboard/data` e `icicso/apps/emulator/src/data`.

Al iniciar la API, se crea automaticamente `data/icicso_catalog.db` si no existe y se asegura la carga del catalogo en el evento de startup, no durante la importacion de modulos. La raiz expone `GET /` y la API queda bajo `/api`.

5. Ejecutar pruebas:

```powershell
py -m pytest
```

### Importar el manifest a SQLite local

El archivo `manifest/icicso_manifest.json` ya forma parte del estado actual del modulo. Puede importarse mediante:

- `POST /api/source-documents/import`

O por script local:

```powershell
py .\software_orquestador\scripts\import_manifest_to_sqlite.py
```

## Fuente documental

El corpus documental base actualmente visible en este espacio de trabajo incluye:

- `01_Arquitectura_Base`
- `02_Capas`
- `03_Outputs`
- `04_Referencias_Externas`
- `05_Catalogos_Listados`
- `06_Trabajo_Colaborativo`
- `99_Archivo_Historico`

## Estado actual del modulo

- Existe manifest local generado en `manifest/icicso_manifest.json`.
- Existe especificacion canonica de dominios en `docs/ICICSO_CANONICAL_CONTINUUM.md`.
- El continuum canonico vigente ya esta normalizado como stack `L0-L12` y debe usarse como fuente primaria para bounded contexts, contratos y orden de implementacion.
- Existe modelo canonico de entidades en `docs/ICICSO_ENTITY_MODEL.md`.
- Existe especificacion canonica de maquinas de estado en `docs/ICICSO_STATE_MACHINES.md`.
- Existe especificacion canonica de contratos en `docs/ICICSO_IO_CONTRACTS.md`.
- Existe especificacion canonica de fronteras de servicio en `docs/ICICSO_SERVICE_BOUNDARIES.md`.
- Existen schemas iniciales para fuente, evidencia, traduccion, incertidumbre, runtime y gobernanza.
- Existe catalogo SQLite local para exploracion e importacion del corpus.
- Existen pruebas automatizadas en `tests/`.
- La suite local de `pytest` pasa en el estado actual del repositorio.

## Regla de elaboracion del software

La elaboracion del software debe seguir el continuo canonico en este orden:

1. `L0-L1`
   Gobernanza base, `VRN`, `SER`, `EO`, `EL`.
2. `L2-L3`
   Traduccion de evidencia, `DDMO`, `EUL`.
3. `L4-L5`
   Armonizacion, `KBOL`, `CPO`, `TAM`, `EVT`, `RDY-G`, `CAE`.
4. `L6-L8`
   Release, activacion de caso, runtime y outputs clinico-legales.
5. `L9-L12`
   Modelos sistemicos, operaciones, interoperabilidad, etica y downstream aislado.

## Nota de higiene estructural

- `build/` y `icicso_software_orquestador.egg-info/` son artefactos generados.
- La carpeta `data/` se crea en ejecucion y no debe confundirse con fuente documental.
- `.pytest_cache/` y cualquier base SQLite local deben tratarse como salidas regenerables.
