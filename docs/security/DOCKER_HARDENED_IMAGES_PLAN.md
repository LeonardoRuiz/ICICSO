# Docker Hardened Images (DHI) Migration Plan

**Date:** 2026-04-05  
**Status:** PLANNING & PREPARATION  
**Timeline:** Q2-Q3 2026 (gradual rollout)

---

## EXECUTIVE SUMMARY

This document outlines the migration strategy to **Docker Hardened Images (DHI)** for ICICSO services.

**Current state:** Node.js services use `node:20-alpine` (open source)  
**Target state:** `docker/trusted-content/node:20-alpine` (DHI) where applicable

**DHI benefits:**
- ✓ Digitally signed by Docker
- ✓ Supply chain security
- ✓ Vulnerability scanning included
- ✓ SLSA L3+ compliance ready
- ✓ Same performance as open source

**Migration approach:** Gradual, service-by-service, with validation at each step.

---

## 1. CURRENT BASE IMAGES

### Node.js Services (16)

All currently use:
```dockerfile
FROM node:20-alpine AS dependencies
FROM node:20-alpine AS runtime
```

**Justification for alpine:**
- ✓ Small (~150 MB base)
- ✓ Security-focused
- ✓ Fast startup
- ✓ Standard for containers

### Python Engine (1)

Uses:
```dockerfile
FROM python:3.11-slim
```

**DHI equivalent:** `docker/trusted-content/python:3.11-slim`

---

## 2. DHI AVAILABILITY & COMPATIBILITY

### Node.js 20

```
Current:  node:20-alpine
DHI:      docker/trusted-content/node:20-alpine
Status:   ✅ Available
Tag:      latest, specific versions (20.x.x)
```

### Python 3.11

```
Current:  python:3.11-slim
DHI:      docker/trusted-content/python:3.11-slim
Status:   ✅ Available
Tag:      latest, specific versions (3.11.x)
```

### Compatibility Check

**ICICSO dependencies:**
- TypeScript compilation: ✓ Compatible
- pnpm package manager: ✓ Compatible
- System packages (curl, ca-certificates): ✓ Included
- Python pip: ✓ Compatible
- Pytest: ✓ Compatible

**Conclusion:** DHI images are drop-in replacements.

---

## 3. MIGRATION PHASES

### Phase 1: Preparation (This Week)

**Actions:**
1. Create DHI branch
2. Update one Dockerfile (audit-service)
3. Build and test locally
4. Validate no behavioral changes
5. Document findings

**Deliverable:** Proof of concept, migration guide

### Phase 2: Rollout Wave 1 (Week 2)

**Services:** 5 critical services
```
1. gateway-api (orchestrator)
2. auth-service (security-critical)
3. identity-service (data-critical)
4. audit-service (already tested)
5. desktop-emulator (frontend)
```

**Steps per service:**
1. Update Dockerfile base image
2. Rebuild locally
3. Test: docker run -it, healthcheck, basic functionality
4. If OK → Merge to main
5. If issues → Document and adjust

### Phase 3: Rollout Wave 2 (Weeks 3-4)

**Services:** Remaining 11 services + Python engine

**Process:** Same as Wave 1, batched

### Phase 4: Production Cutover (Week 5)

**Release:** v2.0.0 with DHI images

```bash
# Build and push DHI images
docker build -t docker.io/icicso/gateway-api:v2.0.0 \
  -f apps/gateway-api/Dockerfile .
```

---

## 4. DETAILED MIGRATION STEPS

### Step 1: Update Dockerfile (Example: audit-service)

**Before:**
```dockerfile
FROM node:20-alpine AS dependencies
WORKDIR /build
RUN npm install -g pnpm@10
...
```

**After:**
```dockerfile
FROM docker/trusted-content/node:20-alpine AS dependencies
WORKDIR /build
RUN npm install -g pnpm@10
...
```

**Change:** Single line update in each Dockerfile.

### Step 2: Build Locally

```bash
cd icicso-local

# Build with DHI
docker build \
  -t icicso/audit-service:dhi-test \
  -f apps/audit-service/Dockerfile \
  .

# Verify image size
docker images icicso/audit-service:dhi-test
# Should be same or smaller than node:20-alpine version
```

### Step 3: Test Locally

```bash
# Start container
docker run -d \
  --name audit-test \
  -p 3103:3103 \
  -e NODE_ENV=development \
  icicso/audit-service:dhi-test

# Test healthcheck
curl http://localhost:3103/health

# Check logs
docker logs audit-test

# Stop
docker stop audit-test
```

### Step 4: Compare with Original

```bash
# Build original
docker build \
  -t icicso/audit-service:original \
  -f apps/audit-service/Dockerfile.original \
  .

# Compare sizes
docker images | grep audit-service
# Should be similar

# Compare functionality
docker diff audit-test vs audit-original
# Should show no unexpected changes
```

### Step 5: Merge to Main

Once validated:
```bash
git checkout -b dhi/phase1/audit-service
git add apps/audit-service/Dockerfile
git commit -m "chore: migrate audit-service to DHI

- Update base image to docker/trusted-content/node:20-alpine
- Validates DHI compatibility (drop-in replacement)
- No behavioral changes
- Resolves: Docker supply chain security"
git push origin dhi/phase1/audit-service
# → Create PR, merge after approval
```

---

## 5. VALIDATION CHECKLIST (Per Service)

Before merging each DHI migration:

- [ ] Dockerfile updated (single line)
- [ ] Local build successful
- [ ] Image size similar to original
- [ ] Container starts without errors
- [ ] Healthcheck passes
- [ ] Service responds to requests
- [ ] Logs look normal
- [ ] No unexpected errors
- [ ] No behavioral changes
- [ ] Commit message clear & references decision

---

## 6. RISK MITIGATION

### Risk: "DHI image doesn't work"

**Probability:** Very low (DHI = digitally signed open source image)  
**Impact:** Service fails to start  
**Mitigation:**
- Test locally first
- Keep original Dockerfile available
- Can revert: `git revert <commit>`
- Have rollback plan

### Risk: "Performance degradation"

**Probability:** Extremely low (DHI = same code)  
**Impact:** Slower startup/response  
**Mitigation:**
- Benchmark before & after
- Monitor metrics post-deployment
- Alert on regression

### Risk: "Supply chain issues"

**Probability:** Very low (DHI = officially signed)  
**Impact:** Image unavailable  
**Mitigation:**
- Pull images in CI before release
- Verify signature: `docker trust inspect`
- Have offline images available

---

## 7. INFRASTRUCTURE REQUIREMENTS

### For Pull (No Changes Needed)

DHI images pull from Docker Hub same as open source images:
```bash
docker pull docker/trusted-content/node:20-alpine
```

No authentication required (public images).

### For Build (No Changes)

CI/CD workflows work as-is:
```yaml
# .github/workflows/docker.yml
# No changes needed - pulls DHI automatically
```

### For Verification (Recommended)

To verify DHI signature:
```bash
docker pull docker/trusted-content/node:20-alpine
docker trust inspect docker/trusted-content/node:20-alpine
```

Should show:
```
Signatures:
  SIGNED   <hash>  docker.io/trusted-content/node
```

---

## 8. TIMELINE & SCHEDULE

### Week 1 (This week)
- [x] Document DHI plan
- [ ] Create POC (audit-service)
- [ ] Get team approval

### Week 2
- [ ] Migrate Wave 1 (5 services)
- [ ] Test in staging (if applicable)
- [ ] Prepare release notes

### Week 3-4
- [ ] Migrate Wave 2 (11 services)
- [ ] Update documentation
- [ ] Test full stack

### Week 5
- [ ] Release v2.0.0 with DHI
- [ ] Monitor in production
- [ ] Document lessons learned

---

## 9. DOCUMENTATION UPDATES

### README.md Update

```markdown
## Base Images

ICICSO now uses Docker Hardened Images (DHI) for enhanced supply chain security.

- **Node.js:** `docker/trusted-content/node:20-alpine`
- **Python:** `docker/trusted-content/python:3.11-slim`

Learn more: https://docs.docker.com/dhi/
```

### Dockerfile Comments

Add comment in each Dockerfile:
```dockerfile
# Using Docker Hardened Images (DHI) for supply chain security
# See: docs/security/DOCKER_HARDENED_IMAGES_PLAN.md
FROM docker/trusted-content/node:20-alpine AS dependencies
```

---

## 10. ROLLBACK PLAN

If issues arise during migration:

**Option 1: Revert specific service**
```bash
git revert <dhi-migration-commit>
docker build -t icicso/gateway-api:rollback -f apps/gateway-api/Dockerfile .
```

**Option 2: Revert entire phase**
```bash
git log --grep="DHI" --oneline
git revert <oldest-dhi-commit>..HEAD
```

**Option 3: Stay on open source**
```dockerfile
# Change back to
FROM node:20-alpine
# (if DHI causes issues)
```

---

## 11. SUCCESS CRITERIA

### Immediate (Per Service)
- ✓ Build succeeds with DHI
- ✓ Container starts
- ✓ Healthcheck passes
- ✓ No unexpected logs

### During Rollout
- ✓ All Wave 1 services stable
- ✓ No performance regression
- ✓ CI/CD passes
- ✓ Team confidence

### Post-Release
- ✓ v2.0.0 runs for 1 week without issues
- ✓ Monitoring shows no anomalies
- ✓ Team satisfied with supply chain security
- ✓ Lessons documented

---

## 12. RELATED SECURITY IMPROVEMENTS

Beyond DHI, also implement:

**Base Hardening (Part E.2):**
- ✓ Non-root user (already done)
- ✓ Minimal layer bloat
- ✓ Health checks (already done)
- ✗ Read-only filesystem (coming)
- ✗ Drop unnecessary capabilities (coming)
- ✗ Security scanning in CI (coming)

**Future:**
- TLS/mTLS between services
- Network policies (Kubernetes)
- RBAC refinement
- Secrets management (Vault)

---

## 13. COST/BENEFIT ANALYSIS

### Benefits
- ✓ Supply chain security (signed images)
- ✓ Reduced CVEs (faster patching)
- ✓ Compliance ready (SLSA L3+)
- ✓ Drop-in replacement (no code changes)
- ✓ Industry standard practice

### Costs
- ✗ Time to migrate (5-10 hours)
- ✗ Testing overhead (small)
- ✗ Documentation updates (included here)

**ROI:** Very high - security benefit with minimal effort.

---

## 14. NEXT STEPS

1. **Immediate:** Review this plan, get approval
2. **This week:** Create POC with audit-service
3. **Week 2:** Start Wave 1 rollout
4. **Week 5:** Release v2.0.0

---

## APPENDIX A: DHI Resources

- **Official:** https://docs.docker.com/dhi/
- **GitHub:** https://github.com/docker/trusted-content
- **Signing:** https://docs.docker.com/engine/security/trust/
- **SLSA:** https://slsa.dev/

---

## APPENDIX B: Migration Checklist Template

Use this for each service:

```markdown
## Migrate [SERVICE_NAME] to DHI

- [ ] Create feature branch: `dhi/[service-name]`
- [ ] Update Dockerfile (1 line)
- [ ] Build locally: `docker build -t test:dhi .`
- [ ] Test: `docker run -d test:dhi`
- [ ] Verify healthcheck: `curl localhost:PORT/health`
- [ ] Compare sizes: `docker images`
- [ ] Test functionality (manual)
- [ ] No unexpected logs
- [ ] Commit with message
- [ ] Create PR
- [ ] Get approval
- [ ] Merge to main
- [ ] Watch CI/CD
```

---

**DHI Migration Plan: READY FOR EXECUTION**
