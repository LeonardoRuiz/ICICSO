# architecture

Base estructural canónica del turno 1/24.

## Cerrado en este bloque

- estructura física del canon `icicso/`
- `packages/shared-kernel` con `src/ids`, `src/enums`, `src/contracts`, `src/audit`, `src/provenance`, `src/hash` y `src/state`
- `apps/emulator/src/data/architectureMap.ts`
- observabilidad mínima en `infra/logging` e `infra/events`
- wiring básico del emulador con el mapa
- tests mínimos en `tests/unit` y `tests/integration`

## Siguiente frontera

Con esta base ya se puede pasar al bloque `SER` sin volver a discutir dónde viven IDs, contratos, riesgos, repo paths o madurez de capas.
