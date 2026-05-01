# ICICSO Local - Service Dockerfile (Multistage)
# Usage: docker build -t icicso-<service>:<version> --build-arg SERVICE_NAME=<service-name> -f services.Dockerfile .
# 
# Build Args:
#   SERVICE_NAME: The pnpm filter name (e.g., @icicso/gateway-api)
#   NODE_VERSION: Node.js version (default: 20-alpine)

ARG NODE_VERSION=20-alpine

# Stage 1: Dependencies
FROM node:${NODE_VERSION} AS dependencies

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace configuration and lock files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM dependencies AS builder

ARG SERVICE_NAME

WORKDIR /build

# Build the service and all its dependencies
# This assumes the service depends on packages, which will be built first
RUN pnpm --filter "${SERVICE_NAME}" build

# Stage 3: Runtime
FROM node:${NODE_VERSION} AS runtime

# Create non-root user
RUN addgroup -g 1000 icicso && \
    adduser -D -u 1000 -G icicso icicso

WORKDIR /app

# Copy built service from builder
COPY --from=builder /build/apps /app/apps
COPY --from=builder /build/packages /app/packages

# Copy only production dependencies
COPY --from=dependencies /build/node_modules /app/node_modules
COPY --from=dependencies /build/pnpm-lock.yaml /app/

# Set ownership
RUN chown -R icicso:icicso /app

# Switch to non-root user
USER icicso

# Health check (can be overridden at compose level)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Metadata
LABEL org.opencontainers.image.vendor="ICICSO"
LABEL org.opencontainers.image.title="ICICSO Service"
LABEL org.opencontainers.image.version="1.0.0"

# Default entrypoint - can be overridden per service
ENTRYPOINT ["node"]
