#!/usr/bin/env node
/**
 * Example: Using the Synthetic ICU Dataset with MCP Tools
 * This shows how to analyze the mock data for sepsis and vancomycin effectiveness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏥 Synthetic ICU Dataset Usage Example\n');
console.log('=' * 50);

// Show available data formats
console.log('📊 Available Data Formats:');
console.log('1. MIMIC Format - Classic MIMIC-III/IV structure');
console.log('2. CLIF Format - Common Longitudinal ICU Format');
console.log('3. OMOP CDM Format - Standardized for research\n');

// Load and display dataset summary
const summaryPath = path.join(__dirname, '../data/mock-icu-data/dataset_summary.json');
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  
  console.log('📈 Dataset Statistics:');
  console.log(`- Patients: ${summary.dataset_info.n_patients}`);
  console.log(`- ICU Admissions: ${summary.dataset_info.n_admissions}`);
  console.log(`- Sepsis Cases: ${summary.conditions.sepsis_cases}`);
  console.log(`- Overall Mortality: ${(summary.conditions.mortality_rate * 100).toFixed(1)}%\n`);
}

// Example queries you can run with the MCP
console.log('🔬 Example Research Questions:\n');

console.log('1️⃣ Basic Sepsis Analysis:');
console.log('Query: "Using the mock ICU dataset, analyze sepsis patient characteristics"');
console.log('Expected: Demographics, comorbidities, mortality rates\n');

console.log('2️⃣ Vancomycin Effectiveness:');
console.log('Query: "Compare 30-day mortality between sepsis patients who received vancomycin vs other antibiotics"');
console.log('Expected: Cohort definitions, survival analysis, adjusted odds ratios\n');

console.log('3️⃣ Risk Prediction:');
console.log('Query: "Build a model to predict sepsis mortality using vitals, labs, and medications"');
console.log('Expected: Feature engineering, model comparison, ROC curves\n');

// Show how to load the data
console.log('💻 Loading Data Examples:\n');

console.log('// MIMIC Format');
console.log('const patients = pd.read_csv("data/mock-icu-data/mimic_format/patients.csv")');
console.log('const diagnoses = pd.read_csv("data/mock-icu-data/mimic_format/diagnoses.csv")');
console.log('const medications = pd.read_csv("data/mock-icu-data/mimic_format/medications.csv")\n');

console.log('// OMOP Format');
console.log('const person = pd.read_csv("data/mock-icu-data/omop_format/person.csv")');
console.log('const condition = pd.read_csv("data/mock-icu-data/omop_format/condition_occurrence.csv")');
console.log('const drug = pd.read_csv("data/mock-icu-data/omop_format/drug_exposure.csv")\n');

// Sample data analysis
console.log('📊 Sample Analysis Code:\n');
console.log(`# Sepsis Vancomycin Analysis
library(tidyverse)
library(survival)

# Load MIMIC format data
diagnoses <- read_csv("data/mock-icu-data/mimic_format/diagnoses.csv")
medications <- read_csv("data/mock-icu-data/mimic_format/medications.csv")
admissions <- read_csv("data/mock-icu-data/mimic_format/admissions.csv")

# Identify sepsis patients
sepsis_patients <- diagnoses %>%
  filter(icd10_code == "A41.9") %>%
  select(subject_id, hadm_id)

# Check vancomycin exposure
vancomycin_exposure <- medications %>%
  filter(rxnorm_code == "11124") %>%
  select(subject_id, hadm_id, startdate)

# Merge and analyze
analysis_cohort <- sepsis_patients %>%
  left_join(admissions, by = c("subject_id", "hadm_id")) %>%
  left_join(vancomycin_exposure, by = c("subject_id", "hadm_id")) %>%
  mutate(vancomycin = !is.na(startdate))

# Calculate mortality by group
mortality_summary <- analysis_cohort %>%
  group_by(vancomycin) %>%
  summarise(
    n = n(),
    deaths = sum(hospital_expire_flag),
    mortality_rate = mean(hospital_expire_flag)
  )

print(mortality_summary)
`);

console.log('\n✅ Ready to Use!');
console.log('\nTo analyze this data with the MCP:');
console.log('1. Make sure the MCP server is configured');
console.log('2. Use natural language queries referencing the dataset');
console.log('3. The MCP will generate complete analysis code');
console.log('\nDataset location: data/mock-icu-data/');