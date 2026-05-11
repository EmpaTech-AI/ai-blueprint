import { FormAnswers, DocumentCorpus } from '../types/pipeline';
import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';

const SECTION_LABELS: Record<string, string> = {
  company_fundamentals: 'Company Fundamentals',
  strategic_context: 'Strategic Context',
  operational_pain_points: 'Operational Pain Points',
  technology_landscape: 'Technology Landscape',
  people_and_culture: 'People & Culture',
  data_readiness: 'Data Readiness',
  budget_and_timeline: 'Budget & Timeline',
};

const SECTION_QUESTIONS: Record<string, string[]> = {
  company_fundamentals: ['industry', 'company_size', 'revenue_range', 'departments', 'geography', 'business_model'],
  strategic_context: ['top_priorities', 'competitive_threat', 'growth_targets', 'active_initiatives'],
  operational_pain_points: ['pain_point_1', 'pain_point_2', 'pain_point_3', 'pain_point_4', 'pain_point_5', 'tried_solutions'],
  technology_landscape: ['crm', 'erp', 'hr_system', 'other_core_systems', 'ai_tools_in_use', 'data_infrastructure', 'it_team_size'],
  people_and_culture: ['leadership_ai_attitude', 'ai_training_done', 'internal_champion', 'resistance_points'],
  data_readiness: ['clean_data', 'valuable_data_location', 'data_governance', 'compliance_constraints'],
  budget_and_timeline: ['budget_allocated', 'budget_range', 'ideal_timeline', 'additional_context'],
};

export async function runStepB(formAnswers: FormAnswers, corpus: DocumentCorpus): Promise<string> {
  log('info', 'Step B: Building intake message for blueprint-intake skill');
  const userMessage = buildIntakeMessage(formAnswers, corpus);
  const result = await invokeSkill('blueprint-intake', userMessage, 8000);

  if (result.split(/\s+/).length < 100) {
    throw new Error('Step B output is suspiciously short (< 100 words). Pipeline halted for human review.');
  }

  log('info', 'Step B: blueprint-intake complete', { wordCount: result.split(/\s+/).length });
  return result;
}

function buildIntakeMessage(formAnswers: FormAnswers, corpus: DocumentCorpus): string {
  let msg = `# CLIENT INTAKE SUBMISSION\n\n## INTAKE FORM RESPONSES\n\n`;

  for (const [sectionId, questionIds] of Object.entries(SECTION_QUESTIONS)) {
    const label = SECTION_LABELS[sectionId] || sectionId;
    msg += `### ${label.toUpperCase()}\n`;
    for (const qId of questionIds) {
      const answer = formAnswers[qId];
      if (answer !== undefined && answer !== '') {
        const val = Array.isArray(answer) ? answer.join(', ') : answer;
        msg += `**${qId.replace(/_/g, ' ')}:** ${val}\n`;
      }
    }
    msg += '\n';
  }

  msg += `## UPLOADED DOCUMENTS\n\n`;
  for (const doc of corpus.documents) {
    msg += `### Document: ${doc.filename}\n`;
    msg += `**Category:** ${doc.category}\n`;
    msg += `**Parse status:** ${doc.status} (confidence: ${doc.confidence})\n`;
    if (doc.pageCount) msg += `**Pages:** ${doc.pageCount}\n`;
    msg += '\n';
    msg += doc.text.substring(0, 12000);
    msg += '\n\n---\n\n';
  }

  if (corpus.failedDocuments.length > 0) {
    msg += `## DOCUMENTS THAT COULD NOT BE PARSED\n`;
    for (const doc of corpus.failedDocuments) {
      msg += `- ${doc.filename} (${doc.category}): ${doc.error}\n`;
    }
    msg += '\n';
  }

  if (corpus.missingRequiredCategories.length > 0) {
    msg += `## MISSING REQUIRED DOCUMENT CATEGORIES\n`;
    corpus.missingRequiredCategories.forEach((cat) => (msg += `- ${cat}\n`));
    msg += '\n';
  }

  return msg;
}
