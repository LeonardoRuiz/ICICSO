# STRUCTURE AFTER CLEANUP

## Estructura resultante resumida

```text
ICICSO/
├─ _archive/
│  └─ deprecated_audit_20260405/
├─ .github/
├─ config/
├─ docs/
├─ infra/
├─ scripts/
├─ tools/
│  └─ desktop-launcher/
├─ services/
│  └─ ingestion-orquestador/
├─ icicso/
├─ icicso-local/
├─ 08_Plataforma_Digital/
│  └─ icicso-foundation/
├─ ICICSO_PAPERS/
├─ ICICSO_TERMINOLOGIAS/
├─ evidence/
├─ backups/
├─ data/
├─ 01_Arquitectura_Base/
├─ 02_Capas/
├─ 04_Referencias_Externas/
├─ 05_Catalogos_Listados/
├─ 06_Trabajo_Colaborativo/
├─ README.md
├─ AUDIT_REPORT.md
├─ SYSTEM_MAP.md
├─ INVENTORY_INDEX.md
├─ MODULE_CLASSIFICATION.md
├─ CLEANUP_DECISIONS.md
├─ DEPRECATION_MAP.md
└─ STRUCTURE_AFTER_CLEANUP.md
```

## Lectura operativa

### Núcleo canónico

- `icicso/`

### Runtime demo reparable

- `icicso-local/`

### Backend Python activo

- `services/ingestion-orquestador/`

### Referencia recuperable en sitio

- `08_Plataforma_Digital/icicso-foundation/`

### Referencias ya retiradas del root

- `_archive/deprecated_audit_20260405/legacy_reference/domain/`
- `_archive/deprecated_audit_20260405/legacy_reference/engines/`
- `_archive/deprecated_audit_20260405/legacy_reference/_quarantine/`

## Qué quedó más claro

- el root ya no presenta `domain/` y `engines/` como si fueran árboles activos;
- los outputs históricos y auditorías anteriores salieron de la superficie principal;
- los launchers válidos quedan concentrados en `scripts/`, `Launch-ICICSO-Continuum.cmd` y `tools/desktop-launcher/`;
- el archivo de cuarentena centraliza todo lo desplazado en una ruta única y fechada.

## Qué se reconecta en la siguiente pasada

- `icicso-local/`
  - reparación del pipeline de build oficial;
  - alineación de `audit-service` con contratos de eventos.
- `08_Plataforma_Digital/icicso-foundation/`
  - cierre de imports y paquetes faltantes;
  - decisión posterior: reparar o archivar.
- caches Python bloqueadas por permisos
  - eliminación pendiente si se libera acceso.
