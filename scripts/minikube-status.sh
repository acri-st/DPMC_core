#!/usr/bin/env bash

set -euo pipefail

minikube status

MINIKUBE_IP="$(minikube ip)"

echo
echo "Pods:"
kubectl get pods -n eocp-dev -o wide

echo
echo "PVCs:"
kubectl get pvc -n eocp-dev

echo
echo "Services:"
kubectl get services -n eocp-dev

echo
echo "Jobs:"
kubectl get jobs -n eocp-dev

echo
echo "URLs:"
echo "Web:           http://${MINIKUBE_IP}:30080"
echo "API:           http://${MINIKUBE_IP}:30030/api"
echo "Keycloak:      http://${MINIKUBE_IP}:30081"
echo "MinIO console: http://${MINIKUBE_IP}:30901"