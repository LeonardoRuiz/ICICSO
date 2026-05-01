FROM node:20-alpine AS build

RUN apk add --no-cache libc6-compat openssl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace

COPY icicso-local/package.json ./package.json
COPY icicso-local/pnpm-lock.yaml ./pnpm-lock.yaml
COPY icicso-local/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY icicso-local/tsconfig.base.json ./tsconfig.base.json
COPY icicso-local/turbo.json ./turbo.json
COPY icicso-local/apps ./apps
COPY icicso-local/packages ./packages
COPY icicso-local/shared ./shared

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @icicso/database db:generate
RUN pnpm build

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace

COPY --from=build /workspace /workspace

CMD ["node", "--version"]
