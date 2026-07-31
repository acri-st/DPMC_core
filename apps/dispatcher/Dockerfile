# DPMC dispatcher — built from THIS repo's root as context (own .gitlab-ci.yml),
# not from the dpmc superproject.
#
# `package = false` in pyproject.toml: only the locked dependencies are
# installed (--no-install-project), the sources are run in place from src/.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:${PATH}"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY src ./src

# Non-root user matching the k8s Deployment's runAsUser (the worker image runs
# as root because it needs the host docker socket; the dispatcher does not).
RUN useradd --uid 1000 --create-home dispatcher
USER dispatcher

CMD ["python", "src/main.py"]
