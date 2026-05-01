# GitHub Actions CI/CD Workflows - ICICSO

Complete guide to ICICSO CI/CD pipelines on GitHub Actions.

---

## Workflows Overview

### 1. **CI (ci.yml)** - Code Quality & Testing

**Triggers:**
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main`, `develop`

**Jobs:**
- **Lint** - ESLint on TypeScript/JavaScript
- **Typecheck** - TypeScript compilation validation
- **Test** - Unit & integration tests
- **Test Python** - Pytest for Semantic Terminology Engine

**Status Badge:**
```markdown
![CI](https://github.com/icicso/icicso/actions/workflows/ci.yml/badge.svg)
```

---

### 2. **Docker Build (docker.yml)** - Container Images

**Triggers:**
- Push to `main`, `develop` branches
- Push tags `v*`
- Pull requests to `main`, `develop`
- Manual dispatch

**Jobs:**
- **Build Services** - 16 parallel Node.js service builds (matrix)
- **Build Frontend** - Desktop emulator image
- **Build Python Engine** - Semantic Terminology Engine
- **Validate Dockerfiles** - Hadolint linting
- **Validate Compose** - Docker Compose config validation

**Features:**
- Matrix strategy for parallel builds
- GitHub Actions cache for layer reuse
- Hadolint validation
- Docker Compose config validation

**Status Badge:**
```markdown
![Docker](https://github.com/icicso/icicso/actions/workflows/docker.yml/badge.svg)
```

---

### 3. **Security (security.yml)** - Vulnerability Scanning

**Triggers:**
- Push to `main`, `develop`
- Pull requests
- Daily schedule (2 AM UTC)

**Jobs:**
- **Dependencies** - pnpm audit for vulnerable packages
- **CodeQL** - GitHub's code analysis engine
- **Dockerfile Security** - Trivy scanner for container vulnerabilities
- **Secrets Check** - TruffleHog secret detection
- **Composition Quality** - Validate package.json and workspace config

**Integrations:**
- GitHub Security tab (SARIF reports)
- CodeQL Dashboard
- Trivy vulnerability database

---

### 4. **Release (release.yml)** - Production Releases

**Triggers:**
- Push tags `v*` (e.g., `v1.0.0`)
- Manual dispatch with version input

**Jobs:**
- **Validate** - Semantic versioning check
- **Build & Push** - Build and push 16 services to Docker registry
- **Build & Push Python** - Build and push Python engine
- **Release Notes** - Generate release notes with image list

**Requires Secrets:**
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub token or password

**Process:**
```
1. Tag commit: git tag v1.0.0 && git push --tags
2. Workflow starts automatically
3. Validates version format (X.Y.Z)
4. Builds all 18 images in parallel
5. Pushes to docker.io/icicso/*:v1.0.0
6. Creates GitHub Release with docker-compose files
```

---

## Usage Scenarios

### Scenario 1: Feature Development

```bash
# Create feature branch
git checkout -b feature/new-audit-logic

# Make changes
vim icicso-local/apps/audit-service/src/index.ts

# Push to GitHub
git push origin feature/new-audit-logic

# CI workflow automatically runs:
# ✓ Lint: ESLint checks
# ✓ Typecheck: TypeScript validation
# ✓ Test: Unit tests
# ✓ Docker Build: Build audit-service image
# ✓ Security: Dependency audit
```

**Result:** Pull request shows CI status ✅ or ❌

### Scenario 2: Main Branch Push

```bash
# Merge to main
git checkout main
git merge feature/new-audit-logic
git push origin main

# Workflows run in order:
# 1. CI (lint, typecheck, test)
# 2. Docker Build (all 18 images)
# 3. Security (scanning, CodeQL)
```

**Result:** All checks pass → Main branch protected, deployable

### Scenario 3: Production Release

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Release workflow runs:
# 1. Validate version (1.0.0 ✓)
# 2. Build all 18 images with tag v1.0.0
# 3. Push to docker.io/icicso/*:v1.0.0
# 4. Create GitHub Release with assets

# Use in production:
docker pull docker.io/icicso/gateway-api:v1.0.0
docker-compose -f docker-compose.yml up -d
```

### Scenario 4: Manual Build Trigger

```bash
# Go to: GitHub → Actions → Docker Build → Run workflow
# Or via CLI:
gh workflow run docker.yml
```

---

## Workflow Status & Monitoring

### View Workflow Status

```bash
# List recent runs
gh run list --workflow=ci.yml

# Watch specific run
gh run view <RUN_ID> --log

# Get job status
gh run view <RUN_ID> --json jobs
```

### GitHub UI

1. Go to repository → Actions tab
2. Select workflow (CI, Docker, Security, Release)
3. View job details, logs, artifacts
4. Click "Re-run failed jobs" if needed

---

## Configuration Reference

### CI Workflow (ci.yml)

| Job | Runs | Duration | Fails CI | 
|-----|------|----------|----------|
| Lint | Always | ~2 min | ✓ Yes |
| Typecheck | Always | ~3 min | ✓ Yes |
| Test | Always | ~3 min | ✓ Yes |
| Test Python | Always | ~2 min | ✗ No (optional) |

### Docker Workflow (docker.yml)

| Job | Strategy | Duration | Builds |
|-----|----------|----------|--------|
| build-services | Matrix 16 | ~30 min (parallel) | 16 images |
| build-frontend | Sequential | ~5 min | 1 image |
| build-python-engine | Sequential | ~10 min | 1 image |
| validate-dockerfiles | Sequential | ~2 min | — |
| validate-compose | Sequential | ~1 min | — |

### Security Workflow (security.yml)

| Job | Runs | Duration | Critical |
|-----|------|----------|----------|
| dependencies | Always | ~2 min | ✗ Warning |
| codeql | Always | ~15 min | ✓ Yes |
| dockerfile-security | Always | ~5 min | ✗ Info |
| secrets | Always | ~2 min | ✓ Yes |
| composition-quality | Always | ~1 min | ✓ Yes |

---

## Secrets & Credentials

### Required for Release Workflow

**GitHub Settings → Secrets and Variables → Actions**

```
DOCKER_USERNAME = your-dockerhub-username
DOCKER_PASSWORD = your-dockerhub-token (not password!)
```

**GitHub automatically provides:**
- `GITHUB_TOKEN` - for release creation
- `secrets.GITHUB_TOKEN` - available in all workflows

---

## Cache Strategy

### GitHub Actions Cache

All workflows use `type=gha`:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Benefits:**
- Reuses Node.js modules between runs
- Caches Docker build layers
- Reduces build time by ~40%
- Free tier: 5 GB

**Clear cache if needed:**
```bash
gh cache delete -k <KEY>
```

---

## Branch Protections (Recommended)

### Settings → Branches → Branch protection rules

Configure for `main`:

```
✓ Require status checks to pass before merging
  - ci.yml: all jobs
  - docker.yml: all jobs
  - security.yml: critical jobs only

✓ Require code reviews
✓ Require branches be up to date before merging
✓ Dismiss stale pull request approvals
✓ Require status checks from a protected branch
```

---

## Troubleshooting

### Workflow Won't Trigger

**Check:**
1. Branch name matches `on.push.branches`
2. GitHub Actions enabled in repo settings
3. `.github/workflows/*.yml` files are valid YAML

```bash
# Validate locally
yamllint .github/workflows/ci.yml
```

### Build Cache Issues

```bash
# Clear all caches
gh cache delete -q --all

# Or specific cache
gh cache delete -k node-modules-main
```

### Flaky Tests

Edit `.github/workflows/ci.yml`:

```yaml
- name: Run tests
  run: pnpm test:repo
  continue-on-error: false  # Set to true temporarily to diagnose
```

### Docker Build Failures

Check logs:
```bash
gh run view <RUN_ID> --log | grep -A 20 "build-gateway-api"
```

### Security Scan False Positives

Edit `.github/workflows/security.yml`:

```yaml
- name: Run Trivy
  continue-on-error: true  # Allow to continue even with findings
```

---

## Best Practices

### 1. Keep Workflows DRY

Reuse workflows:
```yaml
uses: ./.github/workflows/build.yml
```

### 2. Use Concurrency Groups

Prevents duplicate runs:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 3. Parallel Matrix Builds

For multiple services:
```yaml
strategy:
  matrix:
    service: [gateway-api, auth-service, ...]
  fail-fast: false  # Complete all even if one fails
```

### 4. Cache Dependencies

Speeds up builds:
```yaml
cache: 'pnpm'  # Caches node_modules
```

### 5. Environment Variables

Centralize at workflow level:
```yaml
env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10'
```

---

## Advanced: Extending Workflows

### Add New Service CI Check

Edit `.github/workflows/docker.yml`:

```yaml
build-services:
  strategy:
    matrix:
      service:
        - gateway-api
        - new-service  # Add here
```

### Add Custom Step

Edit any workflow:

```yaml
- name: Custom validation
  run: |
    echo "My custom check"
    ./scripts/validate.sh
  if: github.ref == 'refs/heads/main'  # Conditional
```

### Integrate External Tools

```yaml
- name: Slack Notification
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Build ${{ job.status }}"
      }
```

---

## References

- GitHub Actions Docs: https://docs.github.com/en/actions
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Docker Actions: https://github.com/docker/build-push-action
- Cache Action: https://github.com/actions/cache
- CodeQL: https://codeql.github.com/

---

## Support & Monitoring

Monitor workflow health:

```bash
# List last 10 runs
gh run list -L 10

# Watch live
gh run watch <RUN_ID>

# Get summary
gh run view <RUN_ID> --json jobs,conclusion
```

---

**All workflows are production-ready and follow GitHub Actions best practices.**
