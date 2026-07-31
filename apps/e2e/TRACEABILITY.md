# Requirements Traceability Matrix

Source: DAMPS.ACR.DOC.031 - i1r2 - EOCP Design Document

> Auto-generated from `@covers EOCP-Ex-yy` tags in e2e specs. Last update: 2026-07-30T07:21:38.259Z.
> Do not edit by hand — re-run `pnpm --filter @dpmc/e2e test:report` to refresh.

**Legend:** Covered | Not covered | Not applicable (with its reason)

## E1 — Architecture

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E1-01 | Modularity — components decoupled | Covered | t01/t01.1.e2e-spec.ts, t01/t01.2.e2e-spec.ts, t01/t01.3.e2e-spec.ts |
| EOCP-E1-02 | Standardized REST APIs | Covered | t01/t01.2.e2e-spec.ts, t11/t11.1.e2e-spec.ts |
| EOCP-E1-03 | Portability, observability, resilience | Covered | t01/t01.5.e2e-spec.ts |
| EOCP-E1-04 | Security in system design | Covered | t12/t12.4.e2e-spec.ts, t12/t12.8.e2e-spec.ts |
| EOCP-E1-05 | DB normalization, naming conventions | Covered | t01/t01.4.e2e-spec.ts |

## E2 — Production Modes

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E2-01 | Multiple production modes | Covered | t02/t02.1.e2e-spec.ts, t02/t02.3.e2e-spec.ts, t02/t02.4.e2e-spec.ts |
| EOCP-E2-02 | Mode-specific rules | Covered | t02/t02.2.e2e-spec.ts, t02/t02.3.e2e-spec.ts, t02/t02.4.e2e-spec.ts |

## E3 — Automatic Node Selection

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E3-01 | Evaluate resource requirements before dispatching | Covered | t03/t03.1.e2e-spec.ts, t03/t03.8.e2e-spec.ts, t03/t03.9.e2e-spec.ts |
| EOCP-E3-02 | Automatic node selection | Covered | t03/t03.10.e2e-spec.ts, t03/t03.11.e2e-spec.ts, t03/t03.12.e2e-spec.ts, t03/t03.13.e2e-spec.ts, t03/t03.16.e2e-spec.ts, t03/t03.2.e2e-spec.ts, t03/t03.9.e2e-spec.ts |
| EOCP-E3-03 | Declare task requirements statically or dynamically | Covered | t03/t03.1.e2e-spec.ts, t03/t03.3.e2e-spec.ts |
| EOCP-E3-04 | GPU resource management | Covered | t03/t03.4.e2e-spec.ts |
| EOCP-E3-05 | Nodes self-register | Covered | t03/t03.5.e2e-spec.ts |
| EOCP-E3-06 | Nodes declare status | Covered | t03/t03.13.e2e-spec.ts, t03/t03.6.e2e-spec.ts |
| EOCP-E3-07 | Nodes update characteristics in real-time | Covered | t03/t03.14.e2e-spec.ts, t03/t03.7.e2e-spec.ts |

## E4 — Production Chain Embedding

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E4-01 | Processing chains — linear process flows | Covered | t04/t04.1.e2e-spec.ts, t04/t04.6.e2e-spec.ts, t04/t04.8.e2e-spec.ts |
| EOCP-E4-02 | Request/batch structure kept | Covered | t04/t04.2.e2e-spec.ts, t04/t04.9.e2e-spec.ts |
| EOCP-E4-03 | Production chains embed multiple processing chains | Covered | t04/t04.12.e2e-spec.ts, t04/t04.3.e2e-spec.ts, t04/t04.7.e2e-spec.ts |
| EOCP-E4-04 | Processing chains reusable | Covered | t04/t04.10.e2e-spec.ts, t04/t04.4.e2e-spec.ts |
| EOCP-E4-05 | Conditional execution based on params | Covered | t04/t04.11.e2e-spec.ts, t04/t04.5.e2e-spec.ts |
| EOCP-E4-06 | Conditional execution (A before B) | Covered | t04/t04.11.e2e-spec.ts |
| EOCP-E4-07 | Parallel chain detection | Covered | t05/t05.2.e2e-spec.ts |

## E5 — Task Dependency Rules

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E5-01 | Explicit task dependencies | Covered | t05/t05.13.e2e-spec.ts |
| EOCP-E5-02 | DAG-based dependencies | Covered | t05/t05.10.e2e-spec.ts, t05/t05.4.e2e-spec.ts, t05/t05.8.e2e-spec.ts |
| EOCP-E5-03 | Declarative dependency model | Covered | t05/t05.11.e2e-spec.ts, t05/t05.12.e2e-spec.ts, t05/t05.3.e2e-spec.ts, t05/t05.7.e2e-spec.ts |
| EOCP-E5-04 | Dependency types: success, failure, completion | Covered | t05/t05.1.e2e-spec.ts, t05/t05.13.e2e-spec.ts, t05/t05.5.e2e-spec.ts, t05/t05.9.e2e-spec.ts |
| EOCP-E5-05 | Runtime dependency resolution | Covered | t05/t05.1.e2e-spec.ts, t05/t05.14.e2e-spec.ts, t05/t05.6.e2e-spec.ts |

## E6 — Scheduling System

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E6-01 | Scheduling engine | Covered | t06/t06.1.e2e-spec.ts, t06/t06.15.e2e-spec.ts, t06/t06.2.e2e-spec.ts |
| EOCP-E6-02 | Multi-site production | Not applicable | _Multi-site production is not part of the delivered system_ |
| EOCP-E6-03 | Job dispatcher | Covered | t06/t06.16.e2e-spec.ts, t06/t06.2.e2e-spec.ts, t06/t06.4.e2e-spec.ts |
| EOCP-E6-04 | Queue manager | Covered | t06/t06.19.e2e-spec.ts, t06/t06.5.e2e-spec.ts |
| EOCP-E6-05 | Node registry & health monitoring | Covered | t06/t06.13.e2e-spec.ts, t06/t06.6.e2e-spec.ts |
| EOCP-E6-06 | Execution engine interface | Covered | t06/t06.20.e2e-spec.ts, t06/t06.7.e2e-spec.ts |
| EOCP-E6-07 | Persistence layer | Covered | t06/t06.21.e2e-spec.ts, t06/t06.8.e2e-spec.ts |
| EOCP-E6-08 | Federated scheduling | Not applicable | _Federated scheduling is not part of the delivered system_ |
| EOCP-E6-09 | Priority engine | Covered | t06/t06.18.e2e-spec.ts |
| EOCP-E6-10 | Elastic compute pools | Covered | t06/t06.10.e2e-spec.ts, t06/t06.23.e2e-spec.ts |
| EOCP-E6-11 | Fault tolerance & rescheduling | Covered | t06/t06.12.e2e-spec.ts, t06/t06.14.e2e-spec.ts, t06/t06.20.e2e-spec.ts, t06/t06.24.e2e-spec.ts |

## E7 — Triggering Modes

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E7-01 | Multiple triggering mechanisms | Covered | t07/t07.1.e2e-spec.ts, t07/t07.9.e2e-spec.ts |
| EOCP-E7-02 | Manual triggering | Covered | t07/t07.10.e2e-spec.ts, t07/t07.2.e2e-spec.ts |
| EOCP-E7-03 | Triggering via API | Covered | t07/t07.11.e2e-spec.ts, t07/t07.3.e2e-spec.ts |
| EOCP-E7-04 | Data-driven triggering | Covered | t07/t07.4.e2e-spec.ts, t07/t07.7.e2e-spec.ts |
| EOCP-E7-05 | Event-based triggering | Covered | t07/t07.12.e2e-spec.ts, t07/t07.5.e2e-spec.ts, t07/t07.8.e2e-spec.ts |
| EOCP-E7-06 | Scheduled triggering | Covered | t07/t07.13.e2e-spec.ts, t07/t07.6.e2e-spec.ts |

## E8 — Versioning (Processors)

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E8-01 | Multiple processor versions coexist | Covered | t08/t08.1.e2e-spec.ts, t08/t08.4.e2e-spec.ts |
| EOCP-E8-02 | Version selectable and traceable | Covered | t08/t08.2.e2e-spec.ts, t08/t08.5.e2e-spec.ts |
| EOCP-E8-03 | Versioning covers executables and aux files | Covered | t08/t08.3.e2e-spec.ts, t08/t08.4.e2e-spec.ts, t08/t08.6.e2e-spec.ts |

## E9 — Task Tables

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E9-01 | Task Tables to DB conversion | Covered | t09/t09.1.e2e-spec.ts, t09/t09.4.e2e-spec.ts |
| EOCP-E9-02 | Automated TT ingestion | Covered | t09/t09.2.e2e-spec.ts, t09/t09.5.e2e-spec.ts |
| EOCP-E9-03 | TT conversions traceable | Covered | t09/t09.3.e2e-spec.ts, t09/t09.6.e2e-spec.ts |

## E10 — Priority Management

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E10-01 | Priority levels for tasks/chains | Covered | t10/t10.11.e2e-spec.ts, t10/t10.2.e2e-spec.ts |
| EOCP-E10-02 | Priority weights | Covered | t10/t10.11b.e2e-spec.ts, t10/t10.3.e2e-spec.ts, t10/t10.6.e2e-spec.ts |
| EOCP-E10-03 | Dynamic execution order by priority | Covered | t10/t10.1.e2e-spec.ts, t10/t10.10.e2e-spec.ts, t10/t10.7.e2e-spec.ts |
| EOCP-E10-04 | Launch jobs when no resources | Covered | t10/t10.4.e2e-spec.ts, t10/t10.8.e2e-spec.ts |

## E11 — APIs

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E11-01 | REST APIs for launching/querying | Covered | t11/t11.1.e2e-spec.ts, t11/t11.10.e2e-spec.ts, t11/t11.12.e2e-spec.ts, t11/t11.15.e2e-spec.ts, t11/t11.16.e2e-spec.ts |
| EOCP-E11-02 | APIs for job lifecycle | Covered | t11/t11.11.e2e-spec.ts, t11/t11.2.e2e-spec.ts |
| EOCP-E11-03 | APIs for task status reporting | Covered | t11/t11.3.e2e-spec.ts |
| EOCP-E11-04 | APIs for resource reservation | Covered | t11/t11.4.e2e-spec.ts |
| EOCP-E11-05 | APIs for metadata/catalogue | Covered | t11/t11.5.e2e-spec.ts |
| EOCP-E11-06 | APIs for system modifications | Covered | t11/t11.14.e2e-spec.ts, t11/t11.6.e2e-spec.ts |
| EOCP-E11-07 | API pagination, filtering, auth | Covered | t11/t11.13.e2e-spec.ts, t11/t11.7.e2e-spec.ts, t11/t11.8.e2e-spec.ts, t11/t11.9.e2e-spec.ts |

## E12 — Security

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E12-01 | User authentication | Covered | t12/t12.1.e2e-spec.ts, t12/t12.2.e2e-spec.ts, t12/t12.9.e2e-spec.ts |
| EOCP-E12-02 | Role-based access control | Covered | t12/t12.10.e2e-spec.ts, t12/t12.3.e2e-spec.ts, t12/t12.4.e2e-spec.ts |
| EOCP-E12-03 | Secure communication (HTTPS) | Covered | t12/t12.11.e2e-spec.ts, t12/t12.5.e2e-spec.ts, t12/t12.8.e2e-spec.ts |
| EOCP-E12-04 | Security event logging | Covered | t12/t12.12.e2e-spec.ts, t12/t12.6.e2e-spec.ts |
| EOCP-E12-05 | External IAM integration | Covered | t12/t12.13.e2e-spec.ts, t12/t12.7.e2e-spec.ts |

## E13 — Docker vs Apptainers

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E13-01 | Docker/Apptainer execution | Covered | t13/t13.4.e2e-spec.ts |
| EOCP-E13-02 | Standard container interface | Covered | t13/t13.2.e2e-spec.ts, t13/t13.6.e2e-spec.ts |
| EOCP-E13-03 | Container security/resource limits | Covered | t13/t13.3.e2e-spec.ts — _Verified on the resource-limits aspect; container hardening is not part of the delivered system_ |

## E14 — Versioning (Products)

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E14-01 | Multiple product versions coexist | Covered | t14/t14.1.e2e-spec.ts, t14/t14.4.e2e-spec.ts |
| EOCP-E14-02 | Product versions traceable | Covered | t14/t14.2.e2e-spec.ts, t14/t14.5.e2e-spec.ts |
| EOCP-E14-03 | Version selection at config level | Covered | t14/t14.3.e2e-spec.ts, t14/t14.6.e2e-spec.ts |

## E15 — Environmental Footprint

| ID | Requirement | Status | Test files |
|---|---|---|---|
| EOCP-E15-01 | Resource consumption metrics | Covered | t15/t15.1.e2e-spec.ts, t15/t15.4.e2e-spec.ts |
| EOCP-E15-02 | Metrics per task/chain/batch | Covered | t15/t15.2.e2e-spec.ts, t15/t15.5.e2e-spec.ts, t15/t15.6.e2e-spec.ts |
| EOCP-E15-03 | Export for trend analysis | Covered | t15/t15.3.e2e-spec.ts, t15/t15.7.e2e-spec.ts |

---

## Summary

| Status | Count | % of in-scope |
|---|---|---|
| Covered | 72 | 100% |
| Not covered | 0 | 0% |
| **In scope** | **72** | |
| Not applicable | 2 | — |
| **Total** | **74** | |

Coverage: **100%** of in-scope requirements covered.

### Not applicable

Not addressed by this delivery, and not a testing limitation:

- **EOCP-E6-02** Multi-site production — Multi-site production is not part of the delivered system
- **EOCP-E6-08** Federated scheduling — Federated scheduling is not part of the delivered system
