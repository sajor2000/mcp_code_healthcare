/**
 * Fetch Clinical Guidelines using Firecrawl
 * Scrapes STROBE and CDC guidelines for the knowledge base
 */

// import axios from 'axios';  // Commented out for standalone version
import fs from 'fs';
import path from 'path';

interface FirecrawlResponse {
  data: {
    content: string;
    markdown: string;
    metadata?: any;
  };
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0/scrape';

async function scrapeWithFirecrawl(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('Firecrawl API key not found, using fallback content');
    return '';
  }

  // Firecrawl implementation commented out for standalone version
  // Would use axios.post to scrape content in production
  console.warn(`Firecrawl scraping disabled in standalone mode for: ${url}`);
  return '';
}

// STROBE Guidelines structure
export const STROBE_CHECKLIST = {
  title: 'STROBE Statement—Checklist of items for observational studies',
  sections: {
    'Title and abstract': {
      items: [
        {
          number: '1',
          description: 'Indicate the study design with a commonly used term in the title or the abstract',
          subsections: ['(a) Title', '(b) Abstract with structured summary']
        }
      ]
    },
    'Introduction': {
      items: [
        {
          number: '2',
          description: 'Background/rationale: Explain the scientific background and rationale for the investigation'
        },
        {
          number: '3',
          description: 'Objectives: State specific objectives, including any prespecified hypotheses'
        }
      ]
    },
    'Methods': {
      items: [
        {
          number: '4',
          description: 'Study design: Present key elements of study design early in the paper'
        },
        {
          number: '5',
          description: 'Setting: Describe the setting, locations, and relevant dates'
        },
        {
          number: '6',
          description: 'Participants: Give eligibility criteria, sources and methods of selection',
          subsections: ['(a) Cohort study', '(b) Case-control study', '(c) Cross-sectional study']
        },
        {
          number: '7',
          description: 'Variables: Clearly define all outcomes, exposures, predictors, confounders'
        },
        {
          number: '8',
          description: 'Data sources/measurement: Give sources of data and details of methods of assessment'
        },
        {
          number: '9',
          description: 'Bias: Describe any efforts to address potential sources of bias'
        },
        {
          number: '10',
          description: 'Study size: Explain how the study size was arrived at'
        },
        {
          number: '11',
          description: 'Quantitative variables: Explain how quantitative variables were handled'
        },
        {
          number: '12',
          description: 'Statistical methods: Describe all statistical methods',
          subsections: [
            '(a) Describe all statistical methods, including those used to control for confounding',
            '(b) Describe any methods used to examine subgroups and interactions',
            '(c) Explain how missing data were addressed',
            '(d) Cohort study—If applicable, explain how loss to follow-up was addressed',
            '(e) Describe any sensitivity analyses'
          ]
        }
      ]
    },
    'Results': {
      items: [
        {
          number: '13',
          description: 'Participants: Report numbers of individuals at each stage',
          subsections: [
            '(a) Report numbers at each stage (e.g., potentially eligible, examined, confirmed eligible)',
            '(b) Give reasons for non-participation at each stage',
            '(c) Consider use of a flow diagram'
          ]
        },
        {
          number: '14',
          description: 'Descriptive data: Give characteristics of study participants',
          subsections: [
            '(a) Give characteristics (e.g., demographic, clinical, social)',
            '(b) Indicate number of participants with missing data',
            '(c) Cohort study—Summarise follow-up time'
          ]
        },
        {
          number: '15',
          description: 'Outcome data: Report numbers of outcome events or summary measures'
        },
        {
          number: '16',
          description: 'Main results: Give unadjusted estimates and, if applicable, confounder-adjusted estimates'
        },
        {
          number: '17',
          description: 'Other analyses: Report other analyses done (e.g., subgroups, sensitivity analyses)'
        }
      ]
    },
    'Discussion': {
      items: [
        {
          number: '18',
          description: 'Key results: Summarise key results with reference to study objectives'
        },
        {
          number: '19',
          description: 'Limitations: Discuss limitations of the study'
        },
        {
          number: '20',
          description: 'Interpretation: Give a cautious overall interpretation considering objectives, limitations'
        },
        {
          number: '21',
          description: 'Generalisability: Discuss the generalisability (external validity) of the study results'
        }
      ]
    },
    'Other information': {
      items: [
        {
          number: '22',
          description: 'Funding: Give the source of funding and the role of the funders'
        }
      ]
    }
  }
};

// CDC Adult Sepsis Event (ASE) Surveillance Definition
export const CDC_SEPSIS_EVENT = {
  title: 'CDC Adult Sepsis Event (ASE) Surveillance Definition',
  definition: 'Concurrent acute organ dysfunction and suspected infection',
  criteria: {
    suspected_infection: {
      description: 'Blood culture order AND qualifying antibiotic days (QAD)',
      qad_definition: 'New antibiotics continued for ≥4 consecutive days',
      infection_window: 'Day of first QAD ± 2 days'
    },
    organ_dysfunction: {
      description: 'Any of the following criteria:',
      cardiovascular: {
        criteria: 'Initiation of vasopressor',
        details: 'Norepinephrine, dopamine, epinephrine, phenylephrine, or vasopressin'
      },
      pulmonary: {
        criteria: 'Initiation of mechanical ventilation',
        details: 'Invasive mechanical ventilation'
      },
      renal: {
        criteria: 'Doubling of creatinine OR decrease of ≥50% in eGFR from baseline',
        baseline: 'Lowest value from 1-365 days prior'
      },
      hepatic: {
        criteria: 'Bilirubin ≥2.0 mg/dL AND doubling from baseline',
        baseline: 'Lowest value from 1-365 days prior'
      },
      coagulation: {
        criteria: 'Platelet count <100 cells/μL AND ≥50% decrease from baseline',
        baseline: 'Highest value from 1-365 days prior'
      },
      lactate: {
        criteria: 'Lactate ≥2.0 mmol/L',
        details: 'Initial lactate value above threshold'
      }
    },
    septic_shock: {
      definition: 'Sepsis + cardiovascular dysfunction + lactate ≥2.0 mmol/L',
      criteria: 'All three criteria met within sepsis event window'
    }
  },
  exclusions: [
    'Age <18 years',
    'Infection present on admission (POA)',
    'Chronic dialysis patients (for renal criteria)',
    'Comfort measures only'
  ],
  outcomes: {
    mortality: 'In-hospital death or discharge to hospice',
    icu_admission: 'Transfer to ICU during sepsis event window'
  }
};

export async function fetchAndSaveGuidelines() {
  console.log('Fetching clinical guidelines...');
  
  // Try to fetch STROBE guidelines
  const strobeUrl = 'https://www.strobe-statement.org/checklists/';
  const strobeContent = await scrapeWithFirecrawl(strobeUrl);
  
  // Try to fetch CDC sepsis guidelines
  const cdcUrl = 'https://www.cdc.gov/sepsis/pdfs/Sepsis-Surveillance-Toolkit-Mar-2022-508.pdf';
  const cdcContent = await scrapeWithFirecrawl(cdcUrl);
  
  // Combine with our structured definitions
  const guidelines = {
    strobe: {
      ...STROBE_CHECKLIST,
      scraped_content: strobeContent
    },
    cdc_sepsis: {
      ...CDC_SEPSIS_EVENT,
      scraped_content: cdcContent
    },
    last_updated: new Date().toISOString()
  };
  
  // Save to knowledge base
  const outputPath = path.join(__dirname, '../../data/clinical-guidelines.json');
  fs.writeFileSync(outputPath, JSON.stringify(guidelines, null, 2));
  
  console.log('Clinical guidelines saved to:', outputPath);
  return guidelines;
}

// Helper function to generate STROBE-compliant analysis plan
export function generateSTROBEAnalysisPlan(research_question: string, dataset_info: any) {
  const plan = {
    title: `Analysis Plan: ${research_question}`,
    strobe_sections: {
      introduction: {
        background: `This analysis investigates: ${research_question}`,
        objectives: 'Primary objective: [To be specified based on research question]',
        hypotheses: 'Hypothesis: [To be specified]'
      },
      methods: {
        study_design: 'Retrospective cohort study using synthetic CLIF dataset',
        setting: `ICU patients from synthetic dataset (n=${dataset_info.n_patients || 500})`,
        participants: {
          inclusion_criteria: [],
          exclusion_criteria: [],
          cohort_definition: ''
        },
        variables: {
          exposure: '',
          outcome: '',
          confounders: [],
          effect_modifiers: []
        },
        statistical_methods: {
          descriptive: ['Patient characteristics', 'Exposure/outcome distributions'],
          primary_analysis: '',
          sensitivity_analyses: [],
          missing_data_approach: ''
        }
      },
      sample_size: {
        calculation: 'Based on available data',
        power_analysis: 'Post-hoc power calculation if applicable'
      }
    },
    cdc_sepsis_definition: research_question.toLowerCase().includes('sepsis') ? CDC_SEPSIS_EVENT : null
  };
  
  return plan;
}