#!/usr/bin/env bash

set -euo pipefail

COMPONENT="${1:-api}"
NAMESPACE="eocp-dev"

case "$COMPONENT" in
  api|web|keycloak|dispatcher|worker)
    kubectl logs \
      -n "$NAMESPACE" \
      "deployment/$COMPONENT" \
      --all-containers=true \
      --tail=200 \
      -f
    ;;

  database|keycloak-db|s3)
    kubectl logs \
      -n "$NAMESPACE" \
      "statefulset/$COMPONENT" \
      --all-containers=true \
      --tail=200 \
      -f
    ;;

  seed)
    kubectl logs \
      -n "$NAMESPACE" \
      job/dpmc-seed \
      --tail=200 \
      -f
    ;;

  *)
    echo "Unknown component: $COMPONENT"
    echo "Allowed: api, web, keycloak, dispatcher, worker, database, keycloak-db, s3, seed"
    exit 1
    ;;
esac