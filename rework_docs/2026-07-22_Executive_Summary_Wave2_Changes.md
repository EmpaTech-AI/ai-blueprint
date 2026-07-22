# Executive Summary — What We Just Changed and Why

**AI Assist BG · Blueprint Practice · 22 July 2026 · plain-language summary (technical record: CHANGELOG 2.1.0 + the adjudication conformance check)**

## The short version

Last week's test round gave us two gifts: proof that the core engine works (scores, rankings, and findings came out identical across all four runs), and an honest list of what still breaks. The team agreed a fix plan; our part of it is now done and verified. Nothing counts as fixed until the formal re-test passes — but everything is in place for it.

## What was done, in plain terms

**1. The two real mistakes now have hard rules and alarms.**
One test run silently dropped an opportunity from the client's list; another postponed the compliance sprint past its own deadline because "it was too close to finish in time." Both were reasonable-sounding thinking that produced wrong results. The rules now forbid that thinking explicitly: nothing leaves the list without being recorded and justified, and an urgent deadline can never be postponed for being close — closeness is the reason to act, not to delay. Automated checks now catch both mistakes the moment they happen.

**2. We write the answer sheet before the exam.**
Last round was partly graded against the previous version's expectations, which muddied the verdict. From now on, the exact expected results — every finding, score, and phase — are written down and signed off *before* a test batch runs. A new tool compares any run against that signed sheet in seconds.

**3. Fire drills for our alarms.**
A clean test run proves nothing if the alarm never had to ring. We built three deliberately-broken test cases — a dropped opportunity, a postponed deadline, and a split-up recommendation — and confirmed every alarm fires. All three are caught, and two clean control cases pass, so the alarms don't cry wolf either.

**4. Clear formatting rules where the checkers went blind.**
Most of last round's scary flags came from one thing: two pipeline stages formatted their documents in a way our automated checkers couldn't read, so present content looked "missing." Those stages now have explicit, simple structure rules, and we produced a machine-readable rulebook the app team will plug into their checkers — so the documents and the checkers can never drift apart again.

**5. Honest version labels.**
Last round's build label was wrong because it was typed by hand long ago. Labels are now taken from the build itself, never typed — and if unknown, they say "unknown" instead of guessing.

**6. A growth playbook.**
A step-by-step process now exists for adding new industries and countries — each new sector gets its own vetted reference example, its own signed answer sheet, and must pass the same fire drills before it goes live. Same quality bar everywhere, by procedure rather than by hope.

## Verified

All quality gates pass on the reference example; the full test suite passes; the reference example matches the signed answer sheet exactly; all three fire drills catch their planted faults.

## Still open (and whose)

- App-side fixes (document rendering, checker alignment, the label mechanism) — engineering.
- Test artifacts from last round, so we can pinpoint one remaining root cause — operations.
- Signatures on the answer sheet — Practice + engineering leads.
- The formal re-test (four runs plus the fire drills) — the only event that officially counts.
- Two decisions reserved for Ivan: how last round's formatting issue is classified, and the timing of the full template-based rebuild.
