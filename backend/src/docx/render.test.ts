import path from 'path';
import fs from 'fs';
import os from 'os';
import { generateBlueprintTxt, generateBlueprintDocx, generateBlueprintPdf } from './assembler';
import { generateBlueprintHtml as genHtml } from './htmlAssembler';
import { detectResidualComponentMarkers } from './components';

// A deliverable exercising every WS4 component across two sections (so the TOC renders too).
const SAMPLE = [
  '# Executive Summary',
  '',
  ':::callout narrative-thesis',
  'The firm value leaks at sourcing, not screening.',
  ':::',
  '',
  '```kpi',
  'Annual mandates | 258',
  'Sourcing hours/yr | 1,800',
  '```',
  '',
  'Governance exposure is {sev:critical|Critical} and data drift is {sev:medium|Moderate}.',
  '',
  '# Recommended Action Sequence',
  '',
  'Sourcing automation is the first win.',
  '',
  '*End of AI Value Blueprint.*',
].join('\n');

describe('WS4 renderers — components render and leave no raw markers', () => {
  const prevFlag = process.env.WS4_COMPONENTS;
  beforeAll(() => { process.env.WS4_COMPONENTS = 'on'; });
  afterAll(() => { if (prevFlag === undefined) delete process.env.WS4_COMPONENTS; else process.env.WS4_COMPONENTS = prevFlag; });

  it('HTML: renders callout/KPI/severity + TOC, no residual markers', () => {
    const html = genHtml('Meridian Talent Partners', SAMPLE);
    expect(html).toContain('NARRATIVE THESIS');
    expect(html).toContain('258');
    expect(html).toContain('Critical');
    expect(html).toContain('bp-toc');
    expect(detectResidualComponentMarkers(html)).toEqual([]);
  });

  it('TXT: renders callout header, KPI lines, severity label words, no residual markers', () => {
    const txt = generateBlueprintTxt('Meridian Talent Partners', SAMPLE);
    expect(txt).toContain('NARRATIVE THESIS');
    expect(txt).toContain('ANNUAL MANDATES: 258');
    expect(txt).toContain('Critical');
    expect(txt).not.toContain('{sev:');
    expect(detectResidualComponentMarkers(txt)).toEqual([]);
  });

  it('DOCX: generates a buffer without throwing', async () => {
    const tmp = path.join(os.tmpdir(), `ws4-render-${Date.now()}.docx`);
    const buf = await generateBlueprintDocx('Meridian Talent Partners', SAMPLE, tmp);
    expect(buf.length).toBeGreaterThan(0);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  });

  it('PDF: generates a buffer without throwing', async () => {
    const buf = await generateBlueprintPdf('Meridian Talent Partners', SAMPLE);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('fail-loud: a malformed marker aborts rendering (§C4)', () => {
    const bad = '# Title\n\n:::callout mystery\nx\n:::\n\n*End of AI Value Blueprint.*';
    expect(() => genHtml('X', bad)).toThrow(/callout/);
  });
});
