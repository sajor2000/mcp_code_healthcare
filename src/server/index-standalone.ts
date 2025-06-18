#!/usr/bin/env node
/**
 * Standalone MCP Server for Healthcare Research
 * Works without database dependencies - uses mock data and synthetic dataset
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock medical knowledge base
const MEDICAL_KNOWLEDGE = {
  sepsis: {
    definition: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
    icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2'],
    clinical_criteria: {
      SIRS: ['Temperature >38°C or <36°C', 'Heart rate >90', 'Respiratory rate >20', 'WBC >12k or <4k'],
      qSOFA: ['Respiratory rate ≥22', 'Altered mentation', 'Systolic BP ≤100']
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
    monitoring: ['Trough levels', 'Renal function']
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
    icd10_codes: ['J80'],
    berlin_criteria: ['Acute onset', 'Bilateral infiltrates', 'PaO2/FiO2 <300', 'Non-cardiogenic'],
    mortality_rate: '35-45%',
    treatment: ['Lung protective ventilation', 'PEEP', 'Prone positioning', 'ECMO in severe cases']
  }
};

// Create server instance
const server = new Server(
  {
    name: 'healthcare-research-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to load synthetic dataset info
function loadDatasetInfo() {
  try {
    const summaryPath = path.join(__dirname, '../../data/mock-icu-data/dataset_summary.json');
    if (fs.existsSync(summaryPath)) {
      return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    }
  } catch (error) {
    console.error('Could not load dataset summary:', error);
  }
  return null;
}

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'natural_language_query',
      description: 'Process natural language medical research queries and generate analysis plans',
      inputSchema: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'Natural language research question' 
          },
          dataset_info: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              format: { 
                type: 'string',
                enum: ['csv', 'parquet', 'mimic', 'omop', 'clif']
              }
            }
          }
        },
        required: ['query'],
      },
    },
    {
      name: 'lookup_medical_knowledge',
      description: 'Look up medical concepts, conditions, medications, and data models',
      inputSchema: {
        type: 'object',
        properties: {
          concept: { 
            type: 'string', 
            description: 'Medical concept to look up' 
          },
          concept_type: { 
            type: 'string', 
            enum: ['condition', 'medication', 'procedure', 'data_model'],
            description: 'Type of medical concept' 
          },
        },
        required: ['concept'],
      },
    },
    {
      name: 'analyze_synthetic_dataset',
      description: 'Analyze the included synthetic ICU dataset',
      inputSchema: {
        type: 'object',
        properties: {
          analysis_type: {
            type: 'string',
            enum: ['summary', 'sepsis_cohort', 'medication_exposure', 'mortality_analysis'],
            description: 'Type of analysis to perform'
          }
        },
        required: ['analysis_type']
      }
    },
    {
      name: 'generate_research_code',
      description: 'Generate analysis code in R or Python',
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
          }
        },
        required: ['analysis_spec']
      }
    }
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'natural_language_query': {
      const query = args.query as string;
      const datasetInfo = args.dataset_info;
      
      // Parse the query for key elements
      const queryLower = query.toLowerCase();
      const entities = [];
      const conditions = ['sepsis', 'pneumonia', 'ards', 'heart failure', 'stroke'];
      const medications = ['vancomycin', 'norepinephrine', 'propofol', 'fentanyl'];
      const outcomes = ['mortality', 'death', 'survival', 'readmission'];
      
      // Extract conditions
      for (const condition of conditions) {
        if (queryLower.includes(condition)) {
          entities.push({
            text: condition,
            type: 'condition',
            codes: MEDICAL_KNOWLEDGE[condition]?.icd10_codes || []
          });
        }
      }
      
      // Extract medications
      for (const med of medications) {
        if (queryLower.includes(med)) {
          entities.push({
            text: med,
            type: 'medication',
            codes: MEDICAL_KNOWLEDGE[med]?.rxnorm_code ? [MEDICAL_KNOWLEDGE[med].rxnorm_code] : []
          });
        }
      }
      
      // Determine analysis type
      let analysisType = 'descriptive';
      if (queryLower.includes('compar') || queryLower.includes('versus') || queryLower.includes('vs')) {
        analysisType = 'comparison';
      } else if (queryLower.includes('predict') || queryLower.includes('risk')) {
        analysisType = 'prediction';
      } else if (queryLower.includes('associat') || queryLower.includes('correlat')) {
        analysisType = 'association';
      }
      
      // Build hypothesis if comparison
      let hypothesis = null;
      if (analysisType === 'comparison' && entities.length >= 2) {
        const medication = entities.find(e => e.type === 'medication');
        const condition = entities.find(e => e.type === 'condition');
        if (medication && condition) {
          hypothesis = {
            primary: `${medication.text} is associated with improved outcomes in ${condition.text} patients`,
            null: `No difference in outcomes between ${medication.text} and standard care`,
            mechanisms: ['Direct therapeutic effect', 'Reduced complications'],
            confounders: ['Disease severity', 'Comorbidities', 'Timing of intervention']
          };
        }
      }
      
      // Check if using synthetic dataset
      const usingSyntheticData = queryLower.includes('mock') || queryLower.includes('synthetic') || 
                                queryLower.includes('dataset') || (datasetInfo as any)?.path?.includes('mock-icu-data');
      
      const response = {
        parsed_query: {
          original: query,
          intent: analysisType,
          entities: entities,
          temporal_window: queryLower.includes('30 day') ? '30 days' : 
                          queryLower.includes('90 day') ? '90 days' : 
                          queryLower.includes('hospital') ? 'hospitalization' : null,
          using_synthetic_data: usingSyntheticData
        },
        hypothesis: hypothesis,
        cohort_definition: entities.length > 0 ? {
          inclusion_criteria: entities.map(e => `Patients with ${e.text}`),
          exclusion_criteria: ['Age < 18', 'Missing outcome data'],
          expected_sample_size: usingSyntheticData ? 'Approximately 100-200 patients from synthetic dataset' : 'To be determined'
        } : null,
        analysis_plan: {
          steps: [
            'Load and validate data',
            'Define cohorts based on inclusion/exclusion criteria',
            'Calculate descriptive statistics',
            analysisType === 'comparison' ? 'Perform propensity score matching' : null,
            analysisType === 'comparison' ? 'Compare outcomes between groups' : null,
            analysisType === 'prediction' ? 'Build and validate prediction model' : null,
            'Generate visualizations',
            'Interpret results'
          ].filter(Boolean)
        },
        strobe_compliance: {
          checklist: ['Title and abstract', 'Introduction', 'Methods', 'Results', 'Discussion'],
          recommendations: ['Define exposure clearly', 'Address potential confounders', 'Report missing data']
        }
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
    
    case 'lookup_medical_knowledge': {
      const concept = args.concept as string;
      const conceptType = args.concept_type;
      const conceptLower = concept.toLowerCase();
      
      // Check if it's a data model query
      if (conceptType === 'data_model' || ['omop', 'clif', 'mimic'].includes(conceptLower)) {
        const dataModels = {
          omop: {
            name: 'OMOP Common Data Model',
            version: 'v5.4',
            description: 'Standardized data model for observational health data',
            key_tables: ['person', 'visit_occurrence', 'condition_occurrence', 'drug_exposure', 'measurement'],
            advantages: ['Standardized vocabularies', 'Wide adoption', 'Rich analytics tools'],
            use_cases: ['Comparative effectiveness', 'Drug safety', 'Phenotyping']
          },
          clif: {
            name: 'Common Longitudinal ICU Format',
            version: '1.0',
            description: 'Specialized format for ICU data harmonization',
            key_tables: ['patient', 'hospitalization', 'vitals', 'labs', 'medications', 'respiratory_support'],
            advantages: ['ICU-specific', 'High temporal resolution', 'Multi-center compatible'],
            use_cases: ['ICU outcomes research', 'Sepsis studies', 'Mechanical ventilation research']
          },
          mimic: {
            name: 'MIMIC Database Schema',
            version: 'MIMIC-IV',
            description: 'Comprehensive critical care database structure',
            key_tables: ['patients', 'admissions', 'icustays', 'chartevents', 'labevents'],
            advantages: ['Detailed ICU data', 'Free access', 'Well-documented'],
            use_cases: ['Critical care research', 'Machine learning', 'Clinical decision support']
          }
        };
        
        const model = dataModels[conceptLower];
        if (model) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(model, null, 2)
            }]
          };
        }
      }
      
      // Look up medical concept
      const knowledge = MEDICAL_KNOWLEDGE[conceptLower];
      if (knowledge) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              concept: concept,
              ...knowledge,
              data_availability: {
                in_synthetic_dataset: true,
                table_location: conceptType === 'medication' ? 'medications.csv' : 'diagnoses.csv'
              }
            }, null, 2)
          }]
        };
      }
      
      // Default response
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            concept: concept,
            message: 'Concept not found in knowledge base',
            available_concepts: Object.keys(MEDICAL_KNOWLEDGE),
            suggestion: 'Try: sepsis, vancomycin, pneumonia, ards, omop, clif, mimic'
          }, null, 2)
        }]
      };
    }
    
    case 'analyze_synthetic_dataset': {
      const analysisType = args.analysis_type as string;
      const datasetInfo = loadDatasetInfo();
      
      const analyses = {
        summary: {
          description: 'Overall dataset summary',
          results: datasetInfo || {
            n_patients: 500,
            n_admissions: 666,
            n_icu_stays: 608,
            mortality_rate: 0.243,
            available_formats: ['MIMIC', 'CLIF', 'OMOP']
          }
        },
        sepsis_cohort: {
          description: 'Sepsis patient analysis',
          results: {
            n_sepsis_patients: 261,
            sepsis_mortality: '~30%',
            common_treatments: ['Vancomycin', 'Norepinephrine', 'Fluid resuscitation'],
            avg_los: '7.2 days'
          }
        },
        medication_exposure: {
          description: 'Medication usage patterns',
          results: {
            vancomycin_use: '~40% of sepsis patients',
            avg_duration: '5-7 days',
            common_combinations: ['Vancomycin + Piperacillin-tazobactam', 'Vancomycin + Norepinephrine']
          }
        },
        mortality_analysis: {
          description: 'Mortality patterns',
          results: {
            overall_mortality: '24.3%',
            sepsis_mortality: '~30%',
            ards_mortality: '~40%',
            factors: ['Age', 'Severity scores', 'Organ failures']
          }
        }
      };
      
      const analysis = analyses[analysisType];
      if (analysis) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analysis_type: analysisType,
              ...analysis,
              data_location: 'data/mock-icu-data/',
              code_example: `# R code to reproduce
library(tidyverse)
data <- read_csv("data/mock-icu-data/mimic_format/diagnoses.csv")
sepsis <- data %>% filter(icd10_code == "A41.9")`
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: 'Invalid analysis type. Choose: summary, sepsis_cohort, medication_exposure, mortality_analysis'
        }]
      };
    }
    
    case 'generate_research_code': {
      const spec = args.analysis_spec as any;
      const language = args.language as string || 'R';
      
      if (language === 'R') {
        const code = `# Healthcare Research Analysis
# Generated by Healthcare Research MCP

library(tidyverse)
library(survival)
library(tableone)

# Load data (adjust path as needed)
diagnoses <- read_csv("data/mock-icu-data/mimic_format/diagnoses.csv")
medications <- read_csv("data/mock-icu-data/mimic_format/medications.csv")
admissions <- read_csv("data/mock-icu-data/mimic_format/admissions.csv")
vitals <- read_csv("data/mock-icu-data/mimic_format/vitals.csv")

# Define cohorts
cohort <- diagnoses %>%
  filter(${spec.entities?.find((e: any) => e.type === 'condition') ? 
    `icd10_code == "${spec.entities.find((e: any) => e.type === 'condition').codes[0]}"` : 
    'TRUE'}) %>%
  inner_join(admissions, by = c("subject_id", "hadm_id"))

# Add medication exposure
${spec.entities?.find((e: any) => e.type === 'medication') ? `
medication_exposure <- medications %>%
  filter(rxnorm_code == "${spec.entities.find((e: any) => e.type === 'medication').codes[0]}") %>%
  select(subject_id, hadm_id, medication = drug)

cohort <- cohort %>%
  left_join(medication_exposure, by = c("subject_id", "hadm_id")) %>%
  mutate(exposed = !is.na(medication))` : ''}

# Descriptive statistics
summary_stats <- cohort %>%
  summarise(
    n_patients = n_distinct(subject_id),
    n_admissions = n(),
    mortality_rate = mean(hospital_expire_flag),
    avg_los = mean(as.numeric(dischtime - admittime, units = "days"))
  )

print(summary_stats)

${spec.intent === 'comparison' ? `
# Comparison analysis
comparison <- cohort %>%
  group_by(exposed) %>%
  summarise(
    n = n(),
    deaths = sum(hospital_expire_flag),
    mortality_rate = mean(hospital_expire_flag)
  )

# Statistical test
chisq.test(table(cohort$exposed, cohort$hospital_expire_flag))` : ''}

# Visualization
library(ggplot2)
ggplot(cohort, aes(x = hospital_expire_flag)) +
  geom_bar() +
  labs(title = "Mortality Distribution",
       x = "Mortality",
       y = "Count") +
  theme_minimal()`;
        
        return {
          content: [{
            type: 'text',
            text: code
          }]
        };
      } else {
        // Python code
        const code = `# Healthcare Research Analysis
# Generated by Healthcare Research MCP

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns

# Load data
diagnoses = pd.read_csv("data/mock-icu-data/mimic_format/diagnoses.csv")
medications = pd.read_csv("data/mock-icu-data/mimic_format/medications.csv")
admissions = pd.read_csv("data/mock-icu-data/mimic_format/admissions.csv")

# Define cohort
${spec.entities?.find((e: any) => e.type === 'condition') ? 
  `cohort = diagnoses[diagnoses['icd10_code'] == '${spec.entities.find((e: any) => e.type === 'condition').codes[0]}']` :
  'cohort = diagnoses'}
cohort = cohort.merge(admissions, on=['subject_id', 'hadm_id'])

# Add medication exposure
${spec.entities?.find((e: any) => e.type === 'medication') ? `
med_exposure = medications[medications['rxnorm_code'] == '${spec.entities.find((e: any) => e.type === 'medication').codes[0]}']
med_exposure = med_exposure[['subject_id', 'hadm_id', 'drug']].rename(columns={'drug': 'medication'})
cohort = cohort.merge(med_exposure, on=['subject_id', 'hadm_id'], how='left')
cohort['exposed'] = ~cohort['medication'].isna()` : ''}

# Descriptive statistics
summary = {
    'n_patients': cohort['subject_id'].nunique(),
    'n_admissions': len(cohort),
    'mortality_rate': cohort['hospital_expire_flag'].mean(),
}
print(pd.Series(summary))

${spec.intent === 'comparison' ? `
# Comparison analysis
comparison = cohort.groupby('exposed').agg({
    'subject_id': 'count',
    'hospital_expire_flag': ['sum', 'mean']
})
print(comparison)

# Statistical test
from scipy.stats import chi2_contingency
contingency_table = pd.crosstab(cohort['exposed'], cohort['hospital_expire_flag'])
chi2, p_value, dof, expected = chi2_contingency(contingency_table)
print(f"Chi-square test: χ² = {chi2:.3f}, p = {p_value:.3f}")` : ''}

# Visualization
plt.figure(figsize=(10, 6))
cohort['hospital_expire_flag'].value_counts().plot(kind='bar')
plt.title('Mortality Distribution')
plt.xlabel('Mortality')
plt.ylabel('Count')
plt.show()`;
        
        return {
          content: [{
            type: 'text',
            text: code
          }]
        };
      }
    }
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Healthcare Research MCP Server (Standalone) running...');
  console.error('This version works without database dependencies.');
  console.error('Using synthetic dataset at: data/mock-icu-data/');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});