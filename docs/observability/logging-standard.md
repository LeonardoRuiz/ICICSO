# Logging Standard

## Esquema JSON

Campos esperados:

- `timestamp`
- `level`
- `service_name`
- `environment`
- `trace_id`
- `span_id`
- `request_id`
- `route` o `action`
- `correlation_id`
- `message`
- `error_code` cuando aplique

Campos opcionales:

- `user_role`
- `domain_context`
- `status_code`
- `duration_ms`

## Niveles permitidos

- `debug`
- `info`
- `warn`
- `error`

## Reglas

- Toda entrada HTTP debe emitir al menos `request-received` y `request-completed`
- Todo error operacional debe incluir `error_code`
- `trace_id`, `request_id` y `correlation_id` deben viajar entre servicios cuando exista llamada downstream

## Qué nunca debe loggearse

- tokens JWT completos
- contraseñas
- secretos de base de datos
- payload clínico completo si contiene PII sensible
- headers de autorización en claro

## Correlación

- `trace_id`: une frontend, API, parser y engine cuando se propagó `traceparent`
- `correlation_id`: útil para reconstrucción funcional extremo a extremo
- `request_id`: identifica una petición concreta dentro de un servicio
