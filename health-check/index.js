import express from 'express';
import pg from 'pg';
import redis from 'redis';

const app = express();
const port = process.env.PORT || 3100;

const { Client } = pg;
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://icicso:icicso@postgres:5432/icicso'
});

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        postgres: 'unknown',
        redis: 'unknown',
        gateway: 'running'
      }
    };

    // Check PostgreSQL
    try {
      await pgClient.query('SELECT 1');
      health.services.postgres = 'healthy';
    } catch (e) {
      health.services.postgres = 'unhealthy';
    }

    // Check Redis
    try {
      await redisClient.ping();
      health.services.redis = 'healthy';
    } catch (e) {
      health.services.redis = 'unhealthy';
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});

// Block 1 overview (auth, identity, audit)
app.get('/block1/overview', (req, res) => {
  res.json({
    block: 'Authentication & Identity Management',
    services: [
      { name: 'Auth Service', port: 3001, status: 'running' },
      { name: 'Identity Service', port: 3002, status: 'running' },
      { name: 'Audit Service', port: 3003, status: 'running' }
    ],
    endpoints: {
      auth: 'http://localhost:3001',
      identity: 'http://localhost:3002',
      audit: 'http://localhost:3003'
    }
  });
});

// Block 2 overview (storage, ingestion, data governance)
app.get('/block2/overview', (req, res) => {
  res.json({
    block: 'Data Ingestion & Governance',
    services: [
      { name: 'Storage Service', port: 3004, status: 'running' },
      { name: 'Ingestion Service', port: 3005, status: 'running' },
      { name: 'Data Governance Service', port: 3006, status: 'running' }
    ],
    endpoints: {
      storage: 'http://localhost:3004',
      ingestion: 'http://localhost:3005',
      governance: 'http://localhost:3006'
    }
  });
});

// Block 3 overview (evidence lake)
app.get('/block3/overview', (req, res) => {
  res.json({
    block: 'Evidence Management',
    services: [
      { name: 'Evidence Lake Service', port: 3007, status: 'running' }
    ],
    endpoints: {
      evidence: 'http://localhost:3007'
    }
  });
});

// System metrics
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ready check
app.get('/ready', async (req, res) => {
  try {
    await pgClient.query('SELECT 1');
    await redisClient.ping();
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ICICSO Health Check Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      blocks: {
        auth: '/block1/overview',
        ingestion: '/block2/overview',
        evidence: '/block3/overview'
      }
    }
  });
});

// Connect to database
try {
  await pgClient.connect();
  console.log('✓ PostgreSQL connected');
} catch (e) {
  console.log('✗ PostgreSQL connection failed:', e.message);
}

// Connect to Redis
try {
  await redisClient.connect();
  console.log('✓ Redis connected');
} catch (e) {
  console.log('✗ Redis connection failed:', e.message);
}

app.listen(port, () => {
  console.log(`🏥 ICICSO Health Check Service running on port ${port}`);
  console.log(`📊 Dashboard: http://localhost:3000`);
  console.log(`🏥 Health: http://localhost:${port}/health`);
});
