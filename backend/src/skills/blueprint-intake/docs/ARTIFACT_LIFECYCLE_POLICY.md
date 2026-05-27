# Output Artifact Lifecycle Policy (WF-03)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice
**Last updated:** 2026-05-27

---

## Purpose

This document defines what files the Blueprint intake automation wrapper produces, where they are stored, how long they must be kept, and when they may be deleted. It supports post-hoc audit, GDPR right-to-erasure requests, and storage management.

---

## Artifact Map

For each engagement (e.g. `BP-2026-001`), the wrapper writes the following directory structure:

```
outputs/
└── BP-2026-001/
│   ├── dossier_BP-2026-001.md            ← PRIMARY ARTIFACT
│   ├── pipeline_result_BP-2026-001.json  ← AUDIT RECORD
│   └── chunks/
│       ├── chunk_1.md                    ← DEBUG ARTIFACT
│       ├── chunk_2.md                    ← DEBUG ARTIFACT
│       └── chunk_3.md                    ← DEBUG ARTIFACT
└── logs/
    └── BP-2026-001_20260527T093000Z.jsonl  ← OPERATIONAL LOG
```

---

## Artifact Descriptions

### `dossier_<engagement_ref>.md` — Primary Artifact

**What it is:** The assembled Compressed Client Dossier conforming to schema `intake_v1.0`. This is the output of the 3-chunk workflow after CHECKPOINT blocks are stripped, and after the validation gate has run on it.

**Used by:** All downstream Blueprint skills (blueprint-maturity, blueprint-opportunities, blueprint-roadmap, blueprint-assembly). Read as markdown — never converted to DOCX before downstream use.

**Contains PII:** Yes — client company name, business data, strategic context. May include names of key personnel if mentioned in the intake form or documents.

**Retention:** Keep for the duration of the engagement plus 12 months. After 12 months post-delivery, evaluate whether the client has exercised their right to erasure (see `docs/GDPR_PROCEDURES.md`). If no erasure request, may be retained for 24 months total for quality assurance purposes.

**Deletion:** Delete the primary artifact only after:
1. All downstream deliverables (blueprint-assembly DOCX) have been delivered to the client
2. Any applicable retention period has passed
3. Any GDPR erasure request has been processed

---

### `pipeline_result_<engagement_ref>.json` — Audit Record

**What it is:** Machine-readable record of the engagement run. Contains:
- Gate result (PASS / FAIL / SKIPPED)
- Per-chunk token usage and duration
- Total cost in USD
- Model used
- Schema version
- Error (if any)
- Path to dossier file

**Contains PII:** Minimal — `engagement_ref` and `client_name` only. No substantive client content.

**Retention:** Keep for 36 months. This record supports:
- Invoice reconciliation (cost tracking per engagement)
- Quality audit (which engagements failed gate)
- Schema version traceability
- Dispute resolution

**Deletion:** After 36 months, or upon client right-to-erasure request covering this record.

---

### `chunks/chunk_N.md` — Debug Artifacts

**What they are:** The raw individual API responses before CHECKPOINT block stripping and assembly. Chunk 1 includes the CHECKPOINT 1 block; Chunk 2 includes the CHECKPOINT 2 block.

**Used by:** Debugging only. Useful when the assembled dossier fails gate and you need to isolate which chunk introduced the failure.

**Contains PII:** Yes — same content as the assembled dossier, split across three files.

**Retention:** Keep for 30 days after the engagement closes (gate PASS confirmed). Delete after 30 days unless a gate failure investigation is in progress.

**Deletion:** Chunks may be deleted once:
1. The assembled dossier has passed gate validation
2. 30 days have elapsed since gate PASS

If the gate failed and was re-run, keep all chunk files until the root cause is identified and documented.

---

### `logs/<engagement_ref>_<timestamp>.jsonl` — Operational Log

**What it is:** Structured JSON Lines log of the wrapper run. One JSON object per line, each with `ts`, `level`, `engagement_ref`, `event`, and event-specific fields. Records: prompt build, chunk start/complete, rate-limit retries, gate result, cost summary.

**Contains PII:** Minimal. The log records token counts, timing, and event names. It does not log the content of API responses. The `engagement_ref` and `client_name` appear in log entries.

**Retention:** Keep for 90 days. Used for:
- Debugging wrapper failures
- Monitoring chunk duration trends
- Rate-limit retry frequency monitoring

**Deletion:** After 90 days automatically, or sooner if storage is constrained.

---

## The DOCX Conversion Rule

**The dossier markdown is the authoritative pipeline artifact. The DOCX is for humans only.**

```
[1] dossier_BP-2026-001.md       ← pipeline reads this
[2] validate gate on [1]         ← gate runs on [1]
[3] dossier_BP-2026-001.docx     ← client/archive copy only
```

The DOCX conversion (via pandoc or equivalent) happens AFTER the gate passes. The resulting DOCX:
- Is NOT stored in `outputs/` by this wrapper
- Must NOT be fed back into `validate_intake.py` (produces `pandoc_artifact_detected` FAIL by design)
- Is stored in the client deliverables folder (location defined by the Practice Lead)
- May be deleted from the deliverables folder after client handoff per the Practice Lead's document retention policy

---

## Immutability Rule

Once a `dossier_<engagement_ref>.md` has passed gate validation and downstream skills have begun using it, treat it as **immutable**. Do not edit the dossier file directly. If corrections are needed:

1. Re-run `run_intake_automated.py` with a revised `materials.json`
2. Use a new engagement reference (e.g. `BP-2026-001-R1`) or overwrite deliberately with documented justification
3. Re-run the gate on the new dossier
4. Note the revision in the engagement tracker

---

## Storage Estimates

| Artifact | Typical size | Per engagement |
|----------|-------------|---------------|
| `dossier_*.md` | 30–50 KB | 1 file |
| `pipeline_result_*.json` | 5–10 KB | 1 file |
| `chunk_*.md` (×3) | 20–40 KB each | 3 files, ~100 KB total |
| `*.jsonl` log | 5–20 KB | 1 file |
| **Total per engagement** | **~200 KB** | — |

At 50 engagements per year, total storage grows by ~10 MB/year — negligible. No compression required.

---

## GDPR Right-to-Erasure Procedure

When a client requests erasure of their data:

1. Identify all engagement references for that client (search `pipeline_result_*.json` for `client_name`)
2. Delete `dossier_<ref>.md`, `chunks/chunk_*.md`, `pipeline_result_<ref>.json` for all matching refs
3. Delete the `logs/<ref>_*.jsonl` files for matching refs
4. Record the erasure in the engagement tracker with: date, ref(s) deleted, requestor
5. Notify the Practice Lead

The DOCX deliverable (stored separately) must also be located and deleted per the same procedure.

See `docs/GDPR_PROCEDURES.md` for the full erasure workflow.
