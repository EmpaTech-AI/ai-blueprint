# AI Value Blueprint — Engineering Review Justification Report
**Date:** 2026-06-03
**Prepared by:** Viktor Serafimov (AI Assist BG)
**Review type:** Full architecture, code quality, test, and performance review (`/plan-eng-review`)
**Codebase scanned:** `backend/src/` — 22 TypeScript source files, 1,189 lines of pipeline code
**Purpose:** Internal record of all engineering decisions, accepted fixes, and rejected proposals for colleague review before implementation begins

---

## Executive Summary

The engineering review found **11 actionable issues** across the backend pipeline. Of these:
- **1 is a P0 security issue** (auth bypass) that must be fixed before any client-facing deployment
- **5 are P1 correctness issues** that will cause silent failures with real client data
- **5 are P2 hardening issues** that reduce risk and improve resilience

An independent AI subagent (outside voice) reviewed the same codebase and found 2 additional issues the primary review missed — both were accepted and added to the implementation plan.

**Net result:** All 11 decisions were accepted. 0 were rejected. 2 of 3 proposed backlog items were declined as premature.

---

## How to Read This Report

Each decision is documented with:
- **What was found** — the specific code location and the problem
- **Decision taken** — what was accepted or rejected
- **Why** — the reasoning
- **Impact if not fixed** — what happens in production without this fix
- **Impact of fix** — what changes after implementation

---

## Decision Log

---

### D1 — `intake.ts:62` — Unguarded `JSON.parse` on form data
**Priority:** P1 | **Effort:** ~10 min | **Status: ACCEPTED**

**What was found:**
The intake route parses the submitted form answers with `JSON.parse(formAnswers)` directly, with no error handling. If the browser sends malformed JSON — due to a frontend bug, network corruption, or character encoding issue — Node.js throws an unhandled exception. The server returns a generic HTTP 500 error. The client receives no useful information about what went wrong, and no job is created.

**Decision taken:** Wrap in `try/catch`, return HTTP 400 with a clear error message: `"Invalid form data format — please re-submit."`

**Why this was accepted:**
This is a five-line fix with zero risk and a direct path to better user experience. The alternative (leaving it as-is) was only viable if we fully control the frontend and guarantee it never sends malformed JSON — which is not a guarantee we can make.

**Impact if not fixed:**
Any form submission with malformed JSON produces a confusing 500 error. The consultant or client has no idea whether to retry or escalate. Particularly risky during the first real client test if any encoding issue occurs with the uploaded form data.

**Impact of fix:**
The client receives a clear 400 response and knows to re-submit. The consultant sees a clean failure in the logs rather than an ambiguous server error.

---

### D2 — `server.ts` / `orchestrator.ts` — No orphaned job recovery on container restart
**Priority:** P1 | **Effort:** ~30 min | **Status: ACCEPTED**

**What was found:**
When a pipeline job is submitted, it runs asynchronously in the background (`runPipeline(jobId).catch(...)`). If Railway restarts the container while a job is in `running` state — due to a code deploy, memory limit, or crash — the job is permanently stuck in `running`. No mechanism exists to detect or recover stale `running` jobs. The only recovery path is the admin retry endpoint, which requires someone to notice the stuck job and manually intervene.

**Decision taken:** On server startup, run a query: `UPDATE jobs SET status='failed', currentStep='A' WHERE status='running'`. This resets any jobs that were interrupted and makes them visible to the consultant as failed (and therefore retriable).

**Why this was accepted:**
Railway restarts are routine — every code deploy triggers one. This is not a theoretical failure mode; it will happen on the first deploy after the first real client job is submitted. The fix is a single SQL statement at startup.

The trade-off acknowledged: a job that was genuinely mid-run when a very fast restart occurred will be reset unnecessarily. This is acceptable — a retriable failure is far better than a permanently invisible one.

**Impact if not fixed:**
The first time we deploy a code update while a client pipeline is running, the consultant sees a job that never finishes. There is no indication anything is wrong. The client waits indefinitely.

**Impact of fix:**
Any interrupted job surfaces as `failed` immediately after restart. The consultant sees it, understands what happened, and can retry with one click.

---

### D3 — `orchestrator.ts:122–127` — Hard halt on any failed document parse
**Priority:** P1 | **Effort:** ~30 min | **Status: ACCEPTED**

**What was found:**
Step A parses uploaded client documents. If any document fails to parse — a corrupted file, a scanned PDF with no extractable text, a file with an unsupported encoding — the pipeline immediately throws an error and halts entirely. This is a hard stop even if the other uploaded documents parsed successfully.

The pipeline already handles a related condition gracefully: missing required document categories are added as reviewer flags and the pipeline continues. Failed document parses currently receive harsher treatment than missing documents entirely.

**Decision taken:** Replace the `throw` with a reviewer flag: `reviewerFlags.push("Document parse failure: [filename] — [reason]")`. The pipeline continues with the documents that did parse successfully.

**Why this was accepted:**
Real SMB clients frequently upload scanned documents, image-heavy PDFs, or files with non-standard encoding. This will happen with the first real client. The quality gate (confidence scoring) already exists to catch output degradation caused by missing evidence. A reviewer flag gives the consultant the same information a hard halt would, without killing the entire pipeline.

The risk acknowledged: if the only meaningful document fails to parse, the pipeline will proceed and produce a low-quality output. However, this is immediately visible via confidence scores in the admin interface, and the consultant can reject and request re-upload.

**Impact if not fixed:**
First client uploads 3 documents, one of which is a scanned invoice. Pipeline fails. Consultant must ask client to re-upload a cleaner version. Bad first impression, and the full audit value from the other 2 documents is lost.

**Impact of fix:**
Pipeline proceeds with available evidence. Consultant sees a reviewer flag explaining which document failed and why. They can proceed with the partial output or request the client re-upload the failed document.

---

### D4 — `claudeClient.ts` — No step-level timeout; 65-second sleep is hardcoded
**Priority:** P2 | **Effort:** ~1 hour | **Status: ACCEPTED**

**What was found:**
Two issues combined here:

1. **No timeout:** Every API call to Anthropic via `invokeChunk` has no timeout. If the Anthropic API hangs — due to a network issue, a service degradation, or an extremely large response — the pipeline will block indefinitely. The job stays in `running` state with no indication of whether it is progressing or frozen.

2. **Hardcoded sleep:** The 65-second pause between chunks in Step B's 3-chunk protocol is hardcoded as `await sleep(65000)`. This was written to avoid Anthropic's 30,000 input-token-per-minute rate limit. It cannot be adjusted without a code change, and it adds 130 seconds of pure sleeping to every Step B run regardless of actual API state.

**Decision taken:**
- Wrap each `invokeChunk` API call in `Promise.race` with a 300-second timeout. If the timeout fires, the call throws with a clear timeout error.
- Move the 65-second sleep duration to a `CHUNK_PAUSE_MS` environment variable (default: 65000).

**Why this was accepted:**
The 300-second timeout is generous (typical chunk calls complete in 30–60 seconds) but catches real hangs without false positives. The configurable sleep allows testing with shorter delays and future adjustment if Anthropic's rate limits change.

**Impact if not fixed:**
Any API hang causes a job to sit in `running` state forever. Even after fixing D2 (orphan recovery), a hang during a run will not be detected until the container is restarted manually. There is no way to distinguish a slow-but-healthy run from a frozen one.

**Impact of fix:**
Hanging API calls surface as pipeline failures within 5 minutes. The consultant sees `failed` status, understands it was an API timeout, and can retry. The configurable sleep also makes local development faster.

---

### D5 — No email delivery mechanism (`clientEmail` never used)
**Priority:** P2 | **Status: DEFERRED — user chose not to change**

**What was found:**
The intake form collects the client's email address. It is stored in the database. Nothing in the system ever uses it. When a pipeline completes, the consultant must manually check the admin panel and manually deliver the report to the client. There is no notification to the consultant that a job is ready for review.

**Decision taken:** Leave as-is for now. Document the manual delivery workflow.

**Why this was deferred:**
At the current volume (1–2 clients), manual delivery is workable. Adding email infrastructure (Resend, SendGrid, SES) introduces a new dependency and configuration surface that is not justified before the first real client test.

This was the user's explicit decision: "Leave it as is now."

**Impact of deferral:**
The consultant must remember to check the admin panel for completed jobs. At low volume this is manageable. At higher volume (5+ concurrent clients) this becomes a bottleneck. The risk is a delayed delivery if the consultant is occupied and doesn't check the panel.

**What to watch for:** If the team finds itself missing completed jobs or clients asking "where is my report?", email notification should be the next infrastructure addition.

---

### D6 — `confidenceScorer.ts:148` — Zero confidence tags scores 50%, bypassing quality gate
**Priority:** P1 | **Effort:** ~10 min (one character change) | **Status: ACCEPTED**

**What was found:**
The confidence scoring system assigns a score of 50% when a pipeline step produces output with zero confidence tags (`[Document-Backed]`, `[Form-Stated]`, `[Inferred]`, `[Assumption]`).

50% falls in the Blue band (60–75%), which triggers one quality gate retry. If the retry also produces zero-tagged output (also 50%), the pipeline proceeds with a reviewer flag — because 50% is above the Red threshold of 60%.

This means a step that completely ignores the confidence tagging protocol (possibly because the skill prompt failed or was ignored) can pass through the quality gate without ever failing.

Zero tags is qualitatively different from low-confidence tags. Low-confidence tags mean the AI made inferences without strong evidence. Zero tags means the skill prompt structure was not followed at all — the output has no evidence traceability whatsoever.

**Decision taken:** Change line 148 from `const score = total === 0 ? 50 : ...` to `const score = total === 0 ? 0 : ...`. Zero tags = score of 0 = Red band = quality gate fires on first attempt. If the retry is also tagless, the pipeline halts for manual review.

**Why this was accepted:**
This is a single character change with no side effects. The `noTagsReason` field already exists in `ConfidenceResult` and already provides a human-readable explanation for why the score is zero. The consultant sees exactly what went wrong.

The risk acknowledged: a step that is genuinely complete but had a tagging prompt regression would now fail rather than proceed with a flag. This is the correct behavior — a tagless output is not a deliverable.

**Impact if not fixed:**
A step can produce an output with no evidence citations, score 50%, retry once more with no citations, score 50% again, and proceed to the final blueprint. The consultant receives a document with no confidence metadata and no way to know which claims are grounded in client evidence vs. invented.

**Impact of fix:**
Any tagless output immediately triggers the quality gate. The pipeline retries with a corrective note. If the retry is also tagless, the job fails and the consultant sees a clear error explaining that the confidence tagging protocol was not followed.

---

### D7 — `claudeClient.ts` — Steps C–E have no truncation detection
**Priority:** P2 | **Effort:** ~1 hour | **Status: ACCEPTED**

**What was found:**
Step B (blueprint-intake) uses a sophisticated 3-chunk protocol with checkpoint markers to handle long outputs. If Step B hits the token limit mid-response, it detects the truncation via `stop_reason === "max_tokens"` and automatically continues until the required checkpoint marker appears.

Steps C, D, D2, and E use a simpler `invokeSkill` function with fixed `max_tokens` values (6,000, 8,000, 6,000, and 12,000 respectively). These functions return whatever the model produces without checking `stop_reason`. If any of these steps hits its token limit, the output is silently truncated — the pipeline receives a partial response and proceeds as if it were complete.

This means the maturity snapshot, opportunity map, roadmap, or final assembly can be missing its last sections with no warning.

**Decision taken:** Add `stop_reason` detection to `invokeSkill`. If `stop_reason === "max_tokens"`, issue one continuation pass and concatenate the results.

**Why this was accepted:**
The truncation problem was already identified and solved for Step B. Steps C–E have the same vulnerability. The fix reuses the exact same pattern already proven in `buildChunkUntilMarker` — no new concepts or dependencies.

**Impact if not fixed:**
Step D (opportunity mapping) silently truncates for a detailed client. The final blueprint is missing 3 of 8 recommended opportunities. The consultant reviews a shorter-than-expected document without knowing it was cut off. The client receives an incomplete deliverable.

**Impact of fix:**
All five pipeline steps detect and recover from token limit truncation. The output of every step is guaranteed complete before being passed to the next.

---

### D8 — `stepE-assembly.ts` — No input size check for final assembly
**Priority:** P2 | **Effort:** ~1 hour | **Status: ACCEPTED**

**What was found:**
Step E (document assembly) takes all four prior step outputs — dossier, maturity snapshot, opportunity map, and roadmap — and concatenates them into a single user message sent to the Claude API. For a detailed client with many opportunities and a verbose roadmap, this combined message can reach 30,000–50,000 tokens of input context. There is no size check, no truncation, and no warning.

Additionally, the output ceiling for Step E is 12,000 tokens — lower than the typical combined input size. This creates a compounded risk: the input may approach context limits, and the output ceiling may cause the response to be truncated before the document is complete (also addressed by D7).

**Decision taken:** Add a character-length check before calling `invokeSkill` in `stepE-assembly.ts`. If the combined input exceeds a threshold (~80,000 characters, approximately 20,000 tokens), truncate the `opportunities` output (the longest step) to fit within the limit, and emit a warning log.

**Why this was accepted:**
Without this guard, a verbose client causes Step E to fail with a context-length API error after 10+ minutes of upstream processing. All previous work is lost. The job fails at the last step.

Truncating the opportunities output is the right trade-off: the final assembly still has access to the full dossier, maturity scores, and roadmap. Losing some detail from the opportunity descriptions is preferable to failing the entire pipeline.

**Impact if not fixed:**
Large clients — those with detailed documents and many identified opportunities — cause the pipeline to crash at Step E after 10+ minutes. The consultant sees a failed job after a long wait, with no blueprint to review.

**Impact of fix:**
Pipelines for detailed clients complete successfully. The log shows when truncation occurred so the team can investigate if the final document seems thinner than expected. Step E input size never causes a context window error.

---

### D9 — Zero test coverage across the entire backend
**Priority:** P2 | **Effort:** ~4 hours | **Status: ACCEPTED**

**What was found:**
The `backend/package.json` has no `test` script. There are zero test files in the repository. No unit tests, no integration tests, no E2E tests exist. The most critical logic in the system — confidence scoring, quality gate retry decisions, truncation handling, pipeline error paths — has never been automatically verified.

Every one of the other issues found in this review (D1, D2, D3, D6, D7, D8, D10) would have been caught by tests before reaching production. Without tests, every code change is a gamble on whether existing behavior is preserved.

**Decision taken:** Install Jest and ts-jest. Write unit tests starting with `confidenceScorer.ts` (pure functions, no mocking required) and the quality gate logic in `orchestrator.ts`.

Priority test cases:
- `calculateConfidence()` — all branches including zero-tag (regression test for D6 fix)
- `stripJustification()` and `stripForDelivery()`
- Quality gate: Green/Amber/Blue/Red scenarios, retry logic, Red-after-retry halt
- Intake route: valid submission, missing fields, malformed JSON (regression test for D1 fix)

**Why this was accepted:**
`confidenceScorer.ts` contains pure functions with clear inputs and outputs — ideal for unit testing with no infrastructure overhead. The quality gate logic in `orchestrator.ts` is the most critical decision-making code in the system. Together these cover the two areas most likely to break silently under future changes.

**Impact if not fixed:**
Any future change to confidence scoring or quality gate logic can break behavior silently. There is no automated signal when a fix for one issue introduces a regression in another. The team learns about failures when clients receive bad outputs.

**Impact of fix:**
Regression protection for the most critical pipeline logic. Future changes to `confidenceScorer.ts` or the quality gate will fail the test suite if they break established behavior. The D6 fix (zero-tag scoring) becomes a permanent regression test.

---

### D10 — [P0 SECURITY] `undefined === undefined` auth bypass on all admin routes
**Priority:** P0 | **Effort:** ~15 min | **Status: ACCEPTED**
*(Found by independent outside voice review)*

**What was found:**
Every admin-protected route checks authentication with:
```
if (token !== process.env.REVIEWER_SECRET_TOKEN) { return 401 }
```

`token` is read from `req.headers['x-reviewer-token']` or `req.query.token`. `process.env.REVIEWER_SECRET_TOKEN` is read from the environment.

If `REVIEWER_SECRET_TOKEN` is not set in the environment — which happens during local development, in a new deployment where the env var was forgotten, or if the variable name is mistyped — both sides evaluate to `undefined`. In JavaScript, `undefined !== undefined` is `false`. The `if` condition is false, auth passes, and the route executes.

This pattern is repeated in **15+ route handlers** across `download.ts` and `status.ts`, covering:
- Listing all client jobs (with names, emails, confidence scores)
- Downloading any client's DOCX or PDF
- Approving any job for delivery
- Retrying or deleting any job
- Generating risk summaries

**Decision taken:**
1. Add a startup guard in `server.ts`: if `process.env.REVIEWER_SECRET_TOKEN` is not set, throw an error on boot and refuse to start.
2. Fix every route handler check to: `if (!token || token !== process.env.REVIEWER_SECRET_TOKEN)`.

**Why this was accepted:**
This is a data breach waiting to happen. Client names, emails, and confidential consulting deliverables are accessible to anyone who can reach the Railway URL without any credential. The fix is 15 minutes of work across three files.

The startup guard is the primary protection — it makes the misconfiguration impossible to deploy silently. The route-level fix is a belt-and-suspenders addition.

**Impact if not fixed:**
Any deployment where `REVIEWER_SECRET_TOKEN` is not configured — including local development, staging environments, or a future Railway re-deployment where the variable is missed — exposes all client data and admin actions to the public internet.

**Impact of fix:**
The server refuses to start without the token configured. Route-level auth cannot be bypassed by an absent environment variable. Client data is protected regardless of deployment configuration mistakes.

---

### D11 — Files stored as base64 blobs in the main `jobs` table
**Priority:** P2 | **Effort:** ~2 hours | **Status: ACCEPTED**
*(Found by independent outside voice review)*

**What was found:**
When a client uploads documents, the intake route reads every file into memory and stores the raw base64 content in the `uploadedFiles` JSON column of the `jobs` table. A 5MB file becomes approximately 6.7MB of base64 text. With three uploaded documents per job, a single job row can contain 20–30MB of binary blob data.

The `loadJob()` function — which is called at the start of every pipeline step, inside the error handler, and by every admin status endpoint — loads this entire row into Node.js heap memory every time it runs. For an active pipeline with 5 steps plus error handling, a single job triggers 6–10 `loadJob()` calls, each allocating 20–30MB.

The file data is only needed once: during Step A (document parsing). After Step A completes, the file data is never accessed again. Keeping it in the main jobs row means paying the full heap cost for the rest of the pipeline's lifetime, and for every admin status check, job list view, and retry operation.

**Decision taken:** Create a separate `job_files` table with columns `(jobId, categoryId, fileData)`. Load file data only during Step A via a targeted `SELECT * FROM job_files WHERE jobId = ?` query. Remove `fileData` from `uploadedFiles` in the main `jobs` table.

**Why this was accepted:**
This is a straightforward schema change with a migration path. The `jobStore.ts` already has a pattern of safe migrations (`try { ALTER TABLE ... } catch {}`). The split separates two distinct concerns: job metadata/status (accessed frequently) and raw file content (needed once). `loadJob()` becomes a ~1KB row read instead of a 20–30MB one.

**Impact if not fixed:**
Memory pressure throughout the pipeline lifetime of every job. Under multiple concurrent jobs (see TODO T11), heap allocations compound. Under a pipeline crash, the error handler calls `loadJob()` while the process is already stressed — potentially triggering an OOM that causes the container restart that D2 is designed to recover from.

**Impact of fix:**
`loadJob()` returns lightweight job metadata. File data is loaded exactly once, at Step A, by the code that needs it. Memory pressure across the pipeline drops from 20–30MB per job to ~1KB per job for all operations except the initial document parsing.

---

## Rejected / Deferred Decisions

### TODO — Email notification to consultant and client
**Status: DECLINED — user decision**

A proposal to add email notifications (via SendGrid or Resend) when a pipeline completes and when a job is approved. `clientEmail` is currently collected but never used.

**Why declined:**
At the current volume (1–2 clients), manual delivery is workable. Adding email infrastructure introduces a new dependency before the first real client test has confirmed the workflow. The user explicitly chose to keep manual delivery as the long-term model for consultant-mediated work.

**Risk of this decision:**
If volume increases, the consultant must monitor the admin panel manually. Deliveries can be delayed. This is a known and accepted risk.

---

### TODO — Admin audit trail (who approved what)
**Status: DECLINED — user decision**

A proposal to log approval timestamps and an identifier (IP address or reviewer name) alongside job approval records. Currently `approveJob()` updates status with no record of who approved or when.

**Why declined:**
The team has a single consultant performing approvals. An audit trail adds no operational value at this stage. The user noted there are no compliance requirements that necessitate it now.

**Risk of this decision:**
If a second consultant is ever added, there will be no historical record of who approved which jobs. This is an acceptable risk at current team size.

---

### TODO — Concurrent job queue limit
**Status: ACCEPTED — built as T11, not deferred**

A proposal to add a maximum concurrent pipeline limit and reject new submissions with a 503 response when at that limit.

**Why this was accepted for immediate implementation:**
The outside voice review identified that concurrent jobs collide on the shared Anthropic API rate limit. The 65-second sleeps in Step B were calibrated for single-job operation. Under two simultaneous jobs, both pipelines hit the rate limit simultaneously, trigger retry delays, and compound each other's wait time. This is a real risk even at low volume if two consultants or a consultant and a test run overlap.

The fix is lightweight: add a `countRunningJobs()` query to `jobStore.ts`, check it in the intake route, and return a 503 with a retry message if the limit is reached. No queue infrastructure needed.

---

## Impact Summary by Category

### Security
| Issue | Fix | Severity | Before | After |
|---|---|---|---|---|
| D10: Auth bypass | Startup guard + explicit check | P0 — Critical | All admin routes publicly accessible if env var missing | Server refuses to start without token; routes explicitly check for undefined |

### Correctness (will fail silently with real client data)
| Issue | Fix | Severity | Before | After |
|---|---|---|---|---|
| D1: JSON.parse | try/catch → 400 | P1 | 500 error on malformed form data | 400 with clear message |
| D2: Orphan recovery | Boot query | P1 | Jobs stuck in 'running' forever after restart | Jobs reset to 'failed'; consultant sees actionable status |
| D3: Parse failure | Reviewer flag | P1 | Any bad document kills entire pipeline | Pipeline continues; flag shows which doc failed |
| D6: Zero-tag score | Score = 0 | P1 | Tagless output scores 50%, bypasses quality gate | Tagless output scores 0, triggers Red gate and halt |

### Resilience (failure modes under real load)
| Issue | Fix | Severity | Before | After |
|---|---|---|---|---|
| D4: No timeout | Promise.race 300s | P2 | API hangs block pipeline indefinitely | Hangs surface as failures within 5 minutes |
| D7: C–E truncation | stop_reason check | P2 | Steps C–E silently truncate at token limit | Truncation detected; continuation pass issued |
| D8: Step E size | Length guard | P2 | Large clients cause context-window errors at final step | Input truncated gracefully; pipeline completes |
| D11: Memory bomb | Separate table | P2 | 20–30MB heap per loadJob() call throughout pipeline | ~1KB per loadJob(); file data loaded once at Step A |
| T11: Concurrency | 503 on limit | P2 | Concurrent jobs collide on rate limit | New jobs rejected with retry message when at limit |

### Quality assurance
| Issue | Fix | Severity | Before | After |
|---|---|---|---|---|
| D9: No tests | Jest + unit tests | P2 | Zero automated coverage; any change can silently break scoring | Regression protection for confidence scoring and quality gate |

---

## Recommended Implementation Order

Given the above, the recommended order before the first real client test:

**Week 1 — Before any client data enters the system:**
1. **T1** (D10) — Fix auth bypass. This is the only P0. Do this before anything else.
2. **T2** (D1) — JSON.parse guard.
3. **T3** (D2) — Orphan job recovery on boot.
4. **T4** (D6) — Zero-tag score fix.
5. **T5** (D3) — Document parse failure demote.

**Week 2 — Before increasing client volume:**
6. **T6** (D4) — API call timeout + configurable sleep.
7. **T7** (D7) — Truncation detection for steps C–E.
8. **T8** (D8) — Step E input size guard.
9. **T9** (D9) — Jest setup + unit tests for confidenceScorer and quality gate.
10. **T10** (D11) — Move fileData to separate table.
11. **T11** — Concurrent job limit.

T1–T5 can largely be done in parallel (they touch different files with the exception of T3 which touches `server.ts`, as does T1). T6 and T7 both touch `claudeClient.ts` and should be done sequentially or in a single pass.

---

## What the Review Did Not Cover

The following are explicitly out of scope for this review:

- **Skill prompt quality** — The content of the SKILL.md files for each pipeline step (what the AI actually produces) was not reviewed. This is addressed through the quality rubric session described in the `/office-hours` design doc.
- **Frontend code** — The Next.js frontend (`frontend/`) was not reviewed. No issues were flagged in the frontend during this session.
- **DOCX/PDF assembly logic** — The `backend/src/docx/assembler.ts` file was not reviewed in depth. Document formatting issues are in scope for the quality rubric session.
- **Deployment configuration** — Railway and Vercel configuration files were not reviewed. Environment variable setup is documented in the README.

---

## Connection to the Office-Hours Design Doc

This engineering review operates downstream of the product design session recorded in:
`~/.gstack/projects/empathysales-AI-Blueprint/Viktor-main-design-20260603-165303.md`

The design doc established that the project's gating condition is: **"a consultant would send this to a client with less than 30 minutes of editing."** The engineering review findings connect directly to that goal:

- **D6** (zero-tag scoring) and **D7** (truncation) are the most direct threats to output quality — they can produce outputs with missing content or no evidence traceability without triggering any visible failure.
- **D3** (parse failure halt) is the most likely first-day failure scenario with real client data — SMBs frequently have scanned documents.
- **D10** (auth bypass) must be resolved before any real client data enters the system.

The quality rubric session (the design doc's primary assignment — sit with your colleague and review example data cold) remains the highest-priority action. The engineering fixes in this report make the system safe and reliable. The quality rubric session determines whether the output is actually good.

---

*This report was generated from the AI Value Blueprint `/plan-eng-review` session on 2026-06-03. Implementation tasks are tracked in: `~/.gstack/projects/empathysales-AI-Blueprint/tasks-eng-review-20260603-182155.jsonl`. Test plan is at: `~/.gstack/projects/empathysales-AI-Blueprint/Viktor-main-eng-review-test-plan-20260603-181936.md`.*
