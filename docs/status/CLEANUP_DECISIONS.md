# CLEANUP DECISIONS

Fecha de ejecución: 2026-04-05

## Principio aplicado

- conservar lo canónico;
- reparar lo recuperable;
- mandar a cuarentena lo dudoso, duplicado o superado;
- eliminar solo lo regenerable, vacío o claramente residual.

## Qué se conservó

- `icicso/`
  - canon actual y árbol más consistente.
- `icicso-local/`
  - runtime demo reparable; no se tocó su superficie funcional fuera de caches y un paquete huérfano.
- `services/ingestion-orquestador/`
  - backend Python activo y probado.
- `08_Plataforma_Digital/icicso-foundation/`
  - se dejó en sitio porque sigue siendo recuperable y tiene cambios abiertos.
- `config/`, `infra/`, `scripts/`, `.github/`, `docs/`, `tools/desktop-launcher/`
  - soporte operativo vigente.

## Qué se movió a cuarentena

Se creó:

- `_archive/deprecated_audit_20260405/`

### Referencia legacy archivada

- `domain/`
- `engines/`
- `_quarantine/`

Motivo:

- duplicaban autoridad semántica o técnica;
- no participaban del pipeline activo;
- seguían contaminando la lectura del root.

### Documentación histórica archivada

- `docs/00_repo_audit/`
- `docs/audits/`
- `AUDIT_REPO_MASTER.md`
- `99_Archivo_Historico/`

Motivo:

- ya no eran la documentación base de decisión;
- generaban capas de auditoría solapadas;
- añadían ruido al root y a `docs/`.

### Outputs históricos archivados

- `03_Outputs/`

Motivo:

- eran salidas documentales antiguas;
- no son entradas funcionales del sistema.

### Launchers obsoletos archivados

- `ICICSO Canon Emulator.lnk`
- `ICICSO Mockup Local.lnk`

Motivo:

- eran duplicados de launchers más claros y trazables (`.cmd`, `.ps1`);
- no deben convivir como accesos “misteriosos” en el repo.

### Módulo parcial archivado

- `icicso-local/packages/event-bus`

Motivo:

- no tenía `src/`;
- no tenía importadores activos;
- coexistía solo como paquete nominal.

## Qué se eliminó

### Basura vacía o directorios sin función real

- `00_Inbox/`
- `analytics/`
- `apps/`
- `client-ops/`
- `integrations/`
- `legal/`
- `simulation/`
- `icicso-local/infrastructure/`
- `icicso-local/shared/`

### Artefactos regenerables o residuales

- `logs/`
- `dist/`
- `.pnpm-store/`
- `rustup-init.exe`
- `services/ingestion-orquestador/build/`
- `services/ingestion-orquestador/icicso_software_orquestador.egg-info/`
- `services/ingestion-orquestador/uvicorn.out.log`
- `services/ingestion-orquestador/uvicorn.err.log`
- `icicso-local/.turbo/`
- `08_Plataforma_Digital/icicso-foundation/.pnpm-store/`
- `08_Plataforma_Digital/icicso-foundation/.turbo/`

Motivo:

- no eran fuente de verdad;
- se pueden regenerar;
- contaminaban la estructura canónica.

## Qué quedó pendiente por duda razonable o bloqueo técnico

- `08_Plataforma_Digital/icicso-foundation/`
  - se dejó en sitio por ser recuperable y por tener cambios abiertos.
- `icicso-local/engines/13_semantic_terminology_engine/.pytest_cache`
- `services/ingestion-orquestador/.pytest_cache`
- `services/ingestion-orquestador/.ruff_cache`
  - quedaron pendientes por problemas de permisos al borrarlos.
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local`
  - no se modificó desde esta pasada porque está fuera del workspace de escritura actual.

## Conflictos resueltos

- coexistencia de `domain/`, `engines/` y canon root:
  - resuelto archivando `domain/` y `engines/`.
- coexistencia de múltiples auditorías en root y `docs/`:
  - resuelto archivando auditorías históricas y dejando el set actual en root.
- coexistencia de accesos `.lnk` con launchers reales:
  - resuelto archivando los `.lnk`.

## Decisiones importantes

### Por qué no se movió `icicso-foundation`

- tiene código relevante;
- sigue siendo recuperable;
- había cambios abiertos en ese árbol;
- moverlo completo en esta pasada habría sido limpieza agresiva con riesgo innecesario.

### Por qué sí se movieron `domain/` y `engines/`

- no estaban en la ruta activa;
- seguían compitiendo con el canon;
- la auditoría previa ya los había clasificado como referencia legacy.
