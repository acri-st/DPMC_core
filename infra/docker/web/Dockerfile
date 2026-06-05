# DPMC web console (Vite + React SPA), built from the pnpm/turbo monorepo and
# served as static files by nginx — same shape as infra/docker/docs/Dockerfile.
#
# Vite inlines VITE_* values at BUILD time, so the image is environment-specific.
# The ARG defaults below target the prod hosts; override per environment with
# --build-arg (e.g. in the CI job's variables) without editing this file.

FROM node:24-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

ARG VITE_API_URL=https://dpmc-api.operation.acrist-services.com/api
ARG VITE_KEYCLOAK_URL=https://dpmc-keycloak.operation.acrist-services.com
ARG VITE_KEYCLOAK_REALM=dpmc
ARG VITE_ADMIN_ROLE=admin
ENV VITE_API_URL=$VITE_API_URL \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_ADMIN_ROLE=$VITE_ADMIN_ROLE

# Build via turbo so @dpmc/client (workspace dep) builds before the web app's
# `vite build` — `dependsOn: ["^build"]`. A plain `pnpm --filter ./apps/web...
# build` did NOT build the workspace dep here, breaking @dpmc/client resolution.
RUN pnpm exec turbo run build --filter=@dpmc/web

FROM nginxinc/nginx-unprivileged:alpine

COPY infra/docker/web/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
