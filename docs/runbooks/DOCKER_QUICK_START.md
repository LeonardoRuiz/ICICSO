# ICICSO Docker Setup - Quick Start

## 🚀 Start Everything

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📊 Access Points

Once running, visit:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | 🎨 Beautiful control center |
| **Gateway API** | http://localhost:3100 | 🚪 Main API gateway |
| **Health Check** | http://localhost:3100/health | 🏥 System status |
| **Clinical Emulator** | http://localhost:8090 | 🖥️ Clinical UI (when running) |
| **PgAdmin** | http://localhost:5050 | 🔧 PostgreSQL management |
| **Kafka UI** | http://localhost:8888 | 📊 Message queue monitor |
| **MinIO Console** | http://localhost:9001 | 💾 Object storage |

## 🔐 Credentials

All default credentials are in `.env`:

```
POSTGRES_USER=icicso
POSTGRES_PASSWORD=icicso_secure_password_change_me
PGADMIN_DEFAULT_EMAIL=admin@icicso.local
PGADMIN_DEFAULT_PASSWORD=admin_secure_password_change_me
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_secure_password_change_me
```

**⚠️ Change these in production!**

## 🐳 Service Details

### Core Infrastructure
- **PostgreSQL** (Port 5432) - Relational database
- **Redis** (Port 6379) - In-memory cache
- **Kafka** (Port 9092) - Event streaming
- **MinIO** (Port 9000/9001) - Object storage

### Monitoring & Admin
- **PgAdmin** (Port 5050) - PostgreSQL UI
- **Kafka UI** (Port 8888) - Kafka monitoring
- **Dashboard** (Port 3000) - ICICSO control center

### Health Service
- **Health Check** (Port 3100) - Microservice health & status

## 🔍 Check Health

```bash
# Full health check
curl http://localhost:3100/health

# Ready check
curl http://localhost:3100/ready

# System metrics
curl http://localhost:3100/metrics

# Block overviews
curl http://localhost:3100/block1/overview
curl http://localhost:3100/block2/overview
curl http://localhost:3100/block3/overview
```

## 📋 Useful Commands

```bash
# View all running containers
docker-compose ps

# View logs for specific service
docker-compose logs postgres
docker-compose logs redis
docker-compose logs kafka

# Restart a service
docker-compose restart postgres

# Remove all containers and volumes (⚠️ deletes data)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Execute command in container
docker-compose exec postgres psql -U icicso -d icicso
```

## 🚀 Development Workflow

```bash
# Watch logs while developing
docker-compose logs -f health-check

# Connect to PostgreSQL
docker-compose exec postgres psql -U icicso -d icicso

# Check Redis
docker-compose exec redis redis-cli

# Monitor Kafka
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check Docker daemon is running
docker ps

# View service logs
docker-compose logs [service-name]

# Rebuild everything
docker-compose down -v
docker-compose up -d --build
```

### Port already in use
```bash
# Find what's using the port (example: 5432)
lsof -i :5432

# Or change the port in docker-compose.yml
# Example: "5433:5432" maps host 5433 to container 5432
```

### Database won't initialize
```bash
# Clear the volume and restart
docker-compose down -v
docker-compose up -d postgres
# Wait 30 seconds for initialization
docker-compose logs postgres
```

## 📚 Next Steps

1. **Dashboard Open** - Visit http://localhost:3000
2. **Check Health** - Verify http://localhost:3100/health
3. **Explore PgAdmin** - Manage databases at http://localhost:5050
4. **Start Development** - Follow docs in repository root
5. **Run Tests** - `pnpm test` in icicso/ directory

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         ICICSO Control Center (3000)    │
├─────────────────────────────────────────┤
│         Health Check Service (3100)     │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Database & Cache Layer         │  │
│  │  ┌────────────┐  ┌────────────┐  │  │
│  │  │ PostgreSQL │  │ Redis      │  │  │
│  │  │ (5432)     │  │ (6379)     │  │  │
│  │  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Message Queue Layer            │  │
│  │  ┌────────────┐  ┌────────────┐  │  │
│  │  │ Kafka      │  │ Zookeeper  │  │  │
│  │  │ (9092)     │  │ (2181)     │  │  │
│  │  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Storage Layer                  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │ MinIO (9000/9001)          │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Admin & Monitoring             │  │
│  │  ┌──────────┐   ┌────────────┐   │  │
│  │  │ PgAdmin  │   │ Kafka UI   │   │  │
│  │  │ (5050)   │   │ (8888)     │   │  │
│  │  └──────────┘   └────────────┘   │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## 💡 Tips

- The dashboard auto-refreshes health status every 30 seconds
- All services are in the `icicso-net` Docker network
- Volumes are persisted even after containers stop
- Use `docker-compose.override.yml` for local overrides
- Check `.env` for environment configuration

---

**Questions?** Check the main repository documentation or review individual service logs with `docker-compose logs [service-name]`
