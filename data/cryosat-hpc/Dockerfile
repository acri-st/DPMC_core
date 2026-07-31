FROM python:3.12-slim

# Unbuffered stdout/stderr so logs stream live: under the worker (and `docker
# run` without a TTY) stdout is a pipe, which makes Python block-buffer and
# emit only in bursts. This keeps the worker/k8s log streaming real-time.
ENV PYTHONUNBUFFERED=1

WORKDIR /work

# Bake the script at the in-image `/dpmc/scripts` path so the API picks the
# k8s-capable `baked` execution mode (no host bind mounts) — see
# worker.service.ts `executableMode`. The worker supplies the full
# `python /dpmc/scripts/cryosat_hpc.py …` command, so no ENTRYPOINT/CMD here.
# Pure stdlib, no pip deps needed.
#
# COPY paths are repo-root-relative: the CI build-cryosat job (and any manual
# build) uses the repo root as context — `docker build -f data/cryosat/Dockerfile .`
COPY data/cryosat/cryosat_hpc.py /dpmc/scripts/cryosat_hpc.py

RUN useradd --create-home --uid 1000 app
USER app
