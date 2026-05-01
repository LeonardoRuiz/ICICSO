# ICICSO Desktop Emulator - Frontend Server Dockerfile
FROM node:20-alpine AS runtime

RUN addgroup -S icicso && adduser -S -G icicso icicso
WORKDIR /app

# Copy only the static assets and server
COPY apps/desktop-emulator/index.html /app/
COPY apps/desktop-emulator/styles.css /app/
COPY apps/desktop-emulator/app.js /app/
COPY apps/desktop-emulator/server.js /app/

RUN chown -R icicso:icicso /app
USER icicso

EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "require('http').get('http://localhost:8090/health/live', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["node", "server.js"]
