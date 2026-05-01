#!/bin/bash
# ICICSO Complete Startup Script

echo "🚀 ICICSO Docker Setup - Starting All Services"
echo "=============================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found."
    exit 1
fi

echo "✓ Docker found"
echo "✓ Docker Compose found"
echo ""

# Start services
echo "📦 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready (up to 60 seconds)..."
for i in {1..60}; do
    if docker-compose exec -T postgres pg_isready -U icicso > /dev/null 2>&1; then
        echo "✓ PostgreSQL ready"
        break
    fi
    echo -n "."
    sleep 1
done

for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo "✓ Redis ready"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🎨 Dashboard: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3100/health"
echo "🔧 PgAdmin: http://localhost:5050"
echo "📊 Kafka UI: http://localhost:8888"
echo "💾 MinIO: http://localhost:9001"
echo ""
echo "📋 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
echo ""
