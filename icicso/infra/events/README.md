# events

Base mínima de eventos internos del canon.

## Convención

- nombre: `icicso.<module>.<action>`
- envelope: `name`, `source`, `occurredAt`, `traceId`, `payload`
- esta capa solo fija la semántica base; no introduce todavía un bus complejo
