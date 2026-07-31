FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends imagemagick \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir boto3 requests

ENV PYTHONPATH=/dpmc_lib
WORKDIR /work

# Bake the shared dpmc_io lib and the scripts into the image so jobs run on the
# Kubernetes backend (no host bind mounts). Register each executable with the
# baked path `/dpmc/scripts/<exe>/<version>/main.py` so the API picks the
# in-image dpmc_io contract (see worker.service.ts `executableMode`). For local
# dev, docker-compose.host.yml still bind-mounts data/warhol over /app instead.
#
# COPY paths are repo-root-relative: the CI build-warhol job (and any manual
# build) uses the repo root as context — `docker build -f data/warhol/Dockerfile .`
COPY data/warhol/_lib/ /dpmc_lib/
COPY data/warhol/calc /dpmc/scripts/calc
COPY data/warhol/cleanup /dpmc/scripts/cleanup
COPY data/warhol/combine /dpmc/scripts/combine
COPY data/warhol/publish /dpmc/scripts/publish
COPY data/warhol/resize /dpmc/scripts/resize
COPY data/warhol/tint /dpmc/scripts/tint
