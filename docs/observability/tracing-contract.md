# Tracing Contract

## Estado actual

- Propagación activa de `traceparent`, `X-Request-Id` y `X-Correlation-Id` entre frontend, gateway y parser
- Engine clínico devuelve headers de correlación y deja collector/tempo listos para OTLP
- OTEL Collector y Tempo están preparados, pero no todos los servicios emiten spans OTLP todavía

## Naming convention

- `http.server <METHOD> <route>`
- `http.client <METHOD> <target>`
- `parser.ingestion structured`
- `engine.route <route>`

## Atributos mínimos

- `service.name`
- `deployment.environment=local`
- `http.method`
- `http.route`
- `http.status_code`
- `trace_id`
- `correlation_id`
- `request_id`

## Reglas de propagación

- Si entra `traceparent`, el servicio debe reutilizar `trace_id`
- Si no entra `traceparent`, el borde crea uno nuevo
- Las llamadas downstream deben reenviar `traceparent`, `X-Correlation-Id` y `X-Request-Id`
- Los logs deben incluir el mismo `trace_id` cuando exista

## Operaciones obligatorias

- frontend -> gateway
- gateway -> parser
- gateway -> microservicios del motor clínico
- parser -> audit
- engine -> postgres
- engine -> redis

## Pendiente crítico

La exportación OTLP desde los servicios aún no está completa. La correlación actual se apoya en headers y logs. El siguiente paso natural es añadir SDK OpenTelemetry en Node y FastAPI apuntando a `http://host.docker.internal:14418`.
