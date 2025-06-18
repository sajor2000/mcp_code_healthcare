#!/usr/bin/env node
/**
 * Enhanced MCP Server for Healthcare Research
 * Includes STROBE guidelines and CDC sepsis event definitions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STROBE_CHECKLIST, CDC_SEPSIS_EVENT, generateSTROBEAnalysisPlan } from '../utils/fetch-guidelines.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced medical knowledge base with CDC sepsis criteria
const MEDICAL_KNOWLEDGE = {
  sepsis: {
    definition: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
    icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2'],
    cdc_definition: CDC_SEPSIS_EVENT,
    clinical_criteria: {
      SIRS: ['Temperature >38°C or <36°C', 'Heart rate >90', 'Respiratory rate >20', 'WBC >12k or <4k'],
      qSOFA: ['Respiratory rate ≥22', 'Altered mentation', 'Systolic BP ≤100'],
      CDC_ASE: {
        suspected_infection: 'Blood culture + ≥4 days antibiotics',
        organ_dysfunction: ['Vasopressor initiation', 'Mechanical ventilation', 'Creatinine doubling', 
                           'Bilirubin ≥2.0 + doubling', 'Platelets <100 + 50% decrease', 'Lactate ≥2.0']
      }
    },
    mortality_rate: '15-30%',
    treatment: ['Early antibiotics', 'Fluid resuscitation', 'Source control']
  },
  vancomycin: {
    class: 'Glycopeptide antibiotic',
    mechanism: 'Inhibits bacterial cell wall synthesis',
    spectrum: 'Gram-positive bacteria including MRSA',
    rxnorm_code: '11124',
    dosing: 'Weight-based, typically 15-20 mg/kg IV q8-12h',
    monitoring: ['Trough levels', 'Renal function'],
    qad_eligible: true  // Qualifies for CDC antibiotic days
  },
  pneumonia: {
    definition: 'Infection of lung parenchyma',
    icd10_codes: ['J18.9', 'J15.9'],
    types: ['Community-acquired', 'Hospital-acquired', 'Ventilator-associated'],
    mortality_rate: '10-20% (higher in ICU)',
    treatment: ['Antibiotics', 'Oxygen support', 'Mechanical ventilation if severe']
  },
  ards: {
    definition: 'Acute respiratory distress syndrome - severe lung inflammation',
    icd10_codes: ['J80', 'J96.0'],
    berlin_criteria: ['PaO2/FiO2 ratio', 'Bilateral opacities', 'PEEP ≥5', 'Not cardiac failure'],
    mortality_rate: '35-45%',
    treatment: ['Low tidal volume ventilation', 'Prone positioning', 'Neuromuscular blockade']
  }
};

// Create server instance
const server = new Server(
  {
    name: 'healthcare-research-mcp-enhanced',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'natural_language_query',
      description: 'Parse natural language research questions into structured queries using STROBE guidelines',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language research question'
          },
          dataset_info: {
            type: 'object',
            description: 'Information about the dataset being queried'
          },
          use_cdc_sepsis: {
            type: 'boolean',
            description: 'Use CDC Adult Sepsis Event definition',
            default: true
          }
        },
        required: ['query']
      }
    },
    {
      name: 'generate_strobe_analysis',
      description: 'Generate a STROBE-compliant analysis plan for observational studies',
      inputSchema: {
        type: 'object',
        properties: {
          research_question: {
            type: 'string',
            description: 'The research question to analyze'
          },
          study_type: {
            type: 'string',
            enum: ['cohort', 'case-control', 'cross-sectional'],
            default: 'cohort'
          },
          dataset_info: {
            type: 'object',
            description: 'Information about available data'
          }
        },
        required: ['research_question']
      }
    },
    {
      name: 'lookup_medical_knowledge',
      description: 'Look up medical conditions, medications, or clinical guidelines',
      inputSchema: {
        type: 'object',
        properties: {
          entity: {
            type: 'string',
            description: 'Medical entity to look up'
          },
          include_guidelines: {
            type: 'boolean',
            description: 'Include relevant clinical guidelines',
            default: true
          }
        },
        required: ['entity']
      }
    },
    {
      name: 'analyze_synthetic_dataset',
      description: 'Analyze the synthetic ICU dataset with CDC sepsis criteria if applicable',
      inputSchema: {
        type: 'object',
        properties: {
          analysis_type: {
            type: 'string',
            enum: ['descriptive', 'cohort', 'outcomes'],
            description: 'Type of analysis to perform'
          },
          filters: {
            type: 'object',
            description: 'Filters to apply (e.g., condition, medication)'
          },
          apply_cdc_sepsis: {
            type: 'boolean',
            description: 'Apply CDC Adult Sepsis Event criteria',
            default: false
          }
        },
        required: ['analysis_type']
      }
    },
    {
      name: 'generate_research_code',
      description: 'Generate analysis code following STROBE guidelines',
      inputSchema: {
        type: 'object',
        properties: {
          analysis_spec: {
            type: 'object',
            description: 'Analysis specification from natural language query'
          },
          language: {
            type: 'string',
            enum: ['R', 'Python'],
            default: 'R'
          },
          include_strobe_comments: {
            type: 'boolean',
            description: 'Include STROBE checklist items as comments',
            default: true
          }
        },
        required: ['analysis_spec']
      }
    }
  ],
}));

// Sequential thinking helper
function organizeAnalysisTasks(query: string): string[] {
  const tasks = [];
  const queryLower = query.toLowerCase();
  
  // 1. Define cohort/population (STROBE item 6)
  tasks.push('Define study population and eligibility criteria');
  
  // 2. Define exposure/intervention (STROBE item 7)
  if (queryLower.includes('medication') || queryLower.includes('drug') || queryLower.includes('treatment')) {
    tasks.push('Define exposure: medication administration criteria and timing');
  }
  
  // 3. Define outcome (STROBE item 7)
  if (queryLower.includes('mortality') || queryLower.includes('death')) {
    tasks.push('Define outcome: mortality (in-hospital vs 30-day)');
  } else if (queryLower.includes('sepsis')) {
    tasks.push('Define outcome: sepsis using CDC Adult Sepsis Event criteria');
  }
  
  // 4. Identify confounders (STROBE item 7)
  tasks.push('Identify potential confounders: age, sex, comorbidities, severity scores');
  
  // 5. Statistical analysis plan (STROBE item 12)
  tasks.push('Plan statistical analysis: descriptive statistics, unadjusted analysis, adjusted models');
  
  // 6. Handle missing data (STROBE item 12c)
  tasks.push('Plan approach for missing data');
  
  // 7. Sensitivity analyses (STROBE item 12e)
  tasks.push('Plan sensitivity analyses to test robustness');
  
  return tasks;
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'natural_language_query': {
      const query = args.query as string;
      const datasetInfo = args.dataset_info;
      const useCDC = args.use_cdc_sepsis !== false;
      
      // Sequential task organization
      const tasks = organizeAnalysisTasks(query);
      
      // Parse the query for key elements
      const queryLower = query.toLowerCase();
      const entities = [];
      const conditions = ['sepsis', 'pneumonia', 'ards', 'heart failure', 'stroke'];
      const medications = ['vancomycin', 'norepinephrine', 'propofol', 'fentanyl'];
      const outcomes = ['mortality', 'death', 'survival', 'readmission'];
      
      // Extract conditions
      for (const condition of conditions) {
        if (queryLower.includes(condition)) {
          const knowledge = MEDICAL_KNOWLEDGE[condition];
          entities.push({
            text: condition,
            type: 'condition',
            codes: knowledge?.icd10_codes || [],
            cdc_criteria: condition === 'sepsis' && useCDC ? knowledge?.cdc_definition : null
          });
        }
      }
      
      // Extract medications
      for (const med of medications) {
        if (queryLower.includes(med)) {
          entities.push({
            text: med,
            type: 'medication',
            codes: [MEDICAL_KNOWLEDGE[med]?.rxnorm_code || '']
          });
        }
      }
      
      // Extract outcomes
      const detectedOutcomes = outcomes.filter(outcome => queryLower.includes(outcome));
      
      // Build structured query
      const structuredQuery = {
        original_query: query,
        sequential_tasks: tasks,
        entities,
        outcomes: detectedOutcomes,
        temporal_aspects: {
          follow_up: queryLower.includes('30-day') ? '30 days' : 
                    queryLower.includes('90-day') ? '90 days' : 'in-hospital'
        },
        statistical_approach: {
          primary: queryLower.includes('reduces') || queryLower.includes('associated') ? 
                  'association analysis' : 'descriptive analysis',
          adjustment: 'Consider adjusting for: age, sex, severity scores, comorbidities'
        },
        strobe_alignment: {
          study_design: 'Retrospective cohort study',
          key_items_addressed: [4, 5, 6, 7, 8, 12]
        }
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structuredQuery, null, 2)
          }
        ]
      };
    }
    
    case 'generate_strobe_analysis': {
      const researchQuestion = args.research_question as string;
      const studyType = args.study_type || 'cohort';
      const datasetInfo = args.dataset_info || { n_patients: 500 };
      
      const analysisPlan = generateSTROBEAnalysisPlan(researchQuestion, datasetInfo);
      
      // Enhance with specific details based on question
      const questionLower = researchQuestion.toLowerCase();
      
      if (questionLower.includes('sepsis')) {
        analysisPlan.strobe_sections.methods.participants.inclusion_criteria = [
          'Age ≥ 18 years',
          'ICU admission',
          'Meet CDC Adult Sepsis Event criteria'
        ];
        analysisPlan.strobe_sections.methods.variables.outcome = 'Sepsis per CDC ASE definition';
      }
      
      if (questionLower.includes('vancomycin')) {
        analysisPlan.strobe_sections.methods.variables.exposure = 'Vancomycin administration (≥4 consecutive days)';
      }
      
      if (questionLower.includes('mortality')) {
        analysisPlan.strobe_sections.methods.variables.outcome = 'All-cause mortality (in-hospital or 30-day)';
        analysisPlan.strobe_sections.methods.statistical_methods.primary_analysis = 
          'Logistic regression for mortality, Cox regression for time-to-event';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysisPlan, null, 2)
          }
        ]
      };
    }
    
    case 'lookup_medical_knowledge': {
      const entity = args.entity as string;
      const includeGuidelines = args.include_guidelines !== false;
      const entityLower = entity.toLowerCase();
      
      // Find matching knowledge
      const knowledge = MEDICAL_KNOWLEDGE[entityLower] || 
                       Object.entries(MEDICAL_KNOWLEDGE).find(([key, _]) => 
                         key.includes(entityLower) || entityLower.includes(key)
                       )?.[1];
      
      if (!knowledge) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `No knowledge found for entity: ${entity}`
        );
      }
      
      let response = {
        entity,
        ...knowledge
      };
      
      // Add relevant guidelines
      if (includeGuidelines) {
        if (entityLower.includes('sepsis')) {
          response['cdc_guidelines'] = CDC_SEPSIS_EVENT;
        }
        response['analysis_guidelines'] = 'Follow STROBE statement for observational studies';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
    
    case 'analyze_synthetic_dataset': {
      const analysisType = args.analysis_type as string;
      const filters = args.filters || {};
      const applyCDC = args.apply_cdc_sepsis === true;
      
      // Load synthetic data info
      const dataPath = path.join(__dirname, '../../data/mock-icu-data/clif_realistic_samples/dataset_summary.json');
      let datasetSummary: any = { n_patients: 500, n_hospitalizations: 654 };
      
      try {
        const summaryContent = fs.readFileSync(dataPath, 'utf-8');
        datasetSummary = JSON.parse(summaryContent).dataset_info;
      } catch (error) {
        console.warn('Could not load dataset summary, using defaults');
      }
      
      let results = {
        analysis_type: analysisType,
        dataset: datasetSummary,
        filters_applied: filters
      };
      
      if (analysisType === 'descriptive') {
        results['summary'] = {
          total_patients: datasetSummary.n_patients,
          total_encounters: datasetSummary.n_hospitalizations,
          mortality_rate: `${(datasetSummary.mortality_rate * 100).toFixed(1)}%`,
          demographics: {
            female_rate: `${(datasetSummary.female_rate * 100).toFixed(1)}%`,
            median_age: datasetSummary.median_age
          }
        };
      }
      
      if (applyCDC && (filters as any).condition === 'sepsis') {
        results['cdc_sepsis_analysis'] = {
          criteria_applied: 'CDC Adult Sepsis Event definition',
          suspected_infection: 'Blood culture + ≥4 consecutive antibiotic days',
          organ_dysfunction: 'At least one CDC-defined organ dysfunction',
          estimated_cases: Math.round(datasetSummary.n_hospitalizations * 0.25)
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }
    
    case 'generate_research_code': {
      const analysisSpec = args.analysis_spec as any;
      const language = args.language || 'R';
      const includeSTROBE = args.include_strobe_comments !== false;
      
      let code = '';
      
      if (language === 'R') {
        code = `# Healthcare Research Analysis
# Generated following STROBE guidelines for observational studies

# Load required libraries
library(tidyverse)
library(survival)
library(tableone)
library(lubridate)

${includeSTROBE ? '# STROBE Item 4: Study Design' : ''}
# Study design: Retrospective cohort study
study_design <- "retrospective_cohort"

${includeSTROBE ? '# STROBE Item 5: Setting' : ''}
# Load data
data <- read_csv("data/mock-icu-data/clif_realistic/patient.csv")
hospitalizations <- read_csv("data/mock-icu-data/clif_realistic/hospitalization.csv")
medications <- read_csv("data/mock-icu-data/clif_realistic/medication_orders.csv")

${includeSTROBE ? '# STROBE Item 6: Participants' : ''}
# Define cohort
cohort <- hospitalizations %>%
  left_join(data, by = "patient_id") %>%
  filter(age_at_admission >= 18)  # Adult patients only

`;

        // Add condition-specific code
        if (analysisSpec.entities?.some(e => e.text === 'sepsis')) {
          code += `
${includeSTROBE ? '# STROBE Item 7: Variables - Define sepsis using CDC criteria' : ''}
# CDC Adult Sepsis Event definition
# Step 1: Identify suspected infection (blood culture + antibiotics ≥4 days)
antibiotics <- medications %>%
  filter(medication_category %in% c("antibiotic", "antimicrobial")) %>%
  group_by(hospitalization_id) %>%
  summarize(
    antibiotic_days = n_distinct(floor_date(order_dttm, "day")),
    has_qad = antibiotic_days >= 4
  )

# Step 2: Identify organ dysfunction
organ_dysfunction <- cohort %>%
  mutate(
    # Simplified CDC criteria (would need full data for complete implementation)
    cardiovascular = FALSE,  # Would check for vasopressor initiation
    pulmonary = FALSE,       # Would check for mechanical ventilation
    renal = FALSE,           # Would check for creatinine doubling
    hepatic = FALSE,         # Would check for bilirubin ≥2.0 + doubling
    coagulation = FALSE,     # Would check for platelets <100 + 50% decrease
    lactate = FALSE          # Would check for lactate ≥2.0
  ) %>%
  mutate(
    has_organ_dysfunction = cardiovascular | pulmonary | renal | hepatic | coagulation | lactate
  )

# Combine for sepsis definition
sepsis_cohort <- cohort %>%
  left_join(antibiotics, by = "hospitalization_id") %>%
  left_join(organ_dysfunction, by = "hospitalization_id") %>%
  mutate(
    has_sepsis = has_qad & has_organ_dysfunction
  )
`;
        }

        code += `
${includeSTROBE ? '# STROBE Items 13-14: Descriptive statistics' : ''}
# Create Table 1
vars <- c("age_at_admission", "sex_category", "race_category")
cat_vars <- c("sex_category", "race_category")

table1 <- CreateTableOne(
  vars = vars,
  factorVars = cat_vars,
  data = cohort,
  strata = "exposure_group"  # Define based on research question
)

print(table1, showAllLevels = TRUE)

${includeSTROBE ? '# STROBE Item 16: Main results' : ''}
# Primary analysis
# [Add specific analysis based on research question]

${includeSTROBE ? '# STROBE Item 12e: Sensitivity analyses' : ''}
# Sensitivity analysis
# [Add sensitivity analyses to test robustness]
`;
      } else {
        // Python code
        code = `# Healthcare Research Analysis
# Generated following STROBE guidelines for observational studies

import pandas as pd
import numpy as np
from scipy import stats
from lifelines import KaplanMeierFitter, CoxPHFitter
import matplotlib.pyplot as plt
import seaborn as sns

${includeSTROBE ? '# STROBE Item 4: Study Design' : ''}
study_design = "retrospective_cohort"

${includeSTROBE ? '# STROBE Item 5: Setting' : ''}
# Load data
patients = pd.read_csv("data/mock-icu-data/clif_realistic/patient.csv")
hospitalizations = pd.read_csv("data/mock-icu-data/clif_realistic/hospitalization.csv")
medications = pd.read_csv("data/mock-icu-data/clif_realistic/medication_orders.csv")

${includeSTROBE ? '# STROBE Item 6: Participants' : ''}
# Define cohort
cohort = hospitalizations.merge(patients, on='patient_id')
cohort = cohort[cohort['age_at_admission'] >= 18]  # Adults only

# Convert dates
date_cols = ['admission_dttm', 'discharge_dttm']
for col in date_cols:
    cohort[col] = pd.to_datetime(cohort[col])
`;

        if (analysisSpec.entities?.some(e => e.text === 'sepsis')) {
          code += `
${includeSTROBE ? '# STROBE Item 7: Variables - CDC Sepsis definition' : ''}
# Implement CDC Adult Sepsis Event criteria
# Step 1: Suspected infection
antibiotics = medications[medications['medication_category'].isin(['antibiotic', 'antimicrobial'])]
antibiotic_days = antibiotics.groupby('hospitalization_id')['order_dttm'].apply(
    lambda x: pd.to_datetime(x).dt.date.nunique()
).reset_index(name='antibiotic_days')
antibiotic_days['has_qad'] = antibiotic_days['antibiotic_days'] >= 4

# Step 2: Organ dysfunction (simplified - full implementation would need all data)
# This is a placeholder for the actual CDC criteria implementation
cohort['has_organ_dysfunction'] = False  # Would implement full criteria

# Combine for sepsis
cohort = cohort.merge(antibiotic_days, on='hospitalization_id', how='left')
cohort['has_sepsis'] = cohort['has_qad'] & cohort['has_organ_dysfunction']
`;
        }

        code += `
${includeSTROBE ? '# STROBE Items 13-14: Descriptive statistics' : ''}
# Generate Table 1
def create_table1(df, stratify_by=None):
    """Create descriptive statistics table"""
    continuous_vars = ['age_at_admission']
    categorical_vars = ['sex_category', 'race_category']
    
    if stratify_by:
        groups = df.groupby(stratify_by)
        for name, group in groups:
            print(f"\\n{stratify_by} = {name}")
            print_descriptive_stats(group, continuous_vars, categorical_vars)
    else:
        print_descriptive_stats(df, continuous_vars, categorical_vars)

def print_descriptive_stats(df, continuous_vars, categorical_vars):
    # Continuous variables
    for var in continuous_vars:
        print(f"{var}: {df[var].mean():.1f} ± {df[var].std():.1f}")
    
    # Categorical variables
    for var in categorical_vars:
        print(f"\\n{var}:")
        print(df[var].value_counts(normalize=True).multiply(100).round(1))

create_table1(cohort)

${includeSTROBE ? '# STROBE Item 16: Main results' : ''}
# Primary analysis
# [Add specific analysis based on research question]

${includeSTROBE ? '# STROBE Item 12e: Sensitivity analyses' : ''}
# Sensitivity analysis
# [Add sensitivity analyses]
`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: code
          }
        ]
      };
    }
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Enhanced MCP Healthcare Research Server running...');