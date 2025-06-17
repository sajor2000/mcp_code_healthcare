import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';

export class CohortBuilderTool implements Tool {
  name = 'build_research_cohort';
  description = 'Build research cohorts using OMOP/CLIF data with complex inclusion/exclusion criteria';
  
  inputSchema = {
    type: 'object',
    properties: {
      cohort_name: { 
        type: 'string',
        description: 'Name for the cohort definition'
      },
      inclusion_criteria: {
        type: 'object',
        properties: {
          diagnoses: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'ICD-10, SNOMED, or condition names'
          },
          procedures: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Procedure codes or names'
          },
          medications: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Medication names or RxNorm codes'
          },
          lab_values: { 
            type: 'array', 
            items: { 
              type: 'object',
              properties: {
                test: { type: 'string' },
                operator: { type: 'string', enum: ['>', '<', '>=', '<=', '=', '!='] },
                value: { type: 'number' },
                unit: { type: 'string' }
              }
            },
            description: 'Laboratory value criteria'
          },
          demographics: {
            type: 'object',
            properties: {
              age_min: { type: 'number' },
              age_max: { type: 'number' },
              gender: { type: 'array', items: { type: 'string' } },
              race: { type: 'array', items: { type: 'string' } }
            }
          },
          time_window: { 
            type: 'object',
            properties: {
              start_date: { type: 'string', format: 'date' },
              end_date: { type: 'string', format: 'date' },
              index_event: { type: 'string' },
              lookback_days: { type: 'number' },
              followup_days: { type: 'number' }
            }
          },
          settings: {
            type: 'array',
            items: { 
              type: 'string', 
              enum: ['inpatient', 'outpatient', 'emergency', 'icu', 'observation'] 
            }
          }
        }
      },
      exclusion_criteria: { 
        type: 'object',
        description: 'Same structure as inclusion_criteria'
      },
      data_model: { 
        type: 'string', 
        enum: ['OMOP', 'CLIF'],
        description: 'Target data model'
      },
      temporal_logic: {
        type: 'object',
        properties: {
          sequence_requirements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                event1: { type: 'string' },
                event2: { type: 'string' },
                relationship: { type: 'string', enum: ['before', 'after', 'concurrent'] },
                window_days: { type: 'number' }
              }
            }
          }
        }
      }
    },
    required: ['cohort_name', 'inclusion_criteria', 'data_model']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { 
      cohort_name, 
      inclusion_criteria, 
      exclusion_criteria = {}, 
      data_model,
      temporal_logic = {}
    } = args;
    
    // 1. Validate and expand criteria
    const expandedCriteria = await this.expandCriteria(inclusion_criteria, exclusion_criteria);
    
    // 2. Generate SQL based on data model
    const sql = data_model === 'OMOP' 
      ? await this.generateOMOPCohortSQL(expandedCriteria.inclusion, expandedCriteria.exclusion, temporal_logic)
      : await this.generateCLIFCohortSQL(expandedCriteria.inclusion, expandedCriteria.exclusion, temporal_logic);
    
    // 3. Create phenotype definition
    const phenotype = await this.createPhenotypeDefinition({
      name: cohort_name,
      inclusion: expandedCriteria.inclusion,
      exclusion: expandedCriteria.exclusion,
      temporal: temporal_logic
    });
    
    // 4. Generate validation checks
    const validationChecks = this.generateValidationChecks(phenotype);
    
    // 5. Estimate sample size
    const sampleSizeEstimate = await this.estimateSampleSize(sql, data_model);
    
    // 6. Create implementation guide
    const implementationGuide = this.createImplementationGuide(cohort_name, data_model);
    
    return {
      cohort_name,
      sql_query: sql,
      phenotype_definition: phenotype,
      validation_checks: validationChecks,
      estimated_sample_size: sampleSizeEstimate,
      implementation_guide: implementationGuide,
      expanded_criteria: expandedCriteria,
      data_quality_checks: this.generateDataQualityChecks(expandedCriteria)
    };
  }
  
  private async expandCriteria(inclusion: any, exclusion: any) {
    // Expand diagnoses to include all relevant codes
    const expandedInclusion = { ...inclusion };
    const expandedExclusion = { ...exclusion };
    
    if (inclusion.diagnoses) {
      expandedInclusion.diagnosis_codes = await this.expandDiagnosisCodes(inclusion.diagnoses);
    }
    
    if (inclusion.medications) {
      expandedInclusion.medication_codes = await this.expandMedicationCodes(inclusion.medications);
    }
    
    if (inclusion.procedures) {
      expandedInclusion.procedure_codes = await this.expandProcedureCodes(inclusion.procedures);
    }
    
    return {
      inclusion: expandedInclusion,
      exclusion: expandedExclusion
    };
  }
  
  private async expandDiagnosisCodes(diagnoses: string[]): Promise<any> {
    const expanded = {
      icd10: [],
      snomed: [],
      descriptions: []
    };
    
    for (const diagnosis of diagnoses) {
      // Check if it's already a code or needs lookup
      if (/^[A-Z]\d{2}/.test(diagnosis)) {
        // ICD-10 code
        expanded.icd10.push(diagnosis);
      } else if (/^\d{6,}$/.test(diagnosis)) {
        // SNOMED code
        expanded.snomed.push(diagnosis);
      } else {
        // Search for condition
        const codes = await this.searchConditionCodes(diagnosis);
        expanded.icd10.push(...codes.icd10);
        expanded.snomed.push(...codes.snomed);
        expanded.descriptions.push(diagnosis);
      }
    }
    
    return expanded;
  }
  
  private async generateOMOPCohortSQL(inclusion: any, exclusion: any, temporal: any): Promise<string> {
    let sql = `-- OMOP CDM Cohort Definition: ${inclusion.cohort_name || 'Research Cohort'}
-- Generated by Healthcare Research MCP Server

WITH index_events AS (
  SELECT DISTINCT 
    p.person_id,
    p.birth_datetime,
    p.gender_concept_id,
    p.race_concept_id,
    MIN(co.condition_start_date) as index_date
  FROM person p`;
    
    // Add diagnosis criteria
    if (inclusion.diagnosis_codes?.icd10?.length > 0 || inclusion.diagnosis_codes?.snomed?.length > 0) {
      sql += `
  INNER JOIN condition_occurrence co ON p.person_id = co.person_id
  INNER JOIN concept c ON co.condition_concept_id = c.concept_id
  WHERE (`;
      
      const conditions = [];
      if (inclusion.diagnosis_codes.icd10?.length > 0) {
        conditions.push(`c.concept_code IN (${inclusion.diagnosis_codes.icd10.map(c => `'${c}'`).join(',')})`);
      }
      if (inclusion.diagnosis_codes.snomed?.length > 0) {
        conditions.push(`c.concept_id IN (${inclusion.diagnosis_codes.snomed.join(',')})`);
      }
      
      sql += conditions.join(' OR ');
      sql += ')';
    } else {
      sql += `
  WHERE 1=1`;
    }
    
    // Add demographic criteria
    if (inclusion.demographics) {
      if (inclusion.demographics.age_min || inclusion.demographics.age_max) {
        sql += `
    AND DATE_DIFF('year', p.birth_datetime, CURRENT_DATE) BETWEEN ${inclusion.demographics.age_min || 0} AND ${inclusion.demographics.age_max || 120}`;
      }
      if (inclusion.demographics.gender?.length > 0) {
        sql += `
    AND p.gender_concept_id IN (SELECT concept_id FROM concept WHERE concept_name IN (${inclusion.demographics.gender.map(g => `'${g}'`).join(',')}))`;
      }
    }
    
    // Add time window
    if (inclusion.time_window) {
      if (inclusion.time_window.start_date) {
        sql += `
    AND co.condition_start_date >= '${inclusion.time_window.start_date}'`;
      }
      if (inclusion.time_window.end_date) {
        sql += `
    AND co.condition_start_date <= '${inclusion.time_window.end_date}'`;
      }
    }
    
    sql += `
  GROUP BY p.person_id, p.birth_datetime, p.gender_concept_id, p.race_concept_id
),`;
    
    // Add medication requirements
    if (inclusion.medication_codes?.length > 0) {
      sql += `
medication_criteria AS (
  SELECT DISTINCT de.person_id
  FROM drug_exposure de
  INNER JOIN index_events ie ON de.person_id = ie.person_id
  INNER JOIN concept c ON de.drug_concept_id = c.concept_id
  WHERE c.concept_name IN (${inclusion.medications.map(m => `'${m}'`).join(',')})
    AND de.drug_exposure_start_date BETWEEN 
        DATEADD(day, ${temporal.lookback_days || -365}, ie.index_date) 
        AND DATEADD(day, ${temporal.followup_days || 30}, ie.index_date)
),`;
    }
    
    // Add procedure requirements
    if (inclusion.procedure_codes?.length > 0) {
      sql += `
procedure_criteria AS (
  SELECT DISTINCT po.person_id
  FROM procedure_occurrence po
  INNER JOIN index_events ie ON po.person_id = ie.person_id
  WHERE po.procedure_concept_id IN (
    SELECT concept_id FROM concept 
    WHERE concept_code IN (${inclusion.procedures.map(p => `'${p}'`).join(',')})
  )
),`;
    }
    
    // Add lab value criteria
    if (inclusion.lab_values?.length > 0) {
      sql += `
lab_criteria AS (
  SELECT DISTINCT m.person_id
  FROM measurement m
  INNER JOIN index_events ie ON m.person_id = ie.person_id
  WHERE (`;
      
      const labConditions = inclusion.lab_values.map(lab => `
    (m.measurement_concept_id IN (
      SELECT concept_id FROM concept WHERE concept_name LIKE '%${lab.test}%'
    ) AND m.value_as_number ${lab.operator} ${lab.value})`);
      
      sql += labConditions.join(' OR ');
      sql += `
  )
),`;
    }
    
    // Final cohort selection
    sql += `
eligible_cohort AS (
  SELECT DISTINCT ie.*
  FROM index_events ie`;
    
    // Join required tables
    if (inclusion.medication_codes?.length > 0) {
      sql += `
  INNER JOIN medication_criteria mc ON ie.person_id = mc.person_id`;
    }
    if (inclusion.procedure_codes?.length > 0) {
      sql += `
  INNER JOIN procedure_criteria pc ON ie.person_id = pc.person_id`;
    }
    if (inclusion.lab_values?.length > 0) {
      sql += `
  INNER JOIN lab_criteria lc ON ie.person_id = lc.person_id`;
    }
    
    // Add exclusions
    if (exclusion.diagnosis_codes?.length > 0) {
      sql += `
  WHERE NOT EXISTS (
    SELECT 1 FROM condition_occurrence co_ex
    WHERE co_ex.person_id = ie.person_id
    AND co_ex.condition_concept_id IN (
      SELECT concept_id FROM concept 
      WHERE concept_code IN (${exclusion.diagnoses.map(d => `'${d}'`).join(',')})
    )
  )`;
    }
    
    sql += `
)
SELECT 
  person_id,
  index_date,
  DATE_DIFF('year', birth_datetime, index_date) as age_at_index,
  gender_concept_id,
  race_concept_id
FROM eligible_cohort
ORDER BY person_id;`;
    
    return sql;
  }
  
  private async generateCLIFCohortSQL(inclusion: any, exclusion: any, temporal: any): Promise<string> {
    let sql = `-- CLIF Format Cohort Definition: ${inclusion.cohort_name || 'Research Cohort'}
-- Generated for longitudinal ICU data analysis

WITH icu_admissions AS (
  SELECT DISTINCT
    p.patient_id,
    p.birth_date,
    p.gender,
    a.admission_id,
    a.admission_time,
    a.discharge_time,
    a.admission_type
  FROM patients p
  INNER JOIN admissions a ON p.patient_id = a.patient_id
  WHERE a.admission_type IN ('ICU', 'MICU', 'SICU', 'CCU')`;
    
    // Add time window for CLIF
    if (inclusion.time_window) {
      if (inclusion.time_window.start_date) {
        sql += `
    AND a.admission_time >= '${inclusion.time_window.start_date}'`;
      }
      if (inclusion.time_window.end_date) {
        sql += `
    AND a.admission_time <= '${inclusion.time_window.end_date}'`;
      }
    }
    
    sql += `
),`;
    
    // Add diagnosis criteria for CLIF
    if (inclusion.diagnosis_codes?.icd10?.length > 0) {
      sql += `
diagnosis_criteria AS (
  SELECT DISTINCT ia.patient_id, ia.admission_id
  FROM icu_admissions ia
  INNER JOIN diagnoses d ON ia.patient_id = d.patient_id 
    AND d.diagnosis_time BETWEEN ia.admission_time AND ia.discharge_time
  WHERE d.icd10_code IN (${inclusion.diagnosis_codes.icd10.map(c => `'${c}'`).join(',')})
),`;
    }
    
    // Add vital signs criteria
    if (inclusion.lab_values?.some(v => ['heart_rate', 'blood_pressure', 'temperature'].includes(v.test))) {
      sql += `
vital_criteria AS (
  SELECT DISTINCT v.patient_id, ia.admission_id
  FROM vitals v
  INNER JOIN icu_admissions ia ON v.patient_id = ia.patient_id
    AND v.measurement_time BETWEEN ia.admission_time AND ia.discharge_time
  WHERE`;
      
      const vitalConditions = [];
      inclusion.lab_values.forEach(lab => {
        if (['heart_rate', 'blood_pressure', 'temperature'].includes(lab.test)) {
          vitalConditions.push(`(v.${lab.test} ${lab.operator} ${lab.value})`);
        }
      });
      
      sql += vitalConditions.join(' OR ');
      sql += `
),`;
    }
    
    // Add medication administration for CLIF
    if (inclusion.medication_codes?.length > 0) {
      sql += `
medication_criteria AS (
  SELECT DISTINCT ma.patient_id, ia.admission_id
  FROM medication_administration ma
  INNER JOIN icu_admissions ia ON ma.patient_id = ia.patient_id
    AND ma.administration_time BETWEEN ia.admission_time AND ia.discharge_time
  WHERE ma.medication_name IN (${inclusion.medications.map(m => `'${m}'`).join(',')})
),`;
    }
    
    // Add device/procedure criteria
    if (inclusion.procedures?.some(p => ['mechanical_ventilation', 'dialysis', 'ecmo'].includes(p))) {
      sql += `
device_criteria AS (
  SELECT DISTINCT d.patient_id, ia.admission_id
  FROM devices d
  INNER JOIN icu_admissions ia ON d.patient_id = ia.patient_id
    AND d.start_time BETWEEN ia.admission_time AND ia.discharge_time
  WHERE d.device_type IN (${inclusion.procedures.filter(p => 
    ['mechanical_ventilation', 'dialysis', 'ecmo'].includes(p)
  ).map(p => `'${p}'`).join(',')})
),`;
    }
    
    // Final cohort assembly
    sql += `
final_cohort AS (
  SELECT DISTINCT
    ia.patient_id,
    ia.admission_id,
    ia.admission_time as index_time,
    EXTRACT(YEAR FROM AGE(ia.admission_time, ia.birth_date)) as age_at_admission,
    ia.gender
  FROM icu_admissions ia`;
    
    // Join required criteria
    if (inclusion.diagnosis_codes?.icd10?.length > 0) {
      sql += `
  INNER JOIN diagnosis_criteria dc ON ia.patient_id = dc.patient_id 
    AND ia.admission_id = dc.admission_id`;
    }
    
    // Add severity score requirements if specified
    if (inclusion.lab_values?.some(v => ['sofa', 'apache'].includes(v.test))) {
      sql += `
  INNER JOIN severity_scores ss ON ia.patient_id = ss.patient_id
    AND ia.admission_id = ss.admission_id
  WHERE`;
      
      const scoreConditions = [];
      inclusion.lab_values.forEach(lab => {
        if (['sofa', 'apache'].includes(lab.test)) {
          scoreConditions.push(`ss.${lab.test}_score ${lab.operator} ${lab.value}`);
        }
      });
      
      sql += scoreConditions.join(' AND ');
    }
    
    sql += `
)
SELECT 
  patient_id,
  admission_id,
  index_time,
  age_at_admission,
  gender,
  -- Add outcome window
  index_time + INTERVAL '${temporal.followup_days || 30} days' as outcome_window_end
FROM final_cohort
ORDER BY patient_id, admission_id;`;
    
    return sql;
  }
  
  private async createPhenotypeDefinition(params: any) {
    return {
      name: params.name,
      version: '1.0',
      created_date: new Date().toISOString(),
      description: `Phenotype definition for ${params.name}`,
      inclusion_criteria: this.formatCriteria(params.inclusion),
      exclusion_criteria: this.formatCriteria(params.exclusion),
      temporal_relationships: params.temporal,
      validation_status: 'pending',
      expected_prevalence: 'to be determined',
      clinical_rationale: this.generateClinicalRationale(params)
    };
  }
  
  private formatCriteria(criteria: any) {
    const formatted = {
      diagnoses: criteria.diagnosis_codes || {},
      procedures: criteria.procedure_codes || {},
      medications: criteria.medication_codes || {},
      laboratory: criteria.lab_values || [],
      demographics: criteria.demographics || {},
      care_settings: criteria.settings || []
    };
    
    return formatted;
  }
  
  private generateClinicalRationale(params: any) {
    return `This phenotype identifies patients based on the following clinical logic:
    - Primary conditions: ${params.inclusion.diagnoses?.join(', ') || 'Not specified'}
    - Required procedures: ${params.inclusion.procedures?.join(', ') || 'None'}
    - Medication requirements: ${params.inclusion.medications?.join(', ') || 'None'}
    - Laboratory criteria: ${params.inclusion.lab_values?.length || 0} criteria specified
    - Temporal logic: ${params.temporal?.sequence_requirements?.length || 0} temporal relationships`;
  }
  
  private generateValidationChecks(phenotype: any): any[] {
    return [
      {
        check_name: 'Code validity',
        check_type: 'data_quality',
        query: 'Verify all diagnosis codes exist in vocabulary',
        expected_result: 'All codes valid'
      },
      {
        check_name: 'Temporal consistency',
        check_type: 'logic',
        query: 'Check that event sequences are logically possible',
        expected_result: 'No impossible temporal relationships'
      },
      {
        check_name: 'Cohort size',
        check_type: 'feasibility',
        query: 'Estimate cohort size',
        expected_result: 'Sufficient sample size for analysis'
      },
      {
        check_name: 'Data completeness',
        check_type: 'data_quality',
        query: 'Check for missing required variables',
        expected_result: '<10% missing for key variables'
      }
    ];
  }
  
  private async estimateSampleSize(sql: string, dataModel: string): Promise<any> {
    // In production, this would run a count query
    return {
      estimated_n: 'Run query to determine',
      confidence_interval: 'Not available',
      data_source: dataModel,
      estimation_method: 'Direct query',
      notes: 'Execute SQL with COUNT(*) to get actual sample size'
    };
  }
  
  private createImplementationGuide(cohortName: string, dataModel: string): any {
    return {
      steps: [
        {
          step: 1,
          action: 'Review and validate SQL query',
          details: 'Ensure query syntax matches your database system'
        },
        {
          step: 2,
          action: 'Test on sample data',
          details: 'Run on 1% sample to verify logic'
        },
        {
          step: 3,
          action: 'Check cohort characteristics',
          details: 'Generate Table 1 statistics'
        },
        {
          step: 4,
          action: 'Validate against chart review',
          details: 'Manual validation on random sample'
        },
        {
          step: 5,
          action: 'Document and version',
          details: 'Save cohort definition with version control'
        }
      ],
      code_snippets: {
        python: this.generatePythonSnippet(cohortName, dataModel),
        r: this.generateRSnippet(cohortName, dataModel)
      }
    };
  }
  
  private generatePythonSnippet(cohortName: string, dataModel: string): string {
    return `# Python implementation for ${cohortName}
import pandas as pd
from sqlalchemy import create_engine

# Connect to ${dataModel} database
engine = create_engine('postgresql://user:password@host:port/database')

# Execute cohort query
cohort_df = pd.read_sql(cohort_sql, engine)

# Basic cohort statistics
print(f"Cohort size: {len(cohort_df)}")
print(f"Age distribution: {cohort_df['age_at_index'].describe()}")
print(f"Gender distribution: {cohort_df['gender'].value_counts()}")

# Save cohort
cohort_df.to_csv('${cohortName.toLowerCase().replace(' ', '_')}_cohort.csv', index=False)`;
  }
  
  private generateRSnippet(cohortName: string, dataModel: string): string {
    return `# R implementation for ${cohortName}
library(DBI)
library(tidyverse)

# Connect to ${dataModel} database
con <- dbConnect(RPostgres::Postgres(), 
                 host = "host",
                 port = 5432,
                 dbname = "database",
                 user = "user",
                 password = "password")

# Execute cohort query
cohort <- dbGetQuery(con, cohort_sql)

# Basic cohort statistics
summary(cohort$age_at_index)
table(cohort$gender)

# Save cohort
write_csv(cohort, "${cohortName.toLowerCase().replace(' ', '_')}_cohort.csv")`;
  }
  
  private generateDataQualityChecks(criteria: any): any[] {
    return [
      {
        check: 'Diagnosis code coverage',
        query: 'Check percentage of patients with valid diagnosis codes',
        threshold: '>95%'
      },
      {
        check: 'Temporal data availability',
        query: 'Verify timestamps for all events',
        threshold: '>99% non-null'
      },
      {
        check: 'Laboratory value ranges',
        query: 'Validate lab values within plausible ranges',
        threshold: '<1% outliers'
      }
    ];
  }
  
  private async searchConditionCodes(conditionName: string): Promise<any> {
    // In production, this would search the ontology database
    const commonConditions = {
      'sepsis': { icd10: ['A41.9', 'R65.20'], snomed: ['91302008'] },
      'pneumonia': { icd10: ['J18.9'], snomed: ['233604007'] },
      'heart failure': { icd10: ['I50.9'], snomed: ['84114007'] }
    };
    
    return commonConditions[conditionName.toLowerCase()] || { icd10: [], snomed: [] };
  }
  
  private async expandMedicationCodes(medications: string[]): Promise<any> {
    // Expand medication names to codes
    return medications;
  }
  
  private async expandProcedureCodes(procedures: string[]): Promise<any> {
    // Expand procedure names to codes
    return procedures;
  }
}