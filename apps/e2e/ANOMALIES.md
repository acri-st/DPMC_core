# Test Plan — Extraction Anomalies

Source: `test-plan.docx` (DAMPS.ACR.PLN.012 — EOCP Test Plan, i1r2)

This file lists numbering / structural anomalies found in the docx during the automated extraction into `src/constants/test-cases.ts`, and what was changed vs preserved as-is.

## 1. `T034.6` → normalized to `T04.6`

**Where:** Section "T4 - Production chain embedding processing chains", between `T04.5` and `T04.7`.

**Issue:** The heading reads `Test description (T034.6)` in both the Table of Contents (line 88: *"3.5.6Test description (T034.6)51"*) and the body. There is no `T034` section in the document — sections run from `T1` to `T15`. The slot `T04.6` is otherwise missing from the sequence (`T04.1`…`T04.11`).

**Decision:** Treated as a typo for `T04.6`. The case is stored under `id: 'T04.6'` in `test-cases.ts` so it slots correctly into the T4 section and fills the otherwise missing `.6` index.

## 2. `T4.1` — preserved as-is

**Where:** Section "T4", appearing after `T04.11` (TOC line 90: *"3.5.12Test description (T4.1)54"*).

**Issue:** The id format differs from the rest of T4 (`T4.1` vs `T04.x`). The case is the named end-to-end "Warol" integration scenario:

> *This test validates the capability of the system to implement a production chain based on several processing chains.*

It corresponds to the existing `warol.e2e-spec.ts`.

**Decision:** Kept as `T4.1` literally — it is referenced by this id in the docx and serves as the contractual identifier for the named scenario. Section is derived as `T4` from the prefix, so it groups correctly.

## 3. `T5.1` — preserved as-is

**Where:** Section "T5", appearing after `T05.14` (TOC line 105: *"3.6.15Test description (T5.1)62"*).

**Issue:** Same shape as `T4.1` — a named scenario at the end of T5:

> *This test validates the capability of the system to execute processing chains in case of success or failure of the previous one.*

**Decision:** Kept as `T5.1` literally for the same reasons.

## 4. `T10.11` appears **twice** — disambiguated to `T10.11` and `T10.11b`

**Where:** Section "T10 - Priority management". The TOC contains two consecutive entries with the same id:

```
3.11.10  Test description (T10.11)  95
3.11.11  Test description (T10.11)  96
3.11.12  Test description (T10.12)  96
```

**Issue:** Two distinct test cases are both numbered `T10.11`:

| docx id   | Title                                          |
|-----------|------------------------------------------------|
| `T10.11`  | Rejection of invalid priority values           |
| `T10.11`  | Dynamic update of project priority weights     |

**Decision:** Kept the first as `T10.11`, renamed the second to `T10.11b` so each case has a unique id while staying close to the docx labelling. The `b` suffix is documented here so an auditor can match it back.

## 5. `T10.9` is missing — preserved as-is

**Where:** Section T10 jumps from `T10.8` directly to `T10.10`. There is no `T10.9` entry in either the TOC or the body.

**Decision:** Left as a numbering gap — no synthetic case is created. Sequence in the constants file is `T10.1, T10.2, …, T10.8, T10.10, T10.11, T10.11b, T10.12`.

## 6. Section heading vs id prefix inconsistency

The docx labels sections both as `T1` … `T15` (in TOC headings, e.g. "T1 - Design & Core Architecture") and as zero-padded `T01.x` … `T15.x` for case ids. Two sections (T4, T5) also contain unpadded `T4.1` / `T5.1` cases (see 2 and 3 above).

**Decision:** All cases derive their `section` field from the numeric prefix of the id, regardless of zero-padding (`T01.x` → section `T1`; `T4.1` → section `T4`). This keeps `SECTION_TITLES` keyed consistently as `T1`…`T15`.

## Summary

| Anomaly                | Cases impacted   | Action      |
|------------------------|------------------|-------------|
| `T034.6` typo          | 1                | Normalised  |
| Unpadded `T4.1`        | 1                | Preserved   |
| Unpadded `T5.1`        | 1                | Preserved   |
| Duplicate `T10.11`     | 2                | Disambiguated (`T10.11`, `T10.11b`) |
| Missing `T10.9`        | 0                | Preserved (gap) |

**Total cases extracted:** 162 (161 unique docx ids + 1 disambiguated duplicate).

If a future revision of `test-plan.docx` fixes these anomalies, re-running the extractor (`scripts/extract-test-cases.py`, currently inlined in the conversation that produced this) will keep ids stable for already-normalised cases (`T04.6`) and let the duplicate disambiguator pick the same `b` suffix as long as docx order is preserved.
