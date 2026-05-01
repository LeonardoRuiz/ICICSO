# Branching and Release Strategy

## Ramas

### `main`

- rama estable
- sólo recibe cambios ya validados por CI
- candidata directa a release tag

### `develop`

- opcional pero soportada desde ahora
- útil cuando hay varias features largas en paralelo
- integra cambios antes de promover a `main`

Si el equipo prefiere flujo más simple, puede operar sólo con `main` + `feature/*` y dejar `develop` sin uso operativo.

### `feature/*`

- trabajo normal de cambio
- ejemplo: `feature/k8s-smoke-tests`

### `hotfix/*`

- correcciones urgentes sobre una base estable
- ejemplo: `hotfix/gateway-health-timeout`

## Merge policy

- todo cambio entra por pull request
- CI debe estar en verde antes de merge
- cambios a `infra/k8s`, scripts de deploy o workflows requieren revisión técnica explícita

## Versionado

Se propone SemVer:

- `v0.x.y` mientras el stack siga evolucionando fuertemente
- `v1.0.0` cuando el contrato CI/CD + runtime local quede estable

## Tags de release

Convención:

- `v0.1.0`
- `v0.1.1`
- `v0.2.0`

## Regla práctica de version bump

- `patch`: fixes o cambios internos sin romper flujo
- `minor`: nuevo servicio, nueva capacidad operativa o expansión del contrato
- `major`: ruptura de contrato de despliegue, API o topología operativa

## Estrategia de publicación de imágenes

En local y CI:

- tag mutable: `:dev`
- tag trazable: `:<git-sha-corto>`

En una fase posterior hacia staging/producción:

- mantener `:<git-sha>`
- agregar `:vX.Y.Z`

## Relación con releases futuras

- `main` genera candidate release
- tag `vX.Y.Z` congela una versión trazable del repo y de las imágenes
- staging y producción deben desplegar siempre por tag, no por rama
