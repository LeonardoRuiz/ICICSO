# ECR Repositories Plan

## Repositorios iniciales

- `icicso-staging/node-runtime`
- `icicso-staging/frontend`
- `icicso-staging/semantic-terminology-engine`

## Motivo

El `node-runtime` se reutiliza para múltiples servicios Node del stack actual, así que no se crea un repositorio por microservicio en esta fase.

## Evolución futura

Separar repositorios por servicio cuando el pod `engine` deje de ser multi-contenedor y cada servicio tenga su imagen propia.
