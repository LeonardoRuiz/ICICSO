# Matriz de Dependencias de Modulos

Leyenda de estado:

- `connected`
- `partial`
- `disconnected`
- `simulated`
- `promised-not-implemented`

| Modulo | Depende de | Expone a | Estado de conexion | Observaciones |
| --- | --- | --- | --- | --- |
| corpus documental | `references/` | `services/ingestion-orquestador/`, lectura humana | `connected` | fuente conceptual principal |
| `services/ingestion-orquestador/` | corpus local, SQLite, schemas JSON | API FastAPI documental | `connected` | probado con `py -m pytest` |
| `ICICSO_TERMINOLOGIAS/` | raw terminologies, parsers Python, `00_METADATA/sources_catalog.tsv` | salidas TSV, mappings, consola/reporte, `terminology-service` source registry | `partial` | pipeline activo; catalogo oficial y buscador integrados, parsers pendientes para nuevos datasets |
| `icicso/packages/shared-kernel` | ninguno | `icicso/packages/*`, `icicso/apps/emulator` | `connected` | kernel efectivo del canon |
| `icicso/packages/domain/ingest` | `shared-kernel` | `icicso/packages/domain/ser` | `connected` | slice implementado y probado |
| `icicso/packages/domain/ser` | `shared-kernel`, `ingest` | futuros `eo`, `evidence-lake` | `connected` | slice implementado y probado |
| `icicso/packages/domain/eo` | `shared-kernel`, `ser` | continuum canónico | `promised-not-implemented` | descriptor y README, sin wiring real |
| `icicso/packages/domain/evidence-lake` | `shared-kernel`, `eo` | continuum canónico | `promised-not-implemented` | scaffold |
| `icicso/packages/engines/evidence-translation` | `shared-kernel`, `eo` | continuum canónico | `promised-not-implemented` | scaffold |
| `icicso/packages/engines/guideline-harmonization` | `shared-kernel`, `eo`, `epistemic-uncertainty` | continuum canónico | `promised-not-implemented` | scaffold |
| `icicso/apps/emulator` | `architectureMap`, `shared-kernel` types | HTML observacional | `connected` | util como mapa, no como demo de negocio |
| `icicso/apps/api` | ninguno relevante real | potencial API | `partial` | hoy es solo `apiApp` scaffold |
| `icicso-local/packages/contracts` | ninguno | `icicso-local/apps/*` | `connected` | compila |
| `icicso-local/packages/database` | `.data/` local | casi todos los servicios locales | `connected` | compila; base real de la demo |
| `icicso-local/apps/auth-service` | contracts, database, logger, config | `gateway-api` y desktop emulator | `connected` | compila |
| `icicso-local/apps/gateway-api` | 15 servicios locales | desktop emulator, cliente externo | `connected` | compila y tiene wiring real |
| `icicso-local/apps/evidence-lake-service` | contracts, database | `gateway-api` | `connected` | compila |
| `icicso-local/apps/case-control-service` | contracts, database | `gateway-api` | `connected` | compila |
| `icicso-local/apps/desktop-emulator` | `gateway-api` | usuario final local | `connected` | demo real, pero mayormente observacional |
| `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/apps/api` | Prisma, packages foundation | `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/apps/web` | `partial` | arbol archivado; contiene wiring real, pero el workspace completo no pasa typecheck |
| `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/contracts` | supuesto `@icicso/shared-kernel` | bounded contexts foundation | `disconnected` | arbol archivado; importa un paquete que no existe en el workspace |
| `domain/` | contratos y kernels propios | nadie en pipeline real | `disconnected` | referencia semantica, no parte del build |
| `engines/` | nada visible del pipeline real | nadie en pipeline real | `disconnected` | referencia tecnica |
| `tests/` root | archivos de prueba sueltos | nadie | `disconnected` | `npm test` no los ejecuta |
| `scripts/start-icicso-mockup.ps1` | `icicso-local/`, Node, pnpm, Python | arranque local | `connected` | launcher vigente del mockup |
