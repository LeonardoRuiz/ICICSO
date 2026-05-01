# ICICSO System Architecture

Complete system overview, topology, and design documentation.

---

## 1. System Overview

ICICSO is a **distributed clinical decision support platform** implemented as a modular monorepo with containerized microservices.

### Core Purpose

Process clinical evidence through a 15-stage continuum:
```
Ingestion → SER → EO → Evidence Lake → Translation → Uncertainty
    ↓
Guideline Hub → CPO → BOM → Temporal → Event Trigger → Readiness
    ↓
Clinical Pathway → Case Control → Evidence Snapshot → CQOI → Governance
```

### Technology Stack

```
Runtime:     Node.js 20 (TypeScript) + Python 3.11
Databases:   PostgreSQL 16
Cache:       Redis 7
Messaging:   Kafka 7.5
Storage:     MinIO
Orchestration: Docker Compose (local), Kubernetes (future)
CI/CD:       GitHub Actions
```

---

## 2. Monorepo Structure

```
ICICSO/
├── icicso/                          [✅ CANONICAL Development]
│   ├── apps/
│   │   ├── api/                    [Scaffold]
│   │   └── emulator/               [Functional]
│   ├── packages/
│   │   ├── domain/                 [Ingest, SER, EO, Evidence Lake, etc.]
│   │   ├── engines/
│   │   ├── execution/
│   │   ├── integration/
│   │   ├── intelligence/
│   │   ├── operations/
│   │   ├── shared-kernel/
│   │   └── simulation/
│   └── services/
│
├── icicso-local/                    [✅ RUNTIME Demo]
│   ├── apps/                        [16 working services]
│   │   ├── gateway-api:3100
│   │   ├── auth-service:3101
│   │   ├── identity-service:3102
│   │   ├── audit-service:3103
│   │   ├── [12 more services]
│   │   └── desktop-emulator:8090
│   ├── packages/                    [Shared libraries]
│   │   ├── canonical-types
│   │   ├── config
│   │   ├── contracts
│   │   ├── database
│   │   ├── logger
│   │   └── security
│   ├── engines/                     [Python]
│   │   └── 13_semantic_terminology_engine:8000
│   └── docker-compose.yml           [Complete stack]
│
├── services/
│   └── ingestion-orquestador/       [✅ Python Backend]
│
├── deprecated/                       [Archive]
│   └── foundation-archive-20260405/ [Old experimental code]
│
└── .github/
    └── workflows/                   [CI/CD]
        ├── ci.yml
        ├── docker.yml
        ├── security.yml
        └── release.yml
```

---

## 3. Service Topology (Docker Network)

```
┌─────────────────────────────────────────────────────────────┐
│              Docker Network: icicso-network                 │
│                    172.20.0.0/16                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐            ┌─────────────────────┐   │
│  │ Desktop Emulator │            │  Kafka-UI (UI)      │   │
│  │    :8090         │            │     :8080           │   │
│  └────────┬─────────┘            └─────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Gateway API (Reverse Proxy & Mux)           │  │
│  │                :3100                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│           ▲                                                  │
│           │                                                  │
│    ┌──────┴──────┬────────┬────────┬─────────┐             │
│    │             │        │        │         │             │
│    ▼             ▼        ▼        ▼         ▼             │
│  ┌────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │Auth│ │Ident.│ │Audit │ │Stor. │ │Gest. │ ...         │
│  │3101│ │3102  │ │3103  │ │3107  │ │3110  │             │
│  └────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│                     (16 services total)                     │
│                                                              │
│  All connect to shared infrastructure:                      │
│  ┌──────────────┬──────────────┬─────────────┐             │
│  │ PostgreSQL   │ Redis        │ Kafka       │ MinIO       │
│  │    :5432     │   :6379      │  :9092      │ :9000       │
│  └──────────────┴──────────────┴─────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Service Blocks & Responsibilities

### Block 1: Identity & Authentication
```
gateway-api (3100)        - Reverse proxy, service orchestration
├─ auth-service (3101)    - Login, JWT, session management
├─ identity-service (3102) - Longitudinal identities, cases, episodes
└─ audit-service (3103)   - Immutable audit logs, event trails
```

### Block 2: Data Ingestion & Governance
```
storage-service (3107)         - Document storage, retrieval
├─ ingestion-service (3108)    - Ingest pipelines, data processing
├─ terminology-service (3109)  - Canonical terminology, mappings
└─ data-governance-service (3110) - Provenance, lineage, certification
```

### Block 3: Evidence Lake
```
evidence-lake-service (3104)   - Evidence repository, queries
```

### Block 5: Guideline Hub & Clinical Objects
```
ghl-service (3105)        - Guideline Harmonization Layer
└─ kbol-service (3106)    - Bill of Materials, components
```

### Block 6: Runbooks & Readiness
```
runbook-service (3111)      - Clinical procedures, workflows
├─ readiness-service (3112) - Implementation readiness gates
└─ case-control-service (3113) - Case orchestration
```

### Block 7 & 8: Control & Analysis
```
systemic-risk-service (3114)  - Systemic risk analysis
├─ cqoi-service (3115)        - Clinical Quality Outcome Intelligence
└─ [Future: CAE, ESL, Drift]
```

### Frontend & AI
```
desktop-emulator (8090)        - HTML5 UI (demo)
semantic-terminology-engine (8000) - Python ML/NLP
```

---

## 5. Data Flow Example: Case Creation

```
User
  │
  ▼
┌────────────────────────────────────┐
│     POST /identity/cases           │
│     (via desktop-emulator)         │
└────────────────┬───────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Gateway API  │ Routes request
         │ :3100        │
         └──────┬───────┘
                │
                ▼
         ┌──────────────────┐
         │ Identity Service │ Creates case, links to ILC
         │ :3102            │
         └────────┬─────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
   ┌─────────┬──────────┬──────────┐
   │ Audit   │ Storage  │ Database │
   │ Service │ Service  │ Store    │
   │ :3103   │ :3107    │ (Events) │
   └─────────┴──────────┴──────────┘
      │           │          │
      │           │          ▼
      │           │      PostgreSQL :5432
      │           │      - cases table
      │           │      - identities table
      │           │
      │           ▼
      │        MinIO :9000
      │        - case metadata
      │
      ▼
   File: .data/block1-store.json
   - Case record with hash chain
   - Audit events appended
   - Ready for governance

Response: 201 Created { caseId, createdAt, auditEventId }
```

---

## 6. Dependency Graph

### Build Order (pnpm workspace)

```
Layer 0 (No dependencies):
  └─ canonical-types

Layer 1 (Depends on Layer 0):
  ├─ contracts
  ├─ config
  └─ security

Layer 2 (Depends on Layers 0-1):
  ├─ database (→ contracts, canonical-types)
  ├─ logger
  └─ [other packages]

Layer 3 (Depends on Layers 0-2):
  └─ Individual services (audit-service, etc.)
     Each imports from multiple packages
```

### Runtime Dependencies

```
gateway-api
  ↓ depends_on (healthy)
  ├─ auth-service
  ├─ identity-service
  ├─ audit-service
  ├─ [all 16 services]
  ├─ PostgreSQL
  ├─ Redis
  └─ Kafka

Each service
  ↓ depends_on (healthy)
  ├─ PostgreSQL
  ├─ Redis (optional)
  └─ [any other service it needs]
```

---

## 7. Deployment Models

### Local Development

```bash
cd icicso-local
docker-compose up -d

# Services run with:
# - Hot reload (--watch)
# - Volume mounts (./ to /app/src)
# - Development logging
# - All 25 services + infrastructure
```

### Docker Compose (Production-like)

```bash
docker-compose -f icicso-local/docker-compose.yml up -d

# Services run immutable images:
# - No code changes possible
# - Full isolation
# - Reproducible behavior
# - All healthchecks pass
```

### Kubernetes (Future)

```yaml
# Planned:
# - Deployment per service
# - ConfigMaps for config
# - Secrets for credentials
# - Services for networking
# - StatefulSets for databases
```

---

## 8. Data Persistence

```
Volumes:
  postgres_data      → /var/lib/postgresql/data
                       Persistent database
  
  redis_data         → /data
                       In-memory cache (ephemeral OK)
  
  minio_data         → /data
                       Object storage (persistent)
  
  .data/ (local)     → .data/block1-store.json
                       In-memory JSON store (dev only)
```

**Persistence Strategy:**
- Production: PostgreSQL (primary source of truth)
- Cache: Redis (ephemeral, recreatable)
- Files: MinIO (S3-compatible)
- Audit: JSON file + PostgreSQL (immutable append log)

---

## 9. Security Architecture

```
┌─────────────────────────────────────┐
│  User/Client (browser, API client)  │
└────────────────┬────────────────────┘
                 │
                 ▼
          ┌──────────────┐
          │ TLS/HTTPS    │
          │ (future)     │
          └──────┬───────┘
                 │
                 ▼
         ┌──────────────────┐
         │   Gateway API    │
         │ - CORS handling  │
         │ - Rate limiting  │
         │ - Logging        │
         └─────────┬────────┘
                   │
                   ▼
         ┌──────────────────┐
         │  Auth-Service    │
         │ - JWT validation │
         │ - Session mgmt   │
         │ - RBAC check     │
         └────────┬─────────┘
                  │
     ┌────────────┼────────────┐
     │ Allowed    │ Forbidden  │ Audit Log
     ▼            ▼            ▼
  Service      Error 403    audit-service
```

**Current Security:**
- ✓ JWT-based auth
- ✓ RBAC (roles: admin, clinician, auditor, etc.)
- ✓ Non-root containers
- ✓ Immutable audit logs
- ✗ TLS/mTLS (not yet)
- ✗ Network policies (not yet)

---

## 10. Observability

```
┌──────────────────────────────────────┐
│          All Services                │
│  - JSON structured logging (stdout)  │
│  - Correlation IDs (X-Correlation-Id)│
│  - Request tracing (traceparent)     │
│  - Metrics (/metrics endpoint)       │
└──────────────────────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
  Logs        Metrics      Traces
   │             │           │
   ├─ Stdout     ├─ Prometheus ├─ Jaeger/Tempo
   ├─ docker logs├─ Grafana    │
   │             │             │
   └─────────────┴─────────────┘
        (Setup for future)
```

**Currently implemented:**
- ✓ Structured JSON logging
- ✓ Correlation IDs
- ✓ Healthchecks
- ✗ Metrics collection
- ✗ Distributed tracing

---

## 11. CI/CD Pipeline

```
┌─────────────────┐
│  Git Push/Tag   │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌────────────┐               ┌────────────────────┐
    │   CI       │               │ Docker Build       │
    │ (ci.yml)   │               │ (docker.yml)       │
    │            │               │                    │
    │ - Lint     │               │ - 16 services      │
    │ - Test     │               │   (matrix)         │
    │ - Typecheck│               │ - Validate         │
    │            │               │ - Cache            │
    └──────┬─────┘               └────────┬───────────┘
           │                              │
           ├──────────────────────────────┤
           │                              │
           ▼                              ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ Security         │        │ Release          │
    │ (security.yml)   │        │ (release.yml)    │
    │                  │        │                  │
    │ - Scan code      │        │ If tag v*:       │
    │ - Check deps     │        │ - Validate ver.  │
    │ - CodeQL         │        │ - Push to Hub    │
    │ - TruffleHog     │        │ - GitHub Release │
    └──────────────────┘        └──────────────────┘
           │                              │
           └──────────────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ GitHub UI Status │
            │ ✅ All checks OK │
            │ Ready to deploy  │
            └──────────────────┘
```

---

## 12. Scalability Considerations

### Current State (Local)
- Single machine
- Docker Compose
- Shared PostgreSQL
- Suitable for: Development, demos, testing

### Near Term (Kubernetes)
- Multiple replicas per service
- Load balancing
- StatefulSets for databases
- Network policies
- Resource limits
- Horizontal scaling

### Future
- Multi-region deployment
- Database replication
- Cache clusters
- Message queue redundancy
- CDN for static assets

---

## 13. Architecture Decision Log

See `docs/architecture/DECISIONS_ADR.md` for:
- ADR-001: Single source of truth for types
- ADR-002: Multistage Docker builds
- ADR-003: Docker Compose patterns
- ADR-004: GitHub Actions matrix
- ... and 7 more ADRs

---

## 14. Technology Rationale

| Technology | Choice | Rationale |
|-----------|--------|-----------|
| Node.js 20 | TypeScript | Type safety, rapid development |
| PostgreSQL 16 | SQL DB | ACID guarantees, proven reliability |
| Redis 7 | Cache | Sub-millisecond lookups |
| Kafka 7.5 | Event stream | Audit trail, event sourcing capable |
| Docker | Containerization | Reproducibility, deployment flexibility |
| Docker Compose | Orchestration (dev) | Simple, local-friendly |
| GitHub Actions | CI/CD | Integrated, free tier sufficient |

---

## References

- `docs/audit/RUNTIME_DOCKER_AUDIT.md` - Audit findings
- `docs/ci-cd/GITHUB_ACTIONS_GUIDE.md` - CI/CD details
- `icicso-local/DOCKER_COMPOSE_USAGE.md` - Operational guide
- Source: `PHASE A, B, C` implementation docs
