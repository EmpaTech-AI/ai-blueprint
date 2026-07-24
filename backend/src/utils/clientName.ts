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
