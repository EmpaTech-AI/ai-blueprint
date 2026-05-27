# Dashboard Data Refresh Procedure (DB-02)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice
**Last updated:** 2026-05-27

---

## Overview

This document defines how and when the dashboard pulls structural completeness data from the validation harness, what latency to expect, and how to handle errors when the harness is unavailable.

The primary audience is the dashboard team and the Practice Lead overseeing first-week production rollout.

---

## When the Harness Runs

The harness should run **once per dossier upload event**, triggered server-side. It does not run on a schedule.

### Trigger: Dossier upload

When an operator uploads a `.md` dossier to the dashboard:

1. Dashboard receives the file
2. Dashboard saves the file to its storage (e.g., S3, local disk, SharePoint)
3. Dashboard **immediately** invokes the harness on the saved file (synchronous or async — see §Latency below)
4. Harness JSON output is stored alongside the dossier in the engagement record
5. STRUCTURAL STATUS badge reflects the harness result

**Do not** run the harness on the `.docx` version of a dossier — it will fail with `pandoc_artifact_detected`. Only run on native markdown `.md` files. See `docs/OPERATIONS.md §Gate Invocation Point Policy`.

### Trigger: Re-upload (revised dossier)

If an operator uploads a revised dossier for the same engagement, the harness runs again on the new file. The previous harness result is overwritten. The engagement record shows the latest gate status only.

### NOT a trigger

- Downstream skill outputs (maturity snapshot, opportunity map) do not trigger a harness re-run
- Pipeline result JSON uploads (from `run_intake_automated.py`) do not re-trigger the harness — but they do update the gate result displayed from the `gate_result` field
- Operator manual re-requests of the badge (dashboard should not invoke the harness interactively in response to a button press — invoke on upload, cache the result)

---

## Latency

### Expected timing from upload to badge display

| Step | Expected time |
|------|--------------|
| File upload to dashboard | < 1 second |
| Harness invocation (subprocess) | 0.5–2 seconds |
| Harness JSON written to engagement record | < 0.1 second |
| Badge updated in dashboard UI | < 1 second after write |
| **Total: upload to badge visible** | **< 5 seconds** |

The harness reads only the local `.md` file — no network calls. 2 seconds is a conservative upper bound for a 5,000-word dossier.

### Async vs. synchronous invocation

**Recommended: synchronous** — the upload response does not return to the operator until the harness has run. The UI shows a "Validating..." spinner while the harness runs (< 2 seconds). The badge appears as soon as validation completes.

**Acceptable: async** — the upload response returns immediately, badge shows "GATE NOT RUN" (grey), then updates when the async job completes. Maximum acceptable lag from upload to badge update: **30 seconds**.

**Not acceptable:** Badge remaining in "GATE NOT RUN" state for more than 30 seconds after upload, or requiring a page refresh to update.

---

## Error Handling When Harness Is Unavailable

### Harness not found (file path error)

**Symptom:** subprocess call raises `FileNotFoundError` or exits with code 2 immediately  
**Badge state:** Show "GATE NOT RUN" (grey) with tooltip: "Validator unavailable — contact engineering"  
**Action:** Alert engineering; do not show a false PASS or FAIL

```python
import subprocess, json

def run_harness_safe(dossier_path: str, harness_path: str) -> dict:
    try:
        result = subprocess.run(
            ["python3", harness_path, dossier_path, "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        return _harness_unavailable("harness_not_found")
    except subprocess.TimeoutExpired:
        return _harness_unavailable("harness_timeout")
    except Exception as e:
        return _harness_unavailable(f"harness_exception:{type(e).__name__}")

    if result.returncode == 2:
        return _harness_unavailable("harness_exit_2")

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return _harness_unavailable("harness_invalid_json")


def _harness_unavailable(reason: str) -> dict:
    return {
        "passed": None,
        "fail_count": 0,
        "warn_count": 0,
        "issues": [],
        "metrics": {},
        "_error": reason,
    }
```

When `passed` is `None`, the dashboard shows the grey "GATE NOT RUN" badge regardless of the `_error` field.

### Python not found

If the server running the dashboard does not have Python 3.9+ in PATH:

- The harness cannot run
- Show "GATE NOT RUN" badge permanently
- Log the issue for engineering
- Do not block the operator from uploading — the operator can run the gate manually: `bash harness/gate.sh <dossier_path>`

### Harness exit code 1 (FAIL)

This is a normal harness result — not an infrastructure error. Parse the JSON output and show the STRUCTURAL FAIL badge with the violations list.

### Wrong file type uploaded

If the operator uploads a `.docx` file instead of `.md`:

- Dashboard should warn: "Only `.md` files can be structurally validated. `.docx` files cannot be used as pipeline inputs."
- Do not invoke the harness on `.docx` files — it will produce a `pandoc_artifact_detected` FAIL, which is misleading (the DOCX is not a pipeline artifact; the `.md` is).
- Store the `.docx` for archival only.

---

## Caching Policy

The harness result is stored per `(engagement_ref, dossier_hash)` tuple:

- If the same dossier file is re-uploaded (same content, same hash), return the cached result — do not re-invoke the harness
- If a revised dossier is uploaded (different hash), invalidate the cache and re-run
- Cache TTL: indefinite (harness results are deterministic for a given file + schema version)

**Schema version change:** If the schema version bumps (e.g., `intake_v1.1`), invalidate all cached results and re-run on next access. Schema version is embedded in the dossier header — detect it from the file, not from the engagement record.

---

## Dashboard Metrics to Log

For each harness invocation, log:

```json
{
  "ts": "2026-05-27T09:30:00Z",
  "engagement_ref": "BP-2026-001",
  "dossier_hash": "sha256:abc...",
  "gate_result": "PASS",
  "fail_count": 0,
  "warn_count": 2,
  "harness_duration_ms": 1240,
  "schema_version": "intake_v1.0"
}
```

These logs feed the `monitor_production.py` metrics aggregator (QA-04) and support the gate PASS rate trending that the Practice Lead needs during the first weeks of rollout.

---

## First-Week Rollout Monitoring

During the first two weeks of production use, the Practice Lead should:

1. Monitor gate PASS rate daily: run `python3 harness/monitor_production.py --outputs-dir /path/to/outputs`
2. Review every STRUCTURAL FAIL badge — is it a real structural issue or a harness bug?
3. Track time-to-badge (upload → badge displayed) — target < 5 seconds; escalate if > 30 seconds
4. Confirm the Ivan_Montin_3 test case shows STRUCTURAL FAIL before going live

**Gate PASS rate target:** ≥ 95% after the first 10 engagements (the first few may fail as the team adjusts to the 3-chunk workflow).

---

## Questions for Dashboard Team

Before implementation, confirm:

1. Where is the dashboard hosted? (Cloud function, server, local tool) — determines harness invocation method
2. Is Python 3.9+ available in the dashboard's execution environment?
3. What is the dossier upload mechanism? (Web UI, API, shared folder watch) — determines the trigger integration point
4. Is there an existing async job queue we can use for harness invocation, or should we implement synchronous invocation?

Contact: viktor.serafimov@aiassist.bg
