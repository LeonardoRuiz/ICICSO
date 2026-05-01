# SYSTEM STATUS

Fecha base: 23 de abril de 2026

## Resumen ejecutivo

ICICSO hoy está dividido en una base canónica parcialmente ejecutable, un backend Python funcional y un runtime local de demo.

La mejor forma de entender el estado actual es esta:

| Árbol | Rol | Estado real |
| --- | --- | --- |
| `icicso/` | canon TypeScript del continuum | funcional parcial, consistente, con primer slice probado |
| `services/ingestion-orquestador/` | backend documental y de catálogo | funcional |
| `packages/evidence-intelligence/` | validación y mapping de contratos | funcional |
| `icicso-local/` | runtime local y superficies de demo | útil, pero no canónico |
| `_archive/noncanonical/.../icicso-foundation/` | referencia técnica archivada | no operativa |
| `_archive/deprecated_audit_20260405/` | histórico | fuera de la ruta viva |

## Slice realmente probado

Lo que hoy sí tiene evidencia directa de ejecución es:

- `ING -> SER -> EO -> EL` en `icicso/`
- validadores y mapping `SER -> EO` en `packages/evidence-intelligence/`
- catálogo, ingesta, materialización, governance y auditoría en `services/ingestion-orquestador/`

## Qué existe por tipo

### Implementado con evidencia

- `icicso/packages/domain/ingest`
- `icicso/packages/domain/ser`
- `icicso/packages/domain/eo`
- `icicso/packages/domain/evidence-lake`
- `icicso/apps/emulator`
- `packages/evidence-intelligence`
- `services/ingestion-orquestador`

### Scaffold o parcial

- `icicso/apps/api`
- parte importante de `icicso/packages/domain/*` fuera del slice inicial
- varios `icicso/services/*`
- múltiples módulos en `icicso-local/` que sirven para demo, wiring o navegación más que para operación completa

### Histórico o fuera de ruta

- `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/`
- `_archive/deprecated_audit_20260405/`

## Evidencia de validación

Al 23 de abril de 2026:

- `npm --prefix ./icicso test` pasa
- `npm --prefix ./packages/evidence-intelligence run test:validation` pasa
- `py -m pytest services/ingestion-orquestador/tests -q` es la ruta prevista de validación del backend Python

## Qué significa cada superficie

### `icicso/`

Es la fuente de verdad del modelo canónico. No todo está terminado, pero aquí debe vivir el desarrollo nuevo del continuum.

### `services/ingestion-orquestador/`

Es la implementación más concreta del flujo documental. Aquí ya hay API real, persistencia SQLite y feeds que después consume el emulador.

### `icicso-local/`

Sirve para demo local, hub operativo y navegación entre servicios. No debe leerse como el estado definitivo de arquitectura ni como reemplazo del canon.

## Riesgos vivos

- gran parte del continuum fuera de `ING -> SER -> EO -> EL` sigue en modo scaffold o mock;
- `icicso/apps/api` todavía no es un servicio real;
- existen varias superficies con nombres fuertes pero distinta madurez real;
- el repo sigue mezclando canon, runtime local, documentación y archivo histórico.
