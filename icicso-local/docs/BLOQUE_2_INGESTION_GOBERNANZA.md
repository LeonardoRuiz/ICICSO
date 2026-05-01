# Bloque 2 - Ingestión, Terminología y Gobernanza

## Estado del bloque

Bloque 2 ya participa en el runtime demo local y se visualiza en el emulador como `Knowledge` y parte del flujo de ingestión del caso.

Su papel actual es transformar entradas clínicas heterogéneas en dataset usable por el resto del runtime.

No debe leerse como pipeline documental final ni como plataforma completa de interoperabilidad hospitalaria.

## Rol en la arquitectura

Flujo vigente:

`upload metadata -> storage-service -> ingestion-service -> parsed_variable -> terminology mapping -> provenance_record -> certification_record -> dataset_status`

Este bloque convierte documentos y payloads estructurados en variables trazables y certificadas para habilitar el `Evidence Lake`.

## Objetos funcionales

### Ingesta documental

- `ingested_document`
- `document_metadata`
- `storage_pointer`
- `ingestion_event`

### Dataset estructurado

- `parsed_variable`
- `provenance_record`
- `terminology_mapping`
- `data_certification_record`
- `dataset_status`

### Servicios activos

- `storage-service`
- `ingestion-service`
- `terminology-service`
- `data-governance-service`

Caso demo CABG:

- NSTEMI
- CAD multivaso
- DM2
- ERC estadio 3
- HTA
- troponina
- creatinina
- HbA1c
- FEVI 35%
- medicación activa
- consentimiento base simulado

## Reglas operativas

- un dataset queda `PASS` solo si las variables mínimas obligatorias están presentes y certificadas
- `FAIL` bloquea la progresión a capas superiores
- `PARTIAL` conserva utilidad diagnóstica limitada pero no libera el paso completo
- cada variable debe conservar provenance, mapping terminológico y validación semántica mínima
- Bloque 2 replica eventos relevantes a auditoría para sostener trazabilidad del caso

## Endpoints

### Storage

- `GET /health`
- `POST /documents/metadata`
- `GET /cases/:caseId/documents`

### Ingestion

- `GET /health`
- `POST /ingestions/structured`

### Terminology

- `GET /health`
- `GET /lookup?query=...`
- `POST /mapping`

### Data Governance

- `GET /health`
- `GET /parsed-variables?caseId=...`
- `GET /provenance?caseId=...`
- `GET /terminology-mappings?caseId=...`
- `GET /certification-records?caseId=...`
- `GET /dataset-status?caseId=...`
- `POST /certify?caseId=...`

### Gateway

- `GET /block2/overview`
- `GET /block2/dataset-status?caseId=...`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `Knowledge`
- gateway: `http://127.0.0.1:3100/block2/overview`

Lo que debe verse:

- documentos ingeridos
- variables parseadas
- provenance
- mapping terminológico
- certification status
- bloqueos y faltantes del dataset

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block2
.\scripts\Start-Block2-Services.ps1
```

## Cómo probar el bloque

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3107/documents/metadata `
  -ContentType "application/json" `
  -Body '{"caseId":"CASE-CABG3-2026-00014","documentType":"lab","sourceSystem":"LIS","ingestionMethod":"upload","rawFormat":"json","title":"Lab metadata test"}'

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3108/ingestions/structured `
  -ContentType "application/json" `
  -Body '{"caseId":"CASE-CABG3-2026-00014","documentType":"lab","sourceSystem":"LIS","payload":{"observations":[{"name":"Troponina hs","value":210,"unit":"ng/L"},{"name":"Creatinina","value":1.9,"unit":"mg/dL"}]}}'

Invoke-RestMethod "http://127.0.0.1:3110/dataset-status?caseId=CASE-CABG3-2026-00014"

Invoke-RestMethod http://127.0.0.1:3100/block2/overview
```

## Límites actuales

- el parsing sigue centrado en fixture y payloads demo controlados
- la cobertura multiformato es parcial
- el certification gate es suficiente para demo local, no para certificación institucional completa
- la ontología y el mapping terminológico todavía no cubren todos los dominios clínicos objetivo

## Contrato con Bloque 3

Bloque 2 entrega a Bloque 3:

- dataset certificado o explícitamente bloqueado
- variables parseadas con provenance
- mappings terminológicos mínimos
- contexto suficiente para materializar `Source Evidence Record / Evidence Object` sobre el caso
