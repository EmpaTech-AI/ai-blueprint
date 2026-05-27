# Failure Escalation Runbook (WF-05)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice
**Last updated:** 2026-05-27

---

## How to Use This Runbook

Find the failure type that matches what you're seeing. Each entry gives:
1. **Symptom** — what you observe
2. **Diagnosis** — how to confirm it
3. **Resolution** — what to do
4. **Escalation** — when to stop and ask for help

Start with the symptom. Do not skip to escalation — most failures have a self-service resolution.

---

## Failure 1 — Gate FAIL (exit code 1)

### Symptom

```
GATE 1: FAIL — violations detected. See report above. DO NOT invoke blueprint-maturity.
```

The wrapper exits with code `1`. The dossier file exists but is not valid.

### Diagnosis

Read the harness report printed above the gate line. Key fields:
- Which rules failed (e.g. `section_c_count`, `pandoc_artifact_detected`, `required_section_missing`)
- Which section the failure is in
- The exact message

To re-run the gate independently:
```bash
bash harness/gate.sh outputs/BP-2026-001/dossier_BP-2026-001.md
```

To get machine-readable failure detail:
```bash
python3 harness/validate_intake.py outputs/BP-2026-001/dossier_BP-2026-001.md --json | jq '.issues[] | select(.severity=="FAIL")'
```

### Resolution by failure type

**`required_section_missing`** — One or more of Sections A–H or JUSTIFICATION is absent.

→ Check the individual chunk files in `outputs/BP-2026-001/chunks/`. Which chunk is truncated?
→ If `chunk_2.md` ends without "CHECKPOINT 2": the model truncated mid-Section D. Re-run the wrapper. If the same chunk consistently truncates, reduce the amount of context in `materials.json` or split large form responses.
→ If `chunk_3.md` is missing or very short: re-run the wrapper.

**`pandoc_artifact_detected`** — The gate received a DOCX-roundtripped file.

→ You ran the gate on the wrong file. Use the `.md` file, not any `.docx` file.
→ Correct gate invocation: `bash harness/gate.sh outputs/.../dossier_....md`
→ This is an operator error, not a model error. No re-run needed.

**`section_c_count`** — Section C has the wrong number of pain points (not 8).

→ Open `outputs/BP-2026-001/chunks/chunk_2.md` and count `### Pain Point` headings.
→ If fewer than 8: the model produced an incomplete list. Re-run the wrapper.
→ If more than 8: the model over-generated. This is rare. Re-run the wrapper.

**`section_d_count`** — Section D has the wrong number of hypotheses (not 7).

→ Same diagnosis as `section_c_count`. Open `chunk_2.md` and count `### Hypothesis` headings.
→ Re-run the wrapper.

**`selection_score_missing`** — One or more hypotheses is missing the mandatory `**Selection score:**` line.

→ Open `chunk_2.md` and find the hypothesis without the score line.
→ Option A: Re-run the wrapper (preferred — deterministic fix).
→ Option B: Manually add the missing line in the format: `**Selection score:** Impact N × Feasibility N × Alignment N = **[product]** | [Classification]` — then re-run the gate.

**`heading_format_violation`** — Headings are using bold+triple-hyphens instead of H3+em-dash.

→ This usually indicates a model-side format regression. Re-run the wrapper.
→ If the violation persists across multiple re-runs: check if the SKILL.md heading block is intact (look for "Critical: Mandatory Heading Formats" section).

**`section_a_word_count`** — Section A exceeds 350 words.

→ This is a common failure mode. Re-run the wrapper.
→ If Section A consistently exceeds 350 words across multiple runs: check the SKILL.md Section A description — it should say "Hard ceiling: 350 words."
→ Do not manually truncate Section A — it changes the editorial content. Re-run instead.

**`justification_count_low`** — JUSTIFICATION block has fewer entries than Inferred/Assumption tags in the body.

→ This means the model produced Inferred/Assumption tags in the body but did not account for all of them in the JUSTIFICATION appendix.
→ Re-run the wrapper (preferred).
→ If the same gap appears consistently: check the Chunk 3 instructions in SKILL.md.

### When to escalate

Escalate to the Practice Lead if:
- Gate FAIL persists after 3 re-runs on the same materials
- A new failure rule appears that is not listed above
- Gate PASS rate on a new archetype drops below 80%

---

## Failure 2 — Wrapper ERROR (exit code 2)

### Symptom

```
ERROR: [error message]
```

The wrapper exits with code `2`. No dossier may have been produced, or it was produced before the error.

### Diagnosis

Check the log file:
```bash
cat outputs/logs/BP-2026-001_*.jsonl | python3 -m json.tool | grep -A3 '"event": "wrapper_error"'
```

Or check `pipeline_result_*.json` for the `error` field:
```bash
cat outputs/BP-2026-001/pipeline_result_BP-2026-001.json | python3 -m json.tool | grep "error"
```

### Resolution by error type

**`ANTHROPIC_API_KEY not set`**
```
export ANTHROPIC_API_KEY=sk-ant-...
```
Then re-run.

**`materials.json missing required fields`**
→ Open `materials.json` and add the missing field(s): `engagement_ref`, `client_name`, `industry`, or `intake_form`.
→ See `docs/MATERIALS_JSON_CONTRACT.md` for the full schema.

**`SKILL.md not found`**
→ The wrapper is not finding the skill directory. Run the wrapper from the project root, or verify the harness is located at `blueprint-intake/harness/run_intake_automated.py`.
→ Check: `ls backend/src/skills/blueprint-intake/SKILL.md`

**`Rate limit exceeded after N retries`**
→ Your API account hit the per-minute or per-day rate limit.
→ Wait 5–10 minutes and re-run.
→ If this happens consistently: request a higher rate limit through the Anthropic console, or stagger engagement runs.

**`model_not_found` or `model_deprecated`**
→ The configured model has been deprecated by Anthropic.
→ Follow the model deprecation runbook: `harness/RUNBOOK_MODEL_DEPRECATION.md`

**`File not found: dossier_*.md`** (during gate subprocess)
→ The dossier was not written before the gate ran. This usually means an API error interrupted the wrapper during chunk generation.
→ Check the log for which chunk failed, then re-run.

**JSON decode error in `materials.json`**
→ Your `materials.json` has invalid JSON syntax.
→ Validate it: `python3 -m json.tool materials/BP-2026-001.json`
→ Fix the syntax error and re-run.

### When to escalate

Escalate to the Practice Lead if:
- Exit code 2 occurs on a valid `materials.json` with a valid API key
- The error is `anthropic.InternalServerError` for more than 30 minutes
- The error message is unrecognised and the log does not identify the cause

---

## Failure 3 — Transient API Errors

### Symptom

The wrapper pauses (you see "rate_limit_retry" or "api_transient_error" in the log) but eventually completes. Or it completes but took much longer than expected.

### Normal retry behaviour

```
# Normal — these appear in the log and are handled automatically:
{"event": "rate_limit_retry", "retry": 1, "wait_seconds": 5.0}
{"event": "api_transient_error", "status": 529, "retry": 2, "wait_seconds": 10.0}
```

The wrapper retries up to 3 times with exponential backoff. If all 3 retries succeed within the limit, the run completes normally and exits 0.

### When transient errors become a problem

If `retry` reaches 3 and the error persists, the wrapper raises an exception and exits 2. See Failure 2 resolution.

If you see frequent transient errors across multiple engagements:
→ Check the Anthropic status page for a service incident
→ If an incident is ongoing: wait for it to resolve before re-running
→ Log the incident date in the engagement tracker

### Chunk duration anomalies

If a chunk takes more than 5 minutes and the log shows no retries:
→ The API may be under high load (not rate-limited, just slow)
→ Wait — do not kill the process. The wrapper has no timeout for API calls
→ If a chunk takes more than 15 minutes with no response, you may SIGINT (Ctrl+C) safely. The chunk files completed before the interrupted chunk are saved.

---

## Failure 4 — Model Quality Regression

### Symptom

The wrapper exits 0 (gate PASS) but the dossier content is noticeably lower quality than previous engagements:
- Hypothesis selection does not match the input data
- Selection scores are inconsistent with the scoring algorithm
- Section A is generic or fails to cite specific client data
- Pain points repeat similar themes instead of covering distinct issues

### Diagnosis

This is NOT a wrapper failure — the wrapper ran correctly. It is a model output quality issue.

Run the dossier against the AI Output Quality dashboard (the separate quality measurement tool). Check:
- Citation grounding score (target: >80% GREEN)
- Evidence specificity per pain point
- Hypothesis uniqueness (are all 7 distinct?)

Compare against the golden output: `examples/recruitment_meridian_v1.md`

### Resolution

**Option A: Re-run (try once)**
A single low-quality output can result from an unusual model response. Re-run the wrapper once with the same `materials.json`. If the second run is also low quality, move to Option B.

**Option B: Check for model change**
Verify which model version was used:
```bash
cat outputs/BP-2026-001/pipeline_result_BP-2026-001.json | python3 -m json.tool | grep model
```
If the model changed (e.g. Anthropic silently upgraded `claude-opus-4-7` to a new snapshot), follow the model deprecation runbook to shadow-test the new snapshot.

**Option C: Review materials**
If materials are very sparse (few form responses, no documents), lower quality is expected. Review `materials.json` completeness. An engagement with only 3 populated form sections will produce a lower-quality dossier than one with all 7 sections and 5 documents.

### When to escalate

Escalate to the Practice Lead if:
- Two consecutive re-runs produce low-quality dossiers from complete materials
- The AI Output Quality dashboard score drops below 60% GREEN across 3 consecutive engagements
- A previously-ACTIVE archetype suddenly produces structurally inconsistent dossiers

---

## Failure 5 — Truncation Without Gate Failure

### Symptom

The gate PASSES but the dossier seems truncated when you read it — e.g., JUSTIFICATION entries are very sparse, or Section G has only 1 open question.

### Diagnosis

This is a content completeness issue that the harness did not catch as a hard FAIL (it caught it as a WARN or missed it). Check:
```bash
python3 harness/validate_intake.py outputs/BP-2026-001/dossier_BP-2026-001.md --json | jq '.issues[] | select(.severity=="WARN")'
```

Count words in the assembled dossier:
```bash
wc -w outputs/BP-2026-001/dossier_BP-2026-001.md
```
Expected: 4,000–5,500 words. Below 3,500 indicates truncation.

Check chunk word counts in `pipeline_result.json`:
```bash
cat outputs/BP-2026-001/pipeline_result_BP-2026-001.json | python3 -m json.tool | grep -A3 "chunk_number"
```
Chunk 3 below 500 words is a strong truncation indicator.

### Resolution

→ Re-run the wrapper. Chunk 3 truncation is the most common truncation mode — it typically resolves on re-run.
→ If Chunk 3 consistently truncates: reduce the `max_tokens` value for Chunk 3 is already set to 2048, which should be sufficient. Check if Section G or H contains unusual content that is consuming token budget.

### When to escalate

Escalate if:
- Chunk 3 word count is below 300 on 3 consecutive runs
- JUSTIFICATION entries < 3 on every run from complete materials
- The harness consistently passes truncated dossiers (harness coverage gap — file a bug)

---

## Quick Reference

| Exit code | Meaning | First action |
|-----------|---------|-------------|
| 0 (gate PASS) | Success — proceed to Step 2 | None |
| 0 (gate SKIPPED) | Wrapper ran but gate not validated | Run gate manually before Step 2 |
| 1 | Gate FAIL | Read harness report; re-run if structural |
| 2 | Wrapper ERROR | Check log for error type; see Failure 2 |
| Ctrl+C during run | Interrupted | Partial chunks saved; re-run from scratch |

| Log event | Meaning |
|-----------|---------|
| `chunk_complete, within_expected_range: false` | Chunk shorter/longer than expected — check content |
| `chunk_missing_terminator` | Chunk did not end with its expected CHECKPOINT or Final marker |
| `rate_limit_retry` | Handled automatically; no action needed unless `retry: 3` |
| `gate_skipped` | Gate was skipped — validate manually before Step 2 |
| `wrapper_error` | Fatal error — check `error` field |
