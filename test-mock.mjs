#!/usr/bin/env node
// Mock test to demonstrate MCP functionality without database

console.log('🧪 Mock Testing Healthcare Research MCP Server\n');

// Simulate the natural language query tool
console.log('📝 Test 1: Natural Language Query Processing');
console.log('Query: "Using this dataset, analyze if vancomycin reduces sepsis mortality at 30 days"\n');

const mockResponse = {
  parsed_query: {
    intent: 'comparison',
    entities: [
      {
        text: 'vancomycin',
        type: 'medication',
        codes: [{ system: 'RxNorm', code: '11124', display: 'Vancomycin' }]
      },
      {
        text: 'sepsis',
        type: 'condition',
        codes: [{ system: 'ICD-10', code: 'A41.9', display: 'Sepsis, unspecified' }]
      },
      {
        text: 'mortality at 30 days',
        type: 'outcome',
        temporal: '30 days'
      }
    ]
  },
  hypothesis: {
    primary: 'Vancomycin administration reduces 30-day mortality in sepsis patients',
    mechanisms: ['Direct antimicrobial effect', 'Reduced endotoxin release'],
    confounders: ['Sepsis severity', 'Comorbidities', 'Time to antibiotic']
  },
  cohort_definition: {
    exposure_group: 'Sepsis patients receiving vancomycin within 24h',
    control_group: 'Sepsis patients receiving alternative antibiotics',
    sample_size_estimate: 2847
  },
  analysis_code: `# R Code for Sepsis-Vancomycin Analysis
library(tidyverse)
library(survival)
library(tableone)

# Load data
data <- read_csv("sepsis_cohort.csv")

# Define cohorts
vancomycin_cohort <- data %>%
  filter(diagnosis_code == "A41.9",  # Sepsis
         medication_code == "11124",   # Vancomycin
         time_to_abx <= 24)            # Within 24 hours

# Kaplan-Meier survival analysis
km_fit <- survfit(Surv(time_to_death, death_30day) ~ vancomycin_group, 
                  data = analysis_data)

# Cox proportional hazards
cox_model <- coxph(Surv(time_to_death, death_30day) ~ vancomycin_group + 
                   age + sex + severity_score + comorbidity_score,
                   data = analysis_data)
`
};

console.log('Results:');
console.log(JSON.stringify(mockResponse, null, 2));

console.log('\n🔧 Test 2: Medical Knowledge Lookup');
console.log('Query: "What is sepsis?"\n');

const knowledgeResponse = {
  concept: 'sepsis',
  definition: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
  icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2'],
  clinical_criteria: {
    SIRS: ['Temperature >38°C or <36°C', 'Heart rate >90', 'Respiratory rate >20', 'WBC >12k or <4k'],
    qSOFA: ['Respiratory rate ≥22', 'Altered mentation', 'Systolic BP ≤100']
  },
  mortality_rate: '15-30%',
  treatment: ['Early antibiotics', 'Fluid resuscitation', 'Source control']
};

console.log(JSON.stringify(knowledgeResponse, null, 2));

console.log('\n✅ Mock tests completed successfully!');
console.log('\n📱 To test with real data:');
console.log('1. Install dependencies: npm install');
console.log('2. Build project: npm run build');
console.log('3. Configure Claude Desktop or use MCP Inspector');
console.log('4. Set up API keys in .env file for LLM providers');