// Example: Generate a complete sepsis research study using Healthcare Research MCP Server

import { MCPClient } from '@modelcontextprotocol/sdk/client';

async function generateSepsisStudy() {
  // Connect to the MCP server
  const client = new MCPClient('http://localhost:3000');
  
  console.log('=== Generating Sepsis Research Study ===\n');
  
  // 1. Generate research hypothesis
  console.log('1. Generating research hypotheses...');
  const hypothesis = await client.callTool('generate_research_hypothesis', {
    clinical_area: 'sepsis',
    outcome_of_interest: '30-day mortality',
    population: 'ICU patients',
    data_sources: ['OMOP', 'CLIF'],
    hypothesis_types: ['association', 'prediction', 'comparative_effectiveness']
  });
  
  console.log('Generated Hypotheses:');
  hypothesis.hypotheses.forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.hypothesis}`);
    console.log(`     Method: ${h.statistical_approach}`);
    console.log(`     Power: ${h.power_calculation.power}`);
  });
  
  // 2. Build cohort
  console.log('\n2. Building research cohort...');
  const cohort = await client.callTool('build_research_cohort', {
    cohort_name: 'Sepsis ICU Cohort 2020-2023',
    inclusion_criteria: {
      diagnoses: ['sepsis', 'septic shock', 'A41.9', 'R65.20'],
      procedures: ['mechanical ventilation'],
      lab_values: [
        { test: 'lactate', operator: '>', value: 2.0, unit: 'mmol/L' },
        { test: 'white blood cell count', operator: '>', value: 12000, unit: 'cells/μL' }
      ],
      demographics: {
        age_min: 18,
        age_max: 90
      },
      time_window: {
        start_date: '2020-01-01',
        end_date: '2023-12-31',
        index_event: 'first sepsis diagnosis',
        followup_days: 30
      },
      settings: ['icu']
    },
    exclusion_criteria: {
      diagnoses: ['hospice care', 'comfort measures only']
    },
    data_model: 'OMOP',
    temporal_logic: {
      sequence_requirements: [
        {
          event1: 'sepsis diagnosis',
          event2: 'organ dysfunction',
          relationship: 'concurrent',
          window_days: 1
        }
      ]
    }
  });
  
  console.log('Cohort Definition Created:');
  console.log(`  Name: ${cohort.cohort_name}`);
  console.log(`  Estimated N: ${cohort.estimated_sample_size.estimated_n}`);
  console.log(`  SQL Generated: ${cohort.sql_query.split('\n').length} lines`);
  
  // 3. Generate analysis code
  console.log('\n3. Generating analysis code...');
  const analysisCode = await client.callTool('generate_research_code', {
    study_type: 'cohort',
    analysis_plan: {
      primary_outcome: '30-day mortality',
      exposures: ['early_antibiotics', 'vasopressor_timing'],
      covariates: ['age', 'gender', 'charlson_score', 'sofa_score', 'lactate_peak'],
      statistical_methods: ['cox_regression', 'propensity_score', 'competing_risks']
    },
    output_format: 'R',
    data_model: 'OMOP'
  });
  
  console.log('Analysis Code Generated:');
  console.log(`  Format: ${analysisCode.output_format}`);
  console.log(`  Required packages: ${analysisCode.required_packages.join(', ')}`);
  
  // 4. Look up relevant codes
  console.log('\n4. Looking up medical codes...');
  const sepsisCodes = await client.callTool('lookup_medical_code', {
    code: 'A41.9',
    system: 'icd10',
    include_mappings: true
  });
  
  console.log('Code Information:');
  console.log(`  ICD-10: ${sepsisCodes.code} - ${sepsisCodes.data.description}`);
  console.log(`  SNOMED mappings: ${sepsisCodes.mappings.filter(m => m.target_system === 'snomed').length}`);
  
  // 5. Validate phenotype
  console.log('\n5. Validating sepsis phenotype...');
  const phenotypeValidation = await client.callTool('validate_phenotype', {
    phenotype_name: 'Sepsis-3 Criteria',
    criteria: {
      required: ['suspected infection', 'acute change in SOFA ≥ 2'],
      timing: 'within 24 hours',
      severity_markers: ['lactate > 2', 'vasopressor requirement']
    }
  });
  
  console.log('Phenotype Validation:');
  console.log(`  Valid: ${phenotypeValidation.valid}`);
  console.log(`  Clinical accuracy: ${phenotypeValidation.accuracy}`);
  
  // Create final study protocol
  const studyProtocol = {
    title: 'Impact of Early Intervention Timing on 30-Day Mortality in ICU Patients with Sepsis',
    hypothesis: hypothesis.hypotheses[0],
    cohort: {
      definition: cohort.cohort_name,
      estimated_size: cohort.estimated_sample_size.estimated_n,
      sql: cohort.sql_query
    },
    analysis: {
      plan: analysisCode.workflow,
      code: analysisCode.code
    },
    timeline: '12 months',
    deliverables: [
      'Cohort extraction and validation',
      'Statistical analysis report',
      'Manuscript for publication',
      'Reproducible analysis code'
    ]
  };
  
  console.log('\n=== Study Protocol Summary ===');
  console.log(JSON.stringify(studyProtocol, null, 2));
  
  return studyProtocol;
}

// Run the example
generateSepsisStudy()
  .then(() => {
    console.log('\n✓ Sepsis research study generation complete!');
  })
  .catch(error => {
    console.error('Error generating study:', error);
  });