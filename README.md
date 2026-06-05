# 🛰️ DPMC — Data Production Management Core

> Generic orchestrator for Earth Observation (EO) data processing. Handles data ingestion, cataloguing, processing configuration, and large-scale execution of processing chains across cloud, on-premise, or HPC infrastructures.

DPMC is developed by [ACRI-ST](https://www.acri-st.fr/) for ESA under the **DAMPS** programme (PDGS Data Archival, Management & Processing Services, contract 4000135398/21/I-LG). It is the engine behind reprocessing campaigns for missions such as Sentinel-3, EarthCARE, Biomass, FLEX, Cryosat, and Aeolus — and has historically processed 100+ PB of data and ~1 billion products across 200+ processing baselines.

This repository implements the **EOCP** (Evolution of Orchestrator for Complex Processing) generation of DPMC: a modular, API-first, container-native rewrite that introduces production/processing chains, multi-site orchestration, role-based security, and environmental footprint tracking.

## 📚 Table of Contents

- [✨ What it does](#-what-it-does)
- [🗂️ Repository Structure](#️-repository-structure)
- [🚀 Quickstart](#-quickstart)
- [🛠️ Development](#️-development)
- [🐳 Local Services](#-local-services)
- [🧩 Submodules](#-submodules)

## ✨ What it does

- 🧠 **Orchestration** — production chains embedding processing chains, with rich dependency rules (`ON_SUCCESS`, `ON_FAILURE`, converging, conditional, data-availability)
- ⚖️ **Smart scheduling** — Best-Fit-Decreasing bin-packing across nodes, weighted project fairness, aging to prevent starvation, GPU-aware placement
- 🎯 **Multiple triggering modes** — manual, API, scheduled (time-based), event-based, data-driven (post-ingestion)
- 📦 **Container runtimes** — Docker for cloud/on-prem, Apptainer for HPC, selected per project
- 🌐 **Multi-site / master-slave** — distributed DPMC instances coordinating via REST APIs, supporting cloud-bursting, federation, and disaster recovery
- 🔐 **Security** — OAuth2/JWT via Keycloak, RBAC (external-viewers / internal-viewers / operators / admins), all DB access funnelled through the API
- 🔢 **Versioning** — coexistence of multiple processor versions (SXAC = Software × Auxiliary Configuration) and multiple product versions
- 🌱 **Environmental footprint** — per-job and per-project CO₂e estimates from CPU usage, storage, and data transfers (PUE-aware)

## 🗂️ Repository Structure

```
apps/
  api/             # NestJS REST/OData API — abstraction layer over the DPMC database
  web/             # Next.js frontend — operator console & monitoring
  docs/            # Documentation site
  worker/          # Python worker — runs on each compute node, registers itself,
                   # reports status, executes processing jobs (submodule → dpmc-worker)
  dispatcher/      # Python task orchestrator — production-chain runner,
                   # job scheduler, dispatcher (submodule → dpmc-dispatcher)

packages/
  client/          # @dpmc/client      — shared API client (ts-rest, zod schemas)
  prisma/          # @dpmc/prisma      — database schema & generated client
  eslint/          # @dpmc/eslint      — shared ESLint config
  prettier/        # @dpmc/prettier    — shared Prettier config
  typescript/      # @dpmc/typescript  — shared tsconfig presets
```

> ℹ️ `apps/worker` and `apps/dispatcher` live in separate repositories and are integrated as git submodules.

## 🚀 Quickstart

Clone with submodules:

```bash
git clone --recurse-submodules -j8 https://gitlab.shared.acrist-services.com/damps/orchestratorevolution/dpmc.git
cd dpmc
pnpm install
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

To make `git pull` / `git checkout` update submodules automatically (global config, set once):

```bash
git config --global submodule.recurse true
```

## 🛠️ Development

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | Start the full stack (`./bin/dpmc-dev`) |
| `pnpm build`       | `turbo run build`                       |
| `pnpm test`        | `turbo run test`                        |
| `pnpm lint`        | `turbo run lint`                        |
| `pnpm check-types` | `turbo run check-types`                 |
| `pnpm format`      | `prettier --write`                      |

## 🐳 Local Services

Docker-based dev hosts (PostgreSQL, Keycloak, MinIO, etc.):

```bash
pnpm dev:hosts:up      # build + up
pnpm dev:hosts:logs    # follow logs
pnpm dev:hosts:down    # stop
```

## 🧩 Submodules

Update submodules to the latest remote `develop`:

```bash
git submodule update --remote --merge
```

After a bump, commit the new pointers from the root:

```bash
git add apps/worker apps/dispatcher
git commit -m "⬆️ (apps) bump submodules"
```
