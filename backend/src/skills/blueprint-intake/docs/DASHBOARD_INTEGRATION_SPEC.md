# Dashboard Integration Specification (DB-01)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice / Dashboard Team
**Last updated:** 2026-05-27
**Status:** COMPLETE AND READY FOR IMPLEMENTATION

This spec is ready. The dashboard team should acknowledge receipt and implement by the next production rollout cycle. Priority: HIGH.

---

## Background

The AI Output Quality dashboard currently measures **citation grounding** — whether the claims in a dossier are tagged with appropriate confidence tags. This is a useful measure, but it is blind to **structural completeness** — whether all mandatory sections and counts are present.

**The production evidence:** Ivan_Montin runs 1, 2, and 3, plus all V3 dossiers, scored 99%+ GREEN on citation grounding while being structurally incomplete (Section C had 6 of 8 pain points; Sections F, G, and H were entirely missing). The dashboard showed GREEN; the harness showed FAIL. Only the harness is authoritative for gate status.

This spec closes that gap by integrating the harness output into the dashboard as a parallel, non-replaceable signal.

---

## The Two-Signal Model

After integration, the dashboard displays two independent quality signals:

| Signal | Source | What it measures | Replaces the other? |
|--------|--------|-----------------|---------------------|
| **Citation Grounding** | Existing dashboard logic | % of claims tagged with valid confidence tags | No |
| **STRUCTURAL STATUS** | Harness `--json` output | Structural completeness per `intake_v1.0` schema | No |

Both signals must be GREEN for a dossier to be safe to proceed to Step 2. The orchestrator's GATE 1 PASS requirement covers structural status; the dashboard's existing GREEN metric covers citation grounding.

---

## Harness JSON Output Contract

The harness produces the following JSON when called with `--json` flag:

```bash
python3 harness/validate_intake.py path/to/dossier.md --json
```

Output schema:

```json
{
  "passed": true,
  "fail_count": 0,
  "warn_count": 2,
  "issues": [
    {
      "severity": "FAIL",
      "rule": "section_c_count",
      "location": "Section C",
      "message": "Expected 8 pain points, found 6"
    },
    {
      "severity": "WARN",
      "rule": "section_g_count_low",
      "location": "Section G",
      "message": "Only 2 open questions found; expected 3–6"
    }
  ],
  "metrics": {
    "hypotheses": [
      {"position": 1, "title": "AI-Powered CV Formatting"},
      ...
    ],
    "pain_points": [
      {"position": 1, "title": "Manual Candidate Sourcing Bottleneck", "severity": "Critical"},
      ...
    ],
    "weak_tags": [
      {"tag": "Inferred", "sources": "financial summary p.3"},
      ...
    ]
  }
}
```

### Key fields

| Field | Type | Dashboard use |
|-------|------|--------------|
| `passed` | boolean | Determines STRUCTURAL STATUS badge colour |
| `fail_count` | integer | Display alongside badge: "3 structural failures" |
| `warn_count` | integer | Display as secondary indicator |
| `issues[*].rule` | string | Expandable detail view — show rule name + message |
| `issues[*].location` | string | Section reference for drill-down |
| `metrics.hypotheses` | array | Display hypothesis count and titles |
| `metrics.pain_points` | array | Display pain point count and titles |

---

## Dashboard Badge Specification

### STRUCTURAL STATUS badge

Display a badge adjacent to the existing Citation Grounding score, labelled **STRUCTURAL STATUS**.

**Badge states:**

| `passed` | `fail_count` | Badge | Colour |
|----------|-------------|-------|--------|
| `true` | 0 | `STRUCTURAL PASS` | Green (#22C55E) |
| `true` | 0 with warns | `STRUCTURAL PASS (N warnings)` | Green with amber indicator |
| `false` | > 0 | `STRUCTURAL FAIL — N violations` | Red (#EF4444) |
| `null` / not run | — | `GATE NOT RUN` | Grey (#9CA3AF) |

**STRUCTURAL FAIL must NOT be overridden by Citation Grounding score.** A dossier showing 100% GREEN citation grounding with STRUCTURAL FAIL is the exact failure mode this integration exists to detect (Ivan_Montin_3 case).

### Expandable detail panel

When the user clicks the STRUCTURAL STATUS badge, show a panel with:

1. Pass/Fail summary: "3 structural violations, 2 warnings"
2. Violations list (FAIL items): for each issue, show `rule` + `message` + `location`
3. Warnings list (WARN items): for each issue, show same fields
4. Metrics summary: "7 hypotheses detected | 8 pain points detected"
5. Footer: "Schema: intake_v1.0 | Gate: must PASS before blueprint-maturity"

---

## Integration Points

### How the dashboard gets the harness output

**Preferred — run harness server-side on upload:**

```python
import subprocess, json

def run_harness(dossier_path: str) -> dict:
    result = subprocess.run(
        ["python3", "harness/validate_intake.py", dossier_path, "--json"],
        capture_output=True,
        text=True
    )
    if result.returncode == 2:
        return {"passed": None, "fail_count": 0, "warn_count": 0, "issues": [], "metrics": {}}
    return json.loads(result.stdout)
```

Trigger this on every dossier `.md` upload. Store the result alongside the dossier in the engagement record. See `docs/DASHBOARD_REFRESH_PROCEDURE.md` for timing and error handling.

**Alternative — consume `pipeline_result.json`:**

The automation wrapper writes `pipeline_result_<engagement_ref>.json` which includes:
- `gate_result`: "PASS" / "FAIL" / "SKIPPED"
- `gate_fail_count`: integer
- `gate_output`: full text output of the gate

This is a coarser signal (pass/fail only, no rule breakdown). Use the `--json` harness output for the full breakdown.

---

## Known Incomplete Case — Test Target

**Test the STRUCTURAL FAIL badge against the Ivan_Montin_3 Chunk 1–only dossier.**

This dossier was produced in May 2026 and scored 100% GREEN on citation grounding despite being structurally incomplete. It has:
- Sections A and B only (Sections C–H and JUSTIFICATION missing)
- All tags correctly formatted → citation grounding = 100% GREEN

Expected harness output when `--json` is run on this dossier:
```json
{
  "passed": false,
  "fail_count": 5,
  "issues": [
    {"severity": "FAIL", "rule": "required_section_missing", "location": "Section C", ...},
    {"severity": "FAIL", "rule": "required_section_missing", "location": "Section D", ...},
    {"severity": "FAIL", "rule": "required_section_missing", "location": "Section G", ...},
    {"severity": "FAIL", "rule": "required_section_missing", "location": "Section H", ...},
    {"severity": "FAIL", "rule": "required_section_missing", "location": "JUSTIFICATION", ...}
  ]
}
```

**Dashboard expected state:** STRUCTURAL FAIL (5 violations) — in RED — despite citation grounding being 100% GREEN. This is the target test case.

If the Ivan_Montin_3 fixture is not available, reproduce it by truncating any valid dossier after Section B. The harness will detect the same pattern.

---

## Implementation Checklist (for Dashboard Team)

- [ ] Acknowledge receipt of this spec
- [ ] Add harness invocation to dossier upload handler (server-side)
- [ ] Store harness JSON output in engagement record (alongside dossier)
- [ ] Add STRUCTURAL STATUS badge to dossier view
- [ ] Implement expandable detail panel
- [ ] Test against a PASS dossier — badge shows green
- [ ] Test against Ivan_Montin_3 (or truncated fixture) — badge shows STRUCTURAL FAIL despite high grounding score
- [ ] Test GATE NOT RUN state (new upload before harness runs)
- [ ] Demo to Practice Lead before production rollout
