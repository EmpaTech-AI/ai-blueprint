// ─── The guard that keeps the archetype-free golden archetype-free ───────────────────────────────
//
// v37.5. Five remediation cycles validated the entire guard layer on Meridian, and four properties
// reported as pipeline achievements — A6's 24/24, D6b's 4/4, the Class-G layer's operation, S5's clean
// strip — turned out to be properties of the test case. LunaCart was the first non-archetype case and
// exposed all four in one batch. Its v1.1 run then scored 88%, equal to Meridian v38.
//
// The obvious next step is to build `retail.md`. Doing so would make LunaCart archetype-active and
// return the kit to four archetype-active goldens, rebuilding the blind spot that took two weeks to
// find. A fixture document cannot prevent that; this test can.
//
// It is deliberately a test rather than a runtime guard: the hazard is a REPO EDIT, not a bad run.

import fs from 'fs';
import path from 'path';
import {
  parseDataInventory,
  computeInventory,
  pp0SeverityFromCoverage,
  validateDataInventory,
  validatePoolExclusions,
} from './inventoryGuards';

// v37.10: A20a reports an inventory whose Record Classes table is a SUBSET of the classes the Core
// Systems table declares. The contract permits that, so it is a ⚠ rather than a BLOCKER — which means
// `toEqual([])` was conflating "no defects" with "nothing to say". These pins assert BOTH halves
// separately: zero BLOCKERs, and the advisory set is exactly the expected one. Tighter than before,
// not looser — an unexpected advisory still fails.
const blockers = (flags: string[]) => flags.filter(f => f.startsWith('BLOCKER:'));
const advisories = (flags: string[]) => flags.filter(f => !f.startsWith('BLOCKER:'));
const unratedClassAdvisories = (flags: string[]) => advisories(flags).filter(f => /A20a/.test(f));
function expectCleanInventory(flags: string[], expectA20a = 0) {
  expect(blockers(flags)).toEqual([]);
  expect(unratedClassAdvisories(flags)).toHaveLength(expectA20a);
  expect(advisories(flags)).toHaveLength(expectA20a);
}


const ARCHETYPES = path.join(__dirname, '../skills/blueprint-intake/archetypes');
const FIXTURE = path.join(__dirname, '../skills/blueprint-intake/fixtures/lunacart_archetype_free_golden.md');
const fixture = fs.readFileSync(FIXTURE, 'utf-8');

// INDEX.md rows: | keywords | file | slug | STATUS |
function indexRows(): Array<{ keywords: string; file: string; status: string }> {
  const md = fs.readFileSync(path.join(ARCHETYPES, 'INDEX.md'), 'utf-8');
  const rows: Array<{ keywords: string; file: string; status: string }> = [];
  for (const line of md.split('\n')) {
    if (!/^\|/.test(line.trim())) continue;
    const c = line.split('|').map(s => s.replace(/[`*]/g, '').trim()).filter((_, i) => i > 0);
    if (c.length < 4 || /^-+$/.test(c[0]) || /^keywords/i.test(c[0])) continue;
    rows.push({ keywords: c[0].toLowerCase(), file: c[1], status: c[3] ?? '' });
  }
  return rows;
}

const RETAIL_KEYWORDS = /\bretail\b|\be-?commerce\b|\bconsumer goods\b|\bdtc\b/i;
const isActive = (status: string) => /^ACTIVE\b/i.test(status.trim());

describe('LunaCart must remain the permanent archetype-free golden', () => {
  it('no ACTIVE archetype claims retail / e-commerce / DTC', () => {
    const offending = indexRows().filter(r => RETAIL_KEYWORDS.test(r.keywords) && isActive(r.status));
    expect({
      offending: offending.map(r => `${r.keywords} → ${r.file} [${r.status}]`),
      why: 'LunaCart is pinned as the ONLY archetype-free golden (fixtures/lunacart_archetype_free_golden.md). '
        + 'Making retail ACTIVE removes the kit\'s only case that exercises the honest-unavailability path '
        + 'for A4/A9 and its only proof that A11–A17 are archetype-independent. If this is a deliberate '
        + 'decision, edit that fixture and this test together — do not discover it from a batch that '
        + 'silently stopped detecting archetype-conditional behaviour.',
    }).toEqual({ offending: [], why: expect.any(String) });
  });

  it('at least one industry remains non-ACTIVE, so the kit is never all-archetype-active', () => {
    const rows = indexRows().filter(r => r.keywords && !/no match/i.test(r.keywords));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => !isActive(r.status))).toBe(true);
  });

  it('no archetype file carries H-LC-* IDs — the resolver must find no root for this case', () => {
    for (const file of fs.readdirSync(ARCHETYPES).filter(f => f.endsWith('.md'))) {
      const md = fs.readFileSync(path.join(ARCHETYPES, file), 'utf-8');
      expect({ file, hasLcIds: /^\|\s*\**\s*H-LC-\d+/im.test(md) }).toEqual({ file, hasLcIds: false });
    }
  });
});

// "Never fires" escalates to "prove it can." A guard whose firing path is untested is indistinguishable
// from a broken one — this project has hit that three times (A4's skip, A9's missing else, Established's
// unreachability). These two assert the predicate against synthetic INDEX rows.
describe('the guard demonstrably bites', () => {
  const parse = (md: string) => md.split('\n')
    .filter(l => /^\|/.test(l.trim()))
    .map(l => l.split('|').map(s => s.replace(/[`*]/g, '').trim()).filter((_, i) => i > 0))
    .filter(c => c.length >= 4 && !/^-+$/.test(c[0]) && !/^keywords/i.test(c[0]))
    .map(c => ({ keywords: c[0].toLowerCase(), file: c[1], status: c[3] ?? '' }));

  it('would FAIL if retail were made ACTIVE', () => {
    const rows = parse('| retail, e-commerce, consumer goods | `retail.md` | `retail` | ACTIVE |');
    expect(rows.filter(r => RETAIL_KEYWORDS.test(r.keywords) && isActive(r.status))).toHaveLength(1);
  });

  it('permits retail existing as a NON-active archetype — building the file is not the hazard', () => {
    const rows = parse('| retail, e-commerce | `retail.md` | `retail` | PENDING VALIDATION |');
    expect(rows.filter(r => RETAIL_KEYWORDS.test(r.keywords) && isActive(r.status))).toHaveLength(0);
  });

  it('would FAIL if every industry became ACTIVE', () => {
    const rows = parse([
      '| recruitment | `recruitment.md` | `recruitment` | ACTIVE |',
      '| retail | `retail.md` | `retail` | ACTIVE |',
    ].join('\n'));
    expect(rows.some(r => !isActive(r.status))).toBe(false);
  });
});

describe('the pinned LunaCart values recompute from the fixture', () => {
  const computed = computeInventory(parseDataInventory(fixture));

  it('coverage is 0.33 from 7 core systems and 2 active integrations', () => {
    expect(computed.nCore).toBe(7);
    expect(computed.activeIntegrations).toBe(2);
    expect(Math.round(computed.integrationCoverage * 100) / 100).toBe(0.33);
  });

  // The settled answer, and the combination NO v1 run produced.
  it('resolves to PP-0 High (structural) AND Data Early together', () => {
    expect(pp0SeverityFromCoverage(computed.integrationCoverage, false)).toBe('High');
    expect(computed.dataGrade).toBe('Early');
    expect(computed.loadBearingDegradedOrAbsent).toBe(2);   // returns, cs_interactions
  });

  it('passes A11–A15 clean', () => {
    expectCleanInventory(validateDataInventory(fixture).reviewerFlags, 1);  // shopify `products`, postgres `analytics`
  });

  it('records PP-0 High with zero pool exclusions', () => {
    const r = validatePoolExclusions(fixture);
    expect(r.severity).toBe('High');
    expect(r.excludedIds).toEqual([]);
    expect(r.reviewerFlags).toEqual([]);
  });

  // The fixture deliberately keeps the ANNOTATED cell forms the v1.1 runs emitted, so it regression-
  // tests the v37.5 normalisation sweep rather than only the arithmetic.
  it('regression-tests the enum tolerance: annotated mechanism and rating cells', () => {
    expect(fixture).toMatch(/scheduled \(daily\)/);
    expect(fixture).toMatch(/Degraded \(siloed\)/);
    expectCleanInventory(validateDataInventory(fixture).reviewerFlags, 1);
  });

  it('is NOT Established — no governance evidence, so the G1–G3 gate correctly withholds it', () => {
    expect(computed.dataGrade).not.toBe('Established');
  });
});
