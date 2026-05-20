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
} from 'docx';
import fs from 'fs';
import { log } from '../utils/logger';

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

export async function generateBlueprintDocx(
  clientName: string,
  assembledContent: string,
  outputPath: string
): Promise<Buffer> {
  log('info', `Generating DOCX for ${clientName}`, { outputPath });

  const sections = parseAssembledContent(assembledContent);
  const children: Paragraph[] = [];

  // Title page
  children.push(...buildTitlePage(clientName));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Section content
  for (const section of sections) {
    children.push(...buildSection(section));
  }

  const doc = new Document({
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
                children: [
                  new TextRun({
                    text: 'AI Assist BG  |  AI Value Blueprint',
                    color: BRAND.primaryBlue,
                    font: BRAND.bodyFont,
                    size: BRAND.smallSize,
                  }),
                ],
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
                  new TextRun({ text: 'Confidential  |  ', font: BRAND.bodyFont, size: BRAND.smallSize, color: BRAND.gray }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
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
    new Paragraph({
      children: [new TextRun({ text: 'AI VALUE BLUEPRINT', bold: true, size: 48, color: BRAND.primaryBlue, font: BRAND.bodyFont })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: clientName, bold: true, size: 36, color: BRAND.darkGray, font: BRAND.bodyFont })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Prepared by AI Assist BG', size: BRAND.bodySize, color: BRAND.gray, font: BRAND.bodyFont })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: today, size: BRAND.bodySize, color: BRAND.gray, font: BRAND.bodyFont })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'CONFIDENTIAL', bold: true, size: BRAND.smallSize, color: BRAND.gray, font: BRAND.bodyFont })],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function buildSection(section: Section): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
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
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }

    if (trimmed.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(4), bold: true, size: BRAND.h3Size, color: BRAND.darkGray, font: BRAND.bodyFont })],
        spacing: { before: 240, after: 120 },
      }));
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(3), bold: true, size: BRAND.h2Size, color: BRAND.primaryBlue, font: BRAND.bodyFont })],
        spacing: { before: 360, after: 180 },
      }));
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(2, -2), bold: true, size: BRAND.bodySize, font: BRAND.bodyFont })],
        spacing: { after: 120 },
      }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(2), size: BRAND.bodySize, font: BRAND.bodyFont })],
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: BRAND.bodySize, font: BRAND.bodyFont })],
        spacing: { after: 120 },
      }));
    }
  }

  return paragraphs;
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

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
      normal:      Buffer.from(vfs['Roboto-Regular.ttf'],       'base64'),
      bold:        Buffer.from(vfs['Roboto-Medium.ttf'],         'base64'),
      italics:     Buffer.from(vfs['Roboto-Italic.ttf'],         'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'],   'base64'),
    },
  };

  const printer  = new PdfPrinter(fonts);
  const today    = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sections = parseAssembledContent(assembledContent);
  const W        = 451; // printable width at 1-inch margins on A4

  const content: unknown[] = [
    { text: '\n\n\n', fontSize: 12 },
    { text: 'AI VALUE BLUEPRINT',   style: 'coverTitle',        alignment: 'center' },
    { text: clientName,             style: 'coverClient',       alignment: 'center' },
    { text: ' ',                    fontSize: 14 },
    { text: 'Prepared by AI Assist BG', style: 'coverMeta',    alignment: 'center' },
    { text: today,                  style: 'coverMeta',         alignment: 'center' },
    { text: ' ',                    fontSize: 20 },
    { text: 'CONFIDENTIAL',         style: 'coverConfidential', alignment: 'center', pageBreak: 'after' },
  ];

  sections.forEach((section, idx) => {
    content.push({ text: section.heading, style: 'h1', pageBreak: idx > 0 ? 'before' : undefined });
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: W, y2: 0, lineWidth: 1.5, lineColor: '#2E5FA1' }],
      margin: [0, 2, 0, 10],
    });

    for (const line of section.content.split('\n')) {
      const t = line.trim();
      if (!t) { content.push({ text: ' ', fontSize: 5 }); continue; }

      if      (t.startsWith('### ')) content.push({ text: t.slice(4), style: 'h3' });
      else if (t.startsWith('## '))  content.push({ text: t.slice(3), style: 'h2' });
      else if (t.startsWith('**') && t.endsWith('**'))
        content.push({ text: t.slice(2, -2), style: 'body', bold: true });
      else if (t.startsWith('- ') || t.startsWith('• '))
        content.push({ text: `• ${t.slice(2)}`, style: 'bullet' });
      else
        content.push({ text: stripInlineMarkdown(t), style: 'body' });
    }
  });

  const def = {
    pageSize: 'A4',
    pageMargins: [72, 72, 72, 72],
    defaultStyle: { font: 'Roboto', fontSize: 11, color: '#404040', lineHeight: 1.5 },
    header: (pg: number) => pg > 1 ? {
      text: 'AI Assist BG  |  AI Value Blueprint',
      alignment: 'right', margin: [72, 24, 72, 0], fontSize: 9, color: '#2E5FA1',
    } : undefined,
    footer: (pg: number, total: number) => pg > 1 ? {
      text: `Confidential  |  Page ${pg} of ${total}`,
      alignment: 'center', margin: [72, 0, 72, 24], fontSize: 9, color: '#A6A6A6',
    } : undefined,
    content,
    styles: {
      coverTitle:        { fontSize: 28, bold: true,  color: '#2E5FA1', margin: [0, 0, 0, 16] },
      coverClient:       { fontSize: 20, bold: true,  color: '#404040', margin: [0, 0, 0, 24] },
      coverMeta:         { fontSize: 12,               color: '#A6A6A6', margin: [0, 0, 0, 6]  },
      coverConfidential: { fontSize: 10, bold: true,  color: '#A6A6A6'                          },
      h1:  { fontSize: 18, bold: true, color: '#2E5FA1', margin: [0, 16, 0, 4]  },
      h2:  { fontSize: 14, bold: true, color: '#404040', margin: [0, 12, 0, 6]  },
      h3:  { fontSize: 12, bold: true, color: '#404040', margin: [0, 8,  0, 4]  },
      body:   { fontSize: 11, margin: [0, 0, 0, 6]  },
      bullet: { fontSize: 11, margin: [14, 0, 0, 4] },
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

function stripInlineMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}

// ─── TXT Generator ───────────────────────────────────────────────────────────

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

      if      (t.startsWith('### ')) { out.push('', `   ▸ ${t.slice(4).toUpperCase()}`, ''); }
      else if (t.startsWith('## '))  { out.push('', `  ${t.slice(3)}`, `  ${'─'.repeat(t.slice(3).length)}`, ''); }
      else if (t.startsWith('**') && t.endsWith('**')) { out.push(`  ${t.slice(2, -2)}`); }
      else if (t.startsWith('- ') || t.startsWith('• ')) { out.push(`  • ${t.slice(2)}`); }
      else { out.push(`  ${stripInlineMarkdown(t)}`); }
    }
  });

  out.push('', HR1, '   End of Document — AI Assist BG', HR1);
  return out.join('\n');
}

// ─── Content parser ───────────────────────────────────────────────────────────

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
    sections.push({ heading: 'AI Value Blueprint', content: content });
  }

  return sections;
}
