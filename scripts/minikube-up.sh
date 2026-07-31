#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERLAY_DIR="$ROOT_DIR/infra/k8s/overlays/minikube"
cd "$ROOT_DIR"

SKIP_BUILD=false

if [[ "${1:-}" == "--skip-build" ]]; then
  SKIP_BUILD=true
fi

command -v docker >/dev/null 2>&1 || {
  echo "docker is not installed"
  exit 1
}

command -v minikube >/dev/null 2>&1 || {
  echo "minikube is not installed"
  exit 1
}

command -v kubectl >/dev/null 2>&1 || {
  echo "kubectl is not installed"
  exit 1
}

if ! minikube status >/dev/null 2>&1; then
  minikube start \
    --driver=docker \
    --cpus=4 \
    --memory=8192 \
    --disk-size=20g
fi

minikube update-context >/dev/null
kubectl config use-context minikube >/dev/null

minikube addons enable metrics-server >/dev/null

MINIKUBE_IP="$(minikube ip)"

if [[ "$SKIP_BUILD" == false ]]; then
  "$ROOT_DIR/scripts/minikube-build-images.sh"
fi

RENDERED_MANIFEST="$(mktemp)"
trap 'rm -f "$RENDERED_MANIFEST"' EXIT

kubectl kustomize "$OVERLAY_DIR" |
  sed \
    -e "s|__MINIKUBE_IP__|${MINIKUBE_IP}|g" \
    -e "s|https://dpmc-api.operation.acrist-services.com|http://${MINIKUBE_IP}:30030|g" \
    -e "s|https://dpmc-web.operation.acrist-services.com|http://${MINIKUBE_IP}:30080|g" \
    -e "s|https://dpmc-keycloak.operation.acrist-services.com|http://${MINIKUBE_IP}:30081|g" \
  > "$RENDERED_MANIFEST"

kubectl apply -f "$RENDERED_MANIFEST"

kubectl rollout status statefulset/database \
  -n eocp-dev --timeout=300s

kubectl rollout status statefulset/keycloak-db \
  -n eocp-dev --timeout=300s

kubectl rollout status statefulset/s3 \
  -n eocp-dev --timeout=300s

kubectl rollout status deployment/keycloak \
  -n eocp-dev --timeout=300s

kubectl rollout status deployment/api \
  -n eocp-dev --timeout=300s

kubectl delete job dpmc-seed \
  -n eocp-dev \
  --ignore-not-found

kubectl apply -f "$OVERLAY_DIR/seed-job.yml"

kubectl wait \
  --for=condition=complete \
  job/dpmc-seed \
  -n eocp-dev \
  --timeout=600s

kubectl rollout status deployment/web \
  -n eocp-dev --timeout=300s

kubectl rollout status deployment/dispatcher \
  -n eocp-dev --timeout=300s

kubectl rollout status deployment/worker \
  -n eocp-dev --timeout=300s

kubectl rollout status deployment/prometheus \
  -n eocp-dev --timeout=300s

echo
echo "DPMC Minikube environment is ready."
echo "Web:           http://${MINIKUBE_IP}:30080"
echo "API:           http://${MINIKUBE_IP}:30030/api"
echo "Keycloak:      http://${MINIKUBE_IP}:30081"
echo "MinIO API:     http://${MINIKUBE_IP}:30900"
echo "MinIO console: http://${MINIKUBE_IP}:30901"
echo "Prometheus:    http://${MINIKUBE_IP}:30090"
echo "Login:         admin / admin"