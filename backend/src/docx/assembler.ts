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
): Promise<void> {
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
