/**
 * Enhanced Code Generator for Healthcare Research
 * Provides validated, complete code generation with STROBE compliance
 */

import { STROBE_CHECKLIST, CDC_SEPSIS_EVENT } from './fetch-guidelines.js';

// Medical knowledge base
export const CONDITION_KNOWLEDGE = {
  sepsis: {
    icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2', 'A41.3', 'A41.4', 'A41.5', 'A41.8'],
    related_conditions: ['septic shock', 'bacteremia', 'SIRS'],
    common_medications: ['vancomycin', 'meropenem', 'piperacillin-tazobactam', 'norepinephrine'],
    key_vitals: ['temperature', 'heart rate', 'blood pressure', 'respiratory rate'],
    lab_markers: ['lactate', 'white blood cell count', 'procalcitonin', 'creatinine']
  },
  'heart failure': {
    icd10_codes: ['I50.9', 'I50.1', 'I50.2', 'I50.3', 'I50.4'],
    related_conditions: ['pulmonary edema', 'cardiomyopathy', 'atrial fibrillation'],
    common_medications: ['furosemide', 'lisinopril', 'carvedilol', 'spironolactone'],
    key_vitals: ['blood pressure', 'heart rate', 'weight', 'oxygen saturation'],
    lab_markers: ['BNP', 'troponin', 'creatinine', 'sodium']
  },
  pneumonia: {
    icd10_codes: ['J18.9', 'J15.9', 'J18.1', 'J15.0', 'J15.1'],
    related_conditions: ['respiratory failure', 'ARDS', 'pleural effusion'],
    common_medications: ['azithromycin', 'ceftriaxone', 'levofloxacin', 'vancomycin'],
    key_vitals: ['temperature', 'respiratory rate', 'oxygen saturation', 'blood pressure'],
    lab_markers: ['white blood cell count', 'C-reactive protein', 'procalcitonin']
  }
};

// Table schemas for validation
export const TABLE_SCHEMAS = {
  mimic: {
    patients: ['subject_id', 'gender', 'dob', 'dod'],
    admissions: ['subject_id', 'hadm_id', 'admittime', 'dischtime', 'admission_type', 'hospital_expire_flag', 'ethnicity'],
    diagnoses_icd: ['subject_id', 'hadm_id', 'seq_num', 'icd_code', 'icd_version'],
    prescriptions: ['subject_id', 'hadm_id', 'drug', 'starttime', 'stoptime'],
    chartevents: ['subject_id', 'hadm_id', 'itemid', 'charttime', 'value', 'valuenum'],
    icustays: ['subject_id', 'hadm_id', 'stay_id', 'intime', 'outtime', 'los']
  },
  clif: {
    patient: ['patient_id', 'sex_name', 'birth_date', 'death_dttm'],
    hospitalization: ['patient_id', 'hospitalization_id', 'admission_dttm', 'discharge_dttm'],
    vitals: ['hospitalization_id', 'recorded_dttm', 'vital_name', 'vital_value'],
    labs: ['hospitalization_id', 'collection_dttm', 'lab_name', 'lab_value'],
    medication_admin_continuous: ['hospitalization_id', 'admin_dttm', 'medication_name', 'dose']
  },
  omop: {
    person: ['person_id', 'gender_concept_id', 'birth_datetime', 'death_datetime'],
    visit_occurrence: ['visit_occurrence_id', 'person_id', 'visit_start_datetime', 'visit_end_datetime'],
    condition_occurrence: ['condition_occurrence_id', 'person_id', 'condition_concept_id', 'condition_start_date'],
    drug_exposure: ['drug_exposure_id', 'person_id', 'drug_concept_id', 'drug_exposure_start_datetime'],
    measurement: ['measurement_id', 'person_id', 'measurement_concept_id', 'measurement_datetime', 'value_as_number']
  }
};

interface AnalysisSpec {
  query: string;
  condition?: string;
  entities: Array<{ text: string; type: string; codes?: string[] }>;
  analyses: string[];
  visualizations: string[];
  cohort_criteria: {
    inclusion: string[];
    exclusion: string[];
  };
  temporal?: {
    follow_up?: string;
    window?: string;
  };
}

interface DatasetInfo {
  format: 'mimic' | 'clif' | 'omop';
  n_patients?: number;
  n_encounters?: number;
  date_range?: { start: string; end: string };
  available_tables?: string[];
}

export class QueryValidator {
  constructor(private datasetInfo: DatasetInfo) {}

  validate(spec: AnalysisSpec): {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const result = {
      is_valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[]
    };

    // Check if format is supported
    if (!['mimic', 'clif', 'omop'].includes(this.datasetInfo.format)) {
      result.errors.push(`Unsupported data format: ${this.datasetInfo.format}`);
      result.is_valid = false;
    }

    // Check required tables
    const requiredTables = this.getRequiredTables(spec);
    const availableTables = this.datasetInfo.available_tables || Object.keys(TABLE_SCHEMAS[this.datasetInfo.format] || {});
    const missingTables = requiredTables.filter(t => !availableTables.includes(t));

    if (missingTables.length > 0) {
      result.errors.push(`Missing required tables: ${missingTables.join(', ')}`);
      result.is_valid = false;
    }

    // Check condition knowledge
    if (spec.condition && !(spec.condition in CONDITION_KNOWLEDGE)) {
      result.warnings.push(`Condition '${spec.condition}' not in knowledge base. Will use generic approach.`);
    }

    // Check temporal feasibility
    if (spec.temporal?.follow_up === '30-day' && !this.datasetInfo.date_range) {
      result.warnings.push('30-day follow-up requested but date range not specified in dataset');
    }

    // Add suggestions
    if (!result.is_valid) {
      result.suggestions.push('Consider reducing analysis scope or using a different dataset');
    }

    return result;
  }

  getRequiredTables(spec: AnalysisSpec): string[] {
    const required = new Set<string>();
    const format = this.datasetInfo.format;

    // Base tables always needed
    if (format === 'mimic') {
      required.add('patients');
      required.add('admissions');
    } else if (format === 'clif') {
      required.add('patient');
      required.add('hospitalization');
    } else if (format === 'omop') {
      required.add('person');
      required.add('visit_occurrence');
    }

    // Add tables based on analyses
    spec.analyses.forEach(analysis => {
      const analysisLower = analysis.toLowerCase();
      if (analysisLower.includes('medication')) {
        if (format === 'mimic') required.add('prescriptions');
        else if (format === 'clif') required.add('medication_admin_continuous');
        else if (format === 'omop') required.add('drug_exposure');
      }
      if (analysisLower.includes('vital')) {
        if (format === 'mimic') required.add('chartevents');
        else if (format === 'clif') required.add('vitals');
        else if (format === 'omop') required.add('measurement');
      }
      if (analysisLower.includes('diagnosis')) {
        if (format === 'mimic') required.add('diagnoses_icd');
        else if (format === 'omop') required.add('condition_occurrence');
      }
    });

    return Array.from(required);
  }
}

export class EnhancedCodeGenerator {
  generateResearchCode(
    spec: AnalysisSpec,
    language: 'R' | 'Python' = 'R',
    datasetInfo?: DatasetInfo,
    includeSTROBE: boolean = true
  ): string {
    // Validate if dataset info provided
    if (datasetInfo) {
      const validator = new QueryValidator(datasetInfo);
      const validation = validator.validate(spec);
      if (!validation.is_valid) {
        return this.generateErrorCode(validation, language);
      }
    }

    const format = datasetInfo?.format || 'mimic';
    let code = '';

    // Generate header
    code += this.generateHeader(language, spec);

    // STROBE Item 4: Study Design
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 4, 'Study Design');
    }
    code += this.generateStudyDesign(language, spec);

    // STROBE Item 5: Setting
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 5, 'Setting');
    }
    code += this.generateDataLoading(language, format, spec);

    // STROBE Item 6: Participants
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 6, 'Participants');
    }
    code += this.generateCohortDefinition(language, format, spec);

    // STROBE Item 7: Variables
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 7, 'Variables');
    }
    code += this.generateVariableDefinitions(language, format, spec);

    // STROBE Items 13-14: Descriptive Data
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 13, 'Descriptive Data');
    }
    
    // Generate analyses
    spec.analyses.forEach(analysis => {
      code += this.generateAnalysis(language, format, analysis, spec);
    });

    // Generate visualizations
    if (spec.visualizations.length > 0) {
      code += '\n# Visualizations\n';
      spec.visualizations.forEach(viz => {
        code += this.generateVisualization(language, viz, spec);
      });
    }

    // STROBE Item 12e: Sensitivity Analysis
    if (includeSTROBE) {
      code += this.generateSTROBEComment(language, 12, 'Sensitivity Analysis', 'e');
    }
    code += this.generateSensitivityAnalysis(language, spec);

    // Save results
    code += this.generateSaveResults(language);

    return code;
  }

  private generateHeader(language: string, spec: AnalysisSpec): string {
    const libraries = this.getRequiredLibraries(language, spec);
    
    if (language === 'R') {
      let header = `# Healthcare Research Analysis
# Query: ${spec.query}
# Generated by Enhanced Healthcare MCP with STROBE compliance

# Load required libraries
`;
      libraries.forEach(lib => {
        header += `library(${lib})\n`;
      });
      header += `
# Set options
options(scipen = 999)
theme_set(theme_minimal())

`;
      return header;
    } else {
      let header = `"""
Healthcare Research Analysis
Query: ${spec.query}
Generated by Enhanced Healthcare MCP with STROBE compliance
"""

# Import required libraries
`;
      const importMap: Record<string, string> = {
        pandas: 'import pandas as pd',
        numpy: 'import numpy as np',
        matplotlib: 'import matplotlib.pyplot as plt',
        seaborn: 'import seaborn as sns',
        scipy: 'from scipy import stats',
        tableone: 'from tableone import TableOne'
      };

      libraries.forEach(lib => {
        header += (importMap[lib] || `import ${lib}`) + '\n';
      });

      header += `
# Set display options
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', 100)

`;
      return header;
    }
  }

  private generateSTROBEComment(language: string, item: number, description: string, subitem?: string): string {
    const prefix = language === 'R' ? '#' : '#';
    const itemStr = subitem ? `${item}${subitem}` : `${item}`;
    return `\n${prefix} STROBE Item ${itemStr}: ${description}\n`;
  }

  private generateStudyDesign(language: string, spec: AnalysisSpec): string {
    const studyType = spec.temporal?.follow_up ? 'Retrospective cohort study' : 'Cross-sectional study';
    
    if (language === 'R') {
      return `# Study design
study_design <- "${studyType}"
cat("Study Design:", study_design, "\\n\\n")

`;
    } else {
      return `# Study design
study_design = "${studyType}"
print(f"Study Design: {study_design}\\n")

`;
    }
  }

  private generateDataLoading(language: string, format: string, spec: AnalysisSpec): string {
    const tables = new QueryValidator({ format } as DatasetInfo).getRequiredTables(spec);
    
    if (language === 'R') {
      let code = '# Load data files\n';
      tables.forEach(table => {
        code += `${table} <- read_csv("data/${format}_format/${table}.csv")\n`;
      });
      return code + '\n';
    } else {
      let code = '# Load data files\n';
      tables.forEach(table => {
        code += `${table} = pd.read_csv("data/${format}_format/${table}.csv")\n`;
      });
      return code + '\n';
    }
  }

  private generateCohortDefinition(language: string, format: string, spec: AnalysisSpec): string {
    const condition = spec.condition;
    const icdCodes = condition ? CONDITION_KNOWLEDGE[condition]?.icd10_codes : [];
    
    if (language === 'R') {
      let code = '# Define cohort\n';
      
      if (condition && icdCodes) {
        // CDC Sepsis definition if applicable
        if (condition === 'sepsis' && spec.entities.some(e => e.text === 'CDC')) {
          code += this.generateCDCSepsisDefinitionR(format);
        } else {
          code += `# ICD-10 codes for ${condition}\n`;
          code += `${condition}_codes <- c(${icdCodes.map(c => `"${c}"`).join(', ')})\n\n`;
        }
      }
      
      // Age criteria
      const ageInclusion = spec.cohort_criteria.inclusion.find(c => c.includes('Age'));
      if (ageInclusion) {
        const match = ageInclusion.match(/Age\s*>\s*(\d+)/);
        if (match) {
          code += `# Age criterion: ${ageInclusion}\n`;
          code += `min_age <- ${match[1]}\n\n`;
        }
      }
      
      return code;
    } else {
      let code = '# Define cohort\n';
      
      if (condition && icdCodes) {
        if (condition === 'sepsis' && spec.entities.some(e => e.text === 'CDC')) {
          code += this.generateCDCSepsisDefinitionPython(format);
        } else {
          code += `# ICD-10 codes for ${condition}\n`;
          code += `${condition}_codes = ${JSON.stringify(icdCodes)}\n\n`;
        }
      }
      
      return code;
    }
  }

  private generateCDCSepsisDefinitionR(format: string): string {
    return `# CDC Adult Sepsis Event Definition
# Step 1: Suspected infection (blood culture + antibiotics ≥4 days)
suspected_infection <- medications %>%
  filter(drug %in% c("vancomycin", "meropenem", "piperacillin-tazobactam")) %>%
  group_by(subject_id, hadm_id) %>%
  summarize(
    antibiotic_days = n_distinct(as.Date(starttime)),
    has_qad = antibiotic_days >= 4,
    .groups = "drop"
  )

# Step 2: Organ dysfunction (simplified - would need full lab/vitals data)
# Implementing cardiovascular dysfunction: vasopressor initiation
vasopressors <- medications %>%
  filter(drug %in% c("norepinephrine", "epinephrine", "dopamine", "vasopressin")) %>%
  select(subject_id, hadm_id, vasopressor_start = starttime)

# Combine for CDC sepsis definition
cdc_sepsis <- suspected_infection %>%
  inner_join(vasopressors, by = c("subject_id", "hadm_id")) %>%
  filter(has_qad) %>%
  mutate(has_cdc_sepsis = TRUE)

`;
  }

  private generateCDCSepsisDefinitionPython(format: string): string {
    return `# CDC Adult Sepsis Event Definition
# Step 1: Suspected infection (blood culture + antibiotics ≥4 days)
antibiotics = medications[
    medications['drug'].isin(['vancomycin', 'meropenem', 'piperacillin-tazobactam'])
]

suspected_infection = antibiotics.groupby(['subject_id', 'hadm_id']).agg({
    'starttime': lambda x: pd.to_datetime(x).dt.date.nunique()
}).rename(columns={'starttime': 'antibiotic_days'})

suspected_infection['has_qad'] = suspected_infection['antibiotic_days'] >= 4

# Step 2: Organ dysfunction (simplified - would need full lab/vitals data)
# Implementing cardiovascular dysfunction: vasopressor initiation
vasopressors = medications[
    medications['drug'].isin(['norepinephrine', 'epinephrine', 'dopamine', 'vasopressin'])
][['subject_id', 'hadm_id', 'starttime']].rename(columns={'starttime': 'vasopressor_start'})

# Combine for CDC sepsis definition
cdc_sepsis = suspected_infection[suspected_infection['has_qad']].merge(
    vasopressors, on=['subject_id', 'hadm_id']
)
cdc_sepsis['has_cdc_sepsis'] = True

`;
  }

  private generateVariableDefinitions(language: string, format: string, spec: AnalysisSpec): string {
    if (language === 'R') {
      return `# Define variables
# Outcome: ${spec.analyses.includes('mortality') ? 'In-hospital mortality' : 'Primary outcome'}
# Exposure: ${spec.condition || 'Primary exposure'}
# Confounders: Age, sex, comorbidities

`;
    } else {
      return `# Define variables
# Outcome: ${spec.analyses.includes('mortality') ? 'In-hospital mortality' : 'Primary outcome'}
# Exposure: ${spec.condition || 'Primary exposure'}
# Confounders: Age, sex, comorbidities

`;
    }
  }

  private generateAnalysis(language: string, format: string, analysis: string, spec: AnalysisSpec): string {
    const analysisLower = analysis.toLowerCase();
    
    if (analysisLower.includes('demographic')) {
      return this.generateDemographicsAnalysis(language, format);
    } else if (analysisLower.includes('mortality')) {
      return this.generateMortalityAnalysis(language, format);
    } else if (analysisLower.includes('length of stay')) {
      return this.generateLOSAnalysis(language, format);
    } else if (analysisLower.includes('table one')) {
      return this.generateTableOne(language, format);
    }
    
    return `# Analysis: ${analysis} (not implemented)\n\n`;
  }

  private generateDemographicsAnalysis(language: string, format: string): string {
    if (language === 'R') {
      return `# Demographics Analysis
demo_summary <- cohort %>%
  summarise(
    n_patients = n_distinct(subject_id),
    mean_age = mean(age, na.rm = TRUE),
    sd_age = sd(age, na.rm = TRUE),
    pct_female = sum(gender == "F") / n() * 100,
    pct_male = sum(gender == "M") / n() * 100
  )

print(demo_summary)

`;
    } else {
      return `# Demographics Analysis
demo_summary = {
    'n_patients': cohort['subject_id'].nunique(),
    'mean_age': cohort['age'].mean(),
    'sd_age': cohort['age'].std(),
    'pct_female': (cohort['gender'] == 'F').sum() / len(cohort) * 100,
    'pct_male': (cohort['gender'] == 'M').sum() / len(cohort) * 100
}

print("Demographics Summary:")
for key, value in demo_summary.items():
    print(f"{key}: {value:.2f}")

`;
    }
  }

  private generateMortalityAnalysis(language: string, format: string): string {
    if (language === 'R') {
      return `# Mortality Analysis
mortality_summary <- cohort %>%
  group_by(age_group) %>%
  summarise(
    n = n(),
    deaths = sum(hospital_expire_flag == 1),
    mortality_rate = mean(hospital_expire_flag) * 100,
    .groups = "drop"
  )

print(mortality_summary)

# Overall mortality
overall_mortality <- mean(cohort$hospital_expire_flag) * 100
cat(sprintf("Overall mortality rate: %.1f%%\\n", overall_mortality))

`;
    } else {
      return `# Mortality Analysis
mortality_summary = cohort.groupby('age_group').agg({
    'subject_id': 'count',
    'hospital_expire_flag': ['sum', 'mean']
}).round(3)

mortality_summary.columns = ['n', 'deaths', 'mortality_rate']
mortality_summary['mortality_pct'] = mortality_summary['mortality_rate'] * 100

print(mortality_summary)

# Overall mortality
overall_mortality = cohort['hospital_expire_flag'].mean() * 100
print(f"\\nOverall mortality rate: {overall_mortality:.1f}%")

`;
    }
  }

  private generateLOSAnalysis(language: string, format: string): string {
    if (language === 'R') {
      return `# Length of Stay Analysis
los_summary <- cohort %>%
  mutate(los_days = as.numeric(difftime(dischtime, admittime, units = "days"))) %>%
  filter(los_days > 0 & los_days < 365) %>%
  summarise(
    mean_los = mean(los_days, na.rm = TRUE),
    median_los = median(los_days, na.rm = TRUE),
    q25_los = quantile(los_days, 0.25, na.rm = TRUE),
    q75_los = quantile(los_days, 0.75, na.rm = TRUE)
  )

print(los_summary)

`;
    } else {
      return `# Length of Stay Analysis
cohort['los_days'] = (cohort['dischtime'] - cohort['admittime']).dt.total_seconds() / 86400
los_data = cohort[(cohort['los_days'] > 0) & (cohort['los_days'] < 365)]

los_summary = {
    'mean_los': los_data['los_days'].mean(),
    'median_los': los_data['los_days'].median(),
    'q25_los': los_data['los_days'].quantile(0.25),
    'q75_los': los_data['los_days'].quantile(0.75)
}

print("Length of Stay Summary:")
for key, value in los_summary.items():
    print(f"{key}: {value:.1f} days")

`;
    }
  }

  private generateTableOne(language: string, format: string): string {
    if (language === 'R') {
      return `# Create Table One
library(tableone)

# Define variables
vars <- c("age", "gender", "ethnicity", "los_days")
catVars <- c("gender", "ethnicity")

# Create table stratified by outcome
table1 <- CreateTableOne(
  vars = vars,
  strata = "hospital_expire_flag",
  data = cohort,
  factorVars = catVars
)

print(table1, showAllLevels = TRUE, smd = TRUE)

`;
    } else {
      return `# Create Table One
from tableone import TableOne

# Define variables
columns = ["age", "gender", "ethnicity", "los_days"]
categorical = ["gender", "ethnicity"]

# Create table stratified by outcome
table1 = TableOne(
    cohort,
    columns=columns,
    categorical=categorical,
    groupby="hospital_expire_flag",
    pval=True
)

print(table1.tabulate(tablefmt="grid"))

`;
    }
  }

  private generateVisualization(language: string, viz: string, spec: AnalysisSpec): string {
    const vizLower = viz.toLowerCase();
    
    if (vizLower.includes('age distribution')) {
      return this.generateAgeDistributionPlot(language);
    } else if (vizLower.includes('mortality')) {
      return this.generateMortalityPlot(language);
    }
    
    return `# Visualization: ${viz} (not implemented)\n\n`;
  }

  private generateAgeDistributionPlot(language: string): string {
    if (language === 'R') {
      return `# Age Distribution Plot
p_age <- ggplot(cohort, aes(x = age, fill = factor(hospital_expire_flag))) +
  geom_histogram(binwidth = 5, alpha = 0.8) +
  scale_fill_manual(values = c("0" = "#00BFC4", "1" = "#F8766D"),
                    labels = c("Survived", "Died")) +
  labs(title = "Age Distribution by Outcome",
       x = "Age (years)", y = "Count", fill = "Outcome") +
  theme_minimal()

print(p_age)
ggsave("age_distribution.png", p_age, width = 10, height = 6)

`;
    } else {
      return `# Age Distribution Plot
plt.figure(figsize=(10, 6))
survived = cohort[cohort['hospital_expire_flag'] == 0]['age']
died = cohort[cohort['hospital_expire_flag'] == 1]['age']

plt.hist([survived, died], bins=20, alpha=0.8, label=['Survived', 'Died'])
plt.xlabel('Age (years)')
plt.ylabel('Count')
plt.title('Age Distribution by Outcome')
plt.legend()
plt.savefig('age_distribution.png')
plt.show()

`;
    }
  }

  private generateMortalityPlot(language: string): string {
    if (language === 'R') {
      return `# Mortality by Age Group Plot
mortality_plot <- cohort %>%
  mutate(age_group = cut(age, breaks = c(0, 40, 60, 80, Inf),
                         labels = c("<40", "40-59", "60-79", "80+"))) %>%
  group_by(age_group) %>%
  summarise(mortality_rate = mean(hospital_expire_flag) * 100, .groups = "drop")

p_mortality <- ggplot(mortality_plot, aes(x = age_group, y = mortality_rate)) +
  geom_bar(stat = "identity", fill = "#00BFC4") +
  geom_text(aes(label = sprintf("%.1f%%", mortality_rate)), vjust = -0.5) +
  labs(title = "Mortality Rate by Age Group",
       x = "Age Group", y = "Mortality Rate (%)") +
  theme_minimal()

print(p_mortality)
ggsave("mortality_by_age.png", p_mortality, width = 8, height = 6)

`;
    } else {
      return `# Mortality by Age Group Plot
cohort['age_group'] = pd.cut(cohort['age'], bins=[0, 40, 60, 80, float('inf')],
                             labels=['<40', '40-59', '60-79', '80+'])

mortality_by_age = cohort.groupby('age_group')['hospital_expire_flag'].mean() * 100

plt.figure(figsize=(8, 6))
mortality_by_age.plot(kind='bar', color='#00BFC4')
plt.ylabel('Mortality Rate (%)')
plt.xlabel('Age Group')
plt.title('Mortality Rate by Age Group')
plt.xticks(rotation=0)

for i, v in enumerate(mortality_by_age):
    plt.text(i, v + 1, f'{v:.1f}%', ha='center')

plt.savefig('mortality_by_age.png')
plt.show()

`;
    }
  }

  private generateSensitivityAnalysis(language: string, spec: AnalysisSpec): string {
    if (language === 'R') {
      return `# Sensitivity Analysis
# 1. Exclude patients with very short LOS (<1 day)
sensitivity_cohort <- cohort %>%
  filter(los_days >= 1)

cat("Sensitivity analysis: Excluding LOS <1 day\\n")
cat(sprintf("Original cohort: %d patients\\n", n_distinct(cohort$subject_id)))
cat(sprintf("Sensitivity cohort: %d patients\\n", n_distinct(sensitivity_cohort$subject_id)))

`;
    } else {
      return `# Sensitivity Analysis
# 1. Exclude patients with very short LOS (<1 day)
sensitivity_cohort = cohort[cohort['los_days'] >= 1]

print("Sensitivity analysis: Excluding LOS <1 day")
print(f"Original cohort: {cohort['subject_id'].nunique()} patients")
print(f"Sensitivity cohort: {sensitivity_cohort['subject_id'].nunique()} patients")

`;
    }
  }

  private generateSaveResults(language: string): string {
    if (language === 'R') {
      return `# Save results
write_csv(cohort, "cohort_data.csv")
write_csv(demo_summary, "demographics_summary.csv")
if (exists("mortality_summary")) write_csv(mortality_summary, "mortality_summary.csv")
if (exists("table1")) write.csv(table1$ContTable, "table_one.csv")

cat("\\nAnalysis complete! Results saved to CSV files.\\n")
`;
    } else {
      return `# Save results
cohort.to_csv("cohort_data.csv", index=False)
pd.DataFrame([demo_summary]).to_csv("demographics_summary.csv", index=False)
if 'mortality_summary' in locals():
    mortality_summary.to_csv("mortality_summary.csv")
if 'table1' in locals():
    table1.to_csv("table_one.csv")

print("\\nAnalysis complete! Results saved to CSV files.")
`;
    }
  }

  private generateErrorCode(validation: any, language: string): string {
    const comment = language === 'R' ? '#' : '#';
    let code = `${comment} VALIDATION ERRORS\n`;
    code += `${comment} The requested analysis cannot be completed:\n\n`;
    
    validation.errors.forEach((error: string) => {
      code += `${comment} ERROR: ${error}\n`;
    });
    
    validation.warnings.forEach((warning: string) => {
      code += `${comment} WARNING: ${warning}\n`;
    });
    
    code += `\n${comment} Suggestions:\n`;
    validation.suggestions.forEach((suggestion: string) => {
      code += `${comment} - ${suggestion}\n`;
    });
    
    return code;
  }

  private getRequiredLibraries(language: string, spec: AnalysisSpec): string[] {
    if (language === 'R') {
      const libs = ['tidyverse', 'lubridate'];
      if (spec.visualizations.length > 0) {
        libs.push('ggplot2');
      }
      if (spec.analyses.some(a => a.toLowerCase().includes('table'))) {
        libs.push('tableone');
      }
      return libs;
    } else {
      const libs = ['pandas', 'numpy', 'warnings'];
      if (spec.visualizations.length > 0) {
        libs.push('matplotlib', 'seaborn');
      }
      if (spec.analyses.some(a => a.toLowerCase().includes('table'))) {
        libs.push('tableone');
      }
      return libs;
    }
  }
}

export class IntegratedAnalysisPipeline {
  private codeGenerator = new EnhancedCodeGenerator();

  parseEnhancedQuery(query: string): AnalysisSpec {
    const queryLower = query.toLowerCase();
    
    // Extract condition
    let condition: string | undefined;
    let conditionCodes: string[] = [];
    
    for (const [cond, info] of Object.entries(CONDITION_KNOWLEDGE)) {
      if (queryLower.includes(cond)) {
        condition = cond;
        conditionCodes = info.icd10_codes;
        break;
      }
    }

    // Extract analyses
    const analyses: string[] = [];
    const analysisKeywords = {
      demographics: ['demographic', 'age', 'gender', 'population'],
      mortality: ['mortality', 'death', 'survival'],
      'length of stay': ['length of stay', 'los', 'duration'],
      medications: ['medication', 'drug', 'treatment'],
      'table one': ['table one', 'table 1', 'baseline']
    };

    for (const [analysis, keywords] of Object.entries(analysisKeywords)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        analyses.push(analysis);
      }
    }

    // Extract visualizations
    const visualizations: string[] = [];
    if (queryLower.includes('visualiz') || queryLower.includes('plot') || queryLower.includes('chart')) {
      if (queryLower.includes('age')) visualizations.push('age distribution');
      if (queryLower.includes('mortality')) visualizations.push('mortality by age');
    }

    // Extract cohort criteria
    const cohortCriteria = {
      inclusion: [] as string[],
      exclusion: [] as string[]
    };

    // Age criteria
    const ageMatch = query.match(/age\s*(?:>|over|above)\s*(\d+)/i);
    if (ageMatch) {
      cohortCriteria.inclusion.push(`Age > ${ageMatch[1]}`);
    }

    // CDC sepsis criteria
    const entities = [];
    if (queryLower.includes('cdc') && condition === 'sepsis') {
      entities.push({ text: 'CDC', type: 'guideline' });
    }

    if (condition) {
      entities.push({
        text: condition,
        type: 'condition',
        codes: conditionCodes
      });
    }

    return {
      query,
      condition,
      entities,
      analyses: analyses.length > 0 ? analyses : ['demographics'],
      visualizations,
      cohort_criteria: cohortCriteria
    };
  }

  generateCode(
    query: string,
    datasetInfo?: DatasetInfo,
    language: 'R' | 'Python' = 'R',
    includeSTROBE: boolean = true
  ): {
    spec: AnalysisSpec;
    validation?: any;
    code: string;
  } {
    const spec = this.parseEnhancedQuery(query);
    
    let validation;
    if (datasetInfo) {
      const validator = new QueryValidator(datasetInfo);
      validation = validator.validate(spec);
    }

    const code = this.codeGenerator.generateResearchCode(
      spec,
      language,
      datasetInfo,
      includeSTROBE
    );

    return { spec, validation, code };
  }
}