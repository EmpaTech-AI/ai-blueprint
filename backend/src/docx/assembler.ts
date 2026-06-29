import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import fs from 'fs';
import { log } from '../utils/logger';
import { stripCheckpointScaffold } from '../utils/confidenceScorer';
import { COLORS } from './designTokens';
import {
  validateComponentSyntax, matchCalloutOpen, isCalloutClose, isKpiFence, parseKpiRows,
  splitSeveritySpans, hasSeverity, ws4Enabled, type SeverityLevel,
} from './components';

const BRAND = {
  primaryBlue: '2E5FA1',
  lightBlue: 'D6E4F7',
  darkGray: '404040',
  gray: 'A6A6A6',
  white: 'FFFFFF',
  bodyFont: 'Arial',
  h1Size: 36,
  h2Size: 30,
  h3Size: 26,
  bodySize: 22,
  smallSize: 18,
};

interface Section {
  heading: string;
  content: string;
}

// ─── Inline text parser ────────────────────────────────────────────────────────
// Handles **bold**, *italic*, and plain text within a line.

function parseInlineRuns(text: string, baseSize = BRAND.bodySize): TextRun[] {
  // WS4 severity: render {sev:level|Label} as inline bold text in the level's brand hue (DOCX uses
  // the full hue — never a cell fill). The label word is inside the marker, so colour isn't the only
  // signal. Non-severity segments fall through to the **bold**/*italic* parser below.
  if (hasSeverity(text)) {
    const runs: TextRun[] = [];
    for (const seg of splitSeveritySpans(text)) {
      if (seg.level) runs.push(new TextRun({ text: seg.text, bold: true, font: BRAND.bodyFont, size: baseSize, color: COLORS[seg.level as SeverityLevel] }));
      else runs.push(...parseBoldItalicRuns(seg.text, baseSize));
    }
    return runs.length > 0 ? runs : [new TextRun({ text, font: BRAND.bodyFont, size: baseSize, color: BRAND.darkGray })];
  }
  return parseBoldItalicRuns(text, baseSize);
}

function parseBoldItalicRuns(text: string, baseSize: number): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: BRAND.bodyFont, size: baseSize, color: BRAND.darkGray }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, font: BRAND.bodyFont, size: baseSize, color: BRAND.darkGray }));
    } else {
      runs.push(new TextRun({ text: part, font: BRAND.bodyFont, size: baseSize, color: BRAND.darkGray }));
    }
  }
  return runs;
}

// WS4 DOCX callout — left border + shaded paragraph, gold uppercase header, charcoal body.
function buildDocxCallout(label: string, body: string[]): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(new Paragraph({
    children: [new TextRun({ text: label.toUpperCase(), bold: true, font: BRAND.bodyFont, size: BRAND.smallSize, color: COLORS.gold })],
    border: { left: { color: COLORS.blue, size: 18, style: BorderStyle.SINGLE, space: 8 } },
    shading: { type: ShadingType.SOLID, color: COLORS.callout, fill: COLORS.callout },
    spacing: { before: 120, after: 40 },
  }));
  for (const line of body.filter(l => l.trim())) {
    out.push(new Paragraph({
      children: parseInlineRuns(line.trim()),
      border: { left: { color: COLORS.blue, size: 18, style: BorderStyle.SINGLE, space: 8 } },
      shading: { type: ShadingType.SOLID, color: COLORS.callout, fill: COLORS.callout },
      spacing: { after: 60 },
    }));
  }
  return out;
}

// WS4 DOCX KPI cards — a 2-column table (teal label · navy bold value) per the card token mapping.
function buildDocxKpis(rows: Array<{ label: string; value: string }>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(r => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: r.label.toUpperCase(), bold: true, font: BRAND.bodyFont, size: BRAND.smallSize, color: COLORS.teal })] })],
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: r.value, bold: true, font: BRAND.bodyFont, size: BRAND.h3Size, color: COLORS.navy })] })],
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
      ],
    })),
  });
}

// ─── Markdown table builder ────────────────────────────────────────────────────

function buildDocxTable(tableLines: string[]): Table | null {
  // Strip separator rows (e.g. |---|---|  |:---|---:|)
  const dataRows = tableLines.filter(line => !/^\|[\s|:\-]+\|$/.test(line.trim()));
  if (dataRows.length === 0) return null;

  const rows = dataRows.map((line, rowIdx) => {
    const cells = line.split('|').slice(1, -1); // trim leading/trailing empty from split
    return new TableRow({
      tableHeader: rowIdx === 0,
      children: cells.map(cell => new TableCell({
        children: [
          new Paragraph({
            children: rowIdx === 0
              ? [new TextRun({ text: cell.trim(), bold: true, font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.white })]
              : parseInlineRuns(cell.trim(), BRAND.smallSize),
            spacing: { before: 60, after: 60 },
          }),
        ],
        shading: rowIdx === 0
          ? { type: ShadingType.SOLID, color: BRAND.primaryBlue, fill: BRAND.primaryBlue }
          : undefined,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ─── Section builder ───────────────────────────────────────────────────────────

function buildSection(section: Section): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Section heading
  elements.push(
    new Paragraph({
      children: [new TextRun({ text: section.heading, bold: true, size: BRAND.h2Size, color: BRAND.primaryBlue, font: BRAND.bodyFont })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 480, after: 240 },
      border: {
        bottom: { color: BRAND.primaryBlue, size: 4, style: BorderStyle.SINGLE, space: 4 },
      },
    })
  );

  const lines = section.content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const raw     = lines[i];
    const trimmed = raw.trim();

    // Empty line
    if (!trimmed) {
      elements.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-=_]{3,}$/.test(trimmed)) {
      elements.push(new Paragraph({
        border: { bottom: { color: 'CCCCCC', size: 2, style: BorderStyle.SINGLE, space: 2 } },
        spacing: { before: 120, after: 120 },
      }));
      i++;
      continue;
    }

    // WS4 callout (:::callout <type> … :::)
    const calloutD = matchCalloutOpen(raw);
    if (calloutD) {
      i++;
      const body: string[] = [];
      while (i < lines.length && !isCalloutClose(lines[i])) { body.push(lines[i]); i++; }
      if (i < lines.length) i++; // consume :::
      elements.push(...buildDocxCallout(calloutD.label, body));
      continue;
    }

    // WS4 KPI cards (```kpi … ```)
    if (trimmed.startsWith('```') && isKpiFence(raw)) {
      i++;
      const kpiLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { kpiLines.push(lines[i]); i++; }
      if (i < lines.length) i++; // consume closing fence
      elements.push(buildDocxKpis(parseKpiRows(kpiLines)));
      elements.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }

    // Fenced code block (``` … ```) — render inner text in a monospace run with the
    // unrenderable box-drawing glyphs stripped (the ASCII portfolio diagram otherwise prints
    // as tofu). Mirrors the PDF/HTML handling so all three artifacts agree.
    if (trimmed.startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        const cleaned = stripUnrenderableGlyphs(lines[i]);
        if (cleaned.trim()) codeLines.push(cleaned);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      for (const cl of codeLines) {
        elements.push(new Paragraph({
          children: [new TextRun({ text: cl, font: 'Courier New', size: 18, color: '44526B' })],
          spacing: { after: 20 },
        }));
      }
      continue;
    }

    // Markdown table — collect all consecutive table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const tbl = buildDocxTable(tableLines);
      if (tbl) {
        elements.push(tbl);
        elements.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
      continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(4), bold: true, size: BRAND.h3Size, color: BRAND.darkGray, font: BRAND.bodyFont })],
        spacing: { before: 240, after: 120 },
      }));
      i++;
      continue;
    }

    // H2
    if (trimmed.startsWith('## ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(3), bold: true, size: BRAND.h2Size, color: BRAND.primaryBlue, font: BRAND.bodyFont })],
        spacing: { before: 360, after: 180 },
      }));
      i++;
      continue;
    }

    // Unordered bullet
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      elements.push(new Paragraph({
        children: parseInlineRuns(trimmed.slice(2)),
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s+/, '');
      elements.push(new Paragraph({
        children: parseInlineRuns(text),
        numbering: { reference: 'default-numbering', level: 0 },
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // Bold-only line (e.g. **Section Label**)
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(2, -2), bold: true, size: BRAND.bodySize, font: BRAND.bodyFont, color: BRAND.darkGray })],
        spacing: { after: 120 },
      }));
      i++;
      continue;
    }

    // Normal paragraph (may have inline bold/italic)
    elements.push(new Paragraph({
      children: parseInlineRuns(trimmed),
      spacing: { after: 120 },
    }));
    i++;
  }

  return elements;
}

// ─── DOCX Generator ────────────────────────────────────────────────────────────

export async function generateBlueprintDocx(
  clientName: string,
  assembledContent: string,
  outputPath: string
): Promise<Buffer> {
  log('info', `Generating DOCX for ${clientName}`, { outputPath });

  if (ws4Enabled()) validateComponentSyntax(assembledContent); // WS4 §C4 — fail loud before rendering
  const sections = parseAssembledContent(assembledContent);
  const children: (Paragraph | Table)[] = [];

  children.push(...buildTitlePage(clientName));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  if (ws4Enabled() && sections.length > 1) {
    children.push(...buildDocxToc(sections)); // WS4 §C2.4 renderer-generated TOC
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  for (const section of sections) {
    children.push(...buildSection(section));
  }

  const doc = new Document({
    creator: 'AI Assist BG',
    title: `AI Value Blueprint — ${clientName}`,
    description: `AI Value Blueprint prepared by AI Assist BG for ${clientName}`,
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } },
        }],
      }],
    },
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: BRAND.bodyFont, size: BRAND.bodySize, color: BRAND.darkGray },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'AI Assist BG  |  AI Value Blueprint', color: BRAND.primaryBlue, font: BRAND.bodyFont, size: BRAND.smallSize })],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Confidential  |  Page ', font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.gray }),
                  new TextRun({ children: [PageNumber.CURRENT], font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.gray }),
                  new TextRun({ text: ' of ', font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.gray }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.gray }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  log('info', `DOCX written: ${outputPath}`, { sizeBytes: buffer.length });
  return buffer;
}

function buildTitlePage(clientName: string): Paragraph[] {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    new Paragraph({ text: '', spacing: { before: 1440 } }),
    new Paragraph({ children: [new TextRun({ text: 'AI VALUE BLUEPRINT', bold: true, size: 48, color: BRAND.primaryBlue, font: BRAND.bodyFont })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
    new Paragraph({ children: [new TextRun({ text: clientName, bold: true, size: 36, color: BRAND.darkGray, font: BRAND.bodyFont })], alignment: AlignmentType.CENTER, spacing: { after: 480 } }),
    new Paragraph({ children: [new TextRun({ text: 'Prepared by AI Assist BG', size: BRAND.bodySize, color: BRAND.gray, font: BRAND.bodyFont })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: today, size: BRAND.bodySize, color: BRAND.gray, font: BRAND.bodyFont })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: 'CONFIDENTIAL', bold: true, size: BRAND.smallSize, color: BRAND.gray, font: BRAND.bodyFont })], alignment: AlignmentType.CENTER }),
  ];
}

// WS4 §C2.4 — renderer-generated Contents list from the H1 section headings (TOC1 token style).
function buildDocxToc(sections: Section[]): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Contents', bold: true, size: BRAND.h2Size, color: COLORS.navy, font: BRAND.bodyFont })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 240 },
      border: { bottom: { color: COLORS.blue, size: 8, style: BorderStyle.SINGLE, space: 6 } },
    }),
  ];
  sections.forEach((s, idx) => {
    out.push(new Paragraph({
      children: [new TextRun({ text: `${idx + 1}.  ${s.heading}`, bold: true, size: BRAND.bodySize, color: COLORS.navy, font: BRAND.bodyFont })],
      spacing: { after: 80 },
    }));
  });
  return out;
}

// ─── PDF Generator ─────────────────────────────────────────────────────────────

export async function generateBlueprintPdf(
  clientName: string,
  assembledContent: string,
): Promise<Buffer> {
  log('info', `Generating PDF for ${clientName}`);

  if (ws4Enabled()) validateComponentSyntax(assembledContent); // WS4 §C4 — fail loud before rendering

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PdfPrinter = require('pdfmake/src/printer') as new (
    fonts: Record<string, Record<string, Buffer>>
  ) => { createPdfKitDocument: (def: unknown) => NodeJS.EventEmitter & { end(): void } };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfs = require('pdfmake/build/vfs_fonts') as Record<string, string>;

  const fonts = {
    Roboto: {
      normal:      Buffer.from(vfs['Roboto-Regular.ttf'],     'base64'),
      bold:        Buffer.from(vfs['Roboto-Medium.ttf'],       'base64'),
      italics:     Buffer.from(vfs['Roboto-Italic.ttf'],       'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
    },
  };

  const printer  = new PdfPrinter(fonts);
  const today    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sections = parseAssembledContent(assembledContent);
  const W        = 451; // printable width (A4 minus 2×72pt margins)

  const content: unknown[] = [
    { text: '\n\n\n', fontSize: 12 },
    { text: 'AI VALUE BLUEPRINT',    style: 'coverTitle',        alignment: 'center' },
    { text: clientName,              style: 'coverClient',       alignment: 'center' },
    { text: ' ',                     fontSize: 14 },
    { text: 'Prepared by AI Assist BG', style: 'coverMeta',     alignment: 'center' },
    { text: today,                   style: 'coverMeta',         alignment: 'center' },
    { text: ' ',                     fontSize: 20 },
    { text: 'CONFIDENTIAL',          style: 'coverConfidential', alignment: 'center', pageBreak: 'after' },
  ];

  if (ws4Enabled() && sections.length > 1) { // WS4 §C2.4 renderer-generated TOC
    content.push({ text: 'Contents', style: 'h1' });
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 1.5, lineColor: `#${COLORS.blue}` }], margin: [0, 2, 0, 10] });
    sections.forEach((s, idx) => content.push({ text: `${idx + 1}.  ${s.heading}`, color: `#${COLORS.navy}`, bold: true, margin: [0, 0, 0, 6] }));
    content.push({ text: '', pageBreak: 'after' });
  }

  sections.forEach((section, idx) => {
    content.push({ text: section.heading, style: 'h1', pageBreak: idx > 0 ? 'before' : undefined });
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 1.5, lineColor: '#2E5FA1' }],
      margin: [0, 2, 0, 10],
    });

    const lines = section.content.split('\n');
    let li = 0;

    while (li < lines.length) {
      const t = lines[li].trim();

      if (!t) {
        content.push({ text: ' ', fontSize: 5 });
        li++;
        continue;
      }

      // Horizontal rule
      if (/^[-=_]{3,}$/.test(t)) {
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 0.5, lineColor: '#CCCCCC' }],
          margin: [0, 6, 0, 6],
        });
        li++;
        continue;
      }

      // WS4 callout (:::callout <type> … :::)
      const calloutP = matchCalloutOpen(lines[li]);
      if (calloutP) {
        li++;
        const body: string[] = [];
        while (li < lines.length && !isCalloutClose(lines[li])) { body.push(lines[li]); li++; }
        if (li < lines.length) li++; // consume :::
        content.push(buildPdfCallout(calloutP.label, body));
        continue;
      }

      // WS4 KPI cards (```kpi … ```)
      if (t.startsWith('```') && isKpiFence(lines[li])) {
        li++;
        const kpiLines: string[] = [];
        while (li < lines.length && !lines[li].trim().startsWith('```')) { kpiLines.push(lines[li]); li++; }
        if (li < lines.length) li++; // consume closing fence
        content.push(buildPdfKpis(parseKpiRows(kpiLines)));
        continue;
      }

      // Fenced code block (``` … ```) — the assembly model emits an ASCII portfolio diagram
      // here whose box-drawing glyphs print as ⬛ tofu. Render the inner text in a monospace
      // panel with the unrenderable glyphs stripped, so the labels survive and the art does not.
      if (t.startsWith('```')) {
        li++;
        const codeLines: string[] = [];
        while (li < lines.length && !lines[li].trim().startsWith('```')) {
          const cleaned = stripUnrenderableGlyphs(lines[li]);
          if (cleaned.trim()) codeLines.push(cleaned);
          li++;
        }
        if (li < lines.length) li++; // consume closing fence
        if (codeLines.length) content.push({ text: codeLines.join('\n'), style: 'code' });
        continue;
      }

      // Markdown table
      if (t.startsWith('|') && t.endsWith('|')) {
        const tableLines: string[] = [];
        while (li < lines.length && lines[li].trim().startsWith('|')) {
          tableLines.push(lines[li].trim());
          li++;
        }
        const tblNode = buildPdfTable(tableLines);
        if (tblNode) content.push(tblNode);
        continue;
      }

      if      (t.startsWith('### ')) content.push({ text: parsePdfInline(t.slice(4)), style: 'h3' });
      else if (t.startsWith('## '))  content.push({ text: parsePdfInline(t.slice(3)), style: 'h2' });
      else if (/^\d+\.\s/.test(t))   content.push({ text: parsePdfInline(t), style: 'body', margin: [10, 0, 0, 4] });
      else if (t.startsWith('- ') || t.startsWith('• '))
        content.push({ text: ['• ', parsePdfInline(t.slice(2))], style: 'bullet' });
      else
        content.push({ text: parsePdfInline(t), style: 'body' });

      li++;
    }
  });

  const def = {
    pageSize: 'A4',
    pageMargins: [72, 72, 72, 72],
    defaultStyle: { font: 'Roboto', fontSize: 11, color: '#404040', lineHeight: 1.5 },
    header: (pg: number) => pg > 1 ? {
      text: 'AI Assist BG  |  AI Value Blueprint',
      alignment: 'right', margin: [72, 24, 72, 0], fontSize: 9, color: '#214A93',
    } : undefined,
    footer: (pg: number, total: number) => pg > 1 ? {
      text: `Confidential  |  Page ${pg} of ${total}`,
      alignment: 'center', margin: [72, 0, 72, 24], fontSize: 9, color: '#44526B',
    } : undefined,
    content,
    styles: {
      coverTitle:        { fontSize: 28, bold: true,  color: '#214A93', margin: [0, 0, 0, 16] },
      coverClient:       { fontSize: 20, bold: true,  color: '#161B26', margin: [0, 0, 0, 24] },
      coverMeta:         { fontSize: 12,               color: '#44526B', margin: [0, 0, 0, 6]  },
      coverConfidential: { fontSize: 10, bold: true,  color: '#A82E29', letterSpacing: 2       },
      h1:     { fontSize: 18, bold: true,  color: '#13243F', margin: [0, 16, 0, 4]  },
      h2:     { fontSize: 14, bold: true,  color: '#214A93', margin: [0, 12, 0, 6]  },
      h3:     { fontSize: 12, bold: true,  color: '#214A93', margin: [0, 8,  0, 4]  },
      body:   { fontSize: 11, color: '#161B26', margin: [0, 0, 0, 6]   },
      bullet: { fontSize: 11, color: '#161B26', margin: [14, 0, 0, 4]  },
      code:   { fontSize: 9,  font: 'Roboto', color: '#44526B', margin: [0, 4, 0, 8], preserveLeadingSpaces: true },
      tableHeader: { fontSize: 10, bold: true, color: '#FFFFFF', fillColor: '#0D1A30' },
      tableCell:   { fontSize: 10, color: '#161B26' },
    },
  };

  const doc = printer.createPdfKitDocument(def);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// pdfmake inline text: returns an array of {text, bold?, italics?} objects or a plain string.
// NOTE: a line that is ENTIRELY one bold/italic span (e.g. "**Finding 1: …**" or a "**Strategy**"
// table cell) splits into a single part. The earlier code early-returned that single part as a
// raw string, so the markdown markers leaked into the PDF verbatim — the literal `**…**` the
// business flagged across the Findings and the whole scorecard. We must map the single token too.
function boldItalicPdfRuns(text: string): unknown[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) return { text: part.slice(2, -2), bold: true };
    if (part.startsWith('*')  && part.endsWith('*'))  return { text: part.slice(1, -1), italics: true };
    return part;
  });
}

function parsePdfInline(text: string): unknown {
  // WS4 severity: render {sev:level|Label} as inline bold text in the level's brand hue.
  if (hasSeverity(text)) {
    const runs: unknown[] = [];
    for (const seg of splitSeveritySpans(text)) {
      if (seg.level) runs.push({ text: seg.text, bold: true, color: `#${COLORS[seg.level as SeverityLevel]}` });
      else runs.push(...boldItalicPdfRuns(seg.text));
    }
    return runs;
  }
  const runs = boldItalicPdfRuns(text);
  if (runs.length === 0) return text;
  // Return a bare string only when the single part carried no markdown (true plain text).
  if (runs.length === 1 && typeof runs[0] === 'string') return runs[0];
  return runs;
}

// WS4 PDF callout — left blue bar + callout fill (drawn via a 1-cell table layout), gold header.
function buildPdfCallout(label: string, body: string[]): unknown {
  const stack: unknown[] = [
    { text: label.toUpperCase(), bold: true, color: `#${COLORS.gold}`, fontSize: 10, characterSpacing: 1, margin: [0, 0, 0, 4] },
  ];
  for (const line of body.filter(l => l.trim())) {
    stack.push({ text: parsePdfInline(line.trim()), color: `#${COLORS.charcoal}`, fontSize: 11, margin: [0, 0, 0, 3] });
  }
  return {
    table: { widths: ['*'], body: [[{ stack, fillColor: `#${COLORS.callout}` }]] },
    layout: {
      vLineWidth: (i: number) => (i === 0 ? 3 : 0),
      vLineColor: () => `#${COLORS.blue}`,
      hLineWidth: () => 0,
      paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 8, paddingBottom: () => 8,
    },
    margin: [0, 8, 0, 10],
  };
}

// WS4 PDF KPI cards — one bordered cell per card: teal uppercase label, navy bold value.
function buildPdfKpis(rows: Array<{ label: string; value: string }>): unknown {
  const cells = rows.map(r => ({
    stack: [
      { text: r.label.toUpperCase(), color: `#${COLORS.teal}`, bold: true, fontSize: 8, characterSpacing: 0.5 },
      { text: r.value, color: `#${COLORS.navy}`, bold: true, fontSize: 16, margin: [0, 4, 0, 0] },
    ],
    margin: [8, 8, 8, 8],
  }));
  return {
    table: { widths: Array(cells.length).fill('*'), body: [cells] },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => `#${COLORS.border}`, vLineColor: () => `#${COLORS.border}`,
    },
    margin: [0, 8, 0, 12],
  };
}

// Strip box-drawing / block-element / replacement glyphs that the PDF base font (Roboto) and the
// DOCX body font cannot render — they otherwise print as ⬛ tofu (the garbled portfolio diagram).
function stripUnrenderableGlyphs(text: string): string {
  return text.replace(/[─-▟⬛⬜�]/g, '').replace(/[ \t]+$/g, '');
}

function buildPdfTable(tableLines: string[]): unknown | null {
  const dataRows = tableLines.filter(line => !/^\|[\s|:\-]+\|$/.test(line));
  if (dataRows.length === 0) return null;

  const body = dataRows.map((line, rowIdx) => {
    const cells = line.split('|').slice(1, -1);
    return cells.map(cell => ({
      text: parsePdfInline(cell.trim()),
      style: rowIdx === 0 ? 'tableHeader' : 'tableCell',
      margin: [4, 4, 4, 4],
    }));
  });

  // Infer equal column widths
  const colCount = body[0]?.length ?? 1;
  const colWidth = Math.floor(451 / colCount);

  return {
    table: {
      headerRows: 1,
      widths: Array(colCount).fill(colWidth),
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 8, 0, 12],
  };
}

// ─── TXT Generator ─────────────────────────────────────────────────────────────

export function generateBlueprintTxt(clientName: string, assembledContent: string): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const HR1   = '═'.repeat(70);
  const HR2   = '─'.repeat(70);

  const out: string[] = [
    HR1, '',
    '   AI VALUE BLUEPRINT',
    `   ${clientName}`,
    '',
    `   Prepared by AI Assist BG`,
    `   ${today}`,
    '   CONFIDENTIAL',
    '', HR1, '',
  ];

  if (ws4Enabled()) validateComponentSyntax(assembledContent); // WS4 §C4 — fail loud before rendering
  const sections = parseAssembledContent(assembledContent);

  if (ws4Enabled() && sections.length > 1) { // WS4 §C2.4 renderer-generated Contents list
    out.push('  CONTENTS', `  ${'─'.repeat(50)}`);
    sections.forEach((s, idx) => out.push(`  ${idx + 1}. ${s.heading}`));
    out.push('', HR1, '');
  }

  // Flatten WS4 severity markers to their label word (no colour channel in plain text; the label
  // word carries the signal), then strip inline markdown.
  const flat = (s: string) => stripInlineMarkdown(splitSeveritySpans(s).map(x => x.text).join(''));

  sections.forEach((section, idx) => {
    if (idx > 0) out.push('', '');
    out.push(HR2, `${idx + 1}. ${section.heading.toUpperCase()}`, HR2, '');

    const lines = section.content.split('\n');
    let li = 0;
    while (li < lines.length) {
      const line = lines[li];
      const t = line.trim();

      // WS4 callout — header line + body, plain text.
      const calloutT = matchCalloutOpen(line);
      if (calloutT) {
        li++;
        out.push('', `  ── ${calloutT.label} ──`);
        while (li < lines.length && !isCalloutClose(lines[li])) {
          if (lines[li].trim()) out.push(`  ${flat(lines[li].trim())}`);
          li++;
        }
        if (li < lines.length) li++; // consume :::
        out.push('');
        continue;
      }

      // WS4 KPI cards — "LABEL: value" per row.
      if (t.startsWith('```') && isKpiFence(line)) {
        li++;
        const kpiLines: string[] = [];
        while (li < lines.length && !lines[li].trim().startsWith('```')) { kpiLines.push(lines[li]); li++; }
        if (li < lines.length) li++; // consume closing fence
        for (const r of parseKpiRows(kpiLines)) out.push(`  ${r.label.toUpperCase()}: ${r.value}`);
        continue;
      }

      // Fenced code block — drop the fence markers, keep the inner text with unrenderable
      // box glyphs stripped (otherwise the ASCII diagram leaks backticks and tofu into the TXT).
      if (t.startsWith('```')) {
        li++;
        while (li < lines.length && !lines[li].trim().startsWith('```')) {
          const cleaned = stripUnrenderableGlyphs(lines[li]);
          if (cleaned.trim()) out.push(`    ${cleaned.trim()}`);
          li++;
        }
        if (li < lines.length) li++; // consume closing fence
        continue;
      }

      if (!t)                                                  { out.push(''); }
      else if (/^[-=_]{3,}$/.test(t))                          { out.push('  ' + '─'.repeat(50)); }
      else if (t.startsWith('### '))                           { out.push('', `   ▸ ${flat(t.slice(4)).toUpperCase()}`, ''); }
      else if (t.startsWith('## '))                            { const h = flat(t.slice(3)); out.push('', `  ${h}`, `  ${'─'.repeat(h.length)}`, ''); }
      else if (t.startsWith('**') && t.endsWith('**'))         { out.push(`  ${flat(t)}`); }
      else if (t.startsWith('- ') || t.startsWith('• '))       { out.push(`  • ${flat(t.slice(2))}`); }
      else if (/^\d+\.\s/.test(t))                             { out.push(`  ${flat(t)}`); }
      else if (t.startsWith('|') && t.endsWith('|'))           { out.push(`  ${flat(t.replace(/\|/g, ' | ').trim())}`); }
      else                                                     { out.push(`  ${flat(t)}`); }
      li++;
    }
  });

  out.push('', HR1, '   End of Document — AI Assist BG', HR1);
  return out.join('\n');
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}

// ─── Content parser ────────────────────────────────────────────────────────────

function parseAssembledContent(content: string): Section[] {
  // Enforce positional boundary: skip everything before the first `# ` section heading.
  // This strips pre-flight status blocks ("Step 1 — Compressed Dossier: ...") that the
  // assembly model may emit before the document title despite the SKILL.md boundary rule.
  // T-15: CHECKPOINT scaffold removal is the shared, format-tolerant stripper (single source).
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
