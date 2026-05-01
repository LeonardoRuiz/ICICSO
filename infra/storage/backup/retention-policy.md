# Retention Policy

## Retención sugerida local

| tipo | retención sugerida | rotación | purge automático |
| --- | --- | --- | --- |
| backup Postgres | últimos 7 dumps o 14 días | sí | manual por ahora |
| backup documental | últimos 7 paquetes o 14 días | sí | manual por ahora |
| backup completo | últimos 5 paquetes o 30 días | sí | manual por ahora |
| restore-safety | 7 días | sí | manual por ahora |

## Reglas

- No borrar automáticamente el backup más reciente de cada tipo.
- No borrar automáticamente un backup marcado para incidente o auditoría.
- En local, la purga sigue siendo operativa/manual para evitar borrados accidentales.

## Riesgos de crecimiento

- `icicso-local/.data/` puede crecer si el demo deja de ser solamente fixture.
- Los dumps SQL pueden duplicarse rápido si se toman antes de cada prueba.
- `logs/observability/` debe vigilarse por separado; no entra al backup full inicial.
