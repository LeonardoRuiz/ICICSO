# ICICSO Local - Docker Compose Usage Guide

Complete guide to running ICICSO with Docker Compose.

---

## Quick Start

### 1. Full Stack (Everything)

```bash
cd icicso-local
docker-compose up -d
```

Wait for all services to be healthy (~30-60 seconds).

### 2. Check Status

```bash
docker-compose ps
docker-compose logs -f gateway-api
```

### 3. Access Services

- **Gateway API:** http://localhost:3100
- **Desktop Emulator:** http://localhost:8090
- **pgAdmin (PostgreSQL):** http://localhost:5050
- **Kafka UI:** http://localhost:8080
- **MinIO Console:** http://localhost:9001

---

## Environment Setup

### Create .env file

Copy the current .env or start fresh:

```bash
cp .env.example .env.local
# or
cat > icicso-local/.env << 'EOF'
NODE_ENV=development
LOG_LEVEL=info
JWT_SECRET=replace-with-long-local-jwt-secret-minimum-24-chars
JWT_EXPIRES_IN=24h
AUTH_ISSUER=icicso-local-auth
AUTH_AUDIENCE=icicso-local-api
INTERNAL_SERVICE_TOKEN=replace-with-long-local-internal-service-token
DATABASE_URL=postgresql://icicso:icicso-local-password@localhost:5432/icicso_local
POSTGRES_DB=icicso_local
POSTGRES_USER=icicso
POSTGRES_PASSWORD=icicso-local-password
MINIO_ROOT_USER=icicso-minio
MINIO_ROOT_PASSWORD=icicso-local-password
MINIO_BUCKET=icicso-block2
DEMO_CASE_ID=CASE-CABG3-2026-00014
DEMO_EPISODE_ID=EPI-ACS-2026-02-15
DEMO_ILC_ID=ILC-MX-CIH-2026-0004821
GATEWAY_API_PORT=3100
AUTH_SERVICE_PORT=3101
IDENTITY_SERVICE_PORT=3102
AUDIT_SERVICE_PORT=3103
EVIDENCE_LAKE_SERVICE_PORT=3104
GHL_SERVICE_PORT=3105
KBOL_SERVICE_PORT=3106
STORAGE_SERVICE_PORT=3107
INGESTION_SERVICE_PORT=3108
TERMINOLOGY_SERVICE_PORT=3109
DATA_GOVERNANCE_SERVICE_PORT=3110
RUNBOOK_SERVICE_PORT=3111
READINESS_SERVICE_PORT=3112
CASE_CONTROL_SERVICE_PORT=3113
SYSTEMIC_RISK_SERVICE_PORT=3114
CQOI_SERVICE_PORT=3115
EOF
```

---

## Common Commands

### Start Services

```bash
# Full stack with all services
docker-compose up -d

# Rebuild images first
docker-compose up -d --build

# Specific services only
docker-compose up -d gateway-api audit-service auth-service

# Follow logs
docker-compose up
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop but keep volumes
docker-compose down -v

# Stop and remove volumes (careful!)
docker-compose down --volumes
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs gateway-api

# Follow logs (tail)
docker-compose logs -f gateway-api

# Last 100 lines
docker-compose logs --tail=100 gateway-api
```

### Check Health

```bash
# List all containers
docker-compose ps

# Check specific service
docker-compose ps gateway-api

# Health details
docker-compose ps --format=table

# Verify via curl
curl http://localhost:3100/health/live
curl http://localhost:3103/health
```

### Rebuild

```bash
# Rebuild single service
docker-compose build gateway-api

# Rebuild all
docker-compose build

# Rebuild without cache
docker-compose build --no-cache
```

---

## Development Mode

### Enable Source Code Hot Reload

Docker Compose automatically uses `docker-compose.override.yml` for development:

```bash
# Services will watch source code and rebuild on changes
docker-compose up -d

# Watch logs as you edit code
docker-compose logs -f gateway-api
```

The `docker-compose.override.yml` provides:
- Volume mounts for `/src` directories
- `--watch` flag for automatic restart
- Development environment variables

### Make Changes

```bash
# Edit source code
vim apps/gateway-api/src/index.ts

# Changes are automatically reflected in running container
docker-compose logs -f gateway-api
```

---

## Service Dependencies

### Critical Dependencies

These **must be healthy** before applications start:

- **PostgreSQL** → All services that use DATABASE_URL
- **Redis** (optional) → Caching layer
- **Kafka** → Event streaming
- **MinIO** → Object storage

The compose file handles dependency ordering with `depends_on: { service_healthy: true }`.

### Startup Order

1. **Infrastructure** (PostgreSQL, Redis, Kafka, MinIO) - 10-30 seconds
2. **Core Services** (Gateway, Auth, Identity, Audit) - 5-10 seconds
3. **Block Services** (Storage, Ingestion, etc.) - 5-10 seconds
4. **Frontend** (Desktop Emulator) - 2-5 seconds

**Total startup time:** ~1-2 minutes

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs gateway-api

# Common issues:
# - Port conflicts: Change in .env
# - Database not ready: Wait longer, check postgres logs
# - Image build failed: docker-compose build --no-cache
```

### "Connection refused" errors

```bash
# Services trying to connect before dependencies are ready
# Solutions:
# 1. Wait for health checks to pass: docker-compose ps
# 2. Restart failed service: docker-compose restart gateway-api
# 3. Rebuild and restart: docker-compose down && docker-compose up -d
```

### Database issues

```bash
# Connect to PostgreSQL directly
docker-compose exec postgres psql -U icicso -d icicso_local

# Check migrations
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Out of Disk Space

```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Or selectively
docker-compose down -v  # Remove volumes
docker image prune       # Remove unused images
```

---

## Monitoring & Debugging

### Real-time Service Health

```bash
watch -n 5 'docker-compose ps'
```

### Network Diagnostics

```bash
# Check network
docker network ls
docker network inspect icicso-local_icicso-network

# Test inter-service connectivity
docker-compose exec gateway-api \
  curl -v http://auth-service:3101/health
```

### Resource Usage

```bash
docker stats

# Or per-service
docker stats icicso-gateway-api
```

### Inspect Container

```bash
# Shell into running service
docker-compose exec gateway-api sh

# View environment variables
docker-compose exec gateway-api env | grep NODE_ENV

# Check mounted volumes
docker-compose exec gateway-api mount | grep /app
```

---

## Advanced: Multiple Environments

### Production (clean images, no volumes)

```bash
docker-compose -f docker-compose.yml up -d
```

### Staging (with volumes but no hot reload)

```bash
docker-compose -f docker-compose.yml \
              -f docker-compose.staging.yml up -d
```

### Development (with hot reload)

```bash
docker-compose up -d  # Uses both .yml and .override.yml
```

---

## CI/CD Integration

### In GitHub Actions

```yaml
- name: Start ICICSO
  run: |
    cd icicso-local
    docker-compose -f docker-compose.yml up -d
    docker-compose ps

- name: Wait for Health
  run: |
    for i in {1..30}; do
      if docker-compose ps | grep -q "healthy"; then
        break
      fi
      sleep 2
    done
```

---

## Performance Tips

1. **Use named volumes**: Persistent, faster than bind mounts
2. **Build images locally first**: `docker-compose build`
3. **Limit logging**: Set `LOG_LEVEL=warn` in production
4. **Resource limits**: Add `deploy.limits` for resource constraints
5. **Prune regularly**: `docker system prune -a --volumes`

---

## References

- Docker Compose docs: https://docs.docker.com/compose/
- Best practices: https://docs.docker.com/develop/dev-best-practices/
- Healthchecks: https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck

---

## Support

For issues, check logs and consult:
- `docs/INTERVENTION_CHECKPOINT_1.md` - Status overview
- `docs/audit/PARTE_A_DOCKERFILES_COMPLETE.md` - Docker setup details
- `docs/audit/RUNTIME_DOCKER_AUDIT.md` - Architecture reference
