# AUDIT REPORT

Fecha de auditoria: 2026-04-05

## 1. Estado general

El repositorio no es un monorepo único coherente. Es una superposición de al menos cinco líneas:

- `icicso/`: canon más consistente y más pequeño. Pasa pruebas locales.
- `icicso-local/`: runtime demo multi-servicio más tangible. Tiene bastante código real, pero su arranque oficial está roto.
- `services/ingestion-orquestador/`: backend Python real, pequeño, con pruebas que sí pasan.
- `08_Plataforma_Digital/icicso-foundation/`: foundation alterno con masa de código relevante, pero no corrible de punta a punta hoy.
- `domain/`, `packages/`, `engines/`, `ICICSO_PAPERS/`, `ICICSO_TERMINOLOGIAS/`: mezcla de referencia, corpus, contratos, pruebas de concepto y material de soporte.

Conclusión directa:

- Hay valor real.
- Hay demasiados centros de gravedad.
- El root simula ser el orquestador central, pero no lo es.
- La deuda principal no es solo código roto; es competencia entre árboles y señales contradictorias sobre cuál es el canónico.

## 2. Evidencia de ejecutabilidad

### Funciona hoy

- `icicso/`
  - `pnpm test` pasa.
  - Evidencia: pasan pruebas de `shared-kernel`, mapa de arquitectura y wiring del emulador.
- `services/ingestion-orquestador/`
  - `py -m pytest services/ingestion-orquestador/tests -q` pasa.
  - Resultado: `8 passed`.
- `icicso-local/` por módulos aislados
  - `pnpm --filter @icicso/config build` pasa.
  - `pnpm --filter @icicso/database build` pasa.
  - `pnpm --filter @icicso/auth-service build` pasa.
  - `pnpm --filter @icicso/identity-service build` pasa.
  - `pnpm --filter @icicso/gateway-api build` pasa.

### Funciona parcialmente

- `icicso-local/`
  - Tiene servicios Node con endpoints reales.
  - Tiene `docker-compose.yml`.
  - Tiene launchers `.ps1`, `.bat`, `.cmd` conectados al repo real.
  - Pero el script oficial `scripts/start-icicso-mockup.ps1 -PrepareOnly` falla en `@icicso/audit-service`.

### No cierra hoy

- `icicso-local/` arranque oficial
  - Falla verificada:
    - `icicso-local/apps/audit-service/src/index.ts`
    - desalineación entre `auditEventInputSchema` y `appendAuditEvent` porque `packages/contracts` acepta más tipos de evento que `packages/database/src/block1-store.ts`.
- `icicso-local/` typecheck repo
  - `pnpm typecheck` falla en `turbo` por problema operativo/TLS/permisos.
  - Esto bloquea el “monorepo experience” aunque varios paquetes sí compilen por separado.
- `08_Plataforma_Digital/icicso-foundation/`
  - `pnpm build` falla.
  - Fallas verificadas:
    - imports a `@icicso/shared-kernel` sin paquete resoluble dentro del workspace.
    - errores extensos de tipado en `evidence-ingestion`, `evidence-translation`, `operative-compiler`, `case-control`, `governance-ledger`.
- `icicso-local/engines/13_semantic_terminology_engine`
  - `py -m pytest ...` falla en collection por dependencia faltante `pytest_asyncio`.

## 3. Diagnóstico por línea

### A. `icicso/`

Estado:

- árbol más sobrio;
- suite local pasa;
- emulador HTML canónico sí existe;
- `apps/api` sigue siendo placeholder.

Diagnóstico:

- sí es el mejor candidato a canon técnico;
- todavía no es continuum completo;
- hoy es canon por consistencia, no por cobertura funcional.

### B. `icicso-local/`

Estado:

- es el runtime local con más sustancia operativa;
- el gateway tiene conectividad explícita a los demás servicios;
- los servicios exponen endpoints reales por bloque;
- el emulador local existe;
- el arranque oficial no está sano.

Diagnóstico:

- no es humo total;
- tampoco es “activo-demo” confiable todavía;
- es un sistema semiconstruido con varias piezas útiles y una orquestación frágil.

### C. `services/ingestion-orquestador/`

Estado:

- backend Python funcional y probado;
- foco documental / catálogo / manifest;
- no parece integrado al runtime Node principal.

Diagnóstico:

- útil;
- real;
- huérfano respecto al resto del continuum.

### D. `08_Plataforma_Digital/icicso-foundation/`

Estado:

- volumen considerable de código.
- `apps/api` y `apps/web` tienen cuerpo.
- README promete operación local.
- el build global falla en bounded contexts clave.

Diagnóstico:

- no está muerto;
- no está sano;
- no debe seguir presentándose como foundation corrible sin aclarar que hoy está roto.

### E. `domain/`

Estado:

- contiene duplicados semánticos del canon y de foundation;
- muchos `index.ts` mínimos o vacíos;
- mezcla de referencias con mini-paquetes reales.

Diagnóstico:

- enorme zona de referencia/legado;
- baja confiabilidad operativa;
- alto valor para migración selectiva, bajo valor como superficie de ejecución.

## 4. Simulación / maquillaje detectado

### Promesas por encima de la realidad

- `README.md` raíz presenta `icicso-local/` como ruta operativa vigente. Parcialmente cierto, pero hoy el arranque oficial falla.
- `icicso-local/README.md` promete “17 specialized engines”, event-driven Kafka, governance append-only e incertidumbre bayesiana como si fuera un sistema operativo completo. El código verificado no demuestra ese nivel de integración end-to-end.
- `08_Plataforma_Digital/icicso-foundation/README.md` describe una plataforma local operativa; el build real contradice esa promesa.

### Fachadas funcionales

- `icicso/apps/api/src/index.ts` es solo:
  - `export const apiApp = { name: "icicso-api", status: "scaffolded" } as const;`
- múltiples directorios top-level del root están vacíos:
  - `apps/`
  - `analytics/`
  - `client-ops/`
  - `integrations/`
  - `legal/`
  - `simulation/`
  - `00_Inbox/`
- `icicso-local/infrastructure/` y `icicso-local/shared/` existen pero están vacíos.
- `icicso-local/packages/event-bus` tiene `package.json` pero no `src/`.

## 5. Fallos estructurales concretos

- Root `pnpm-workspace.yaml` declara solo `apps/*` y `packages/*` del root.
  - Problema: esos árboles están vacíos y no representan los workspaces reales usados por el proyecto.
- `08_Plataforma_Digital/icicso-foundation/packages/shared-kernel` no existe.
  - Problema: varios paquetes dependen de `@icicso/shared-kernel`.
- `icicso-local/packages/contracts` y `icicso-local/packages/database` no comparten el mismo catálogo de eventos de auditoría.
- `icicso-local/.env.example` no es un ejemplo funcional; es un puntero textual a `config/env/.env.local.example`.
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local` no es una copia de código ni mirror del repo.
  - Solo contiene launchers y un `LEEME`.

## 6. Residuos y artefactos no canónicos

- `rustup-init.exe` en raíz.
- `node_modules/`, `.pnpm-store/`, `.venv/`, `.turbo/`, caches y logs mezclados con la estructura de producto.
- `logs/` con 39 archivos.
- `dist/` con 47 archivos.
- `software_orquestador/` aparece como eliminado en git, pero su sucesor real vive en `services/ingestion-orquestador/`.
- `_quarantine/` existe y el propio root README dice que no debe usarse como señal de calidad.

## 7. Conclusión operativa

Estado real del sistema:

- canon más estable: `icicso/`
- mockup más ambicioso: `icicso-local/`
- backend Python real y útil: `services/ingestion-orquestador/`
- foundation alterno: relevante pero roto
- mayor deuda: duplicación semántica y workspaces competidores
- mayor simulación: root y README(s) cuando presentan “una sola arquitectura activa”
