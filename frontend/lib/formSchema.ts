export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export const FORM_SECTIONS: FormSection[] = [
  {
    id: 'company_fundamentals',
    title: 'Company Fundamentals',
    description: 'Help us understand your business.',
    questions: [
      { id: 'industry', type: 'text', label: 'What industry are you in?', required: true },
      { id: 'company_size', type: 'select', label: 'Number of employees',
        options: ['1–10', '11–50', '51–200', '201–500', '500+'], required: true },
      { id: 'revenue_range', type: 'select', label: 'Annual revenue range',
        options: ['Under €500K', '€500K–€2M', '€2M–€10M', '€10M–€50M', '€50M+'], required: true },
      { id: 'departments', type: 'number', label: 'How many departments does your company have?', required: true },
      { id: 'geography', type: 'text', label: 'Where do you operate? (countries/regions)', required: true },
      { id: 'business_model', type: 'multiselect', label: 'Business model',
        options: ['B2B', 'B2C', 'Hybrid'], required: true },
    ],
  },
  {
    id: 'strategic_context',
    title: 'Strategic Context',
    description: "What's driving your business right now?",
    questions: [
      { id: 'top_priorities', type: 'textarea', label: 'What are your top 3 business priorities for the next 12 months?',
        placeholder: "Be as specific as possible — e.g., 'Grow revenue by 30%', 'Enter the German market'", required: true },
      { id: 'competitive_threat', type: 'textarea', label: 'What is your biggest competitive threat right now?', required: true },
      { id: 'growth_targets', type: 'textarea', label: 'What are your growth targets? (revenue, headcount, market share)', required: false },
      { id: 'active_initiatives', type: 'textarea', label: 'Are there any active transformation or change initiatives underway?',
        placeholder: 'e.g., ERP migration, new CRM rollout, market expansion', required: false },
    ],
  },
  {
    id: 'operational_pain_points',
    title: 'Operational Pain Points',
    description: 'This is the most important section. Please be specific.',
    questions: [
      { id: 'pain_point_1', type: 'textarea', label: 'Describe your #1 most painful, slow, or expensive process', required: true },
      { id: 'pain_point_2', type: 'textarea', label: 'Describe your #2 most painful process', required: true },
      { id: 'pain_point_3', type: 'textarea', label: 'Describe your #3 most painful process', required: false },
      { id: 'pain_point_4', type: 'textarea', label: 'Describe your #4 most painful process', required: false },
      { id: 'pain_point_5', type: 'textarea', label: 'Describe your #5 most painful process', required: false },
      { id: 'tried_solutions', type: 'textarea', label: "What have you already tried to fix these problems? What didn't work?", required: false },
    ],
  },
  {
    id: 'technology_landscape',
    title: 'Technology Landscape',
    description: 'Tell us about your current systems.',
    questions: [
      { id: 'crm', type: 'text', label: 'What CRM do you use? (e.g., Salesforce, HubSpot, none)', required: false },
      { id: 'erp', type: 'text', label: 'What ERP or finance system do you use? (e.g., SAP, Xero, spreadsheets)', required: false },
      { id: 'hr_system', type: 'text', label: 'What HR system do you use?', required: false },
      { id: 'other_core_systems', type: 'textarea', label: 'Any other core systems we should know about?', required: false },
      { id: 'ai_tools_in_use', type: 'textarea', label: 'Are you currently using any AI tools? (e.g., ChatGPT, Copilot, Grammarly)', required: false },
      { id: 'data_infrastructure', type: 'select', label: 'How would you describe your data infrastructure?',
        options: [
          'Mostly paper and manual processes',
          'Spreadsheets (Excel/Google Sheets)',
          'Mix of spreadsheets and some databases',
          'Structured databases and reporting tools',
          'Modern data warehouse / BI platform',
        ], required: true },
      { id: 'it_team_size', type: 'select', label: 'How large is your IT team?',
        options: ['No dedicated IT', '1–2 people', '3–10 people', '10+ people', 'Outsourced'], required: true },
    ],
  },
  {
    id: 'people_and_culture',
    title: 'People & Culture',
    description: "Help us understand your organisation's readiness for AI.",
    questions: [
      { id: 'leadership_ai_attitude', type: 'select', label: "How would you describe leadership's attitude toward AI?",
        options: [
          'Enthusiastic — actively pushing for AI adoption',
          'Open — interested but cautious',
          'Neutral — waiting to see',
          'Skeptical — needs proof before committing',
          'Resistant — opposed to AI initiatives',
        ], required: true },
      { id: 'ai_training_done', type: 'textarea', label: 'Has your team done any AI training? If yes, describe briefly.', required: false },
      { id: 'internal_champion', type: 'text', label: 'Who would be the internal champion for an AI initiative? (role, not name)', required: false },
      { id: 'resistance_points', type: 'textarea', label: 'What are the biggest internal resistance points to adopting AI?', required: false },
    ],
  },
  {
    id: 'data_readiness',
    title: 'Data Readiness',
    description: 'The quality of your data determines what AI can do for you.',
    questions: [
      { id: 'clean_data', type: 'select', label: 'Does your company have clean, structured data?',
        options: [
          'Yes — well-organised and reliable',
          'Partially — some areas are clean, others aren\'t',
          'No — our data is messy and inconsistent',
        ], required: true },
      { id: 'valuable_data_location', type: 'textarea', label: 'Where does your most valuable data live? (CRM, spreadsheets, emails, paper, etc.)', required: true },
      { id: 'data_governance', type: 'select', label: 'Do you have a data owner or data governance process?',
        options: [
          'Yes — formal ownership and policies',
          'Informal — some ownership but no formal process',
          'No — data ownership is unclear',
        ], required: true },
      { id: 'compliance_constraints', type: 'textarea', label: 'Are there any compliance constraints we should know about? (GDPR, industry regulations, etc.)', required: false },
    ],
  },
  {
    id: 'budget_and_timeline',
    title: 'Budget & Timeline',
    description: "Help us calibrate our recommendations to what's realistic for you.",
    questions: [
      { id: 'budget_allocated', type: 'select', label: 'Has budget been allocated for AI initiatives?',
        options: [
          'Yes — budget is confirmed and ready',
          'In discussion — budget is being considered',
          'No — no budget allocated yet',
          'Prefer not to say',
        ], required: true },
      { id: 'budget_range', type: 'select', label: 'If yes, what range? (Optional)',
        options: ['Under €10K', '€10K–€50K', '€50K–€150K', '€150K+', 'Prefer not to say'], required: false },
      { id: 'ideal_timeline', type: 'select', label: 'What is your ideal timeline to see first AI results?',
        options: [
          'As soon as possible (within 1–3 months)',
          '3–6 months',
          '6–12 months',
          "We're planning for next year",
        ], required: true },
      { id: 'additional_context', type: 'textarea', label: 'Is there anything else we should know before we begin your analysis?', required: false },
    ],
  },
];

export const UPLOAD_CATEGORIES = [
  { id: 'financial_summary', label: 'Financial Summary (P&L, Revenue Breakdown)', required: true,
    description: 'e.g., Annual P&L, revenue by product line, cost breakdown. Max 5MB.' },
  { id: 'org_chart', label: 'Org Chart or Team Structure', required: true,
    description: 'e.g., Organisational chart, team hierarchy. Can be a simple diagram or a slide.' },
  { id: 'sales_pipeline', label: 'Sales or Pipeline Data', required: true,
    description: 'e.g., CRM export, sales pipeline report, pipeline by stage.' },
  { id: 'process_docs', label: 'Process Documentation (SOPs, Workflows)', required: true,
    description: 'e.g., Standard operating procedures, workflow diagrams, process maps.' },
  { id: 'marketing_data', label: 'Marketing or Customer Data', required: false,
    description: 'e.g., Customer list overview, marketing performance, churn data.' },
  { id: 'tech_inventory', label: 'Technology Inventory', required: false,
    description: 'e.g., List of software tools, systems, subscriptions, IT architecture.' },
  { id: 'strategic_docs', label: 'Strategic Documents', required: false,
    description: 'e.g., Board deck, annual plan, company strategy presentation.' },
  { id: 'previous_ai', label: 'Previous AI or Digital Initiative Descriptions', required: false,
    description: 'e.g., Any past AI pilots, digital transformation reports, technology assessments.' },
];

export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.csv,.pptx';
export const MAX_FILE_SIZE_MB = 5;
