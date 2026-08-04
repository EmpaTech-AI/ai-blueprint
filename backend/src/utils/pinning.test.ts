// ─── v37.6: the three pins and the rung declaration (eight-batch report III.2 / III.3) ────────────
//
// Ivan's synthesis: one latent variable explains every correlation and every absence — the degree of
// PINNING. Pinned surfaces are stable, durable, case-independent and safe; unpinned surfaces are where
// 100% of defects live on both sides of the producer–verifier contract. These tests cover the pins that
// close the rung-C stability gap without a single new archetype file.

import fs from 'fs';
import path from 'path';
import { renderInventoryMarker, parseDataInventory, computeInventory, validatePoolExclusions } from './inventoryGuards';
import { extractStage1Manifest, validateAgainstManifest } from './stage1Manifest';
import { resolveRung, formatRungDeclaration } from './archetypeRung';
import { validateRoadmapPhases } from './opportunityValidator';

const ARCHETYPES = path.join(__dirname, '../skills/blueprint-intake/archetypes');

const inventory = (opts: { active: string; nCore: string; coverage: string; severity: string }) => [
  '# Dossier', '', '## [DATA_INVENTORY]', '', '### Core Systems',
  '| System | Record classes held | Core? | Core because (stated priority) | Confidence |',
  '|---|---|---|---|---|',
  '| shopify | orders | yes | P1 | [Document-Backed] |',
  '| netsuite | finance | yes | P3 | [Document-Backed] |',
  '| postgres | analytics | yes | P1 | [Document-Backed] |',
  '| returnly | returns | yes | P2 | [Document-Backed] |',
  '| zendesk | cs | yes | P4 | [Document-Backed] |',
  '| skuvault | inventory | yes | P3 | [Document-Backed] |',
  '| klaviyo | marketing | yes | P1 | [Document-Backed] |', '',
  '### Integrations',
  '| System A | System B | Mechanism | Status | Active? | Confidence |', '|---|---|---|---|---|---|',
  '| shopify | postgres | scheduled | functioning | yes | [Document-Backed] |',
  '| netsuite | postgres | scheduled | functioning | yes | [Document-Backed] |',
  '| returnly | postgres | manual | functioning | no | [Document-Backed] |', '',
  '### Record Classes',
  '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
  '|---|---|---|---|---|---|---|',
  '| orders | shopify | yes | P1 | Reliable | feeds postgres | [Document-Backed] |',
  '| returns | returnly | yes | P2 | Degraded | siloed | [Document-Backed] |',
  '| cs | zendesk | yes | P4 | Degraded | siloed | [Document-Backed] |', '',
  `<!-- inventory: n_core=${opts.nCore} active_integrations=${opts.active} integration_coverage=${opts.coverage} ` +
  `designated_ssot=postgres ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=2 ` +
  `data_grade=Early pp0_severity=${opts.severity} -->`, '',
].join('\n');

// ── III.3 pin 2: the marker is rendered, and the evidence survives ──────────────
describe('pin 2 — inventory marker RENDERED from the tables (R1, R2, R9)', () => {
  // The exact LunaCart v1.2 defect: marker claims 4 active integrations, tables recompute to 2.
  const wrong = inventory({ active: '4', nCore: '7', coverage: '0.67', severity: 'High' });

  it('corrects the count, the coverage and the severity from the tables', () => {
    const r = renderInventoryMarker(wrong);
    expect(r.rendered).toBe(true);
    expect(r.changedFields).toEqual(expect.arrayContaining(['active_integrations', 'integration_coverage']));
    expect(r.corrected).toMatch(/active_integrations=2\b/);
    expect(r.corrected).toMatch(/integration_coverage=0\.33\b/);
  });

  // R2: PP-0 reached the right severity via the WRONG CLAUSE. With coverage rendered to 0.33 it now
  // reaches High through the coverage band, which is the clause that should have fired.
  it('re-derives pp0_severity from the rendered coverage, not the authored one', () => {
    const r = renderInventoryMarker(inventory({ active: '5', nCore: '7', coverage: '1.00', severity: 'none' }));
    expect(r.corrected).toMatch(/pp0_severity=High\b/);
    expect(r.changedFields).toContain('pp0_severity');
  });

  it('the rendered marker then agrees with its own tables', () => {
    const rendered = renderInventoryMarker(wrong).corrected;
    const computed = computeInventory(parseDataInventory(rendered));
    expect(parseDataInventory(rendered).marker!.activeIntegrations).toBe(computed.activeIntegrations);
    expect(Math.round(computed.integrationCoverage * 100) / 100).toBe(0.33);
  });

  // The discipline that keeps the fix falsifiable: removing a defect must not remove its measurement.
  it('is a no-op when the marker already agrees — no gratuitous edits', () => {
    const right = inventory({ active: '2', nCore: '7', coverage: '0.33', severity: 'High' });
    const r = renderInventoryMarker(right);
    expect(r.rendered).toBe(false);
    expect(r.corrected).toBe(right);
  });

  it('is a safe no-op when there is no inventory block at all', () => {
    const r = renderInventoryMarker('# Dossier\n\nNo inventory here.\n');
    expect(r).toEqual({ corrected: '# Dossier\n\nNo inventory here.\n', rendered: false, changedFields: [] });
  });
});

// ── III.3 pin 1: the Stage-1 freeze gives rung C a root ────────────────────────
describe('pin 1 — Stage-1 freeze manifest (A19), the rung-C substitute for an archetype root', () => {
  const mk = (id: string, i: number, f: number, a: number, extra = '') =>
    `<!-- score: id=${id} impact=${i} feasibility=${f} alignment=${a} product=${i * f * a} class=X ` +
    `ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no ` +
    `compliance_deadline=none system_event_deadline=none phase_dependency=n/a ${extra}-->`;
  const stage1 = [mk('H-EC-01', 5, 4, 5), mk('H-EC-02', 4, 3, 4)].join('\n');
  const manifest = extractStage1Manifest(stage1);

  it('freezes the ID set, scores and the nine relay flags', () => {
    expect(manifest.ids).toEqual(['h-ec-01', 'h-ec-02']);
    expect(manifest.elements[0]).toMatchObject({ impact: 5, baseFeasibility: 4, alignment: 5 });
    expect(Object.keys(manifest.elements[0].flags)).toHaveLength(9);
  });

  it('is clean when Stage 3 copies the freeze', () => {
    expect(validateAgainstManifest(stage1, manifest).reviewerFlags).toEqual([]);
  });

  it('BLOCKERs a dropped element and an invented one — R3\'s recurrence path', () => {
    const drifted = [mk('H-EC-01', 5, 4, 5), mk('H-EC-09', 3, 3, 3)].join('\n');
    const flags = validateAgainstManifest(drifted, manifest).reviewerFlags;
    expect(flags.some(f => /DROPPED h-ec-02/.test(f))).toBe(true);
    expect(flags.some(f => /INVENTED h-ec-09/.test(f))).toBe(true);
  });

  it('BLOCKERs an impact or alignment change — neither is adjustable by any rule', () => {
    const flags = validateAgainstManifest([mk('H-EC-01', 4, 4, 5), mk('H-EC-02', 4, 3, 4)].join('\n'), manifest).reviewerFlags;
    expect(flags.some(f => /impact=4 at Stage 3 but 5 at the Stage-1 freeze/.test(f))).toBe(true);
  });

  // Feasibility is DIRECTIONAL, not frozen: A4 legitimately reduces it.
  it('allows feasibility to FALL (the D6 adjustment) but not to RISE', () => {
    const reduced = [mk('H-EC-01', 5, 2, 5), mk('H-EC-02', 4, 3, 4)].join('\n');
    expect(validateAgainstManifest(reduced, manifest).reviewerFlags).toEqual([]);
    const raised = [mk('H-EC-01', 5, 5, 5), mk('H-EC-02', 4, 3, 4)].join('\n');
    expect(validateAgainstManifest(raised, manifest).reviewerFlags
      .some(f => /feasibility ROSE from 4 .* to 5/.test(f))).toBe(true);
  });

  it('BLOCKERs relay-flag drift, which moves an opportunity between phases', () => {
    const drifted = stage1.replace('phase_dependency=n/a -->', 'phase_dependency=strict -->');
    expect(validateAgainstManifest(drifted, manifest).reviewerFlags
      .some(f => /phase_dependency=strict at Stage 3 but n\/a/.test(f))).toBe(true);
  });

  it('fails loud when nothing could be frozen — at rung C the loss is total, not partial', () => {
    const r = validateAgainstManifest(stage1, extractStage1Manifest('no markers here'));
    expect(r.unavailableReason).toBe('no_stage1_markers');
    expect(r.reviewerFlags[0]).toMatch(/its absence is not a coverage gap, it is total/);
  });
});

// ── Item 7: the rung is a first-class output ───────────────────────────────────
describe('item 7 — rung declaration with the measured coverage fraction', () => {
  it('reads rung A from the ACTIVE archetype in INDEX', () => {
    const d = resolveRung('ARCHETYPE: recruitment', ARCHETYPES);
    expect(d).toMatchObject({ rung: 'A', verification: 'FULL' });
  });

  it('reads rung B for PENDING VALIDATION — activation is earned by calibration, not authorship', () => {
    const d = resolveRung('ARCHETYPE: manufacturing', ARCHETYPES);
    expect(d).toMatchObject({ rung: 'B', verification: 'FULL-attempted' });
    expect(d.reason).toMatch(/earned by calibration, not authorship/);
  });

  it('reads rung C for generic — UNAVAILABLE by fact, not by fault', () => {
    const d = resolveRung('ARCHETYPE: generic', ARCHETYPES);
    expect(d).toMatchObject({ rung: 'C', verification: 'PARTIAL' });
    expect(d.reason).toMatch(/by fact, not by fault/);
  });

  // Rule 2: activation is never inferred from the presence of a file.
  it('treats an unlisted archetype as rung C rather than inferring ACTIVE', () => {
    const d = resolveRung('ARCHETYPE: retail', ARCHETYPES);
    expect(d.rung).toBe('C');
    expect(d.reason).toMatch(/inferring ACTIVE from the presence of a file is exactly what rule 1 forbids/);
  });

  it('prints the coverage fraction and the non-comparability rule on the run record', () => {
    const line = formatRungDeclaration(resolveRung('ARCHETYPE: generic', ARCHETYPES), 8, 24);
    expect(line).toMatch(/^RUNG: C /);
    expect(line).toMatch(/Class-A coverage 8\/24/);
    expect(line).toMatch(/sets verification DEPTH, never verdict logic/);
    expect(line).toMatch(/Scores from different rungs are NOT comparable/);
  });
});

// ── Items 2 and 3: the two remaining instrument fixes ─────────────────────────
describe('item 2 — A16 register-format scoping (13 BLOCKERs on Meridian)', () => {
  const withSectionH = (sectionH: string) =>
    `# Dossier\n\n<!-- inventory: n_core=5 pp0_severity=Critical -->\n\n## Section H\n\n${sectionH}\n`;
  const roots = (ids: string[]) => new Map(ids.map(id => [id, { band1Pool: 'no' }]));

  it('captures only the IDs that follow the exclusion label', () => {
    const canonical = '- Excluded (`band1_pool=no`, PP-0 Critical (systemic)): H-RT-08 RPO Product ' +
      'Infrastructure (score 50); H-RT-09 Executive Search (score 32) — both standalone product-build bets';
    expect(validatePoolExclusions(withSectionH(canonical), roots(['h-rt-08', 'h-rt-09'])).excludedIds)
      .toEqual(['h-rt-08', 'h-rt-09']);
  });

  // The over-capture: a register line names the whole evaluated pool AND narrates the exclusion.
  it('does NOT capture the evaluated pool listed before the label', () => {
    const register = '- Candidate register: H-RT-01, H-RT-02, H-RT-03, H-RT-04, H-RT-05, H-RT-06, H-RT-07 ' +
      'evaluated and kept; excluded per `band1_pool=no`: H-RT-08, H-RT-09';
    expect(validatePoolExclusions(withSectionH(register), roots(['h-rt-08', 'h-rt-09'])).excludedIds)
      .toEqual(['h-rt-08', 'h-rt-09']);
  });

  it('captures nothing from prose narration with no record label', () => {
    const prose = '- **Candidate evaluated:** Executive Search Workflow Intelligence — excluded from the ' +
      'candidate pool by the Band-1 rule (`band1_pool=no`): a standalone product-build bet on a fragmented layer';
    expect(validatePoolExclusions(withSectionH(prose), new Map()).excludedIds).toEqual([]);
  });

  // One diagnostic beats thirteen BLOCKERs: a flood buries the findings beside it.
  it('SUSPENDS A16c on a probable over-capture rather than emitting N BLOCKERs', () => {
    const flood = '- Excluded (`band1_pool=no`): ' +
      Array.from({ length: 9 }, (_, i) => `H-RT-0${i + 1}`).join(', ');
    const library = roots(Array.from({ length: 13 }, (_, i) => `h-rt-${String(i + 1).padStart(2, '0')}`));
    const r = validatePoolExclusions(withSectionH(flood), library);
    expect(r.provenanceChecked).toBe(false);
    expect(r.reviewerFlags.filter(f => /A16c/.test(f))).toHaveLength(1);
    expect(r.reviewerFlags[0]).toMatch(/SUSPENDED \(probable register-format over-capture\)/);
  });
});

describe('item 3 — GATE-4 Quick-Win recomputed from post-adjustment feasibility', () => {
  const roadmap = [
    '## Phase 1: Now', '', '### A', '', 'Element: H-EC-01', '',
    '## Phase 2: Next', '', '## Phase 3: Later', '', '### B', '', 'Element: H-EC-02', '',
    '## Bridge', '',
  ].join('\n');

  // The false positive: the model MIS-LABELLED a card as QuickWin (REG-25 catches that), and GATE-4
  // then stacked a placement violation on top by trusting the label.
  it('does not fire on a mis-LABELLED card whose real feasibility is not Quick-Win', () => {
    const misLabelled = [{ id: 'H-EC-02', impact: 5, feasibility: 2, alignment: 5, product: 50, class: 'QuickWin' }];
    expect(validateRoadmapPhases(roadmap, misLabelled).reviewerFlags
      .some(f => /Quick Win H-EC-02 appears/.test(f))).toBe(false);
  });

  it('still fires on a genuine Quick Win placed in Later, whatever the label says', () => {
    const genuine = [{ id: 'H-EC-02', impact: 4, feasibility: 5, alignment: 4, product: 80, class: 'FoundationBuilder' }];
    expect(validateRoadmapPhases(roadmap, genuine).reviewerFlags
      .some(f => /Quick Win H-EC-02 appears in "Phase 3: Later"/.test(f))).toBe(true);
  });
});

// ── Reliable [DATA_INVENTORY] emission: the contract, not the code ─────────────
describe('R5 — [DATA_INVENTORY] is in the mandatory production order', () => {
  const skill = fs.readFileSync(
    path.join(__dirname, '../skills/blueprint-intake/SKILL.md'), 'utf-8');

  // It was documented but absent from the ORDERED list, and omitted in 1/4 Meridian runs.
  // Documentation is not a checklist.
  it('appears in the Chunk 3 production order', () => {
    const order = /\*\*Production order for Chunk 3 \(mandatory\):\*\*([^\n]*)/.exec(skill)?.[1] ?? '';
    expect(order).toMatch(/\[DATA_INVENTORY\]/);
    expect(order.indexOf('[DATA_INVENTORY]')).toBeLessThan(order.indexOf('[JUSTIFICATION]'));
  });

  it('appears in the first-turn behaviour for Chunk 3', () => {
    expect(skill).toMatch(/produce Chunk 3 \(Sections E–H \+ \*\*\[DATA_INVENTORY\]\*\*/);
  });
});
