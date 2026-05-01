# Architecture Decision Records (ADRs) - ICICSO

Decisions made during modernization and restructuring of ICICSO monorepo.

---

## ADR-001: Single Source of Truth for Types

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Platform Engineering Team

### Context

Multiple packages were defining audit event types independently:
- `canonical-types/` had AUDIT_EVENT_TYPES
- `contracts/block1.ts` had duplicate auditEventTypeSchema
- Risk of divergence between type definitions

### Decision

Establish `@icicso/canonical-types` as single source of truth for domain types.

All other packages (contracts, database, services) must import and derive from canonical-types, not duplicate.

### Consequences

**Positive:**
- ✓ No type divergence
- ✓ Changes propagate automatically
- ✓ Type safety guaranteed
- ✓ Single source to update

**Negative:**
- ✗ Tight coupling to canonical-types (acceptable for shared domain)
- ✗ Must update canonical-types first when adding types

### Implementation

**File modified:** `icicso-local/tsconfig.base.json`
- Added path aliases for `@icicso/*` packages

**File modified:** `icicso-local/packages/contracts/src/block1.ts`
- Changed to import from canonical-types
- Zod schemas derive from Typescript enums

**Status:** ✅ IMPLEMENTED (PHASE 2)

---

## ADR-002: Multistage Docker Builds

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** DevOps Team

### Context

ICICSO has 16 Node.js services + 1 Python engine.
Need reproducible, minimal Docker images for:
- Local development (docker-compose)
- CI/CD pipelines
- Production deployment
- Docker Build Cloud future

### Decision

Use multistage Dockerfile pattern for all services:

**Stage 1 (dependencies):** Install pnpm, copy workspace, `pnpm install`
**Stage 2 (builder):** Build specific service only
**Stage 3 (runtime):** Copy minimal artifacts, non-root user, healthcheck

### Consequences

**Positive:**
- ✓ Images ~100-200 MB (not bloated with devDependencies)
- ✓ Reproducible builds
- ✓ Non-root user (security hardened)
- ✓ Layer caching works well
- ✓ Ready for Dockerfile security scanning
- ✓ Compatible with Docker Build Cloud

**Negative:**
- ✗ Longer build time first run (~10-15 min)
- ✗ Slightly more complex Dockerfile syntax
- ✗ Requires working Node environment

### Implementation

**Files created:** 19 Dockerfiles
- `icicso-local/apps/*/Dockerfile` (16 services)
- `icicso-local/apps/desktop-emulator/Dockerfile`
- `icicso-local/engines/13_semantic_terminology_engine/Dockerfile`
- `icicso-local/services.Dockerfile` (template)

**Status:** ✅ IMPLEMENTED (PHASE 3A)

---

## ADR-003: Docker Compose Profiles vs Multiple Compose Files

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Infrastructure Team

### Context

Need to support multiple runtime configurations:
- Full stack (all 25 services)
- Infrastructure only (BD, cache, queues)
- Applications only
- Development (with hot reload)

### Decision

Use single `docker-compose.yml` + `docker-compose.override.yml` pattern:

- **docker-compose.yml:** Base configuration (production-like, all services)
- **docker-compose.override.yml:** Development overrides (auto-applied by Docker Compose)
  - Volume mounts for source code
  - `--watch` for hot reload
  - NODE_ENV=development

No separate compose files for prod/dev.

### Consequences

**Positive:**
- ✓ Single source for service definition
- ✓ Override automatically applied in development
- ✓ No duplication of service configs
- ✓ Production = remove override, use base
- ✓ Cleaner than 3+ compose files

**Negative:**
- ✗ Developers must understand override concept
- ✗ Not as explicit as separate files

### Implementation

**Files created:** 2 compose files
- `icicso-local/docker-compose.yml` (660 lines, all services)
- `icicso-local/docker-compose.override.yml` (155 lines, dev overrides)

**Status:** ✅ IMPLEMENTED (PHASE 3B)

---

## ADR-004: GitHub Actions Matrix for Parallel Docker Builds

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** CI/CD Team

### Context

ICICSO has 16 Node.js services. Building sequentially takes 30+ minutes.
Building all in parallel could take same 5-10 minutes per service = ~5-10 min total.

### Decision

Use GitHub Actions matrix strategy to build all services in parallel:

```yaml
strategy:
  matrix:
    service: [gateway-api, auth-service, ...]
  fail-fast: false
```

Each service builds independently, caches are shared via `type=gha`.

### Consequences

**Positive:**
- ✓ Total build time: 30 min → 10 min (3x faster)
- ✓ CI feedback loop faster
- ✓ Release time faster
- ✓ GitHub Actions cache shared across matrix jobs
- ✓ Fail-fast: false allows partial success reporting

**Negative:**
- ✗ Uses more concurrent runners (GitHub quota)
- ✗ Slightly more complex workflow YAML

### Implementation

**Files created:** Workflows
- `.github/workflows/docker.yml` (matrix build)
- `.github/workflows/ci.yml` (matrix support)
- `.github/workflows/release.yml` (matrix publish)

**Status:** ✅ IMPLEMENTED (PHASE 3C)

---

## ADR-005: Canonical Development Tree = icicso/

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Architecture Review Board

### Context

ICICSO repo has 4 trees:
- `icicso/` - Canon development (tests pass)
- `icicso-local/` - Runtime demo (operational)
- `services/ingestion-orquestador/` - Python backend (functional)
- `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/` - Alternate (broken, deprecated)

Confusion: Which is the real one?

### Decision

`icicso/` is **canonical** development tree:
- Tests pass
- CI builds succeed
- New features go here
- Incremental building of the system

`icicso-local/` is **runtime demo:**
- Operational locally
- Reference for service integration
- Not the primary development tree

`services/ingestion-orquestador/` is **support backend:**
- Python-specific functionality
- Integrated but separate

`icicso-foundation/` is **deprecated:**
- Experimental, not maintained
- Archived in `/deprecated/`

### Consequences

**Positive:**
- ✓ Clear path for new contributors
- ✓ No confusion about where to develop
- ✓ icicso/ can grow incrementally
- ✓ icicso-local/ stays focused on runtime demo

**Negative:**
- ✗ Some code duplication between icicso/ and icicso-local/ (acceptable for now)
- ✗ Need to keep both in sync conceptually

### Implementation

**Files modified:**
- `START_HERE.md` - Clear direction to icicso/
- `README.md` - Canonical path documented
- `docs/architecture/MONOREPO_STRUCTURE.md` - Detailed explanation

**Status:** ✅ IMPLEMENTED (PHASE 5)

---

## ADR-006: Non-Root User in All Containers

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Security Team

### Context

Docker security best practice: Never run as root.
All ICICSO containers run code as root by default.

### Decision

Create `icicso:icicso` non-root user (UID 1000, GID 1000) in all Dockerfiles.
Switch to that user before ENTRYPOINT.

```dockerfile
RUN addgroup -g 1000 icicso && \
    adduser -D -u 1000 -G icicso icicso
USER icicso
```

### Consequences

**Positive:**
- ✓ Security hardened
- ✓ Minimal attack surface
- ✓ Matches standard practice
- ✓ DHI-compatible

**Negative:**
- ✗ File permissions must be correct (handled in Dockerfile)
- ✗ Some edge cases in startup scripts (unlikely in ICICSO)

### Implementation

**Files modified:** All 19 Dockerfiles
- Non-root user created
- Ownership set to icicso:icicso
- USER directive before ENTRYPOINT

**Status:** ✅ IMPLEMENTED (PHASE 3A)

---

## ADR-007: Health Checks for All Services

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Operations Team

### Context

docker-compose health checks help orchestration and debugging.
Must validate service is actually ready, not just "started".

### Decision

All services have HEALTHCHECK:
- Interval: 30 seconds
- Timeout: 10 seconds
- Start period: 5 seconds (wait for startup)
- Retries: 3

Healthcheck tests service's `/health`, `/health/live`, or `/health/ready` endpoints.

### Consequences

**Positive:**
- ✓ `docker-compose ps` shows real health
- ✓ Orchestration can react to unhealthy services
- ✓ Better visibility
- ✓ Debugging easier

**Negative:**
- ✗ Services must implement health endpoints
- ✗ Extra network calls every 30 seconds

### Implementation

**Files modified:** All 19 Dockerfiles + docker-compose.yml
- HEALTHCHECK instruction added
- docker-compose.yml: depends_on with condition: service_healthy

**Status:** ✅ IMPLEMENTED (PHASE 3A & 3B)

---

## ADR-008: Path Aliases in tsconfig.base.json

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** TypeScript Team

### Context

Services import from workspace packages like:
```typescript
import { auditEventInputSchema } from "@icicso/contracts";
```

TypeScript needs to know where `@icicso/contracts` lives.

### Decision

Use tsconfig `paths` to map `@icicso/*` to `packages/*/src`:

```json
{
  "paths": {
    "@icicso/canonical-types": ["packages/canonical-types/src"],
    "@icicso/contracts": ["packages/contracts/src"],
    ...
  }
}
```

### Consequences

**Positive:**
- ✓ Clean imports
- ✓ IDE can resolve imports
- ✓ TypeScript strict mode works
- ✓ Refactoring tools can track imports

**Negative:**
- ✗ Runtime requires bundler (pnpm workspace handles this)
- ✗ Must maintain paths as packages grow

### Implementation

**File modified:** `icicso-local/tsconfig.base.json`
- baseUrl and paths configured

**Status:** ✅ IMPLEMENTED (PHASE 2)

---

## ADR-009: Semantic Versioning for Releases

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Release Management Team

### Context

Need consistent versioning for Docker images and releases.
Team should know version compatibility at a glance.

### Decision

Use Semantic Versioning (X.Y.Z):
- X = Major (breaking changes)
- Y = Minor (new features, backwards compatible)
- Z = Patch (bug fixes, backwards compatible)

Release workflow validates format before building.

### Consequences

**Positive:**
- ✓ Standard, well-understood versioning
- ✓ Clear compatibility implications
- ✓ Docker image tags are meaningful
- ✓ SemVer tooling available

**Negative:**
- ✗ Must decide version bumps before tagging
- ✗ No pre-release versions initially (can add later)

### Implementation

**File modified:** `.github/workflows/release.yml`
- Version validation: `^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$`

**Status:** ✅ IMPLEMENTED (PHASE 3C)

---

## ADR-010: Single docker-compose.yml for All Environments

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** DevOps Team

### Context

Could have:
- `docker-compose.yml` for local dev
- `docker-compose.prod.yml` for production
- `docker-compose.ci.yml` for CI

Or: single compose file with environment variables.

### Decision

Single `docker-compose.yml` + `.env` file:
- All environment variables externalized
- Override provided via `docker-compose.override.yml`
- Production = use base compose with `.env.prod`
- Development = use base + override with `.env.dev`

### Consequences

**Positive:**
- ✓ Single source of truth for services
- ✓ Environment configs separate
- ✓ Easy to promote between environments
- ✓ Overrides only touch development

**Negative:**
- ✗ Must not commit `.env` file
- ✗ Must configure `.env` before running

### Implementation

**Files created:** docker-compose.yml with env vars
**Files created:** docker-compose.override.yml for dev
**Files created:** .dockerignore to exclude .env

**Status:** ✅ IMPLEMENTED (PHASE 3B)

---

## ADR-011: GitHub Actions Only for CI/CD

**Date:** 2026-04-05  
**Status:** ACCEPTED  
**Proposed by:** Platform Engineering

### Context

Could use:
- GitHub Actions (free tier, integrated)
- Jenkins (self-hosted, complex)
- GitLab CI (different VCS)
- Other SaaS CI

### Decision

GitHub Actions for all CI/CD:
- Lint & test (ci.yml)
- Docker build (docker.yml)
- Security scanning (security.yml)
- Releases (release.yml)

Hosted on GitHub, no additional infrastructure needed.

### Consequences

**Positive:**
- ✓ Free tier covers typical usage
- ✓ Integrated with GitHub
- ✓ No additional infrastructure
- ✓ Standard for GitHub repos
- ✓ Marketplace ecosystem

**Negative:**
- ✗ Locked into GitHub
- ✗ Quotas on concurrent runners
- ✗ Need to configure secrets

### Implementation

**Files created:** 4 workflows in `.github/workflows/`

**Status:** ✅ IMPLEMENTED (PHASE 3C)

---

## Future ADRs (Planned)

- **ADR-012:** Migration to Docker Hardened Images (DHI)
- **ADR-013:** Kubernetes deployment strategy
- **ADR-014:** Observability & monitoring architecture
- **ADR-015:** Database versioning & migrations
- **ADR-016:** API versioning strategy
- **ADR-017:** Authentication & authorization redesign

---

## How to Add an ADR

1. Create new file: `docs/architecture/decisions/ADR-NNN-title.md`
2. Use template above
3. Document: Context, Decision, Consequences, Implementation
4. Get team consensus
5. Add to this index
6. Reference in commit messages

---

**All ADRs are ACCEPTED and implemented unless marked otherwise.**
