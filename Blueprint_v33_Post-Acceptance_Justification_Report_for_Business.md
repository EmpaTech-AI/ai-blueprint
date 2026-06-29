# AI Value Blueprint — v33 Acceptance Result & v33.1 Fix: Justification Report for Business

**AI Assist BG · Blueprint Pipeline · Prepared by Engineering**
**Audience:** Business / leadership · **Date:** 29 June 2026
**Status:** Acceptance run complete (5 of 6 criteria passed); the one gap was fixed and shipped the same day (v33.1); a confirmation re-run is the remaining step.
**Supersedes:** the pre-acceptance *Blueprint v33 Justification Report* (written before the run; its "four client datasets" ask no longer applies — see §6).

---

## 1. In one paragraph

The v33 quality-and-safety release was put through our formal acceptance test — four full runs on a real client engagement (Meridian Talent Partners), independently audited by our quality function (the Practice). The result is the **best in the project's history: 5 of 6 criteria passed, all confirmed four times over.** Critically, **the two risks leadership cares about most are now closed and verified ×4**: a wrong leadership name in a client document, and internal working-notes leaking into a client document. One criterion did not pass — a **roadmap-sequencing consistency** issue, where one initiative could land in a different phase between otherwise-identical runs. This is an *internal consistency* problem, **not** a case of a client receiving false information. We identified the root cause, fixed it the same day (release **v33.1**), and the fix is built, tested green, committed, and deployed. The only thing between us and a clean 6-of-6 is a **confirmation re-run** of the same test.

---

## 2. What "acceptance" tested, and why it matters commercially

The Blueprint is a paid, client-facing deliverable; its credibility is the product. We do not declare a release "done" on a passing test suite alone — we require it to **prove itself on four real runs of a real client**, audited against locked criteria. This is deliberately conservative: it catches problems that only appear on real, varied data. The v33 acceptance run is that test. It is the difference between "the code works in the lab" and "the product is trustworthy in front of a client."

---

## 3. The result — 5 of 6, verified four times

| # | What it checks | Result (×4 runs) | Verdict |
|---|---|---|---|
| 1 | **No internal notes leak** into the client document | Clean in all four | ✅ **Pass** |
| 2 | **Honest confidence score** (reflects client evidence, not inflated) | Grounding 83–89%; reusable-template confidence reported separately and pinned identically (7) every run | ✅ **Pass** |
| 3 | **Consistent roadmap structure** | Fixed table present, internal checklist absent, all four | ✅ **Pass** |
| 4 | **Clean data** (no placeholders, duplicates) | Clean in all four | ✅ **Pass** |
| 5 | **No change to the analytical decisions** (selection, scores, dates, **phase sequencing**) | Values identical ×4, **but one initiative's phase varied** (3 runs one way, 1 the other) | ❌ **Did not pass** |
| 6 | **Correct leadership name** | Correct in all four; zero wrong names | ✅ **Pass** |

**The turnaround:** criteria 1–4 are precisely the surfaces that *failed* the previous (v32) acceptance. v33 flipped all of them to passing, ×4. That is real, hard-won progress.

---

## 4. The one that didn't pass — stated plainly

**What happened.** In the roadmap, one initiative (an advanced "Big Bet") strictly depends on an earlier foundational initiative. Across the four runs, the system placed it in the "Later" phase three times and the "Next" phase once. The underlying analysis — what the initiatives are, their scores, the client facts — was **identical every time**. Only the *phase placement* of this one item varied.

**Why this is a consistency issue, not a client-facing error.** Both placements are internally defensible — neither is a false statement about the client. No client received wrong information. The problem is **reproducibility**: the same input should always produce the same roadmap, and here it didn't. For a product whose credibility rests on rigour, run-to-run variability is a quality defect even when both outputs are plausible. This matches the safety principle from the release: the failure direction is safe — a *different-but-valid* sequence, never a *false* one.

**Root cause.** The rule governing this kind of dependency was written to cover one situation explicitly but was silent on a closely-related one, leaving the AI to fill the gap — which it did inconsistently across runs.

---

## 5. What we already did about it — v33.1 (shipped same day)

We did not leave this open. The fix is built, tested, and deployed:

1. **Pinned the rule to a single outcome.** The dependency rule now resolves to one deterministic answer in *all* situations, with no room for the AI to interpret it two ways. (Engineering note: a strict dependency now always defers the dependent initiative to the latest phase — the most conservative, and the reading the audit judged "arguably more correct.")
2. **Added an automatic guardrail in code.** The system now *checks* this placement on every run and **blocks release** if it ever deviates from the pinned rule. So even a future recurrence cannot silently ship — it becomes a caught, blocked error, consistent with the rest of the safety gate.
3. **Closed a minor cosmetic leak** (an internal "Step 4 of 5" pipeline label that appeared as a subtitle in one of the four runs).
4. **Honest version labelling.** This is a new build, so it is stamped **v33.1** — deliberately *not* reused as "v33," so the build that fixed the issue can never be confused with the build that was tested with it. (This is the same provenance discipline the audit asked us to maintain.)

**Status:** all automated tests pass (82 of 82), the change is committed and pushed, and it is deploying to production.

---

## 6. What we need now — and what we do *not*

**We do NOT need four new client datasets.** The earlier report asked for these; that ask is now **mooted**. The acceptance run was correctly executed as the *same* client fixture run four times (which is exactly what exposed the run-to-run variation). The confirmation re-run uses the same approach — no new client data required.

**The single remaining step to "done":** a **confirmation re-run** (the audit calls it T-10⁶) — four more runs on v33.1, audited against the same criteria, to confirm the sequencing issue is closed *and* the five passing criteria still hold. We expect this to return a clean 6 of 6.

**One parallel, non-urgent item:** a small hosting-platform (Railway) configuration change to enable cryptographic build-verification. It does **not** block the re-run or the "done" milestone — it simply upgrades how we prove which build produced a given report. Schedule it when convenient.

---

## 7. Honest risk posture

- The two highest-stakes risks — **a wrong leadership name** and **internal notes in a client document** — are **closed and verified four times over.** These are the failures that would most damage a client relationship, and they are done.
- The grounding/confidence score is now **honest** (it reflects the client's own evidence, no longer inflated) — verified ×4.
- The sequencing issue is **fixed but not yet re-confirmed.** We are confident in the fix (it is deterministic and now guarded in code), but by our own policy we **credit nothing as "done" until the re-run confirms it ×4.** We are reporting it as fixed-and-shipped, awaiting confirmation — not as closed.
- Worst case if anything still varied: a *different-but-valid* roadmap sequence — never a false statement to a client. The safe failure direction holds.

---

## 8. Bottom line for business

- v33 is the **strongest release in the project's history: 5 of 6, four-times-verified.** The two risks that matter most commercially are closed.
- The single gap (roadmap-sequencing consistency) was diagnosed and **fixed the same day** (v33.1), with an automatic guardrail so it can't silently recur.
- **No business action is required to proceed.** We do not need new client data. The remaining step is an engineering-run confirmation test, which we expect to return a clean 6 of 6.
- The only optional business/ops item is scheduling the non-urgent Railway change.

*Prepared by Engineering for business review. The full independent audit (Practice, Frame v4.0 / Era J) and the technical change record are available on request. This report reflects the post-acceptance, post-v33.1 state and supersedes the earlier pre-acceptance justification report.*
