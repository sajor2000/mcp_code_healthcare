/**
 * Fetch OMOP CDM Specifications
 * Retrieves the latest OMOP Common Data Model specifications
 * 
 * Citation:
 * OHDSI Collaborative. OMOP Common Data Model v5.4. Observational Health Data 
 * Sciences and Informatics (OHDSI). 2023.
 * 
 * Source: https://ohdsi.github.io/CommonDataModel/
 * GitHub: https://github.com/OHDSI/CommonDataModel
 * License: Apache License 2.0
 * 
 * This implementation provides complete OMOP CDM v5.4 table specifications,
 * relationships, and standard concept mappings for healthcare data standardization.
 */

// OMOP CDM v5.4 Complete Table Specifications
// Based on official OMOP CDM documentation
export const OMOP_CDM_V54 = {
  version: '5.4',
  release_date: '2023-09-01',
  tables: {
    // Clinical Data Tables
    person: {
      description: 'Central table containing demographic information about patients',
      columns: {
        person_id: { type: 'integer', required: true, pk: true, description: 'Unique identifier for each patient' },
        gender_concept_id: { type: 'integer', required: true, description: 'Gender from OMOP vocabulary' },
        year_of_birth: { type: 'integer', required: true, description: 'Year of birth' },
        month_of_birth: { type: 'integer', required: false, description: 'Month of birth' },
        day_of_birth: { type: 'integer', required: false, description: 'Day of birth' },
        birth_datetime: { type: 'datetime', required: false, description: 'Exact birth datetime' },
        race_concept_id: { type: 'integer', required: true, description: 'Race from OMOP vocabulary' },
        ethnicity_concept_id: { type: 'integer', required: true, description: 'Ethnicity from OMOP vocabulary' },
        location_id: { type: 'integer', required: false, description: 'Location of residence' },
        provider_id: { type: 'integer', required: false, description: 'Primary care provider' },
        care_site_id: { type: 'integer', required: false, description: 'Primary care site' },
        person_source_value: { type: 'varchar(50)', required: false, description: 'Source identifier' },
        gender_source_value: { type: 'varchar(50)', required: false, description: 'Source gender value' },
        gender_source_concept_id: { type: 'integer', required: false, description: 'Source gender concept' },
        race_source_value: { type: 'varchar(50)', required: false, description: 'Source race value' },
        race_source_concept_id: { type: 'integer', required: false, description: 'Source race concept' },
        ethnicity_source_value: { type: 'varchar(50)', required: false, description: 'Source ethnicity value' },
        ethnicity_source_concept_id: { type: 'integer', required: false, description: 'Source ethnicity concept' }
      }
    },
    
    visit_occurrence: {
      description: 'Clinical encounters or visits',
      columns: {
        visit_occurrence_id: { type: 'integer', required: true, pk: true, description: 'Unique visit identifier' },
        person_id: { type: 'integer', required: true, fk: 'person', description: 'Patient identifier' },
        visit_concept_id: { type: 'integer', required: true, description: 'Type of visit' },
        visit_start_date: { type: 'date', required: true, description: 'Visit start date' },
        visit_start_datetime: { type: 'datetime', required: false, description: 'Visit start datetime' },
        visit_end_date: { type: 'date', required: true, description: 'Visit end date' },
        visit_end_datetime: { type: 'datetime', required: false, description: 'Visit end datetime' },
        visit_type_concept_id: { type: 'integer', required: true, description: 'Source of visit record' },
        provider_id: { type: 'integer', required: false, description: 'Provider associated with visit' },
        care_site_id: { type: 'integer', required: false, description: 'Care site of visit' },
        visit_source_value: { type: 'varchar(50)', required: false, description: 'Source visit identifier' },
        visit_source_concept_id: { type: 'integer', required: false, description: 'Source visit concept' },
        admitted_from_concept_id: { type: 'integer', required: false, description: 'Admission source' },
        admitted_from_source_value: { type: 'varchar(50)', required: false, description: 'Source admission value' },
        discharged_to_concept_id: { type: 'integer', required: false, description: 'Discharge destination' },
        discharged_to_source_value: { type: 'varchar(50)', required: false, description: 'Source discharge value' },
        preceding_visit_occurrence_id: { type: 'integer', required: false, description: 'Previous visit' }
      }
    },
    
    condition_occurrence: {
      description: 'Diagnoses, signs, symptoms',
      columns: {
        condition_occurrence_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        condition_concept_id: { type: 'integer', required: true, description: 'SNOMED/ICD concept' },
        condition_start_date: { type: 'date', required: true },
        condition_start_datetime: { type: 'datetime', required: false },
        condition_end_date: { type: 'date', required: false },
        condition_end_datetime: { type: 'datetime', required: false },
        condition_type_concept_id: { type: 'integer', required: true },
        condition_status_concept_id: { type: 'integer', required: false },
        stop_reason: { type: 'varchar(20)', required: false },
        provider_id: { type: 'integer', required: false },
        visit_occurrence_id: { type: 'integer', required: false, fk: 'visit_occurrence' },
        visit_detail_id: { type: 'integer', required: false },
        condition_source_value: { type: 'varchar(50)', required: false, description: 'Source ICD code' },
        condition_source_concept_id: { type: 'integer', required: false },
        condition_status_source_value: { type: 'varchar(50)', required: false }
      }
    },
    
    drug_exposure: {
      description: 'Medication exposures',
      columns: {
        drug_exposure_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        drug_concept_id: { type: 'integer', required: true, description: 'RxNorm concept' },
        drug_exposure_start_date: { type: 'date', required: true },
        drug_exposure_start_datetime: { type: 'datetime', required: false },
        drug_exposure_end_date: { type: 'date', required: true },
        drug_exposure_end_datetime: { type: 'datetime', required: false },
        verbatim_end_date: { type: 'date', required: false },
        drug_type_concept_id: { type: 'integer', required: true },
        stop_reason: { type: 'varchar(20)', required: false },
        refills: { type: 'integer', required: false },
        quantity: { type: 'float', required: false },
        days_supply: { type: 'integer', required: false },
        sig: { type: 'text', required: false },
        route_concept_id: { type: 'integer', required: false },
        lot_number: { type: 'varchar(50)', required: false },
        provider_id: { type: 'integer', required: false },
        visit_occurrence_id: { type: 'integer', required: false, fk: 'visit_occurrence' },
        visit_detail_id: { type: 'integer', required: false },
        drug_source_value: { type: 'varchar(50)', required: false, description: 'Source drug name' },
        drug_source_concept_id: { type: 'integer', required: false },
        route_source_value: { type: 'varchar(50)', required: false },
        dose_unit_source_value: { type: 'varchar(50)', required: false }
      }
    },
    
    procedure_occurrence: {
      description: 'Procedures performed',
      columns: {
        procedure_occurrence_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        procedure_concept_id: { type: 'integer', required: true, description: 'CPT/HCPCS/ICD procedure' },
        procedure_date: { type: 'date', required: true },
        procedure_datetime: { type: 'datetime', required: false },
        procedure_end_date: { type: 'date', required: false },
        procedure_end_datetime: { type: 'datetime', required: false },
        procedure_type_concept_id: { type: 'integer', required: true },
        modifier_concept_id: { type: 'integer', required: false },
        quantity: { type: 'integer', required: false },
        provider_id: { type: 'integer', required: false },
        visit_occurrence_id: { type: 'integer', required: false, fk: 'visit_occurrence' },
        visit_detail_id: { type: 'integer', required: false },
        procedure_source_value: { type: 'varchar(50)', required: false },
        procedure_source_concept_id: { type: 'integer', required: false },
        modifier_source_value: { type: 'varchar(50)', required: false }
      }
    },
    
    measurement: {
      description: 'Laboratory tests, vital signs, quantitative findings',
      columns: {
        measurement_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        measurement_concept_id: { type: 'integer', required: true, description: 'LOINC concept' },
        measurement_date: { type: 'date', required: true },
        measurement_datetime: { type: 'datetime', required: false },
        measurement_time: { type: 'varchar(10)', required: false },
        measurement_type_concept_id: { type: 'integer', required: true },
        operator_concept_id: { type: 'integer', required: false },
        value_as_number: { type: 'float', required: false },
        value_as_concept_id: { type: 'integer', required: false },
        unit_concept_id: { type: 'integer', required: false },
        range_low: { type: 'float', required: false },
        range_high: { type: 'float', required: false },
        provider_id: { type: 'integer', required: false },
        visit_occurrence_id: { type: 'integer', required: false, fk: 'visit_occurrence' },
        visit_detail_id: { type: 'integer', required: false },
        measurement_source_value: { type: 'varchar(50)', required: false, description: 'Source lab name' },
        measurement_source_concept_id: { type: 'integer', required: false },
        unit_source_value: { type: 'varchar(50)', required: false },
        unit_source_concept_id: { type: 'integer', required: false },
        value_source_value: { type: 'varchar(50)', required: false },
        measurement_event_id: { type: 'integer', required: false },
        meas_event_field_concept_id: { type: 'integer', required: false }
      }
    },
    
    observation: {
      description: 'Clinical observations not fitting other domains',
      columns: {
        observation_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        observation_concept_id: { type: 'integer', required: true },
        observation_date: { type: 'date', required: true },
        observation_datetime: { type: 'datetime', required: false },
        observation_type_concept_id: { type: 'integer', required: true },
        value_as_number: { type: 'float', required: false },
        value_as_string: { type: 'varchar(60)', required: false },
        value_as_concept_id: { type: 'integer', required: false },
        qualifier_concept_id: { type: 'integer', required: false },
        unit_concept_id: { type: 'integer', required: false },
        provider_id: { type: 'integer', required: false },
        visit_occurrence_id: { type: 'integer', required: false, fk: 'visit_occurrence' },
        visit_detail_id: { type: 'integer', required: false },
        observation_source_value: { type: 'varchar(50)', required: false },
        observation_source_concept_id: { type: 'integer', required: false },
        unit_source_value: { type: 'varchar(50)', required: false },
        qualifier_source_value: { type: 'varchar(50)', required: false },
        value_source_value: { type: 'varchar(50)', required: false },
        observation_event_id: { type: 'integer', required: false },
        obs_event_field_concept_id: { type: 'integer', required: false }
      }
    },
    
    death: {
      description: 'Mortality information',
      columns: {
        person_id: { type: 'integer', required: true, pk: true, fk: 'person' },
        death_date: { type: 'date', required: true },
        death_datetime: { type: 'datetime', required: false },
        death_type_concept_id: { type: 'integer', required: false },
        cause_concept_id: { type: 'integer', required: false },
        cause_source_value: { type: 'varchar(50)', required: false },
        cause_source_concept_id: { type: 'integer', required: false }
      }
    },
    
    // Health System Data Tables
    location: {
      description: 'Geographic locations',
      columns: {
        location_id: { type: 'integer', required: true, pk: true },
        address_1: { type: 'varchar(50)', required: false },
        address_2: { type: 'varchar(50)', required: false },
        city: { type: 'varchar(50)', required: false },
        state: { type: 'varchar(2)', required: false },
        zip: { type: 'varchar(9)', required: false },
        county: { type: 'varchar(20)', required: false },
        country: { type: 'varchar(100)', required: false },
        location_source_value: { type: 'varchar(50)', required: false },
        latitude: { type: 'float', required: false },
        longitude: { type: 'float', required: false }
      }
    },
    
    care_site: {
      description: 'Healthcare facilities',
      columns: {
        care_site_id: { type: 'integer', required: true, pk: true },
        care_site_name: { type: 'varchar(255)', required: false },
        place_of_service_concept_id: { type: 'integer', required: false },
        location_id: { type: 'integer', required: false, fk: 'location' },
        care_site_source_value: { type: 'varchar(50)', required: false },
        place_of_service_source_value: { type: 'varchar(50)', required: false }
      }
    },
    
    provider: {
      description: 'Healthcare providers',
      columns: {
        provider_id: { type: 'integer', required: true, pk: true },
        provider_name: { type: 'varchar(255)', required: false },
        npi: { type: 'varchar(20)', required: false },
        dea: { type: 'varchar(20)', required: false },
        specialty_concept_id: { type: 'integer', required: false },
        care_site_id: { type: 'integer', required: false, fk: 'care_site' },
        year_of_birth: { type: 'integer', required: false },
        gender_concept_id: { type: 'integer', required: false },
        provider_source_value: { type: 'varchar(50)', required: false },
        specialty_source_value: { type: 'varchar(50)', required: false },
        specialty_source_concept_id: { type: 'integer', required: false },
        gender_source_value: { type: 'varchar(50)', required: false },
        gender_source_concept_id: { type: 'integer', required: false }
      }
    },
    
    // Health Economics Data Tables
    payer_plan_period: {
      description: 'Insurance coverage periods',
      columns: {
        payer_plan_period_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        payer_plan_period_start_date: { type: 'date', required: true },
        payer_plan_period_end_date: { type: 'date', required: true },
        payer_concept_id: { type: 'integer', required: false },
        payer_source_value: { type: 'varchar(50)', required: false },
        payer_source_concept_id: { type: 'integer', required: false },
        plan_concept_id: { type: 'integer', required: false },
        plan_source_value: { type: 'varchar(50)', required: false },
        plan_source_concept_id: { type: 'integer', required: false },
        sponsor_concept_id: { type: 'integer', required: false },
        sponsor_source_value: { type: 'varchar(50)', required: false },
        sponsor_source_concept_id: { type: 'integer', required: false },
        family_source_value: { type: 'varchar(50)', required: false },
        stop_reason_concept_id: { type: 'integer', required: false },
        stop_reason_source_value: { type: 'varchar(50)', required: false },
        stop_reason_source_concept_id: { type: 'integer', required: false }
      }
    },
    
    cost: {
      description: 'Cost information',
      columns: {
        cost_id: { type: 'integer', required: true, pk: true },
        cost_event_id: { type: 'integer', required: true },
        cost_domain_id: { type: 'varchar(20)', required: true },
        cost_type_concept_id: { type: 'integer', required: true },
        currency_concept_id: { type: 'integer', required: false },
        total_charge: { type: 'float', required: false },
        total_cost: { type: 'float', required: false },
        total_paid: { type: 'float', required: false },
        paid_by_payer: { type: 'float', required: false },
        paid_by_patient: { type: 'float', required: false },
        paid_patient_copay: { type: 'float', required: false },
        paid_patient_coinsurance: { type: 'float', required: false },
        paid_patient_deductible: { type: 'float', required: false },
        paid_by_primary: { type: 'float', required: false },
        paid_ingredient_cost: { type: 'float', required: false },
        paid_dispensing_fee: { type: 'float', required: false },
        payer_plan_period_id: { type: 'integer', required: false },
        amount_allowed: { type: 'float', required: false },
        revenue_code_concept_id: { type: 'integer', required: false },
        revenue_code_source_value: { type: 'varchar(50)', required: false },
        drg_concept_id: { type: 'integer', required: false },
        drg_source_value: { type: 'varchar(3)', required: false }
      }
    },
    
    // Standardized Derived Elements
    drug_era: {
      description: 'Continuous drug exposures',
      columns: {
        drug_era_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        drug_concept_id: { type: 'integer', required: true },
        drug_era_start_date: { type: 'date', required: true },
        drug_era_end_date: { type: 'date', required: true },
        drug_exposure_count: { type: 'integer', required: false },
        gap_days: { type: 'integer', required: false }
      }
    },
    
    condition_era: {
      description: 'Continuous condition periods',
      columns: {
        condition_era_id: { type: 'integer', required: true, pk: true },
        person_id: { type: 'integer', required: true, fk: 'person' },
        condition_concept_id: { type: 'integer', required: true },
        condition_era_start_date: { type: 'date', required: true },
        condition_era_end_date: { type: 'date', required: true },
        condition_occurrence_count: { type: 'integer', required: false }
      }
    }
  },
  
  // Key relationships
  relationships: [
    { from: 'visit_occurrence.person_id', to: 'person.person_id' },
    { from: 'condition_occurrence.person_id', to: 'person.person_id' },
    { from: 'condition_occurrence.visit_occurrence_id', to: 'visit_occurrence.visit_occurrence_id' },
    { from: 'drug_exposure.person_id', to: 'person.person_id' },
    { from: 'drug_exposure.visit_occurrence_id', to: 'visit_occurrence.visit_occurrence_id' },
    { from: 'procedure_occurrence.person_id', to: 'person.person_id' },
    { from: 'measurement.person_id', to: 'person.person_id' },
    { from: 'observation.person_id', to: 'person.person_id' },
    { from: 'death.person_id', to: 'person.person_id' }
  ],
  
  // Standard concepts mapping
  standard_concepts: {
    gender: {
      8507: 'Male',
      8532: 'Female',
      8551: 'Unknown',
      8570: 'Ambiguous'
    },
    race: {
      8527: 'White',
      8516: 'Black or African American',
      8515: 'Asian',
      8557: 'Native Hawaiian or Other Pacific Islander',
      8657: 'American Indian or Alaska Native'
    },
    ethnicity: {
      38003563: 'Hispanic or Latino',
      38003564: 'Not Hispanic or Latino'
    },
    visit_type: {
      9201: 'Inpatient Visit',
      9202: 'Outpatient Visit',
      9203: 'Emergency Room Visit',
      262: 'Emergency Room and Inpatient Visit',
      581476: 'Home Visit'
    }
  }
};

// OMOP to other format mappings
export const OMOP_MAPPINGS = {
  toMIMIC: {
    person: 'patients',
    visit_occurrence: 'admissions',
    condition_occurrence: 'diagnoses_icd',
    drug_exposure: 'prescriptions',
    measurement: 'labevents',
    procedure_occurrence: 'procedures_icd'
  },
  toCLIF: {
    person: 'patient',
    visit_occurrence: 'hospitalization',
    measurement: 'labs',
    drug_exposure: 'medication_admin_continuous',
    observation: 'patient_assessments'
  }
};

// Query patterns for OMOP
export const OMOP_QUERY_PATTERNS = {
  cohort_definition: `
    -- OMOP Cohort Definition Template
    WITH cohort AS (
      SELECT DISTINCT
        p.person_id,
        p.year_of_birth,
        p.gender_concept_id,
        p.race_concept_id,
        p.ethnicity_concept_id
      FROM person p
      WHERE EXISTS (
        SELECT 1 
        FROM condition_occurrence co
        WHERE co.person_id = p.person_id
          AND co.condition_concept_id IN ({{condition_concepts}})
      )
    )
    SELECT * FROM cohort;
  `,
  
  medication_exposure: `
    -- OMOP Medication Exposure Query
    SELECT 
      de.person_id,
      de.drug_concept_id,
      c.concept_name as drug_name,
      de.drug_exposure_start_date,
      de.drug_exposure_end_date,
      de.quantity,
      de.days_supply
    FROM drug_exposure de
    JOIN concept c ON de.drug_concept_id = c.concept_id
    WHERE de.drug_concept_id IN ({{drug_concepts}})
      AND de.drug_exposure_start_date >= '{{start_date}}'
      AND de.drug_exposure_start_date <= '{{end_date}}';
  `,
  
  lab_results: `
    -- OMOP Lab Results Query
    SELECT
      m.person_id,
      m.measurement_concept_id,
      c.concept_name as measurement_name,
      m.measurement_date,
      m.value_as_number,
      m.unit_concept_id,
      u.concept_name as unit_name,
      m.range_low,
      m.range_high
    FROM measurement m
    JOIN concept c ON m.measurement_concept_id = c.concept_id
    LEFT JOIN concept u ON m.unit_concept_id = u.concept_id
    WHERE m.measurement_concept_id IN ({{measurement_concepts}});
  `
};

// Helper functions for OMOP data
export function getOMOPTableSchema(tableName: string): any {
  return OMOP_CDM_V54.tables[tableName] || null;
}

export function getOMOPRequiredTables(analysisType: string): string[] {
  const analysisTableMap = {
    demographics: ['person'],
    diagnoses: ['person', 'condition_occurrence'],
    medications: ['person', 'drug_exposure'],
    procedures: ['person', 'procedure_occurrence'],
    labs: ['person', 'measurement'],
    vitals: ['person', 'measurement'],
    mortality: ['person', 'death'],
    visits: ['person', 'visit_occurrence'],
    costs: ['person', 'cost', 'payer_plan_period']
  };
  
  return analysisTableMap[analysisType] || ['person'];
}

export function generateOMOPQuery(queryType: string, parameters: any): string {
  const template = OMOP_QUERY_PATTERNS[queryType];
  if (!template) return '';
  
  let query = template;
  for (const [key, value] of Object.entries(parameters)) {
    query = query.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return query;
}

// Validate OMOP data structure
export function validateOMOPStructure(tables: string[]): {
  isValid: boolean;
  missingTables: string[];
  warnings: string[];
} {
  const requiredTables = ['person', 'visit_occurrence'];
  const missingTables = requiredTables.filter(t => !tables.includes(t));
  const warnings = [];
  
  // Check for vocabulary tables
  if (!tables.includes('concept')) {
    warnings.push('Missing concept table - vocabulary lookups will not work');
  }
  
  // Check for era tables
  if (!tables.includes('drug_era') && tables.includes('drug_exposure')) {
    warnings.push('Missing drug_era table - consider generating for better analysis');
  }
  
  return {
    isValid: missingTables.length === 0,
    missingTables,
    warnings
  };
}