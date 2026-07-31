#!/usr/bin/env bash

set -euo pipefail

if ! minikube status >/dev/null 2>&1; then
  echo "Minikube is already stopped."
  exit 0
fi

# Stop preserves the cluster and PVC data.
minikube stop