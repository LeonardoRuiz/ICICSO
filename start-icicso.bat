@echo off
REM ICICSO Complete Startup Script for Windows

echo.
echo 🚀 ICICSO Docker Setup - Starting All Services
echo ============================================== 
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker not found. Please install Docker Desktop first.
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose not found.
    exit /b 1
)

echo ✓ Docker found
echo ✓ Docker Compose found
echo.

REM Start services
echo 📦 Starting services...
docker-compose up -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak

echo.
echo ✅ Services started successfully!
echo.
echo 🎨 Dashboard: http://localhost:3000
echo 🏥 Health Check: http://localhost:3100/health
echo 🔧 PgAdmin: http://localhost:5050
echo 📊 Kafka UI: http://localhost:8888
echo 💾 MinIO: http://localhost:9001
echo.
echo 📋 View logs: docker-compose logs -f
echo 🛑 Stop services: docker-compose down
echo.
pause
