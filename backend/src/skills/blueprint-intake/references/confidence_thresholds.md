# Confidence Threshold Rules

**Schema:** `intake_v1.0`
**Purpose:** Lock the rule for choosing between the four confidence tags. Eliminates Defect 6 — non-deterministic confidence classification.

---

## The Four Tags

```
[Document-Backed]           Highest confidence — corroborated by PDF source(s)
[Form-Stated]               Stated by client in intake form, not yet corroborated by document
[Document-Backed + Form-Stated]   Strongest — both PDF and form agree
[Inferred]                  Derived from sources via explicit logical chain
[Assumption]                Estimate or assertion with no direct source
```

## Decision Tree

For every claim that requires a tag, apply this tree in order. The first matching rule sets the tag.

```
1. Is the claim a direct quote, named value, or factual assertion that appears in a PDF source?
   → YES, AND it also appears in the intake form: [Document-Backed + Form-Stated]
   → YES, PDF only: [Document-Backed]
   → NO: proceed to 2

2. Is the claim stated explicitly in the intake form (form: <section>)?
   → YES, AND not contradicted by any PDF: [Form-Stated]
   → YES, BUT contradicted by a PDF: flag for Section H (contradictions); use [Document-Backed] for the PDF version
   → NO: proceed to 3

3. Is the claim derived from one or more sources via an explicit logical or arithmetic chain?
   → YES, AND the derivation chain is shown in the body or appendix: [Inferred]
   → NO: proceed to 4

4. Is the claim an estimate, benchmark, or assertion without a direct source?
   → YES: [Assumption] — MUST be entered in [JUSTIFICATION] appendix with verbatim claim, gap, and resolution action
   → NO: the claim cannot be made — either find a source or remove it
```

## Specific Cases

### Quantitative Claims

A number must be tagged according to its strongest source:

- Exact figure in a PDF: `[Document-Backed]`
- Approximate range that matches a PDF range: `[Document-Backed]`
- Calculated by combining PDF figures (e.g. revenue × margin %): `[Inferred]` with arithmetic shown
- Industry benchmark with no Meridian-specific source: `[Assumption]`
- Stated by client in form but not verified: `[Form-Stated]`

### Named Entities

- Person, company, system, or product named in a PDF: `[Document-Backed]`
- Same entity named in form but not in PDFs: `[Form-Stated]`
- Entity inferred to exist (e.g. "an external Vincere consultant" referenced indirectly): tag as `[Inferred]` with derivation

### Forward-Looking Statements

- Target stated in PDF 7 (strategic plan): `[Document-Backed — strategic plan p.N]`
- Forecast stated in form but not in PDFs: `[Form-Stated]`
- Projection calculated from current state and targets: `[Inferred]` with derivation

### Severity & Priority Classifications

These are analytical judgements made by the intake skill. Tag them based on the evidence supporting the judgement:

- Severity rated High based on quantified document evidence: `[Document-Backed]`
- Severity rated High based on form pain-point statement plus document corroboration: `[Document-Backed + Form-Stated]`
- Severity rated based only on form: `[Form-Stated]`
- Severity rated based on analyst judgement without explicit source: `[Inferred]` with brief rationale

## Forbidden Patterns

The following are NOT acceptable tag uses:

1. **Tagless quantitative claim.** Every number requires a tag.
2. **`[Document-Backed]` without a citation.** Tag must include source name and page.
3. **`[Inferred]` without a derivation.** Either show the chain in the body OR add an appendix entry.
4. **`[Assumption]` without an appendix entry.** Mandatory.
5. **Vague tags.** `[Likely]`, `[Probably]`, `[Estimated]` (without `Assumption` framing) are all rejected.
6. **Tag stacking.** Don't combine tags like `[Document-Backed / Inferred]` — pick one per the decision tree.

## Edge Cases

### When a PDF says "approximately" or "around"

The PDF's qualifier carries through:

> "Approximately 35% of records are stale [Document-Backed — tech inventory p.2]"

The tag is still `[Document-Backed]` — the imprecision is in the source, not in our claim.

### When two PDFs disagree

Flag the discrepancy in Section H Reviewer Checklist. Use the higher-confidence source (most recent, most authoritative) for the body claim. Tag as `[Document-Backed]` with the chosen source.

Example: PDF 2 lists 51 delivery FTEs; PDF 1 lists 42 average delivery FTEs in the FY2025 P&L notes. Use 51 (current state, org chart is the authoritative source) and note the discrepancy:

> "Delivery FTEs: 51 [Document-Backed — org chart p.2]" with Section H note: "Minor discrepancy — P&L lists 42 avg delivery FTEs, likely reflecting prior-year average vs current."

### When a claim is partially documented

If 60% of a claim is documented and 40% is the analyst's framing:

- If the analyst's framing doesn't change the substantive claim: tag the documented part with `[Document-Backed]` and leave the framing as connective tissue (no separate tag needed).
- If the framing makes a new claim: that new claim is `[Inferred]` and requires either inline derivation or an appendix entry.

## Confidence Score for Section Auditing

After tag assignment, the harness computes per-section confidence:

```
section_confidence = (count[Document-Backed] + count[Form-Stated] + count[Document-Backed+Form-Stated]) 
                     / total_tags
```

| Confidence | Interpretation |
|---|---|
| ≥ 90% | Strong — section ready for downstream skills |
| 75–89% | Acceptable — proceed but flag low-confidence items in Section H |
| 60–74% | Weak — requires reviewer attention before downstream use |
| < 60% | Fail — section must be reworked, more evidence required, or scope reduced |

The harness fails any dossier with overall confidence below 75% or any single section below 60%.
