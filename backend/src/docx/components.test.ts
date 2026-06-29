import {
  validateComponentSyntax,
  ComponentError,
  matchCalloutOpen,
  isCalloutClose,
  isKpiFence,
  parseKpiRows,
  splitSeveritySpans,
  detectResidualComponentMarkers,
} from './components';

describe('WS4 component grammar — match helpers', () => {
  it('matches a valid callout open and maps the header label', () => {
    expect(matchCalloutOpen(':::callout narrative-thesis')).toEqual({ type: 'narrative-thesis', label: 'NARRATIVE THESIS' });
    expect(matchCalloutOpen(':::callout key-insight')).toEqual({ type: 'key-insight', label: 'KEY INSIGHT' });
  });
  it('returns null for non-callout lines and the bare close', () => {
    expect(matchCalloutOpen('Some prose')).toBeNull();
    expect(matchCalloutOpen(':::')).toBeNull();
    expect(isCalloutClose(':::')).toBe(true);
  });
  it('identifies the kpi fence by info string', () => {
    expect(isKpiFence('```kpi')).toBe(true);
    expect(isKpiFence('```')).toBe(false);
    expect(isKpiFence('```ts')).toBe(false);
  });
  it('parses KPI rows', () => {
    expect(parseKpiRows(['Annual mandates | 258', '', 'Recoverable | 45%'])).toEqual([
      { label: 'Annual mandates', value: '258' },
      { label: 'Recoverable', value: '45%' },
    ]);
  });
  it('splits severity spans, carrying the level and label', () => {
    const segs = splitSeveritySpans('Risk is {sev:high|High priority} today.');
    expect(segs).toEqual([
      { text: 'Risk is ' },
      { text: 'High priority', level: 'high' },
      { text: ' today.' },
    ]);
  });
});

describe('WS4 fail-loud validation (§C4)', () => {
  it('passes well-formed callout / kpi / severity', () => {
    const md = [
      ':::callout narrative-thesis',
      'The value leaks at sourcing.',
      ':::',
      '',
      '```kpi',
      'Annual mandates | 258',
      '```',
      '',
      'Severity is {sev:critical|Critical} here.',
    ].join('\n');
    expect(() => validateComponentSyntax(md)).not.toThrow();
  });

  it('throws on an unknown callout type', () => {
    expect(() => validateComponentSyntax(':::callout mystery\nx\n:::')).toThrow(ComponentError);
  });
  it('throws on a callout that is never closed', () => {
    expect(() => validateComponentSyntax(':::callout key-insight\nbody')).toThrow(/never closed/);
  });
  it('throws on a closing ::: with no open', () => {
    expect(() => validateComponentSyntax('prose\n:::\nmore')).toThrow(/no open callout/);
  });
  it('throws on a KPI line without exactly one pipe', () => {
    expect(() => validateComponentSyntax('```kpi\nAnnual mandates 258\n```')).toThrow(/Label \| Value/);
    expect(() => validateComponentSyntax('```kpi\na | b | c\n```')).toThrow(ComponentError);
  });
  it('throws on an empty KPI block', () => {
    expect(() => validateComponentSyntax('```kpi\n```')).toThrow(/empty/);
  });
  it('throws on a malformed severity marker (bad level / missing label)', () => {
    expect(() => validateComponentSyntax('x {sev:huge|Label} y')).toThrow(/severity/);
    expect(() => validateComponentSyntax('x {sev:high} y')).toThrow(/severity/);
    expect(() => validateComponentSyntax('x {sev:high|} y')).toThrow(/severity/);
  });
});

describe('WS4 post-render residual detector (§C6b)', () => {
  it('flags an unrendered marker of each class as a BLOCKER', () => {
    expect(detectResidualComponentMarkers('# Doc\n:::callout key-insight\n')[0]).toMatch(/^BLOCKER:/);
    expect(detectResidualComponentMarkers('text {sev:high|x} text').length).toBe(1);
    expect(detectResidualComponentMarkers('```kpi\n').length).toBe(1);
  });
  it('returns [] for clean rendered output', () => {
    expect(detectResidualComponentMarkers('# Executive Summary\nClean prose, no markers.')).toEqual([]);
  });
});
