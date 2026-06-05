#!/usr/bin/env bash
# Wipe build artefacts and dependency caches across the monorepo.
# Usage: ./scripts/clean.sh [--deep]
#   --deep also removes pnpm-lock.yaml and the pnpm store cache.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEEP=0
for arg in "$@"; do
  case "$arg" in
    --deep) DEEP=1 ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

TARGETS=(
  ".turbo"
  "dist"
  "build"
  "node_modules"
  ".next"
  ".cache"
  "coverage"
  "tsconfig.tsbuildinfo"
  "*.tsbuildinfo"
  ".venv"
  ".ruff_cache"
  ".pytest_cache"
  ".mypy_cache"
  ".DS_Store"
)

echo "▶ cleaning $ROOT"

PRUNE_DIRS=(-name node_modules -prune -o -name .git -prune)

for pattern in "${TARGETS[@]}"; do
  if [[ "$pattern" == *"*"* ]]; then
    find . \( "${PRUNE_DIRS[@]}" \) -o -type f -name "$pattern" -print -exec rm -f {} +
  else
    find . \( "${PRUNE_DIRS[@]}" \) -o \( -name "$pattern" \) -print -exec rm -rf {} +
  fi
done

# Always nuke the root node_modules (excluded by the prune above).
[[ -d node_modules ]] && { echo "./node_modules"; rm -rf node_modules; }

if [[ $DEEP -eq 1 ]]; then
  echo "▶ deep clean"
  [[ -f pnpm-lock.yaml ]] && { echo "./pnpm-lock.yaml"; rm -f pnpm-lock.yaml; }
  if command -v pnpm >/dev/null 2>&1; then
    pnpm store prune || true
  fi
fi

echo "✔ done"
