"""
ICICSO Semantic Terminology Engine
Main FastAPI application for terminology normalization and cross-mapping.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import uuid4
import os

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import text

from .api.routes import router
from .core.config import settings
from .core.database import create_tables, engine
from .core.logging import setup_logging

setup_logging()
logger = structlog.get_logger(__name__)

REQUEST_COUNTER = Counter(
    "icicso_engine_requests_total",
    "Total requests handled by semantic terminology engine.",
    ["method", "route", "status_code"],
)
REQUEST_DURATION = Histogram(
    "icicso_route_resolution_duration_seconds",
    "Semantic terminology engine request duration in seconds.",
    ["method", "route"],
)
ENGINE_FAILURES = Counter(
    "icicso_engine_failures_total",
    "Total semantic terminology engine failures.",
    ["route", "error_code"],
)
RULE_EVALUATION = Counter(
    "icicso_rule_evaluation_total",
    "Total rule evaluations or terminology operations performed.",
    ["operation"],
)
ACTIVE_REQUESTS = Gauge(
    "icicso_engine_active_requests",
    "Active requests in semantic terminology engine.",
)
POSTGRES_UP = Gauge(
    "icicso_postgres_up",
    "PostgreSQL connectivity as seen from semantic terminology engine.",
    ["service"],
)
REDIS_UP = Gauge(
    "icicso_redis_up",
    "Redis connectivity as seen from semantic terminology engine.",
    ["service"],
)

SERVICE_NAME = "semantic-terminology-engine"
BUILD_ID = "dev-local"
redis_client = redis_from_url(settings.redis_url, encoding="utf-8", decode_responses=True)


def parse_traceparent(traceparent: str | None) -> tuple[str, str] | None:
    if not traceparent:
        return None

    parts = traceparent.split("-")
    if len(parts) != 4 or len(parts[1]) != 32 or len(parts[2]) != 16:
        return None
    return parts[1], parts[2]


def create_traceparent(trace_id: str, span_id: str) -> str:
    return f"00-{trace_id}-{span_id}-01"


def telemetry_context(request: Request) -> dict[str, str]:
    parsed = parse_traceparent(request.headers.get("traceparent"))
    trace_id = parsed[0] if parsed else uuid4().hex + uuid4().hex[:8]
    span_id = uuid4().hex[:16]
    request_id = request.headers.get("x-request-id") or str(uuid4())
    correlation_id = request.headers.get("x-correlation-id") or str(uuid4())
    return {
        "trace_id": trace_id[:32],
        "span_id": span_id,
        "request_id": request_id,
        "correlation_id": correlation_id,
    }


async def postgres_ready() -> bool:
    try:
        async with engine.begin() as connection:
            await connection.execute(text("SELECT 1"))
        POSTGRES_UP.labels(service=SERVICE_NAME).set(1)
        return True
    except Exception as exc:
        POSTGRES_UP.labels(service=SERVICE_NAME).set(0)
        logger.warning("postgres-health-check-failed", error=str(exc), error_code="POSTGRES_UNAVAILABLE")
        return False


async def redis_ready() -> bool:
    try:
        await redis_client.ping()
        REDIS_UP.labels(service=SERVICE_NAME).set(1)
        return True
    except Exception as exc:
        REDIS_UP.labels(service=SERVICE_NAME).set(0)
        logger.warning("redis-health-check-failed", error=str(exc), error_code="REDIS_UNAVAILABLE")
        return False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("semantic-terminology-engine-starting")
    app.state.startup_complete = False
    await create_tables()
    app.state.startup_complete = True
    logger.info("semantic-terminology-engine-started")
    yield
    await redis_client.aclose()
    logger.info("semantic-terminology-engine-stopped")


def create_application() -> FastAPI:
    app = FastAPI(
        title="ICICSO Semantic Terminology Engine",
        description="Healthcare terminology normalization and cross-mapping service",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def observability_middleware(request: Request, call_next):
        context = telemetry_context(request)
        route = request.url.path
        method = request.method
        request.state.telemetry = context
        ACTIVE_REQUESTS.inc()
        started = time.perf_counter()

        log = logger.bind(
            service_name=SERVICE_NAME,
            environment=settings.environment,
            route=route,
            method=method,
            **context,
        )
        request.state.log = log
        log.info("request-received")
        if route.startswith("/api/v1"):
            RULE_EVALUATION.labels(operation=route).inc()

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as exc:
            status_code = 500
            ENGINE_FAILURES.labels(route=route, error_code="UNHANDLED_EXCEPTION").inc()
            log.error("request-failed", error=str(exc), error_code="UNHANDLED_EXCEPTION")
            raise
        finally:
            duration = time.perf_counter() - started
            ACTIVE_REQUESTS.dec()
            REQUEST_COUNTER.labels(method=method, route=route, status_code=str(status_code)).inc()
            REQUEST_DURATION.labels(method=method, route=route).observe(duration)
            if status_code >= 400:
                ENGINE_FAILURES.labels(route=route, error_code=f"HTTP_{status_code}").inc()
            log.info("request-completed", status_code=status_code, duration_ms=round(duration * 1000))

    @app.middleware("http")
    async def response_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        telemetry = getattr(request.state, "telemetry", None)
        if telemetry:
            response.headers["X-Correlation-Id"] = telemetry["correlation_id"]
            response.headers["X-Request-Id"] = telemetry["request_id"]
            response.headers["traceparent"] = create_traceparent(telemetry["trace_id"], telemetry["span_id"])
        return response

    app.include_router(router, prefix="/api/v1")

    @app.get("/health/live")
    async def health_live():
        return {
            "service_name": SERVICE_NAME,
            "status": "live",
            "build_id": BUILD_ID,
            "timestamp": time.time(),
        }

    @app.get("/health/startup")
    async def health_startup(request: Request):
        started = bool(getattr(request.app.state, "startup_complete", False))
        status = "started" if started else "starting"
        return JSONResponse(
            status_code=200 if started else 503,
            content={
                "service_name": SERVICE_NAME,
                "status": status,
                "build_id": BUILD_ID,
                "timestamp": time.time(),
            },
        )

    @app.get("/health/ready")
    @app.get("/health")
    async def health_ready(request: Request):
        postgres_ok, redis_ok = await postgres_ready(), await redis_ready()
        degraded = not redis_ok
        ready = postgres_ok
        status = "ready" if ready and not degraded else "degraded" if ready else "not_ready"
        return JSONResponse(
            status_code=200 if ready else 503,
            content={
                "service_name": SERVICE_NAME,
                "status": status,
                "build_id": BUILD_ID,
                "timestamp": time.time(),
                "process": {
                    "pid": os.getpid(),
                    "uptime_seconds": round(time.time() - request.app.state.started_at, 3),
                },
                "dependencies": [
                    {"dependency": "postgres", "critical": True, "status": "up" if postgres_ok else "down"},
                    {"dependency": "redis", "critical": False, "status": "up" if redis_ok else "down"},
                ],
            },
        )

    @app.get("/metrics")
    async def metrics():
        return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)

    @app.get("/")
    async def root():
        RULE_EVALUATION.labels(operation="root").inc()
        return {
            "service": "ICICSO Semantic Terminology Engine",
            "service_name": SERVICE_NAME,
            "version": "1.0.0",
            "description": "Healthcare terminology normalization and cross-mapping",
            "endpoints": {
                "health_live": "/health/live",
                "health_ready": "/health/ready",
                "metrics": "/metrics",
                "api": "/api/v1",
                "docs": "/docs",
            },
        }

    app.state.started_at = time.time()
    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "semantic_terminology_engine.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=None,
    )
