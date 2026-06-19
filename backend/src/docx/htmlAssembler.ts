import { log } from '../utils/logger';

interface Section {
  heading: string;
  content: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function parseAssembledContent(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');
  let currentHeading = 'Executive Summary';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentContent = [];
      }
      currentHeading = line.slice(2).trim();
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
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

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const year  = new Date().getFullYear();
  const sections = parseAssembledContent(assembledContent);

  const sectionPages = sections.map((section, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const body = renderSectionContent(section.content);
    return `
<div class="sheet" id="section-${idx + 1}">
  <div class="sheet-header">
    <span class="sh-brand">AI Assist BG — AI Value Blueprint</span>
    <span class="sh-client">${esc(clientName)}</span>
  </div>
  <div class="sheet-body">
    <div class="sec-eyebrow">Section ${num}</div>
    <h1 class="sec-title">${esc(section.heading)}</h1>
    <div class="sec-rule"></div>
    <div class="sec-content">
      ${body}
    </div>
  </div>
  <div class="sheet-footer">
    <span>Confidential — Addressee Only</span>
    <span>AI Assist BG</span>
  </div>
</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Value Blueprint — ${esc(clientName)}</title>
<style>

/* ── Reset ───────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Design tokens ───────────────────────────────────────────────────────── */
:root {
  --navy:  #13243F;
  --blue:  #214A93;
  --teal:  #0FA6CC;
  --teal2: #06637F;
  --gold:  #C2851A;
  --body:  #1A2035;
  --muted: #5C6880;
  --rule:  #CDD5E1;
  --bg:    #EEF2F8;
  --light: #F4F7FC;
  --sans:  Calibri, Carlito, 'Trebuchet MS', Arial, sans-serif;
  --serif: Georgia, 'Times New Roman', serif;
}

/* ── Screen shell ────────────────────────────────────────────────────────── */
body {
  background: var(--bg);
  font-family: var(--sans);
  color: var(--body);
  font-size: 11pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Toolbar (screen only) ───────────────────────────────────────────────── */
.toolbar {
  background: var(--navy);
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
  background: var(--gold);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--sans);
  letter-spacing: .02em;
  transition: background .15s;
}
.btn-print:hover { background: #a56515; }
.btn-print:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }

/* ── A4 sheet ────────────────────────────────────────────────────────────── */
.sheet, .cover {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  margin: 20px auto;
  padding: 14mm 18mm;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 18px rgba(0,0,0,.10);
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
  border-bottom: .5pt solid var(--rule);
  padding-bottom: 5pt;
  margin-bottom: 12pt;
}
.sh-brand { color: var(--blue); font-weight: 600; letter-spacing: .02em; }

.sheet-body { flex: 1; display: flex; flex-direction: column; }

.sheet-footer {
  border-top: .5pt solid var(--rule);
  padding-top: 5pt;
  margin-top: 12pt;
}

/* ── Cover ───────────────────────────────────────────────────────────────── */
.cover {
  background: var(--navy);
  padding: 0;
}
.cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 36mm 18mm 22mm;
}
.cover-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 18mm;
}
.cover-eyebrow {
  font-size: 8pt;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 6mm;
  font-weight: 700;
}
.cover-title {
  font-family: var(--serif);
  font-size: 34pt;
  font-weight: 400;
  color: #fff;
  line-height: 1.18;
  margin-bottom: 4mm;
}
.cover-gold-rule {
  width: 38mm;
  height: 2pt;
  background: var(--gold);
  margin: 7mm 0;
}
.cover-client {
  font-size: 17pt;
  font-weight: 700;
  color: rgba(255,255,255,.88);
  margin-bottom: 14mm;
}
.cover-meta {
  font-size: 9pt;
  color: rgba(255,255,255,.50);
  line-height: 1.9;
}
.cover-meta strong { color: rgba(255,255,255,.72); font-weight: 600; }
.cover-foot {
  border-top: .5pt solid rgba(255,255,255,.15);
  padding: 7mm 18mm;
  display: flex;
  justify-content: space-between;
  font-size: 8pt;
  color: rgba(255,255,255,.30);
  flex-shrink: 0;
}

/* ── Section heading ─────────────────────────────────────────────────────── */
.sec-eyebrow {
  font-size: 8pt;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 3mm;
  font-weight: 700;
}
.sec-title {
  font-family: var(--serif);
  font-size: 22pt;
  font-weight: 400;
  color: var(--navy);
  line-height: 1.2;
  margin-bottom: 3mm;
}
.sec-rule {
  height: 1.5pt;
  background: linear-gradient(to right, var(--teal), transparent 70%);
  margin-bottom: 10mm;
}
.sec-content { flex: 1; }

/* ── Prose ───────────────────────────────────────────────────────────────── */
.body {
  font-size: 11pt;
  line-height: 1.68;
  color: var(--body);
  margin-bottom: 5pt;
}
.sh2 {
  font-size: 12.5pt;
  font-weight: 700;
  color: var(--blue);
  margin: 11pt 0 4pt;
  padding-left: 7pt;
  border-left: 2.5pt solid var(--teal);
}
.sh3 {
  font-size: 11pt;
  font-weight: 700;
  color: var(--body);
  margin: 8pt 0 3pt;
}
.nlist { padding-left: 14pt; }
.divider {
  border: none;
  border-top: .5pt solid var(--rule);
  margin: 8pt 0;
}

/* ── Bullets ─────────────────────────────────────────────────────────────── */
.blist {
  list-style: none;
  padding: 0;
  margin: 3pt 0 6pt;
}
.blist li {
  position: relative;
  padding-left: 13pt;
  font-size: 11pt;
  line-height: 1.65;
  margin-bottom: 3pt;
  color: var(--body);
}
.blist li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6.5pt;
  width: 5pt;
  height: 5pt;
  border-radius: 50%;
  background: var(--teal);
}

/* ── Tables ──────────────────────────────────────────────────────────────── */
.tbl-wrap {
  overflow-x: auto;
  margin: 5pt 0 10pt;
}
.dtbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}
.dtbl th {
  background: var(--navy);
  color: #fff;
  font-weight: 700;
  text-align: left;
  padding: 6pt 8pt;
  border: none;
  font-size: 9pt;
  letter-spacing: .02em;
}
.dtbl td {
  padding: 5pt 8pt;
  border-bottom: .5pt solid var(--rule);
  vertical-align: top;
}
.dtbl tr:nth-child(even) td { background: var(--light); }

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
  <span class="toolbar-sep">—</span>
  <span>${esc(clientName)}</span>
  <span class="toolbar-spacer"></span>
  <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
</nav>

<!-- Cover page -->
<div class="cover" role="region" aria-label="Cover page">
  <div class="cover-body">
    <svg class="cover-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="8" fill="#0FA6CC" fill-opacity="0.18"/>
      <path d="M12 36L24 12L36 36" stroke="#0FA6CC" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 28H32" stroke="#C2851A" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <div class="cover-eyebrow">AI Assist BG — Confidential</div>
    <div class="cover-title">AI Value<br>Blueprint</div>
    <div class="cover-gold-rule" aria-hidden="true"></div>
    <div class="cover-client">${esc(clientName)}</div>
    <div class="cover-meta">
      <strong>Prepared by</strong> AI Assist BG<br>
      <strong>Date</strong> ${today}<br>
      <strong>Classification</strong> Confidential — Addressee Only
    </div>
  </div>
  <div class="cover-foot">
    <span>AI Assist BG · ai-assist.bg</span>
    <span>© ${year} AI Assist BG. All rights reserved.</span>
  </div>
</div>

${sectionPages}

</body>
</html>`;
}
