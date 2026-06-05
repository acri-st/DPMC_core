# DPMC API (NestJS) — built from the pnpm/turbo monorepo.
#
# Stage 1 installs the whole workspace and builds the API together with its
# workspace deps in topological order (turbo `build` dependsOn ^build):
#   @dpmc/client (rolldown) -> @dpmc/prisma (`prisma generate` -> packages/prisma/dist)
#   -> @dpmc/api (`nest build` -> apps/api/dist).
#
# Stage 2 carries the built tree as-is. The pnpm node_modules layout uses
# symlinks into the virtual store, so the workspace is copied whole rather than
# pruned — this keeps `node apps/api/dist/main` and the Prisma CLI (used by the
# k8s migrate initContainer) resolvable. Not size-optimized; a `pnpm deploy`
# prune is a future improvement.
#
# Base is node:24-slim (Debian/glibc) to match CI and to keep the Prisma query
# engine target identical between build and runtime.

FROM node:24-slim AS builder

WORKDIR /app

# OpenSSL is required by Prisma's engines (otherwise `prisma generate` warns and
# may misbehave on the slim base, which ships without it).
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Manifests first for better layer caching on dependency installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
# Build via turbo so the `dependsOn: ["^build"]` graph runs first: @dpmc/client
# (rolldown) and @dpmc/prisma (`prisma generate`) build before @dpmc/api's
# `nest build`. A plain `pnpm --filter ./apps/api... build` did NOT build the
# workspace deps here, so nest build failed to resolve @dpmc/client / @dpmc/prisma.
RUN pnpm exec turbo run build --filter=@dpmc/api

FROM node:24-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# OpenSSL for the Prisma engine used by the migrate initContainer (migrate deploy).
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Built workspace (dist artifacts + node_modules with the generated Prisma
# client and migrations under packages/prisma/prisma).
COPY --from=builder /app ./

# node:24-slim ships a non-root `node` user (uid 1000) — matches the
# Deployment's runAsUser.
USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
