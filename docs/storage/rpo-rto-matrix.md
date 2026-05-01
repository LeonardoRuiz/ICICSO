# RPO RTO Matrix

| sistema | dato | criticidad | RPO objetivo | RTO objetivo | método de backup | método de restore | validación posterior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Postgres | datos relacionales del engine | alta | 24h local | 60 min | `pg_dump` consistente | `psql` desde dump SQL | `SELECT 1`, health engine |
| `.data/block1-store.json` | identidades, casos, auditoría base | alta | 24h local | 30 min | zip + checksum | restore de `.data/` | endpoints de bloque 1 |
| `.data/block2-store.json` | documentos/metadatos de ingestión | alta | 24h local | 30 min | zip + checksum | restore de `.data/` | parser y dataset status |
| `.data/block3/5/6/7/8` | derivados y readiness | media | 24h local | 30 min | zip + checksum | restore de `.data/` | endpoints de bloques |
| Redis | cache | media | best effort | 15 min | no requerido | reprovision | readiness redis |
| observability logs | logs locales | baja | none | none | no inicial | no inicial | n/a |
