# Model Deprecation Runbook (WR-05)

**Applies to:** `run_intake_automated.py`
**Current model:** `claude-opus-4-7`
**Owner:** AI Assist BG — Blueprint Practice Lead
**Last reviewed:** 2026-05-27

---

## When This Runbook Applies

Run this procedure when ANY of the following occur:

1. Anthropic announces deprecation of `claude-opus-4-7` (or the current default model)
2. A newer Opus model is released and you want to upgrade
3. Production runs begin returning `model_not_found` or `model_deprecated` API errors
4. Quality review detects regression attributable to a model update

---

## Step 1 — Detect and Confirm

**Deprecation notice sources (check in order):**

1. Anthropic API error message: `{"error": {"type": "model_deprecation", ...}}`
2. Anthropic email to your API account's registered address
3. Anthropic status page / changelog at `status.anthropic.com`
4. Community reports in Anthropic Discord or forums

**Confirm the deprecation date:** Anthropic typically provides a "hard deprecation" date after which the model stops accepting requests. Note this date. You have until that date to migrate.

---

## Step 2 — Identify the Replacement Model

Check the Anthropic documentation for the recommended replacement. Typical naming convention:

| Deprecated | Likely Replacement |
|---|---|
| `claude-opus-4-7` | `claude-opus-4-8` or `claude-opus-5-0` |
| `claude-sonnet-4-6` | `claude-sonnet-4-7` |

**Confirm the replacement model's:**
- Context window (must be ≥ 200K tokens to support the full system prompt + 3-turn conversation)
- Output token limit (must be ≥ 4096 per turn for chunks 1 and 2)
- API availability in your region

---

## Step 3 — Update Pricing Constants

Open `run_intake_automated.py` and update `MODEL_PRICING` with the new model's pricing:

```python
MODEL_PRICING: dict[str, dict[str, float]] = {
    "claude-opus-4-8": {               # ← add new entry
        "input_per_mtok": XX.XX,       # from Anthropic pricing page
        "output_per_mtok": XX.XX,
        "cache_write_per_mtok": XX.XX,
        "cache_read_per_mtok": XX.XX,
    },
    "claude-opus-4-7": { ... },        # keep old entry for historical cost records
    ...
}
```

Update the comment with today's date:
```python
# Verified: YYYY-MM-DD. See RUNBOOK_MODEL_DEPRECATION.md §Pricing Update.
```

---

## Step 4 — Shadow Test (Do Not Skip)

Before switching production, run the new model on a representative engagement in parallel with the current model. Use the `--model` flag:

```bash
# Current model (reference)
python run_intake_automated.py materials/BP-TEST-001.json \
    --engagement-ref TEST-OLD-MODEL \
    --model claude-opus-4-7 \
    --output-dir ./model_test

# New model (candidate)
python run_intake_automated.py materials/BP-TEST-001.json \
    --engagement-ref TEST-NEW-MODEL \
    --model claude-opus-4-8 \
    --output-dir ./model_test
```

**Pass criteria — both dossiers must:**
1. Exit with gate result `PASS`
2. Have the same pain point titles (±minor rephrasing)
3. Have the same hypothesis titles and classification
4. Score ≥ 95% GREEN on the AI Output Quality dashboard

**Fail criteria — escalate to Practice Lead if:**
- Gate fails on new model but not old model
- Hypothesis count changes (must be exactly 7)
- Pain point count changes (must be exactly 8)
- Selection scores diverge by more than 10% for any hypothesis

Use the golden output `examples/recruitment_meridian_v1.md` as the reference. If the golden output fails gate on the new model, the model change has introduced a schema regression — do not proceed without investigating.

---

## Step 5 — Update the Default Model

Once shadow tests pass, update `run_intake_automated.py`:

```python
DEFAULT_MODEL = "claude-opus-4-8"   # was: claude-opus-4-7
```

Update the version comments:
```python
# Current model: claude-opus-4-8 (migrated from claude-opus-4-7 on YYYY-MM-DD)
```

Update this runbook's header:
```
Current model: claude-opus-4-8
Last reviewed: YYYY-MM-DD
```

---

## Step 6 — Update the Orchestrator

The orchestrator skill (`blueprint-orchestrator.md`) version table lists skill versions. Update it to reflect the new model if the skill version bumps:

```markdown
| blueprint-intake | 2.2.0 | intake_v1.0 |   ← bump MINOR for model upgrade
```

---

## Step 7 — Communicate

Notify the team before the hard deprecation date:

- **Slack / email:** "Model migrated from `claude-opus-4-7` → `claude-opus-4-8` on [date]. All new engagements use the new model. In-flight engagements under `claude-opus-4-7`: [list engagement refs]. Those will complete under the old model — do not change their `--model` flag."

**Rule:** In-flight engagements (started but not yet at Step 5) must complete with the model they started under. Do not switch models mid-engagement. The skill version policy in `blueprint-orchestrator.md` §Skill Versioning Policy covers this.

---

## Step 8 — Monitor First Production Run

After the switch, monitor the first live engagement closely:

```bash
# Stream the JSON log in real time
python run_intake_automated.py materials/BP-2026-XXX.json --json 2>/dev/null | jq .

# After completion, check gate result in pipeline_result.json
cat outputs/BP-2026-XXX/pipeline_result_BP-2026-XXX.json | jq '.gate_result, .total_cost_usd'
```

If the gate fails on the first production run under the new model, roll back immediately (see §Rollback below).

---

## Rollback Procedure

If the new model causes gate failures or quality regressions in production:

1. Revert `DEFAULT_MODEL` in `run_intake_automated.py` to the previous model
2. Revert the `MODEL_PRICING` comment date
3. Re-run the failing engagement under the old model using `--model <old-model>`
4. File a regression report: engagement ref, old model, new model, gate failure output
5. Do not attempt the model upgrade again until the regression is understood

---

## Pricing Update Procedure

If pricing changes without a model change (Anthropic adjusts prices):

1. Update `MODEL_PRICING` in `run_intake_automated.py` with the new rates
2. Update the `# Verified:` comment with today's date
3. Update this runbook's "Last reviewed" date
4. No shadow testing required for pricing-only changes (no quality impact)

---

## Historical Model Log

| Model | In service from | Retired | Notes |
|-------|----------------|---------|-------|
| `claude-opus-4-7` | 2026-05-27 | — | Initial production model |
