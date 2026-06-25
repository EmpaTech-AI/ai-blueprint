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
  return runs.length > 0 ? runs : [new TextRun({ text, font: BRAND.bodyFont, size: baseSize, color: BRAND.darkGray })];
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

  const sections = parseAssembledContent(assembledContent);
  const children: (Paragraph | Table)[] = [];

  children.push(...buildTitlePage(clientName));
  children.push(new Paragraph({ children: [new PageBreak()] }));

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

// ─── PDF Generator ─────────────────────────────────────────────────────────────

export async function generateBlueprintPdf(
  clientName: string,
  assembledContent: string,
): Promise<Buffer> {
  log('info', `Generating PDF for ${clientName}`);

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

      if      (t.startsWith('### ')) content.push({ text: t.slice(4), style: 'h3' });
      else if (t.startsWith('## '))  content.push({ text: t.slice(3), style: 'h2' });
      else if (/^\d+\.\s/.test(t))   content.push({ text: t, style: 'body', margin: [10, 0, 0, 4] });
      else if (t.startsWith('- ') || t.startsWith('• '))
        content.push({ text: `• ${t.slice(2)}`, style: 'bullet' });
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

// pdfmake inline text: returns an array of {text, bold?, italics?} objects or a plain string
function parsePdfInline(text: string): unknown {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  if (parts.length === 1) return parts[0]; // plain string — pdfmake handles it fine
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) return { text: part.slice(2, -2), bold: true };
    if (part.startsWith('*')  && part.endsWith('*'))  return { text: part.slice(1, -1), italics: true };
    return part;
  });
}

function buildPdfTable(tableLines: string[]): unknown | null {
  const dataRows = tableLines.filter(line => !/^\|[\s|:\-]+\|$/.test(line));
  if (dataRows.length === 0) return null;

  const body = dataRows.map((line, rowIdx) => {
    const cells = line.split('|').slice(1, -1);
    return cells.map(cell => ({
      text: rowIdx === 0 ? cell.trim() : parsePdfInline(cell.trim()),
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

  const sections = parseAssembledContent(assembledContent);
  sections.forEach((section, idx) => {
    if (idx > 0) out.push('', '');
    out.push(HR2, `${idx + 1}. ${section.heading.toUpperCase()}`, HR2, '');

    for (const line of section.content.split('\n')) {
      const t = line.trim();
      if (!t) { out.push(''); continue; }

      if (/^[-=_]{3,}$/.test(t))                              { out.push('  ' + '─'.repeat(50)); }
      else if (t.startsWith('### '))                           { out.push('', `   ▸ ${t.slice(4).toUpperCase()}`, ''); }
      else if (t.startsWith('## '))                           { out.push('', `  ${t.slice(3)}`, `  ${'─'.repeat(t.slice(3).length)}`, ''); }
      else if (t.startsWith('**') && t.endsWith('**'))        { out.push(`  ${t.slice(2, -2)}`); }
      else if (t.startsWith('- ') || t.startsWith('• '))      { out.push(`  • ${t.slice(2)}`); }
      else if (/^\d+\.\s/.test(t))                            { out.push(`  ${t}`); }
      else if (t.startsWith('|') && t.endsWith('|'))           { out.push(`  ${t.replace(/\|/g, ' | ').trim()}`); }
      else                                                     { out.push(`  ${stripInlineMarkdown(t)}`); }
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
