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

## Inline Tagging Density Rule (FW-08)

**Tag every claim whose derivation would appear in the [JUSTIFICATION] appendix. Do not tag connective tissue.**

Apply this rule to decide whether a specific sentence needs a tag:

1. **Tag it** if the sentence makes a quantitative, forward-looking, or characterisation claim that a reviewer could reasonably challenge — i.e., a claim that you would need to defend with a source or a logical chain.
2. **Do not tag** if the sentence is connective tissue (transition, restatement, explanation of what the next claim shows) that does not add a new verifiable assertion.
3. **One tag per claim.** If the same derived figure appears in two different sections (e.g., "revenue per FTE of £103k" in Section A and again in Section D), it requires one [JUSTIFICATION] appendix entry and both body occurrences carry `[Inferred — appendix item N]`. The body tag count will be 2, but the appendix item count is 1.

**Harness enforcement — single three-tier count check (`lc_raw_count` metric):**

| Tier | Count band | Gate result | Meaning |
|---|---|---|---|
| Expected | 12–18 | OK — no action | Model is tagging at the right depth |
| Advisory | 10–11 or 19–22 | WARN (`fw08_lc_count_advisory`) | Outside expected but not yet mis-tagging; review |
| Mis-tagging | <10 or >22 | FAIL (`fw08_lc_count_out_of_band`) | Clear signal of under- or over-tagging |

Historical range across 7 production runs (V3–V5): 9–15 tags. Two runs (V3_T2, Ivan V3) sit at 9 — these would FAIL the mis-tagging tier, correctly identifying under-tagging. The density ratio (Inf+Asm ÷ total tags) is intentionally not encoded: at Meridian-class dossier sizes (~190–220 total tags) the count band is a sufficient proxy, and a separate density check measuring an overlapping concept would introduce contradictory verdicts on the same dossier.

**What this resolves:** Without this rule, identical reasoning produces different tag counts across runs (V4 evidence: 10 tags in T1 vs 15 in T2 on identical content). The appendix item count is the stable signal; body tag count is bounded but not fixed.

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

## Classification Edge Cases

The following examples resolve common borderline classifications. Apply these BEFORE falling back to the general decision tree. Each example names the correct tag and explains why.

### Edge Case 1 — Current-state claim: intake form + document corroboration

> "The firm employs 51 delivery FTEs across three offices."

**Scenario:** The intake form says "around 50 delivery people." The org chart lists exactly 51 delivery FTEs.

**Correct tag:** `[Document-Backed + Form-Stated — org chart p.1; form: company fundamentals]`

**Rule:** If a claim appears in the form (even approximately) AND is corroborated by a document (even with a slightly different figure), use `[Document-Backed + Form-Stated]`. Use the document's precise figure in the body; the form corroboration upgrades the tag.

---

### Edge Case 2 — Forward-looking outcome claim with strong document support

> "The firm targets 25% revenue growth in FY2026."

**Scenario:** This target appears verbatim on page 2 of the strategic plan PDF. The form also mentions it.

**Correct tag:** `[Document-Backed — strategic plan p.2]` (or `[Document-Backed + Form-Stated]` if form also states it)

**Rule:** Forward-looking claims that appear verbatim in a PDF are `[Document-Backed]`, not `[Inferred]`. The claim IS the target itself — it's a documented fact that the target exists. Only use `[Inferred]` when you are CALCULATING a forward-looking outcome from current data (e.g., "if TTF improves by 20%, the firm could add 18 placements per year" — that projection requires `[Inferred]`).

---

### Edge Case 3 — Named individual as resistance point (the "Georgieva rule")

> "Senior Partner Georgieva is identified as the highest-resistance stakeholder for the proposed CRM cutover."

**Scenario:** No document names Georgieva as resistant. The characterisation is derived by the analyst from: her role (Senior Partner), her department (most affected by CRM cutover), and the absence of any AI tools in her documented workflows.

**Correct tag:** `[Inferred — appendix item N]`

**Rule:** Current-state characterisations of a named individual derived from indirect signals (role + department + absence of adoption evidence) are `[Inferred]`, NOT `[Assumption]`. The distinction:
- `[Inferred]` = derived via an explicit logical chain from evidence in documents/form
- `[Assumption]` = estimate or benchmark with no direct source connection

A named individual's attitude inferred from their documented role and behaviour IS an explicit derivation — it is not a benchmark. Use `[Inferred]` with the derivation chain in the appendix entry.

---

### Edge Case 4 — Aggregate calculation with mixed-confidence inputs

> "Revenue per delivery FTE: £103,000."

**Scenario:** Total revenue (£5.25M) is `[Document-Backed]` from the financial summary. Delivery FTE count (51) is `[Document-Backed]` from the org chart. The ratio is the analyst's calculation.

**Correct tag:** `[Inferred — appendix item N]`

**Rule:** Any arithmetic calculation combining source values is ALWAYS `[Inferred]`, even when all inputs are `[Document-Backed]`. The calculation itself is a claim that goes beyond what either source states directly. Show the arithmetic in the appendix entry:

> £5,250,000 ÷ 51 delivery FTEs = £102,941 ≈ £103,000

If one input is `[Form-Stated]` and another is `[Document-Backed]`, the result is still `[Inferred]` — not downgraded to `[Form-Stated]`. The derivation chain, once explicit, is `[Inferred]` regardless of input quality.

---

### Edge Case 5 — Named individual corroborated by multiple cross-referenced documents

> "Managing Director Ivanova leads the company with a stated growth mandate, supported by a dedicated BD team."

**Scenario:** Ivanova's name and role appear in the strategic plan (p.1), the org chart (p.1), and the intake form (Section 1). The BD team structure is confirmed in the org chart (p.2).

**Correct tag:** `[Document-Backed + Form-Stated — strategic plan p.1; org chart p.1; form: company fundamentals]`

**Rule:** When a named individual is mentioned in multiple documents AND the form, use `[Document-Backed + Form-Stated]`. Multiple document sources do not create a new tag type — list all relevant sources in the citation. Multi-document corroboration increases certainty but does not change the tag.

---

### Edge Case 6 — Partially documented claim with analyst framing

> "The manual sourcing process consumes an estimated 60% of each consultant's working week, driven primarily by the absence of a structured database query workflow."

**Scenario:** The 60% figure comes from SOP p.2 and sales pipeline p.3 (both `[Document-Backed]`). The phrase "absence of a structured database query workflow" is the analyst's interpretation of what causes the 60%.

**Correct approach:** Tag the factual component (`[Document-Backed — SOP p.2; sales pipeline p.3]`). The framing ("driven primarily by...") is connective tissue — it does not require a separate tag if it does not make a new standalone claim.

**BUT:** If the framing makes a new causal claim — e.g., "This bottleneck is the primary reason for the 28-day TTF gap" — that causal assertion requires its own `[Inferred]` tag with an appendix entry explaining the derivation chain.

**Rule:** Analyst framing that paraphrases the evidence = no separate tag. Analyst framing that asserts causation or a new fact = `[Inferred]` with appendix entry.

---

### Edge Case 7 — Same figure stated in both form and document but figures differ slightly

> "The firm processed approximately 340 placements in FY2025."

**Scenario:** The intake form says "around 350 placements last year." The financial summary PDF states "338 confirmed placements FY2025."

**Correct tag:** `[Document-Backed — financial summary p.3]` using the document figure (338, rounded to ~340 for readability).

**Rule:** When the form and document disagree numerically, use the document figure and tag as `[Document-Backed]`. Do NOT use `[Document-Backed + Form-Stated]` when the figures conflict — that tag implies agreement. Flag the discrepancy in Section H: "Form states ~350 placements; financial summary records 338 — minor discrepancy, use 338 as authoritative."

---

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
