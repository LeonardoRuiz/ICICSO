# Auto-generated Dockerfile for ICICSO services
# Service: ingestion-service
# Port: 3108

FROM node:20-alpine AS dependencies
WORKDIR /build
RUN npm install -g pnpm@10
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --no-frozen-lockfile

FROM dependencies AS builder
WORKDIR /build
RUN pnpm --filter @icicso/ingestion-service build

FROM node:20-alpine AS runtime
RUN addgroup -S icicso && adduser -S -G icicso icicso
WORKDIR /app
COPY --from=builder /build/apps/ingestion-service/dist /app/dist
COPY --from=builder /build/apps/ingestion-service/package.json /app/
COPY --from=builder /build/packages /app/packages
COPY --from=builder /build/node_modules /app/node_modules
RUN chown -R icicso:icicso /app
USER icicso
EXPOSE 3108
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "require('http').get('http://localhost:3108/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
ENTRYPOINT ["node", "dist/index.js"]
