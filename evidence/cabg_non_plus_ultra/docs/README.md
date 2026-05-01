# Módulo CABG non plus ultra

Este módulo construye un repositorio trazable para un caso índice de `CABG x3 urgente` en un paciente con `DM2`, `NSTEMI`, `FEVI 35%`, `ERC estadio 3` y anatomía multivaso compleja.

## Qué hace

- Carga un seed de 50 referencias objetivo.
- Resuelve metadatos contra fuentes primarias y oficiales.
- Intenta descargar full text sólo por vías legales.
- Guarda PDFs, landing pages, abstracts y XML de PMC cuando existen.
- Consolida un registro deduplicado y una matriz clínica operativa.
- Ejecuta una auditoría final de calidad.

## Cómo correrlo

```powershell
py evidence\cabg_non_plus_ultra\scripts\run_all.py
```

También se puede ejecutar por fases con `01` a `07`.

## Dónde quedan los archivos

- PDFs: `raw/pdf/`
- landing pages HTML: `raw/landing_pages/`
- abstracts: `raw/abstracts/`
- XML de PMC: `raw/pmc_xml/`
- salidas finales: `processed/`

## Cómo se marcan paywalls y validación

- `open`: full text legal descargado.
- `abstract-only`: sólo abstract y landing page.
- `paywalled`: landing page validada sin full text legal.
- `not_downloaded_legal_restriction`: no se descargó por restricción legal.

La prioridad de validación es: DOI landing page, PubMed, Europe PMC, publisher, Crossref y society page oficial.

## Limitaciones

- No se fuerza acceso a paywalls.
- Los resúmenes se apoyan en metadatos y abstracts legalmente accesibles.
- Algunos documentos recientes pueden requerir revisión manual adicional.
