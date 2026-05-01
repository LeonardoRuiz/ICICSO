# Data Classification

| categoría | sistema origen | persistencia requerida | sensibilidad | criticidad | retención | backup | restore |
| --- | --- | --- | --- | --- | --- | --- | --- |
| configuración | `config/`, `infra/k8s`, `infra/observability` | sí | baja a media | alta | versionada | sí, parcial en backup full | sí |
| secretos | env local real, secrets K8s generados | sí | alta | alta | fuera de Git | no en backup full inicial | regeneración controlada |
| datos operativos transaccionales | Postgres | sí | alta | alta | según ambiente | sí | sí |
| documentos fuente | hoy serializados como payload/metadato en `.data/block2-store.json`; futuro MinIO | sí | alta | alta | larga | sí | sí |
| derivados regenerables | `.data/block3*`, `block5*`, `block6*`, `block7*`, `block8*` | deseable en local | media | media | corta a media | sí en backup documental | sí |
| cache | Redis | opcional | baja a media | media | corta | no | no |
| observabilidad | `logs/observability/`, métricas y traces efímeros | parcial | media | baja | corta | no en full inicial | no |
| artefactos temporales | builds y temporales de scripts | no | baja | baja | muy corta | no | no |
| backups | `backups/local/` | sí | media a alta | alta | según política | n/a | n/a |

## Lectura operativa

- La fuente primaria local del mock integral no es solamente Postgres; también es `icicso-local/.data/`.
- Redis se clasifica como cache restaurable, no como fuente de verdad.
- La observabilidad local sirve para diagnóstico, pero no se respalda como dato de negocio.
