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

### Pattern Set 6 — Reasoning Preambles Inside the JUSTIFICATION Section

The `## [JUSTIFICATION]` block must open directly with `**Item 1 —`. Any reasoning or
stage-acknowledgement text appearing between the section heading and the first `**Item 1`
line fails pre-flight. This closes the v11_t1 defect class (leaked preamble inside the
appendix section).

The following patterns are forbidden anywhere between `## [JUSTIFICATION]` and `**Item 1`:

```regex
^Re-reading (Checkpoint|chunk|section)   e.g. "Re-reading Checkpoint 2 to confirm…"
^Producing \[JUSTIFICATION\]             e.g. "Producing [JUSTIFICATION] first…"
^I (will|am|have|need)                   e.g. "I will now enumerate…"
^Let me                                   e.g. "Let me review the Inferred tags…"
^Now (I|let|producing)                   e.g. "Now I'll produce the appendix…"
^(Reviewing|Checking|Confirming)         e.g. "Reviewing the Inferred items…"
^(First|Next|Finally),?\s+(I|let|we)     e.g. "First, I'll list…"
```

**Harness enforcement:** After locating `## [JUSTIFICATION]`, scan forward to the first
`**Item 1 —` line. If any non-blank, non-heading line is found before `**Item 1 —` that
matches Pattern Set 6 (or Pattern Set 2), fail validation with:
`"JUSTIFICATION preamble detected — section must open directly with **Item 1. Regenerate chunk 3."`

Unlike Pattern Set 3 (body contamination), JUSTIFICATION preambles are recoverable by
stripping the offending lines. However, a preamble indicates the model is reasoning mid-output
rather than producing the appendix from Checkpoint 2's committed list — this is a generation
discipline issue that should trigger regeneration, not patching.

### Pattern Set 7 — Self-Tagged Confidence Overview Sentence

The `### Confidence Overview` line opens the JUSTIFICATION block. The sentence that follows
it describes the output's confidence structure — it is a meta-description, not a verifiable
claim. It must NOT carry any confidence tag.

The following patterns are forbidden in the `### Confidence Overview` sentence:

```
[Document-Backed]  in the Confidence Overview sentence
[Form-Stated]      in the Confidence Overview sentence
[Inferred]         in the Confidence Overview sentence
[Assumption]       in the Confidence Overview sentence
```

**Why:** A self-tagged Confidence Overview inflates the LC item count and creates a phantom
span in the UI panel extractor (confirmed defect in v14 t1, t3). The UI extractor reads all
confidence tags inside the JUSTIFICATION block; the meta-sentence must be tag-free.

**Harness enforcement:** After locating `### Confidence Overview`, scan the immediately
following non-blank line. If it matches any of the four canonical confidence tags, fail
validation with:
`"JUSTIFICATION Confidence Overview is self-tagged — meta-sentence must not carry confidence tags. Regenerate chunk 3."`

Unlike JUSTIFICATION preambles (Pattern Set 6), self-tagged overviews are recoverable by
stripping the tag. However, a self-tagged sentence indicates the model has confused a
meta-description with a substantive claim — regeneration is preferred over patching.

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
