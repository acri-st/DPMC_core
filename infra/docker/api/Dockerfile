# syntax=docker/dockerfile:1

# DPMC API — image destinée au développement local avec Minikube.
#
# Construction depuis la racine :
#
#   minikube image build \
#     -t dpmc-api:minikube \
#     -f infra/docker/api/Dockerfile \
#     .
#
# Le build Turbo construit les dépendances dans cet ordre :
#
#   @dpmc/client
#   @dpmc/prisma
#   @dpmc/api
#
# L'image runtime conserve le workspace complet, car pnpm utilise des liens
# symboliques vers son store virtuel. Elle contient également Prisma, les
# migrations, tsx et les données nécessaires au Job Kubernetes de seed.

FROM node:24-slim AS builder

WORKDIR /app

# OpenSSL est requis par Prisma.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
    && rm -rf /var/lib/apt/lists/*

# Version identique à celle déclarée dans package.json.
RUN corepack enable \
    && corepack prepare pnpm@11.1.3 --activate

# Manifests du monorepo.
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./
COPY prettier.config.mjs ./

# Workspaces pnpm.
COPY apps ./apps
COPY packages ./packages

# Fichiers consommés par packages/prisma/src/seed/sources.ts.
# Lorsque le seed est exécuté depuis /app/packages/prisma,
# ../../data/seed correspond à /app/data/seed.
COPY data/seed ./data/seed

RUN pnpm install --frozen-lockfile

# Turbo construit les dépendances workspace avant l'API.
RUN pnpm exec turbo run build --filter=@dpmc/api


FROM node:24-slim AS runtime

ENV NODE_ENV=production
ENV HOME=/tmp

WORKDIR /app

# OpenSSL est également requis par Prisma au runtime et par l'initContainer
# chargé d'exécuter `prisma migrate deploy`.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@11.1.3 --activate

# Conserver le workspace avec les dist, node_modules, migrations et fixtures.
COPY --from=builder --chown=node:node /app /app

# Répertoire temporaire accessible à l'utilisateur non-root.
RUN mkdir -p /tmp/.cache \
    && chown -R node:node /tmp/.cache

# L'utilisateur node existe dans l'image officielle avec l'UID 1000.
USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]