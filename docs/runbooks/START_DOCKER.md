# 🚀 ICICSO - Start Here (Docker Version)

## ⚡ Quick Start (60 Seconds)

### Windows
```
Double-click: start-icicso.bat
```

### Mac/Linux
```
bash start-icicso.sh
```

### Manual (Any OS)
```
docker-compose up -d
```

---

## 🎨 Open Dashboard

Once started, visit:

```
http://localhost:3000
```

✨ Beautiful UI with all services, links, and commands.

---

## 📊 Key Services

| Service | Port | URL |
|---------|------|-----|
| Dashboard | 3000 | http://localhost:3000 |
| Health Check | 3100 | http://localhost:3100/health |
| Database Admin | 5050 | http://localhost:5050 |
| Message Queue UI | 8888 | http://localhost:8888 |
| Object Storage | 9001 | http://localhost:9001 |

---

## 🔐 Quick Credentials

From `.env` file:

```
PostgreSQL: icicso / (check .env)
PgAdmin: admin@icicso.local / (check .env)
MinIO: minioadmin / (check .env)
```

---

## 📋 Common Commands

```bash
# View running services
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Connect to database
docker-compose exec postgres psql -U icicso -d icicso

# Check system health
curl http://localhost:3100/health
```

---

## 🆘 Something Wrong?

1. **Services won't start?**
   ```
   docker-compose logs [service-name]
   ```

2. **Port already in use?**
   - Check `.env` or docker-compose.yml and change the port
   - Or: `docker-compose down` then try again

3. **Can't connect to database?**
   ```
   docker-compose restart postgres
   ```

4. **More help?**
   - Read: `DOCKER_QUICK_START.md`
   - Check: `DOCKER_SETUP_SUMMARY.md`

---

## 📁 Created Files

```
✓ docker-compose.yml       - All services configured
✓ .env                     - Environment setup
✓ .dockerignore           - Build optimization
✓ dashboard/              - Beautiful UI
✓ health-check/           - Health monitoring service
✓ start-icicso.bat        - Windows startup
✓ start-icicso.sh         - Linux/Mac startup
✓ DOCKER_QUICK_START.md   - Full guide
✓ DOCKER_SETUP_SUMMARY.md - What was created
```

---

## ✅ You're Ready!

1. Run `docker-compose up -d`
2. Visit http://localhost:3000
3. All services are running and accessible

**Enjoy! 🎉**
