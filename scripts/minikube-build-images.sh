#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v minikube >/dev/null 2>&1 || {
  echo "minikube is not installed"
  exit 1
}

minikube status >/dev/null 2>&1 || {
  echo "minikube is not running"
  exit 1
}

test -f apps/worker/Dockerfile || {
  echo "Missing apps/worker submodule"
  echo "Run: git submodule update --init --recursive"
  exit 1
}

test -f apps/dispatcher/Dockerfile || {
  echo "Missing apps/dispatcher submodule"
  echo "Run: git submodule update --init --recursive"
  exit 1
}

AVAILABLE_KB="$(df -Pk /var | awk 'NR == 2 {print $4}')"
MINIMUM_KB=$((10 * 1024 * 1024))

if (( AVAILABLE_KB < MINIMUM_KB )); then
  echo "Not enough free space under /var."
  echo "At least 10 GiB are required before image builds."
  df -h /var
  exit 1
fi

MINIKUBE_IP="$(minikube ip)"

echo "Minikube IP: $MINIKUBE_IP"

echo "Building API..."
minikube image build \
  -t dpmc-api:minikube \
  -f infra/docker/api/Dockerfile \
  .

echo "Building Web..."
minikube image build \
  -t dpmc-web:minikube \
  -f infra/docker/web/Dockerfile \
  --build-opt="build-arg=VITE_API_URL=http://${MINIKUBE_IP}:30030/api" \
  --build-opt="build-arg=VITE_KEYCLOAK_URL=http://${MINIKUBE_IP}:30081" \
  --build-opt="build-arg=VITE_KEYCLOAK_REALM=dpmc" \
  --build-opt="build-arg=VITE_ADMIN_ROLE=admin" \
  .

echo "Building Dispatcher..."
minikube image build \
  -t dpmc-dispatcher:minikube \
  apps/dispatcher

echo "Building Worker..."
minikube image build \
  -t dpmc-worker:minikube \
  apps/worker

echo "Building Generic Docker processor..."
minikube image build \
  -t harbor.shared.acrist-services.com/dsy/damps/dpmc/generic-docker:development \
  -f data/generic-docker/Dockerfile \
  .

echo "Available DPMC images:"
minikube image ls |
  grep -E 'dpmc-(api|web|dispatcher|worker)|generic-docker' ||
  true