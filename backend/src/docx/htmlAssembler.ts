import { log } from '../utils/logger';
import { stripCheckpointScaffold } from '../utils/confidenceScorer';
import { hex, severityWebTextHex } from './designTokens';
import {
  validateComponentSyntax, matchCalloutOpen, isCalloutClose, isKpiFence, parseKpiRows,
  splitSeveritySpans, hasSeverity, ws4Enabled,
} from './components';

interface Section {
  heading: string;
  content: string;
}

const ORDINALS = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inline markdown + WS4 severity spans. Severity labels render as inline bold text in the level's
// on-white text hue (the label word is inside the marker, so colour is never the sole signal).
function inlineFormat(text: string): string {
  const md = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  if (!hasSeverity(text)) return md(text);
  return splitSeveritySpans(text)
    .map(seg => seg.level
      ? `<strong class="bp-sev" style="color:${severityWebTextHex(seg.level)}">${esc(seg.text)}</strong>`
      : md(seg.text))
    .join('');
}

function parseAssembledContent(content: string): Section[] {
  // T-15: shared, format-tolerant CHECKPOINT scaffold stripper (single source of truth).
  const cleanContent = stripCheckpointScaffold(content);
  const sections: Section[] = [];
  const lines = cleanContent.split('\n');
  let currentHeading = '';
  let currentContent: string[] = [];
  let seenFirstHeading = false;

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (seenFirstHeading && currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentContent = [];
      }
      currentHeading = line.slice(2).trim();
      seenFirstHeading = true;
    } else if (seenFirstHeading) {
      currentContent.push(line);
    }
  }

  if (seenFirstHeading && currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  if (sections.length === 0) {
    sections.push({ heading: 'AI Value Blueprint', content });
  }

  return sections;
}

function renderTable(tableLines: string[]): string {
  const dataRows = tableLines.filter(line => !/^\|[\s|:\-]+\|$/.test(line));
  if (dataRows.length === 0) return '';

  const rows = dataRows.map((line, idx) => {
    const cells = line.split('|').slice(1, -1);
    if (idx === 0) {
      return `<tr>${cells.map(c => `<th>${inlineFormat(c.trim())}</th>`).join('')}</tr>`;
    }
    return `<tr>${cells.map(c => `<td>${inlineFormat(c.trim())}</td>`).join('')}</tr>`;
  });

  const thead = rows[0];
  const tbody = rows.slice(1).join('\n');
  return `<div class="tbl-wrap"><table class="dtbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

function renderSectionContent(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let i = 0;
  let inList = false;

  while (i < lines.length) {
    const t = lines[i].trim();

    if (!t) {
      if (inList) { out.push('</ul>'); inList = false; }
      i++;
      continue;
    }

    if (/^[-=_]{3,}$/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr class="divider">');
      i++;
      continue;
    }

    // WS4 callout (:::callout <type> … :::) — gold uppercase header, blue left border, callout bg.
    const callout = matchCalloutOpen(lines[i]);
    if (callout) {
      if (inList) { out.push('</ul>'); inList = false; }
      i++;
      const body: string[] = [];
      while (i < lines.length && !isCalloutClose(lines[i])) { body.push(lines[i]); i++; }
      if (i < lines.length) i++; // consume the closing :::
      const bodyHtml = body.filter(l => l.trim()).map(l => `<p>${inlineFormat(l.trim())}</p>`).join('\n');
      out.push(`<div class="bp-callout"><div class="hd">${esc(callout.label)}</div>${bodyHtml}</div>`);
      continue;
    }

    // WS4 KPI cards (```kpi … ```) — teal uppercase label, navy bold value.
    if (t.startsWith('```') && isKpiFence(lines[i])) {
      if (inList) { out.push('</ul>'); inList = false; }
      i++;
      const kpiLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { kpiLines.push(lines[i]); i++; }
      if (i < lines.length) i++; // consume closing fence
      const cards = parseKpiRows(kpiLines)
        .map(r => `<div class="bp-kpi"><div class="k">${inlineFormat(r.label)}</div><div class="v">${esc(r.value)}</div></div>`)
        .join('');
      out.push(`<div class="bp-kpis">${cards}</div>`);
      continue;
    }

    // Fenced code block (``` … ```) — contain it in a monospace panel so the ASCII portfolio
    // diagram renders as intended instead of leaking backticks and box characters as prose.
    if (t.startsWith('```')) {
      if (inList) { out.push('</ul>'); inList = false; }
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(esc(lines[i]));
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      if (codeLines.join('').trim()) out.push(`<pre class="ascii">${codeLines.join('\n')}</pre>`);
      continue;
    }

    if (t.startsWith('|') && t.endsWith('|')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    if (t.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="sh3">${inlineFormat(t.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (t.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="sh2">${inlineFormat(t.slice(3))}</h2>`);
      i++;
      continue;
    }

    if (t.startsWith('- ') || t.startsWith('• ')) {
      if (!inList) { out.push('<ul class="blist">'); inList = true; }
      out.push(`<li>${inlineFormat(t.slice(2))}</li>`);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="body nlist">${inlineFormat(t.replace(/^\d+\.\s+/, ''))}</p>`);
      i++;
      continue;
    }

    if (inList) { out.push('</ul>'); inList = false; }
    out.push(`<p class="body">${inlineFormat(t)}</p>`);
    i++;
  }

  if (inList) out.push('</ul>');
  return out.join('\n');
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function generateBlueprintHtml(clientName: string, assembledContent: string): string {
  log('info', `Generating HTML for ${clientName}`);

  if (ws4Enabled()) validateComponentSyntax(assembledContent); // WS4 §C4 — fail loud before rendering
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sections = parseAssembledContent(assembledContent);

  // WS4 §C2.4 — renderer-generated TOC from the H1 section headings (own page).
  const tocHtml = ws4Enabled() && sections.length > 1 ? `
<nav class="bp-toc" aria-label="Contents">
  <div class="bp-toc-h">Contents</div>
  <ol>${sections.map((s, idx) => `<li><a href="#section-${idx + 1}">${esc(s.heading)}</a></li>`).join('')}</ol>
</nav>` : '';

  // WS4 component styling, derived from the canonical tokens (design doc §7 — no local colours).
  const componentCss = `
  .bp-toc { width:210mm; min-height:297mm; margin:20px auto; background:${hex('white')}; padding:14mm 18mm; box-shadow:0 6px 26px rgba(0,0,0,.28); page-break-after:always; break-after:page; }
  .bp-toc-h { font-family:var(--sans); font-weight:bold; font-size:20px; color:${hex('navy')}; border-bottom:2px solid ${hex('blue')}; padding-bottom:8px; margin-bottom:14px; }
  .bp-toc ol { list-style:none; padding:0; margin:0; }
  .bp-toc li { padding:6px 0; border-bottom:.5pt solid ${hex('border')}; }
  .bp-toc a { color:${hex('navy')}; text-decoration:none; font-weight:bold; font-size:12pt; }
  .bp-callout { background:${hex('callout')}; border-left:3px solid ${hex('blue')}; padding:14px 18px; margin:12px 0; border-radius:0 3px 3px 0; }
  .bp-callout .hd { font-family:var(--sans); font-weight:bold; color:${hex('gold')}; text-transform:uppercase; letter-spacing:2px; font-size:11pt; margin-bottom:6px; }
  .bp-callout p { color:${hex('charcoal')}; font-size:11pt; margin:0 0 4pt; }
  .bp-kpis { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin:12px 0; }
  .bp-kpi { background:${hex('white')}; border:1px solid ${hex('border')}; border-radius:4px; padding:14px 16px; }
  .bp-kpi .k { color:${hex('teal')}; text-transform:uppercase; font-size:9pt; font-weight:bold; letter-spacing:.06em; }
  .bp-kpi .v { color:${hex('navy')}; font-weight:bold; font-size:22px; margin-top:6px; }
  .bp-sev { font-weight:bold; }`;

  const sectionPages = sections.map((section, idx) => {
    const ordinal = ORDINALS[idx] ?? `${idx + 1}`;
    const num = idx + 1;
    const body = renderSectionContent(section.content);
    return `
<div class="sheet" id="section-${num}">
  <div class="sheet-header">
    <span class="sh-brand">AI Assist BG &nbsp;|&nbsp; AI Value Blueprint</span>
    <span class="sh-client">${esc(clientName)}</span>
  </div>
  <div class="sheet-body">
    <div class="sec-eyebrow">Section ${ordinal}</div>
    <div class="sec-head">
      <div class="sec-accent-rule" aria-hidden="true"></div>
      <h1 class="sec-title"><span class="sec-no">${num}</span>&nbsp;${esc(section.heading)}</h1>
    </div>
    <div class="sec-content">
      ${body}
    </div>
  </div>
  <div class="sheet-footer">
    <span>Confidential &mdash; Addressee Only</span>
    <span>AI Assist BG</span>
  </div>
</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Value Blueprint &mdash; ${esc(clientName)}</title>
<style>

/* ── Reset ───────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Design tokens (matched to Baros Vision Master Deliverable) ──────────── */
/* WS2 — AI Assist BG canonical tokens (Design System v1.0.0). No local hexes (§7). */
:root {
  --navy:        #1B2A4A;
  --navy-deep:   #1B2A4A;
  --blue:        #2E5090;
  --teal:        #4A6FA5;
  --teal-deep:   #2E5090;
  --gold:        #C17B2C;
  --gold-deep:   #C17B2C;
  --gold-tint:   #F7F9FC;
  --ink:         #2D3748;
  --muted:       #666666;
  --line:        #BDC3CB;
  --tint:        #F7F9FC;
  --tint-2:      #F0F4F8;
  --confidential:#CC0000;
  --page:        #FFFFFF;
  --bg:          #4A5568;
  --sans:        "Calibri", "Carlito", Arial, sans-serif;
  --serif:       Georgia, "Times New Roman", serif;
  --util:        Arial, sans-serif;
}

/* ── Screen shell ────────────────────────────────────────────────────────── */
body {
  background: var(--bg);
  font-family: var(--sans);
  color: var(--ink);
  font-size: 11pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Toolbar (screen only) ───────────────────────────────────────────────── */
.toolbar {
  background: var(--navy-deep);
  color: #fff;
  padding: 9px 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 100;
  font-size: 13px;
}
.toolbar-title { font-size: 14px; font-weight: 700; letter-spacing: -.01em; }
.toolbar-sep { opacity: .35; }
.toolbar-spacer { flex: 1; }
.btn-print {
  background: var(--blue);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--sans);
  letter-spacing: .02em;
}
.btn-print:hover { background: var(--teal-deep); }
.btn-print:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }

/* ── A4 sheet + cover ────────────────────────────────────────────────────── */
.sheet, .cover {
  width: 210mm;
  min-height: 297mm;
  background: var(--page);
  margin: 20px auto;
  padding: 14mm 18mm;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 26px rgba(0,0,0,.28);
  page-break-after: always;
  break-after: page;
}

/* ── Running header / footer ─────────────────────────────────────────────── */
.sheet-header, .sheet-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8pt;
  color: var(--muted);
  flex-shrink: 0;
}
.sheet-header {
  border-bottom: .5pt solid var(--line);
  padding-bottom: 5pt;
  margin-bottom: 10pt;
}
.sh-brand { color: var(--blue); font-weight: 700; letter-spacing: .02em; }
.sh-client { color: var(--muted); }

.sheet-body { flex: 1; display: flex; flex-direction: column; }

.sheet-footer {
  border-top: .5pt solid var(--line);
  padding-top: 5pt;
  margin-top: 10pt;
}

/* ── Cover ───────────────────────────────────────────────────────────────── */
.cover {
  background: var(--page);
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  padding-top: 18mm;
}
.cover-eyebrow {
  color: var(--blue);
  font-weight: 700;
  letter-spacing: .34em;
  font-size: 11pt;
  text-transform: uppercase;
  margin-bottom: 22px;
}
.cover-logo {
  width: 120px;
  height: 72px;
  margin: 0 auto 20px;
  display: block;
}
.cover-title {
  font-family: var(--util);
  font-size: 28pt;
  font-weight: normal;
  color: var(--navy);
  line-height: 1.1;
  margin-bottom: 0;
  letter-spacing: .01em;
}
.cover-gold-rule {
  width: 60px;
  height: 3px;
  background: var(--blue);
  border-radius: 2px;
  margin: 16px auto 0;
}
.cover-client {
  font-family: var(--serif);
  font-style: italic;
  font-size: 24pt;
  font-weight: normal;
  color: var(--muted);
  margin-top: 14px;
}
.cover-meta {
  font-size: 10pt;
  color: var(--muted);
  line-height: 2;
  margin-top: 24px;
}
.cover-prepared {
  color: var(--blue);
  font-weight: 600;
  font-size: 10pt;
  margin-top: 20px;
}
.cover-confidential {
  color: var(--confidential);
  font-weight: 700;
  letter-spacing: .18em;
  font-size: 9pt;
  text-transform: uppercase;
  margin-top: 16px;
}

/* ── Section heading (signature structure) ───────────────────────────────── */
.sec-eyebrow {
  color: var(--blue);
  font-weight: 700;
  letter-spacing: .22em;
  font-size: 8pt;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.sec-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.sec-accent-rule {
  width: 5px;
  align-self: stretch;
  min-height: 28px;
  background: linear-gradient(180deg, var(--teal), var(--teal-deep));
  border-radius: 3px;
  flex-shrink: 0;
}
.sec-title {
  font-family: var(--sans);
  font-size: 20pt;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.2;
  margin: 0;
}
.sec-no {
  color: var(--teal-deep);
}
.sec-content { flex: 1; }

/* ── Prose ───────────────────────────────────────────────────────────────── */
.body {
  font-size: 11pt;
  line-height: 1.68;
  color: var(--ink);
  margin-bottom: 6pt;
}
.sh2 {
  font-size: 13pt;
  font-weight: 700;
  color: var(--blue);
  margin: 14pt 0 5pt;
  padding-left: 9pt;
  border-left: 3pt solid var(--blue);
}
.sh3 {
  font-size: 11pt;
  font-weight: 700;
  color: var(--navy);
  margin: 10pt 0 4pt;
}
.nlist { padding-left: 14pt; }
.divider {
  border: none;
  border-top: .5pt solid var(--line);
  margin: 8pt 0;
}

/* ── Bullets ─────────────────────────────────────────────────────────────── */
.blist {
  list-style: none;
  padding: 0;
  margin: 4pt 0 8pt;
}
.blist li {
  position: relative;
  padding-left: 14pt;
  font-size: 11pt;
  line-height: 1.65;
  margin-bottom: 4pt;
  color: var(--ink);
}
.blist li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7pt;
  width: 5pt;
  height: 5pt;
  border-radius: 50%;
  background: var(--teal-deep);
}

/* ── Tables ──────────────────────────────────────────────────────────────── */
.tbl-wrap {
  overflow-x: auto;
  margin: 6pt 0 12pt;
}
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}
.dtbl th {
  background: var(--navy-deep);
  color: #fff;
  font-weight: 700;
  text-align: left;
  padding: 7pt 10pt;
  border: none;
  font-size: 9pt;
  letter-spacing: .02em;
}
.dtbl td {
  padding: 6pt 10pt;
  border-bottom: .5pt solid var(--line);
  vertical-align: top;
  color: var(--ink);
}
.dtbl tr:nth-child(even) td { background: var(--tint-2); }

/* ── Fenced ASCII panel ──────────────────────────────────────────────────── */
.ascii {
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 8.5pt;
  line-height: 1.4;
  color: var(--muted);
  background: var(--tint-2);
  border: .5pt solid var(--line);
  border-radius: 6px;
  padding: 10pt 12pt;
  margin: 8pt 0 12pt;
  overflow-x: auto;
  white-space: pre;
}

${componentCss}

/* ── Print ───────────────────────────────────────────────────────────────── */
@media print {
  .toolbar { display: none; }
  body { background: #fff; }
  .cover, .sheet {
    margin: 0;
    box-shadow: none;
    width: 100%;
    min-height: 0;
    padding: 14mm 18mm;
  }
  @page { size: A4; margin: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .btn-print { transition: none; }
}

</style>
</head>
<body>

<nav class="toolbar" role="toolbar">
  <span class="toolbar-title">AI Value Blueprint</span>
  <span class="toolbar-sep">&mdash;</span>
  <span>${esc(clientName)}</span>
  <span class="toolbar-spacer"></span>
  <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
</nav>

<!-- Cover page -->
<div class="cover" role="region" aria-label="Cover page">
  <div class="cover-eyebrow">AI Value Blueprint</div>
  <svg class="cover-logo" viewBox="0 0 120 72" aria-label="AI Assist BG mark" role="img">
    <defs>
      <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#06637F"/>
        <stop offset="1" stop-color="#0FA6CC"/>
      </linearGradient>
    </defs>
    <rect x="4"  y="34" width="19" height="34" rx="2" fill="url(#lg)"/>
    <rect x="29" y="20" width="19" height="48" rx="2" fill="url(#lg)"/>
    <rect x="54" y="7"  width="35" height="16" rx="2" fill="url(#lg)"/>
    <rect x="54" y="28" width="45" height="16" rx="2" fill="url(#lg)"/>
    <rect x="54" y="49" width="62" height="17" rx="2" fill="url(#lg)"/>
  </svg>
  <div class="cover-title">AI Value Blueprint</div>
  <div class="cover-gold-rule" aria-hidden="true"></div>
  <div class="cover-client">${esc(clientName)}</div>
  <div class="cover-meta">
    Prepared by AI Assist BG<br>
    ${today}
  </div>
  <div class="cover-confidential">Confidential</div>
</div>
${tocHtml}

${sectionPages}

</body>
</html>`;
}
