# NEXT ACTIONS

## 1. Reparar `icicso-local`

Trabajo real:

- alinear `packages/contracts`, `packages/canonical-types` y `packages/database/src/block1-store.ts` para el catálogo de `eventType`;
- recompilar `@icicso/audit-service`;
- rerun de `.\scripts\start-icicso-mockup.ps1`.

## 2. Validar runtime local mínimo

Después de reparar `audit-service`:

- verificar `http://127.0.0.1:3100/health`
- verificar `http://127.0.0.1:8090/index.html`
- ejecutar `.\scripts\Invoke-ContinuumDoctor.ps1`

## 3. Decidir el destino final de `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/`

Opciones reales:

- repararlo en serio;
- separarlo a un repo propio;
- conservarlo archivado como referencia técnica.

No seguir:

- devolviéndolo a la ruta principal sin decisión.

## 4. Limpiar pendientes por permisos

- `services/ingestion-orquestador/.pytest_cache`
- `services/ingestion-orquestador/.ruff_cache`
- `icicso-local/engines/13_semantic_terminology_engine/.pytest_cache`

## 5. Seguir construyendo en el canon real

Ruta:

- `icicso/`

Siguiente continuidad sana:

- `ingest -> ser -> eo -> evidence-lake`

## Qué no hacer ahora

- no abrir desarrollo nuevo en `_archive/`;
- no reactivar `domain/` o `engines/` en el root;
- no vender como “operativo” algo que no pasó validación.
