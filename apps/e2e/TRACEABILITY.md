# Requirements Traceability Matrix

Source: DAMPS.ACR.DOC.031 - i1r2 - EOCP Design Document

> Auto-generated from `@covers EOCP-Ex-yy` tags in e2e specs. Last update: 2026-05-07T14:46:45.823Z.
> Do not edit by hand — re-run `pnpm --filter @dpmc/e2e test:report` to refresh.

**Legend:** Covered | Not covered | N/A (not testable via e2e)

## E1 — Architecture

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E1-01 | Modularity — components decoupled | N/A | t01/t01.1.e2e-spec.ts, t01/t01.2.e2e-spec.ts, t01/t01.3.e2e-spec.ts |
| EOCP-E1-02 | Standardized REST APIs | Not covered | — |
| EOCP-E1-03 | Portability, observability, resilience | N/A | t01/t01.5.e2e-spec.ts |
| EOCP-E1-04 | Security in system design | Not covered | — |
| EOCP-E1-05 | DB normalization, naming conventions | N/A | t01/t01.4.e2e-spec.ts |

## E2 — Production Modes

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E2-01 | Multiple production modes | Covered | t02/t02.1.e2e-spec.ts, t02/t02.3.e2e-spec.ts, t02/t02.4.e2e-spec.ts |
| EOCP-E2-02 | Mode-specific rules | Covered | t02/t02.2.e2e-spec.ts, t02/t02.3.e2e-spec.ts, t02/t02.4.e2e-spec.ts |

## E3 — Automatic Node Selection

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E3-01 | Evaluate resource requirements before dispatching | Not covered | — |
| EOCP-E3-02 | Automatic node selection | Not covered | — |
| EOCP-E3-03 | Declare task requirements statically or dynamically | Not covered | — |
| EOCP-E3-04 | GPU resource management | Not covered | — |
| EOCP-E3-05 | Nodes self-register | Covered | t03/t03.5.e2e-spec.ts |
| EOCP-E3-06 | Nodes declare status | Covered | t03/t03.6.e2e-spec.ts |
| EOCP-E3-07 | Nodes update characteristics in real-time | Covered | t03/t03.7.e2e-spec.ts |

## E4 — Production Chain Embedding

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E4-01 | Processing chains — linear process flows | Not covered | — |
| EOCP-E4-02 | Request/batch structure kept | Not covered | — |
| EOCP-E4-03 | Production chains embed multiple processing chains | Not covered | — |
| EOCP-E4-04 | Processing chains reusable | Not covered | — |
| EOCP-E4-05 | Conditional execution based on params | Not covered | — |
| EOCP-E4-06 | Conditional execution (A before B) | Not covered | — |
| EOCP-E4-07 | Parallel chain detection | Not covered | — |

## E5 — Task Dependency Rules

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E5-01 | Explicit task dependencies | Not covered | — |
| EOCP-E5-02 | DAG-based dependencies | Not covered | — |
| EOCP-E5-03 | Declarative dependency model | Not covered | — |
| EOCP-E5-04 | Dependency types: success, failure, completion | Not covered | — |
| EOCP-E5-05 | Runtime dependency resolution | Not covered | — |

## E6 — Scheduling System

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E6-01 | Scheduling engine | Not covered | — |
| EOCP-E6-02 | Multi-site production | Not covered | — |
| EOCP-E6-03 | Job dispatcher | Not covered | — |
| EOCP-E6-04 | Queue manager | Not covered | — |
| EOCP-E6-05 | Node registry & health monitoring | Not covered | — |
| EOCP-E6-06 | Execution engine interface | Not covered | — |
| EOCP-E6-07 | Persistence layer | Not covered | — |
| EOCP-E6-08 | Federated scheduling | Not covered | — |
| EOCP-E6-09 | Priority engine | Not covered | — |
| EOCP-E6-10 | Elastic compute pools | Not covered | — |
| EOCP-E6-11 | Fault tolerance & rescheduling | Not covered | — |

## E7 — Triggering Modes

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E7-01 | Multiple triggering mechanisms | Not covered | — |
| EOCP-E7-02 | Manual triggering | Not covered | — |
| EOCP-E7-03 | Triggering via API | Not covered | — |
| EOCP-E7-04 | Data-driven triggering | Not covered | — |
| EOCP-E7-05 | Event-based triggering | Not covered | — |
| EOCP-E7-06 | Scheduled triggering | Not covered | — |

## E8 — Versioning (Processors)

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E8-01 | Multiple processor versions coexist | Covered | t08/t08.1.e2e-spec.ts, t08/t08.2.e2e-spec.ts |
| EOCP-E8-02 | Version selectable and traceable | Covered | t08/t08.1.e2e-spec.ts, t08/t08.2.e2e-spec.ts, t08/t08.3.e2e-spec.ts |
| EOCP-E8-03 | Versioning covers executables and aux files | Covered | t08/t08.3.e2e-spec.ts |

## E9 — Task Tables

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E9-01 | Task Tables to DB conversion | Not covered | — |
| EOCP-E9-02 | Automated TT ingestion | Not covered | — |
| EOCP-E9-03 | TT conversions traceable | Not covered | — |

## E10 — Priority Management

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E10-01 | Priority levels for tasks/chains | Not covered | — |
| EOCP-E10-02 | Priority weights | Not covered | — |
| EOCP-E10-03 | Dynamic execution order by priority | Not covered | — |
| EOCP-E10-04 | Launch jobs when no resources | Not covered | — |

## E11 — APIs

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E11-01 | REST APIs for launching/querying | Covered | t11/t11.1.e2e-spec.ts |
| EOCP-E11-02 | APIs for job lifecycle | Covered | t11/t11.15.e2e-spec.ts, t11/t11.16.e2e-spec.ts, t11/t11.2.e2e-spec.ts |
| EOCP-E11-03 | APIs for task status reporting | Covered | t11/t11.10.e2e-spec.ts, t11/t11.3.e2e-spec.ts |
| EOCP-E11-04 | APIs for resource reservation | Covered | t11/t11.11.e2e-spec.ts, t11/t11.4.e2e-spec.ts |
| EOCP-E11-05 | APIs for metadata/catalogue | Covered | t11/t11.12.e2e-spec.ts, t11/t11.5.e2e-spec.ts |
| EOCP-E11-06 | APIs for system modifications | Covered | t11/t11.14.e2e-spec.ts, t11/t11.6.e2e-spec.ts |
| EOCP-E11-07 | API pagination, filtering, auth | Covered | t11/t11.13.e2e-spec.ts, t11/t11.7.e2e-spec.ts, t11/t11.8.e2e-spec.ts, t11/t11.9.e2e-spec.ts |

## E12 — Security

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E12-01 | User authentication | Covered | t12/t12.1.e2e-spec.ts, t12/t12.2.e2e-spec.ts |
| EOCP-E12-02 | Role-based access control | Covered | t12/t12.3.e2e-spec.ts |
| EOCP-E12-03 | Secure communication (HTTPS) | N/A | — |
| EOCP-E12-04 | Security event logging | Not covered | — |
| EOCP-E12-05 | External IAM integration | Not covered | — |

## E13 — Docker vs Apptainers

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E13-01 | Docker/Apptainer execution | Not covered | — |
| EOCP-E13-02 | Standard container interface | Not covered | — |
| EOCP-E13-03 | Container security/resource limits | Not covered | — |

## E14 — Versioning (Products)

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E14-01 | Multiple product versions coexist | Not covered | — |
| EOCP-E14-02 | Product versions traceable | Not covered | — |
| EOCP-E14-03 | Version selection at config level | Not covered | — |

## E15 — Environmental Footprint

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E15-01 | Resource consumption metrics | Not covered | — |
| EOCP-E15-02 | Metrics per task/chain/batch | Not covered | — |
| EOCP-E15-03 | Export for trend analysis | Not covered | — |

---

## Summary

| Status | Count | % |
|---|---|---|
| Covered | 17 | 23% |
| Not covered | 53 | 72% |
| N/A | 4 | 5% |
| **Total** | **74** | |

Coverage: **23%** of testable requirements covered.
