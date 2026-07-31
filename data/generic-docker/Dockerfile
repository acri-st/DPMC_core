FROM python:3.12-slim

# Unbuffered stdout/stderr so logs stream live: under the worker (and `docker
# run` without a TTY) stdout is a pipe, which makes Python block-buffer and
# emit only in bursts. This keeps the worker/k8s log streaming real-time.
ENV PYTHONUNBUFFERED=1

WORKDIR /work

# Bake the script at the in-image `/dpmc/scripts` path so the API picks the
# k8s-capable `baked` execution mode (no host bind mounts), exactly like Warhol
# — see worker.service.ts `executableMode`. The worker supplies the full
# `python /dpmc/scripts/generic_docker.py …` command, so no ENTRYPOINT/CMD here.
# Pure stdlib, no pip deps needed.
#
# COPY paths are repo-root-relative: the CI build-generic-docker job (and any
# manual build) uses the repo root as context —
# `docker build -f data/generic-docker/Dockerfile .`
COPY data/generic-docker/generic_docker.py /dpmc/scripts/generic_docker.py

RUN useradd --create-home --uid 1000 app
USER app
