# ICICSO Runtime & Docker Audit
**Fecha:** 2026-04-05  
**Auditor:** Platform Engineering Team  
**Status:** CRITICAL FINDINGS + ACTION PLAN

---

## EXECUTIVE SUMMARY

ICICSO es un **monorepo médico-clínico enterprise** que implementa un continuum de procesamiento de evidencia clínica desde ingesta → análisis de riesgo sistémico → decisión clínica.

**Estado general:**
- **✅ Canon (`icicso/`)**: Funcional, tests pasan, base sana.
- **🟡 Runtime local (`icicso-local/`)**: Arrastrable pero con fallos críticos en arranque de `audit-service`.
- **✅ Backend Python (`services/ingestion-orquestador/`)**: Funcional, tests pasan.
- **❌ Foundation alterno (`08_Plataforma_Digital/icicso-foundation/`)**: Roto, debe deprecarse.

**Readiness para CI/CD y contenedorización:**
- ⚠️ No hay Dockerfiles individuales por servicio en la ruta activa.
- ⚠️ `docker-compose.yml` en `icicso-local/` cubre solo infraestructura (PostgreSQL, Redis, Kafka, MinIO), no los servicios de aplicación.
- ⚠️ Falta .dockerignore.
- ⚠️ No hay CI/CD workflow (GitHub Actions).
- ⚠️ Scripts PowerShell de arranque local existen pero son frágiles.

---

## 1. ESTRUCTURA DEL MONOREPO

### 1.1. Árboles principales

```
ICICSO/
├── icicso/                          [✅ CANON - Autoridad técnica principal]
│   ├── apps/
│   │   ├── api/                    [Scaffold, no prioritario]
│   │   └── emulator/               [HTML5 navegable, integrado al runtime]
│   ├── packages/
│   │   ├── domain/
│   │   ├── engines/
│   │   ├── execution/
│   │   ├── integration/
│   │   ├── intelligence/
│   │   ├── operations/
│   │   ├── shared-kernel/          [Tipos, constantes compartidas]
│   │   └── simulation/
│   ├── services/                   [Planeado, mayormente vacío]
│   ├── tests/                      [Test suite root]
│   └── pnpm-workspace.yaml
│
├── icicso-local/                    [🟡 RUNTIME LOCAL - Servicios aislados]
│   ├── apps/
│   │   ├── audit-service/          [⚠️ PROBLEMA CRÍTICO]
│   │   ├── auth-service/
│   │   ├── identity-service/
│   │   ├── storage-service/
│   │   ├── ingestion-service/
│   │   ├── terminology-service/
│   │   ├── data-governance-service/
│   │   ├── evidence-lake-service/
│   │   ├── ghl-service/
│   │   ├── kbol-service/
│   │   ├── runbook-service/
│   │   ├── readiness-service/
│   │   ├── case-control-service/
│   │   ├── systemic-risk-service/
│   │   ├── cqoi-service/
│   │   └── desktop-emulator/
│   ├── packages/
│   │   ├── canonical-types/        [Tipos base del domain]
│   │   ├── config/                 [Validación y carga de env]
│   │   ├── contracts/              [Zod schemas, DTOs]
│   │   ├── database/               [In-memory store JSON + Prisma]
│   │   ├── logger/                 [Telemetría, métricas, trazas]
│   │   └── security/               [Auth, JWT, RBAC]
│   ├── engines/
│   │   └── 13_semantic_terminology_engine/  [Python, pytest]
│   ├── docker-compose.yml          [Infra: PostgreSQL, Redis, Kafka, MinIO]
│   ├── .env                        [Configuración activa, no versionada]
│   └── pnpm-workspace.yaml
│
├── services/
│   └── ingestion-orquestador/       [✅ Backend Python documental]
│
├── 08_Plataforma_Digital/
│   └── icicso-foundation/           [❌ DEPRECAR - Roto, imports faltantes]
│
├── _archive/                        [Legacy archivado]
│
└── [Config, scripts, docs, etc.]
```

### 1.2. Totales de servicios

**Servicios activos en icicso-local:**
- Gateway API (proxy + orquestación)
- Auth Service (login, JWT)
- Identity Service (identidades longitudinales, casos, episodios)
- Audit Service (eventos auditables, cadena de hashes)
- Storage Service (documentos)
- Ingestion Service (pipelines)
- Terminology Service (catálogos)
- Data Governance Service (metadatos, provenance)
- Evidence Lake Service (depósito de evidencia)
- GHL Service (Guideline Harmonization Layer)
- KBOL Service (Bill of Materials)
- Runbook Service (procedimientos clínicos)
- Readiness Service (compuertas de implementación)
- Case Control Service (orquestación de casos)
- Systemic Risk Service (análisis de riesgo sistémico)
- CQOI Service (Clinical Quality Outcome Intelligence)

**Paquetes compartidos:**
- canonical-types
- config
- contracts
- database
- logger
- security

---

## 2. PROBLEMA CRÍTICO: AUDIT-SERVICE

### 2.1. Síntoma

El script `start-icicso-mockup.ps1` falla al compilar `audit-service`.

**Error reportado (presunto):**
```
error TS2307: Cannot find module '@icicso/contracts' or its 
corresponding type declarations.
```

o

```
Type error in audit-service: auditEventInputSchema is not 
compatible with expected type.
```

### 2.2. Causa raíz diagnosticada

En `icicso-local/apps/audit-service/src/index.ts` línea ~25:

```typescript
const parsed = auditEventInputSchema.parse(await readJsonBody(request));
```

El schema está en `@icicso/contracts` → `block1.ts` → `auditEventInputSchema`.

**Problema real:** El esquema define campos que no coinciden con lo que la base de datos (`block1-store.ts`) espera.

En `block1-store.ts`:
- La función `appendAuditEvent()` espera: `eventType: AuditEventType`
- El tipo `AuditEventType` viene de `@icicso/canonical-types` (línea ~35)

En `contracts/block1.ts` línea ~13:
```typescript
export const auditEventTypeSchema = z.enum([
  "login",
  "login_failed",
  ...
]);
```

**DESALINEACIÓN DETECTADA:**

En `canonical-types/index.ts`, `AUDIT_EVENT_TYPES` define:
```typescript
export const AUDIT_EVENT_TYPES = [
  "login",
  "login_failed",
  "logout",
  "create_case",
  "read_case",
  "document.ingested",
  ...
] as const;
```

Pero en `contracts/block1.ts` el enum está duplicado y puede haberse divergido.

### 2.3. Verificación de la alineación

**Archivos a alinear:**
1. `icicso-local/packages/canonical-types/src/index.ts` → Define `AUDIT_EVENT_TYPES` como fuente de verdad
2. `icicso-local/packages/contracts/src/block1.ts` → Debe re-exportar desde canonical-types
3. `icicso-local/packages/database/src/block1-store.ts` → Debe importar desde canonical-types

### 2.4. Acción correctiva

1. Unified type source: `canonical-types` es la fuente única
2. `contracts/block1.ts` debe importar desde `canonical-types`
3. `database/block1-store.ts` ya importa correctamente
4. Recompilar y validar

---

## 3. ESTADO DE DOCKERIZACIÓN

### 3.1. Dockerfiles existentes

**En el repo:**
- ❌ Ningún Dockerfile individual por servicio en `icicso-local/apps/*/`
- ❌ Ningún Dockerfile en `icicso/apps/*/`
- ✅ `docker-compose.yml` en `icicso-local/` pero solo cubre **infraestructura**, no aplicaciones

### 3.2. Análisis de docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:     [✅ Base de datos]
  redis:        [✅ Cache]
  kafka:        [✅ Message broker]
  zookeeper:    [✅ Coordinador]
  minio:        [✅ Object storage]
  pgadmin:      [✅ Admin UI]
  kafka-ui:     [✅ Admin UI]
```

**FALTA:** Aplicaciones Node.js/TypeScript de los servicios ICICSO.

### 3.3. Readiness para multistage builds

**Tecnologías detectadas:**
- Node.js 20+ (servicios TypeScript)
- Python 3.11+ (semantic terminology engine)
- PostgreSQL 16
- Redis 7
- Kafka 7.5
- MinIO latest

**Estrategia recomendada:**
- **Multistage Node.js Dockerfile** para servicios (build + runtime alpine)
- **Separado Dockerfile Python** para engines
- **Compose.yml unificado** con perfiles de ejecución

---

## 4. ESTADO DE CI/CD

### 4.1. Infraestructura actual

- ❌ `.github/workflows/` no existe
- ❌ No hay lint, typecheck, test, build pipelines automatizados
- ❌ No hay validación de Dockerfile
- ❌ No hay Docker build cloud integration
- ❌ No hay tagging/versioning strategy

### 4.2. Readiness

**Requisitos presentes:**
- ✅ `pnpm` workspace setup completo
- ✅ `turbo` para builds distribuidos
- ✅ Test infrastructure (`test` scripts en package.json)
- ✅ TypeScript strict mode (probable)
- ✅ ESLint/Prettier en devDependencies

**Requisitos faltantes:**
- ❌ Convención de ramas (main, develop, feature/*, release/*)
- ❌ Git tags para versionado semántico
- ❌ Dockerfile validation en pipeline
- ❌ Docker build caching strategy
- ❌ SBOM generation
- ❌ Image scanning

---

## 5. DEUDA TÉCNICA

### 5.1. Duplicación de líneas técnicas

**Consecuencia:** Alto costo cognitivo, riesgo de trabajar en árbol equivocado.

| Árbol | Estatus | Acción |
|-------|---------|--------|
| `icicso/` | ✅ Canon, sano | Mantener, continuar construyendo |
| `icicso-local/` | 🟡 Runtime demo | Reparar, dockerizar, mantener activo |
| `services/ingestion-orquestador/` | ✅ Backend Python | Mantener, integrar con pipeline |
| `08_Plataforma_Digital/icicso-foundation/` | ❌ Roto | **DEPRECAR** - Referencias faltantes a shared-kernel |

### 5.2. Inconsistencias en packaging

- ✅ `pnpm-workspace.yaml` correcto en ambas raíces
- ✅ `tsconfig.json` presente
- ⚠️ Path aliases pueden no estar alineados entre monorepos
- ❌ No hay script uniforme para validar workspace health

### 5.3. Observaciones sobre icicso-foundation

**Estado:**
```
08_Plataforma_Digital/icicso-foundation/
├── apps/              [API y web reales planeados]
├── packages/          [Bounded contexts]
└── [Configuración]
```

**Problemas:**
- Import: `@icicso/shared-kernel` no encontrado
- TypeScript: Errores de tipado en bounded contexts
- Build: `pnpm build` falla
- Conclusión: Nunca llegó a madurez; mantenerla es deuda

**Recomendación:** Mover a `_archive/foundation-deprecation-v20260405/` con documentación de razones.

### 5.4. Servicios incompletos

**En icicso-local/apps:**
- Todos los servicios tienen `src/index.ts`
- Todos importan `@icicso/config` correctamente
- Todos tienen `package.json` y `tsconfig.json`
- ✅ No hay scaffolds rotos evidentes

**En icicso/:**
- `apps/api/` es mostly scaffold
- Mayoría de `packages/domain/*` están parcialmente implementados
- Esto es **aceptable** porque el canon es incremental

---

## 6. VARIABLES DE ENTORNO Y CONFIGURACIÓN

### 6.1. Estrategia actual

**Fuente de verdad:** `icicso-local/.env` (generado dinámicamente, no versionado)

**Ejemplo versionado:** `icicso-local/.env.example` está deprecado
**Nueva fuente propuesta:** `config/env/.env.local.example` (ver comentario en .env.example)

### 6.2. Variables detectadas

✅ Cubiertas:
- Puertos de servicios (todos los 16 servicios)
- URLs internas (gateway, servicios)
- Database (PostgreSQL URL)
- JWT (secret, issuer, audience, expires)
- Storage (MinIO)
- Logging (level)
- Node environment

⚠️ Parcialmente cubiertas:
- OTEL/Observability (presente pero no integrado en código)
- Kafka brokers (definido, no usado en servicios aún)

❌ Faltantes:
- Non-root user en contenedores (preparación)
- Secretos para Docker image scanning
- TLS/mTLS entre servicios (futuro)

---

## 7. SEGURIDAD

### 7.1. Hallazgos

**Buenas prácticas presentes:**
- ✅ JWT con secret configurado vía env
- ✅ RBAC (BaseRole enum)
- ✅ Correlation IDs para trazabilidad
- ✅ Audit logging (append-only con hashes)
- ✅ Healthchecks en servicios principales

**Gaps detectados:**
- ❌ Sin non-root user en contenedores futuros
- ❌ Sin minimización explícita de capas base
- ❌ Sin política de secretos documentada
- ❌ Sin SBOM generado
- ❌ Sin image scanning integrado en CI

### 7.2. Hardened Images readiness

**Actual:** Usará `node:20-alpine` u similar
**Candidato DHI:** `docker.io/docker/trusted-content/node:20-alpine`

Viabilidad: **ALTA** - Sin dependencias de sistema especiales detectadas.

---

## 8. RIESGOS RESIDUALES

| Riesgo | Severidad | Mitigation |
|--------|-----------|-----------|
| audit-service no compila | 🔴 CRÍTICO | Fix inmediato en FASE 2 |
| icicso-foundation sigue visible | 🟠 ALTO | Deprecar + mover a archive |
| Sin Docker individual services | 🟠 ALTO | Implementar en FASE 3 |
| Sin CI/CD | 🟠 ALTO | Implementar en FASE 4 |
| Duplicación config env | 🟡 MEDIO | Unificar en FASE 5 |
| Sin hardening base | 🟡 MEDIO | Implementar en FASE 7 |
| Sin SBOM/scanning | 🟡 MEDIO | Plan en FASE 7 |

---

## 9. READINESS PARA FASES SIGUIENTES

### 9.1. FASE 2: Reparación Runtime Local

**Bloqueadores:** Ninguno mayor. Requiere:
1. Fix audit-service type alignment
2. Validación de build completo
3. Ejecutar `start-icicso-mockup.ps1` exitosamente

**Esfuerzo:** ~1-2 horas

### 9.2. FASE 3: Dockerización

**Blockeadores:** Ninguno
**Requiere:**
1. 16 Dockerfiles por servicio (multistage)
1. 1 Dockerfile Python para engines
2. Actualizar docker-compose.yml
3. .dockerignore

**Esfuerzo:** ~4-6 horas

### 9.3. FASE 4: CI/CD

**Blockeadores:** Ninguno
**Requiere:**
1. GitHub Actions workflows (lint, test, build, docker)
2. Reusable workflows si aplica
3. Matriz para múltiples Node versions

**Esfuerzo:** ~3-4 horas

### 9.4. FASE 5: Limpieza

**Blockeadores:** Ninguno
**Requiere:**
1. Deprecation plan para icicso-foundation
2. Consolidación de config
3. Limpieza de caches problemáticos

**Esfuerzo:** ~2 horas

---

## 10. CONCLUSIONES Y PRÓXIMOS PASOS

### 10.1. Estado final esperado

Al completar las 8 fases:
- ✅ Runtime local totalmente funcional
- ✅ Servicios en contenedores reproducibles
- ✅ CI/CD enterprise-grade con GitHub Actions
- ✅ Deuda técnica minimizada
- ✅ Arquitectura documentada (diagramas, ADRs)
- ✅ Plan de migración a DHI claro
- ✅ Repo coherente, auditable, listo para evolución

### 10.2. Documento de trabajo

Este audit sirve como **LÍNEA BASE TÉCNICA**. Se actualizará al final de cada fase con estado real verificado.

---

## APÉNDICE A: Comandos actuales de verificación

```bash
# Canon
cd icicso && pnpm test

# Backend Python
py -m pytest services/ingestion-orquestador/tests -q

# Runtime local (ACTUALMENTE FALLA)
.\scripts\start-icicso-mockup.ps1

# Doctor
.\scripts\Invoke-ContinuumDoctor.ps1
```

---

**Documento de Auditoría finalizado.**  
**Proceder a FASE 2: Reparación Runtime Local**
