// S-46 (Era-O' root cause): the DOCX/PDF title slot was filled from the operator-typed
// job.clientName ("Tommy Shelby 3"), a slot the model never controls -- so the SKILL-level
// pin alone could not fix it. The client-facing title MUST come from the dossier's
// INTAKE_FACTS CLIENT_NAME (the single source of truth for client identity); the job label
// is a fallback only when no dossier exists yet.
export function extractIntakeClientName(dossier?: string | null): string | null {
  if (!dossier) return null;
  const block = dossier.match(/<!--\s*INTAKE_FACTS([\s\S]*?)-->/);
  if (!block) return null;
  // The intake contract writes "CLIENT_NAME:" but the app-side facts parser has always
  // tolerated both ":" and "=" (see validateRoleNames) -- mirror that tolerance here.
  const m = block[1].match(/^\s*CLIENT_NAME\s*[:=]\s*([^\n|]+)/m);
  const name = m ? m[1].trim() : '';
  return name.length > 0 ? name : null;
}

export function resolveClientTitleName(dossier: string | null | undefined, jobName: string): string {
  return extractIntakeClientName(dossier) ?? jobName;
}

// v37.4 (admissibility): the reviewer-flag panels carried no run index, so a grader holding four
// panels from one batch could not attribute a flag to a run — the same family as the run-index stamp
// defect that took five batches to close. The index already exists in the operator's job label
// ("LunaCart v37.3 Test 2"); `stripTestLabel` removes it for the client-facing title and it was then
// discarded. This recovers it for the internal panel instead of throwing it away.
//
// Matches the label forms the operator actually types: "Test 2", "test_2", "T2", "run 3", "#4".
const RUN_LABEL_RE = /(?:\b[Tt]est[\s_-]*|\b[Rr]un[\s_-]*|\bT(?=\d)|#)(\d{1,2})\s*$/;

export function parseRunIndex(jobName: string): string | null {
  const m = RUN_LABEL_RE.exec(jobName.trim());
  return m ? `T${m[1]}` : null;
}
