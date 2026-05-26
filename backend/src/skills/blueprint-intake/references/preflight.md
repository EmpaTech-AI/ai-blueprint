# Pre-Flight Sanitization

**Schema:** `intake_v1.0`
**Purpose:** Remove deliverable-integrity defects before the dossier reaches any reviewer. Closes Defect 6 (the title-leak and orchestrator-preamble failure mode that disqualified TEST 2).

---

## Operating Principle

The pipeline strips contamination before assembly. The skill never gets to "decide" whether to include test metadata or pipeline acknowledgements — those patterns are removed mechanically, every run, every time.

## Forbidden Patterns

The harness rejects any dossier containing any of these patterns. The pipeline's pre-flight step removes them before validation runs.

### Pattern Set 1 — Test Metadata in Header

Any of these in the document title, subtitle, or header block fails:

```regex
TEST[\s_]?\d+              e.g. "TEST 1", "TEST_2", "TEST3"
temp[\s_]?\d+              e.g. "temp 0", "temp_1", "temp42"
TEMP\d+                    e.g. "TEMP0"
DEBUG                      any case
DRAFT v\d+                 unless deliverable is explicitly a draft
PILOT[\s_]?\d+             unless deliverable is explicitly a pilot
\bv\d+\.\d+\.dev\b         dev version markers
```

### Pattern Set 2 — Pipeline Stage Acknowledgements

Any opening paragraph beginning with any of these (case-insensitive, anchored to paragraph start) fails:

```regex
^I have confirmed
^I have received
^I confirm receipt
^All inputs are complete
^Proceeding to (final assembly|analysis|the next step)
^Step \d+ \(
^Beginning (Stage|Step|Phase) \d+
^Inputs verified
^All upstream outputs (received|confirmed)
^Acknowledgement of receipt
^No missing sections
^No unresolved placeholders
```

### Pattern Set 3 — Orchestrator Internal Annotations

Any of these strings anywhere in the body fails:

```
"Step 1 (Intake):"
"Step 2 (Maturity):"
"Step 3 (Opportunities):"
"Step 4 (Roadmap):"
"Step 5 (Assembly):"
"upstream output"
"downstream skill"     (acceptable in body context — methodology reference; rejected only in dossier prose)
"orchestrator"         (acceptable in references section; rejected in dossier prose)
```

### Pattern Set 4 — Methodology References Misplaced in Body

These belong in operational documentation, not in client-facing or downstream-facing dossier content:

```
"per the methodology"      (acceptable in [JUSTIFICATION] appendix only)
"this skill produces"      (rejected anywhere — meta-reference)
"the schema requires"      (rejected anywhere — meta-reference)
"per schema intake_v1.0"   (rejected in body; acceptable in header block only)
```

### Pattern Set 5 — Forbidden Confidence Phrasings

Per `confidence_thresholds.md`:

```
\[Likely\]
\[Probably\]
\[Estimated\]              (use [Inferred] or [Assumption] instead)
\[Document-Backed?\]       (must be full "Document-Backed", not "Doc-Backed")
\[Form Stated\]            (must be "Form-Stated" with hyphen)
```

## Pre-Flight Pipeline Steps

The pipeline runs these steps **in order** before the dossier is presented:

### Step 1 — Header Sanitization

1. Inspect the title field. If it matches Pattern Set 1, strip the matching substring and log the removal.
2. Inspect the subtitle field. If it matches Pattern Set 1, strip the matching substring and log.
3. If the cleaned title is empty after stripping, fail the run with explicit error: "Title contains only forbidden patterns — operator must supply a valid title."

### Step 2 — Leading Paragraph Sanitization

1. Identify the first body paragraph after the header block.
2. If it matches any pattern in Pattern Set 2, remove the entire paragraph.
3. Repeat until the first remaining paragraph is clean.
4. If more than 3 paragraphs are removed, fail the run with: "Excessive scaffolding detected — pipeline output appears corrupted; investigate generator."

### Step 3 — Body Scan

1. Scan all body paragraphs for Pattern Set 3 strings.
2. For each match, fail validation. Body-level contamination is not mechanically recoverable — it signals a deeper assembly problem that requires regeneration, not patching.

### Step 4 — Source Name Normalisation

1. For every citation tag, look up the source name in `source_registry.md`.
2. If the source name is an acceptable alias, normalise to the canonical name.
3. If the source name is unknown, fail validation with: "Unknown source name '<name>' in tag — must match source registry."

### Step 5 — Confidence Tag Normalisation

1. For every citation tag, verify the confidence tag matches the four canonical tags exactly.
2. Reject any malformed tag per Pattern Set 5.

### Step 6 — Final Verification

After all sanitization, run the full validator (`harness/validate_intake.py`). Any failure aborts assembly.

## Operator Override

Pre-flight failures can be overridden only by explicit operator decision documented in a sidecar file `<dossier>.override.md` with:

- The specific pattern overridden
- The reason for override
- The operator's name and date
- The reviewer who countersigns

This trail exists for the audit log. Default behaviour is reject-and-regenerate.

## Logging

Every pre-flight run produces a log entry in `<dossier>.preflight.log` with:

- Timestamp
- Patterns matched (if any)
- Stripped content (verbatim)
- Final status: PASS / FAIL / OVERRIDE

These logs are the audit evidence for the pipeline's QA discipline.
