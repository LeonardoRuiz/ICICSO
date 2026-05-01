# TECHNICAL DEBT

## Deuda 1. Multiplicidad de líneas técnicas

Todavía conviven:

- `icicso/`
- `icicso-local/`
- `services/ingestion-orquestador/`
- `08_Plataforma_Digital/icicso-foundation/`

Impacto:

- alto costo cognitivo;
- riesgo de trabajar en el árbol equivocado.

## Deuda 2. Arranque roto del runtime local

Problema real:

- `icicso-local` falla en `audit-service` por desalineación de tipos de auditoría.

Impacto:

- existe hub local y existen launchers;
- no existe todavía runtime validado end-to-end.

## Deuda 3. Foundation alterno roto

Problemas reales:

- imports faltantes a `@icicso/shared-kernel`;
- tipado roto en varios bounded contexts.

Impacto:

- sigue siendo referencia técnica;
- no debe tratarse como foundation operativa.

## Deuda 4. Canon pequeño

Problema:

- el canon `icicso/` es el árbol más sano, pero cubre solo un slice del continuum.

Impacto:

- buena base para construir;
- cobertura funcional todavía limitada.

## Deuda 5. Señales engañosas por nombres

Problema:

- varios paquetes y servicios existen como scaffold con nombres definitivos.

Impacto:

- un lector nuevo puede sobrestimar la madurez del sistema.

## Deuda 6. Residuos con permisos problemáticos

Pendientes:

- `services/ingestion-orquestador/.pytest_cache`
- `services/ingestion-orquestador/.ruff_cache`
- `icicso-local/engines/13_semantic_terminology_engine/.pytest_cache`

## Regla para no maquillar deuda

- paquete existente no equivale a implementación completa;
- launcher existente no equivale a sistema cerrado;
- referencia en sitio no equivale a módulo canónico.
