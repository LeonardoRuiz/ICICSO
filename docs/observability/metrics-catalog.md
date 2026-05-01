# Metrics Catalog

| nombre | tipo | labels | descripción | unidad | servicio origen | umbral sugerido |
| --- | --- | --- | --- | --- | --- | --- |
| `icicso_api_request_count_total` | counter | `method`, `route` | solicitudes HTTP al gateway | requests | gateway-api | crecimiento continuo esperado |
| `icicso_api_request_duration_seconds` | histogram | `method`, `route`, `status_code` | latencia HTTP del gateway | segundos | gateway-api | p95 < 1s en local |
| `icicso_api_error_count_total` | counter | `method`, `route`, `status_code` | errores HTTP del gateway | requests | gateway-api | ideal 0 sostenido |
| `icicso_api_active_requests` | gauge | none | solicitudes activas del gateway | requests | gateway-api | < 20 en local |
| `icicso_documents_received_total` | counter | none | documentos estructurados recibidos | documentos | ingestion-service | depende de uso |
| `icicso_parse_success_total` | counter | `document_type` | parseos exitosos | parseos | ingestion-service | debe superar a fallos |
| `icicso_parse_failure_total` | counter | none | parseos fallidos | parseos | ingestion-service | ideal 0 sostenido |
| `icicso_parse_duration_seconds` | histogram | `document_type` | duración del parseo | segundos | ingestion-service | p95 < 1s en local |
| `icicso_parser_error_count_total` | counter | `method`, `route`, `status_code` | errores HTTP del parser | requests | ingestion-service | ideal 0 sostenido |
| `icicso_engine_requests_total` | counter | `method`, `route`, `status_code` | requests del engine clínico | requests | semantic-terminology-engine | crecimiento continuo esperado |
| `icicso_route_resolution_duration_seconds` | histogram | `method`, `route` | latencia del engine | segundos | semantic-terminology-engine | p95 < 1s |
| `icicso_rule_evaluation_total` | counter | `operation` | operaciones clínicas/terminológicas | operaciones | semantic-terminology-engine | depende de uso |
| `icicso_engine_failures_total` | counter | `route`, `error_code` | fallos del engine | fallos | semantic-terminology-engine | ideal 0 sostenido |
| `icicso_frontend_health` | gauge | none | salud del emulador | booleano 0/1 | desktop-emulator | 1 constante |
| `icicso_frontend_request_count_total` | counter | `route`, `method` | tráfico del emulador | requests | desktop-emulator | depende de uso |
| `icicso_postgres_up` | gauge | `service` | conectividad a postgres vista desde app | booleano 0/1 | ingestion-service, engine | 1 constante |
| `icicso_redis_up` | gauge | `service` | conectividad a redis vista desde app | booleano 0/1 | semantic-terminology-engine | 1 constante |
| `pg_up` | gauge | exporter labels | salud del exporter postgres | booleano 0/1 | postgres-exporter | 1 constante |
| `redis_up` | gauge | exporter labels | salud del exporter redis | booleano 0/1 | redis-exporter | 1 constante |
