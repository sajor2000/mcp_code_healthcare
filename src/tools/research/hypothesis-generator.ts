import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';

export class HypothesisGeneratorTool implements Tool {
  name = 'generate_research_hypothesis';
  description = 'Generate testable research hypotheses based on clinical concepts and available data';
  
  inputSchema = {
    type: 'object',
    properties: {
      clinical_area: { 
        type: 'string',
        description: 'Clinical area of interest (e.g., sepsis, ARDS, AKI, heart failure, diabetes)'
      },
      outcome_of_interest: {
        type: 'string',
        description: 'Primary outcome (e.g., mortality, readmission, length of stay, complications)'
      },
      population: {
        type: 'string',
        description: 'Target population (e.g., ICU patients, elderly, pediatric, specific conditions)'
      },
      data_sources: {
        type: 'array',
        items: { type: 'string', enum: ['OMOP', 'CLIF', 'both'] },
        description: 'Available data sources'
      },
      hypothesis_types: {
        type: 'array',
        items: { 
          type: 'string', 
          enum: ['association', 'prediction', 'comparative_effectiveness', 'trajectory', 'subgroup'] 
        },
        description: 'Types of hypotheses to generate'
      }
    },
    required: ['clinical_area', 'outcome_of_interest']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { 
      clinical_area, 
      outcome_of_interest, 
      population = 'general adult', 
      data_sources = ['both'],
      hypothesis_types = ['association', 'prediction', 'comparative_effectiveness']
    } = args;
    
    // 1. Identify relevant conditions and codes
    const conditions = await this.identifyConditions(clinical_area);
    
    // 2. Determine available variables based on data sources
    const variables = await this.getAvailableVariables(data_sources);
    
    // 3. Generate hypotheses based on templates
    const hypotheses = await this.generateHypotheses({
      conditions,
      outcome: outcome_of_interest,
      population,
      variables,
      types: hypothesis_types
    });
    
    // 4. Create study designs for each hypothesis
    const studyDesigns = await this.createStudyDesigns(hypotheses);
    
    // 5. Identify required data elements
    const dataRequirements = this.getRequiredDataElements(hypotheses);
    
    // 6. Generate power calculations
    const powerCalculations = this.generatePowerCalculations(hypotheses);
    
    return {
      clinical_area,
      outcome_of_interest,
      population,
      data_sources,
      identified_conditions: conditions,
      hypotheses: hypotheses.map((h, idx) => ({
        ...h,
        study_design: studyDesigns[idx],
        power_calculation: powerCalculations[idx]
      })),
      required_data_elements: dataRequirements,
      implementation_recommendations: this.getImplementationRecommendations(hypotheses)
    };
  }
  
  private async identifyConditions(clinical_area: string) {
    const conditionMap = {
      sepsis: {
        icd10: ['A41.9', 'A41.89', 'R65.20', 'R65.21'],
        snomed: ['91302008', '76571007'],
        keywords: ['sepsis', 'septic shock', 'septicemia'],
        related: ['infection', 'SIRS', 'organ dysfunction']
      },
      ards: {
        icd10: ['J80', 'J96.00', 'J96.01'],
        snomed: ['67782005'],
        keywords: ['ARDS', 'acute respiratory distress'],
        related: ['respiratory failure', 'mechanical ventilation']
      },
      aki: {
        icd10: ['N17.0', 'N17.1', 'N17.2', 'N17.9'],
        snomed: ['14669001'],
        keywords: ['acute kidney injury', 'AKI', 'renal failure'],
        related: ['creatinine', 'dialysis', 'RRT']
      },
      heart_failure: {
        icd10: ['I50.1', 'I50.2', 'I50.3', 'I50.9'],
        snomed: ['84114007', '194767001'],
        keywords: ['heart failure', 'CHF', 'HFrEF', 'HFpEF'],
        related: ['ejection fraction', 'BNP', 'cardiac']
      }
    };
    
    // Get specific condition or search for it
    const condition = conditionMap[clinical_area.toLowerCase().replace(' ', '_')] || 
                     await this.searchForCondition(clinical_area);
    
    return condition;
  }
  
  private async getAvailableVariables(data_sources: string[]) {
    const variables = {
      OMOP: {
        demographics: ['age', 'gender', 'race', 'ethnicity'],
        conditions: ['diagnosis_codes', 'condition_onset', 'condition_type'],
        procedures: ['procedure_codes', 'procedure_date', 'procedure_type'],
        medications: ['drug_exposure', 'dose', 'route', 'duration'],
        measurements: ['lab_results', 'vital_signs', 'scores'],
        visits: ['visit_type', 'admission_date', 'discharge_date', 'length_of_stay']
      },
      CLIF: {
        demographics: ['age', 'gender', 'weight', 'height', 'bmi'],
        vitals: ['heart_rate', 'blood_pressure', 'temperature', 'respiratory_rate', 'spo2'],
        labs: ['arterial_blood_gas', 'chemistry', 'hematology', 'microbiology'],
        medications: ['medication_administration', 'infusion_rates', 'boluses'],
        devices: ['mechanical_ventilation', 'dialysis', 'ecmo', 'vasopressors'],
        scores: ['sofa', 'apache', 'saps', 'glasgow_coma_scale']
      }
    };
    
    // Combine variables based on selected data sources
    const combined = {};
    data_sources.forEach(source => {
      if (source === 'both') {
        Object.assign(combined, variables.OMOP, variables.CLIF);
      } else if (variables[source]) {
        Object.assign(combined, variables[source]);
      }
    });
    
    return combined;
  }
  
  private async generateHypotheses(params: any) {
    const templates = {
      association: [
        {
          template: 'Association between {exposure} and {outcome} in patients with {condition}',
          statistical_test: 'Cox proportional hazards regression',
          considerations: ['confounding', 'selection bias', 'immortal time bias']
        },
        {
          template: 'Impact of {intervention} timing on {outcome} in {population}',
          statistical_test: 'Time-varying Cox model',
          considerations: ['time-dependent confounding', 'competing risks']
        }
      ],
      prediction: [
        {
          template: 'Predicting {outcome} using {predictors} in {population}',
          statistical_test: 'Machine learning models (XGBoost, Random Forest, Neural Networks)',
          considerations: ['class imbalance', 'feature selection', 'calibration']
        },
        {
          template: 'Early warning system for {outcome} using temporal patterns',
          statistical_test: 'LSTM/GRU neural networks',
          considerations: ['temporal alignment', 'missing data', 'real-time deployment']
        }
      ],
      comparative_effectiveness: [
        {
          template: 'Comparing {intervention1} vs {intervention2} for {outcome} in {condition}',
          statistical_test: 'Propensity score matching with doubly robust estimation',
          considerations: ['indication bias', 'unmeasured confounding', 'equipoise']
        },
        {
          template: 'Effectiveness of {treatment} across different {subgroups}',
          statistical_test: 'Heterogeneous treatment effects analysis',
          considerations: ['multiple testing', 'subgroup definition', 'power']
        }
      ],
      trajectory: [
        {
          template: 'Trajectory patterns of {biomarker} and association with {outcome}',
          statistical_test: 'Group-based trajectory modeling',
          considerations: ['number of trajectories', 'model selection', 'interpretation']
        }
      ],
      subgroup: [
        {
          template: 'Identifying phenotypes of {condition} with distinct {outcome} patterns',
          statistical_test: 'Latent class analysis or clustering',
          considerations: ['cluster validation', 'clinical interpretability', 'stability']
        }
      ]
    };
    
    // Generate specific hypotheses based on parameters
    const hypotheses = [];
    params.types.forEach(type => {
      if (templates[type]) {
        templates[type].forEach(template => {
          const hypothesis = this.instantiateHypothesis(template, params);
          hypotheses.push(hypothesis);
        });
      }
    });
    
    return hypotheses;
  }
  
  private instantiateHypothesis(template: any, params: any) {
    // Example instantiation logic
    let hypothesis = template.template;
    
    // Replace placeholders with actual values
    const replacements = {
      '{exposure}': this.selectExposure(params.variables),
      '{outcome}': params.outcome,
      '{condition}': params.conditions.keywords[0],
      '{population}': params.population,
      '{predictors}': this.selectPredictors(params.variables),
      '{intervention1}': 'early intervention',
      '{intervention2}': 'standard care',
      '{treatment}': 'therapeutic intervention',
      '{subgroups}': 'risk strata',
      '{biomarker}': this.selectBiomarker(params.variables)
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      hypothesis = hypothesis.replace(placeholder, value);
    });
    
    return {
      hypothesis,
      statistical_approach: template.statistical_test,
      considerations: template.considerations,
      feasibility: this.assessFeasibility(template, params)
    };
  }
  
  private selectExposure(variables: any): string {
    // Logic to select appropriate exposure variable
    const exposures = ['medication timing', 'intervention threshold', 'care protocol'];
    return exposures[0];
  }
  
  private selectPredictors(variables: any): string {
    return 'clinical features and laboratory values';
  }
  
  private selectBiomarker(variables: any): string {
    const biomarkers = ['lactate', 'creatinine', 'troponin', 'procalcitonin'];
    return biomarkers[0];
  }
  
  private assessFeasibility(template: any, params: any): object {
    return {
      data_availability: 'high',
      technical_complexity: 'medium',
      sample_size_adequacy: 'to be determined',
      timeline: '6-12 months'
    };
  }
  
  private async createStudyDesigns(hypotheses: any[]) {
    return hypotheses.map(hypothesis => ({
      design_type: this.determineDesignType(hypothesis),
      inclusion_criteria: this.generateInclusionCriteria(hypothesis),
      exclusion_criteria: this.generateExclusionCriteria(hypothesis),
      primary_endpoint: this.definePrimaryEndpoint(hypothesis),
      secondary_endpoints: this.defineSecondaryEndpoints(hypothesis),
      statistical_plan: this.createStatisticalPlan(hypothesis),
      sample_size: this.estimateSampleSize(hypothesis)
    }));
  }
  
  private determineDesignType(hypothesis: any): string {
    if (hypothesis.hypothesis.includes('Comparing')) {
      return 'Retrospective cohort study';
    } else if (hypothesis.hypothesis.includes('Predicting')) {
      return 'Predictive modeling study';
    } else if (hypothesis.hypothesis.includes('Association')) {
      return 'Observational cohort study';
    }
    return 'Cross-sectional study';
  }
  
  private generateInclusionCriteria(hypothesis: any): string[] {
    return [
      'Age ≥ 18 years',
      'Primary diagnosis matching study condition',
      'Complete data for primary outcome',
      'Minimum follow-up period met'
    ];
  }
  
  private generateExclusionCriteria(hypothesis: any): string[] {
    return [
      'Prior inclusion in similar studies',
      'Missing key variables',
      'Data quality concerns'
    ];
  }
  
  private definePrimaryEndpoint(hypothesis: any): object {
    return {
      endpoint: hypothesis.hypothesis.match(/and (.+?) in/)?.[1] || 'clinical outcome',
      timing: '30 days',
      definition: 'As per standard clinical criteria'
    };
  }
  
  private defineSecondaryEndpoints(hypothesis: any): string[] {
    return [
      'Time to event',
      'Composite outcomes',
      'Safety endpoints',
      'Resource utilization'
    ];
  }
  
  private createStatisticalPlan(hypothesis: any): object {
    return {
      primary_analysis: hypothesis.statistical_approach,
      sensitivity_analyses: [
        'Alternative model specifications',
        'Missing data approaches',
        'Subgroup analyses'
      ],
      interim_analyses: 'Not planned',
      multiplicity_adjustment: 'Bonferroni correction for secondary endpoints'
    };
  }
  
  private estimateSampleSize(hypothesis: any): object {
    return {
      estimated_n: 1000,
      power: 0.80,
      alpha: 0.05,
      effect_size: 'To be determined from pilot data',
      assumptions: 'Based on prior literature'
    };
  }
  
  private getRequiredDataElements(hypotheses: any[]): object {
    const elements = {
      demographics: ['age', 'sex', 'race', 'ethnicity'],
      clinical: [],
      laboratory: [],
      medications: [],
      procedures: [],
      outcomes: []
    };
    
    // Aggregate required elements from all hypotheses
    hypotheses.forEach(h => {
      // Add specific requirements based on hypothesis
      if (h.hypothesis.includes('sepsis')) {
        elements.clinical.push('infection source', 'SOFA score');
        elements.laboratory.push('lactate', 'white blood cell count');
      }
      // Add more condition-specific requirements
    });
    
    return elements;
  }
  
  private generatePowerCalculations(hypotheses: any[]): object[] {
    return hypotheses.map(h => ({
      minimum_sample_size: 500,
      expected_effect_size: 0.3,
      power: 0.8,
      alpha: 0.05,
      notes: 'Preliminary calculation - refine with pilot data'
    }));
  }
  
  private getImplementationRecommendations(hypotheses: any[]): object {
    return {
      data_preparation: [
        'Create cohort extraction queries',
        'Define variable specifications',
        'Implement data quality checks'
      ],
      analysis_pipeline: [
        'Develop reproducible analysis scripts',
        'Create visualization templates',
        'Set up version control'
      ],
      validation: [
        'Internal validation with bootstrap',
        'External validation if possible',
        'Sensitivity analyses'
      ],
      dissemination: [
        'Register study protocol',
        'Prepare analysis plan',
        'Plan publications'
      ]
    };
  }
  
  private async searchForCondition(clinical_area: string) {
    // Search for condition in database
    const query = `
      SELECT DISTINCT 
        condition_name,
        icd10_codes,
        snomed_codes
      FROM medical_conditions
      WHERE condition_name LIKE ?
      LIMIT 10
    `;
    
    try {
      const results = this.db.prepare(query).all(`%${clinical_area}%`);
      if (results.length > 0) {
        return {
          icd10: results[0].icd10_codes?.split(',') || [],
          snomed: results[0].snomed_codes?.split(',') || [],
          keywords: [clinical_area],
          related: []
        };
      }
    } catch (error) {
      console.error('Error searching for condition:', error);
    }
    
    // Return default if not found
    return {
      icd10: [],
      snomed: [],
      keywords: [clinical_area],
      related: []
    };
  }
}