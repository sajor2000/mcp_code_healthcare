import { MedicalNLP, ParsedQuery, MedicalEntity } from '../nlp/medical-nlp.js';
import { LLMMedicalNLP, LLMParsedQuery } from '../nlp/llm-medical-nlp.js';
import { checkSTROBECompliance, generateSTROBECompliantAdditions } from '../nlp/strobe-guidelines.js';
import { createModuleLogger } from './logger.js';
import { ValidationError } from './errors.js';

const contextLogger = createModuleLogger('context-builder-enhanced');

export interface EnhancedAnalysisSpec extends ParsedQuery {
  study_question?: string;
  outcomes?: string[];
  exposures?: string[];
  predictors?: string[];
  covariates?: string[];
  inclusion_criteria?: Array<{
    type: string;
    codes?: string[];
    values?: any[];
    operator?: string;
  }>;
  exclusion_criteria?: Array<{
    type: string;
    codes?: string[];
    values?: any[];
    operator?: string;
  }>;
  analysis_plan?: Array<{
    type: string;
    parameters: Record<string, any>;
    rationale?: string;
  }>;
  data_model?: 'OMOP' | 'CLIF';
  cohort_definition?: {
    index_event?: string;
    washout_period?: number;
    follow_up?: { min?: number; max?: number };
  };
  sample_size_estimate?: {
    expected_n?: number;
    power_calculation?: any;
  };
  feasibility_assessment?: {
    data_availability: 'high' | 'medium' | 'low';
    technical_complexity: 'high' | 'medium' | 'low';
    estimated_timeline?: string;
  };
  strobeCompliance?: any;
  confidence?: number;
  reasoning?: string;
}

export class EnhancedContextBuilder {
  private static llmNLP: LLMMedicalNLP | null = null;
  
  private static getLLMNLP(): LLMMedicalNLP {
    if (!this.llmNLP) {
      this.llmNLP = new LLMMedicalNLP({
        provider: process.env.LLM_PROVIDER as 'claude' | 'openai' || 'claude',
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
        model: process.env.LLM_MODEL
      });
    }
    return this.llmNLP;
  }
  
  static async buildFromNaturalLanguage(query: string, options?: { useLLM?: boolean }): Promise<EnhancedAnalysisSpec> {
    contextLogger.info('Building enhanced analysis context', { query, useLLM: options?.useLLM });
    
    try {
      let parsedQuery: ParsedQuery | LLMParsedQuery;
      let isLLMParsed = false;
      
      // Try LLM parsing first if enabled
      if (options?.useLLM !== false && (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)) {
        try {
          const llmNLP = this.getLLMNLP();
          parsedQuery = await llmNLP.parseQuery(query);
          
          // Enhance with local ontologies
          parsedQuery = await llmNLP.enhanceWithLocalOntologies(parsedQuery as LLMParsedQuery);
          isLLMParsed = true;
          
          contextLogger.info('LLM parsing successful', { 
            confidence: (parsedQuery as LLMParsedQuery).confidence 
          });
        } catch (llmError) {
          contextLogger.warn('LLM parsing failed, falling back to rule-based', { 
            error: llmError.message 
          });
          // Fall back to rule-based parsing
          parsedQuery = await MedicalNLP.parseQuery(query);
        }
      } else {
        // Use rule-based parsing
        parsedQuery = await MedicalNLP.parseQuery(query);
      }
      
      // Enhance entities with clinical context
      const enhancedEntities = await MedicalNLP.enhanceWithClinicalContext(parsedQuery.entities);
      parsedQuery.entities = enhancedEntities;
      
      // Determine data model based on query
      const dataModel = this.inferDataModel(parsedQuery);
      
      // Extract study components
      const outcomes = this.extractOutcomes(parsedQuery);
      const predictors = this.extractPredictors(parsedQuery);
      const covariates = this.extractCovariates(parsedQuery);
      
      // Build inclusion/exclusion criteria
      const { inclusion, exclusion } = this.buildCriteria(parsedQuery);
      
      // Generate analysis plan
      let analysisPlan = await this.generateAnalysisPlan(parsedQuery, outcomes, predictors, covariates);
      
      // Always check STROBE compliance and enhance
      const strobeAdditions = generateSTROBECompliantAdditions({
        outcomes,
        predictors,
        covariates,
        analysis_plan: analysisPlan,
        study_type: this.inferStudyType(parsedQuery),
        data_model: dataModel
      });
      
      // Add STROBE-required analyses that are missing
      for (const addition of strobeAdditions) {
        if (!analysisPlan.some(p => p.type === addition.type)) {
          analysisPlan.push(addition);
        }
      }
      
      // If LLM was used, incorporate its specific recommendations
      if (isLLMParsed && parsedQuery.hasOwnProperty('strobeCompliance')) {
        const llmQuery = parsedQuery as LLMParsedQuery;
        
        // Add LLM-suggested analyses
        if (llmQuery.suggestedAnalyses) {
          analysisPlan = this.incorporateSuggestedAnalyses(
            analysisPlan,
            llmQuery.suggestedAnalyses
          );
        }
      }
      
      // Define cohort
      const cohortDefinition = this.defineCohort(parsedQuery);
      
      // Estimate sample size
      const sampleSizeEstimate = await this.estimateSampleSize(parsedQuery, dataModel);
      
      // Assess feasibility
      const feasibilityAssessment = this.assessFeasibility(parsedQuery, analysisPlan);
      
      // Create flattened spec that extends ParsedQuery
      const spec: EnhancedAnalysisSpec = {
        ...parsedQuery,  // Include all ParsedQuery fields
        study_question: query,
        outcomes,
        exposures: predictors,  // Also add as exposures
        predictors,
        covariates,
        inclusion_criteria: inclusion,
        exclusion_criteria: exclusion,
        analysis_plan: analysisPlan,
        data_model: dataModel,
        cohort_definition: cohortDefinition,
        ...(sampleSizeEstimate && { sample_size_estimate: sampleSizeEstimate }),
        ...(feasibilityAssessment && { feasibility_assessment: feasibilityAssessment })
      };
      
      // Validate the specification
      this.validateSpec(spec);
      
      contextLogger.info('Analysis context built successfully', {
        intent: parsedQuery.intent,
        entityCount: parsedQuery.entities.length,
        analysisSteps: analysisPlan.length
      });
      
      // Always perform STROBE compliance check
      const strobeCompliance = checkSTROBECompliance(spec);
      (spec as any).strobeCompliance = strobeCompliance;
      
      // Add LLM metadata if available
      if (isLLMParsed) {
        (spec as any).confidence = (parsedQuery as LLMParsedQuery).confidence;
        (spec as any).llmReasoning = (parsedQuery as LLMParsedQuery).reasoning;
        
        // Merge LLM STROBE insights with systematic check
        if ((parsedQuery as LLMParsedQuery).strobeCompliance) {
          const llmCompliance = (parsedQuery as LLMParsedQuery).strobeCompliance;
          (spec as any).strobeCompliance.llm_insights = llmCompliance;
        }
      }
      
      return spec;
    } catch (error) {
      contextLogger.error('Failed to build analysis context', { error: error.message });
      throw error;
    }
  }
  
  // Remove this method as STROBE compliance is now handled systematically
  
  private static incorporateSuggestedAnalyses(
    analysisPlan: EnhancedAnalysisSpec['analysis_plan'],
    suggestedAnalyses: string[]
  ): EnhancedAnalysisSpec['analysis_plan'] {
    const enhancedPlan = [...analysisPlan];
    
    // Map suggested analyses to specific analysis types
    const analysisMapping: Record<string, any> = {
      'negative control': {
        type: 'negative_control_analysis',
        parameters: {
          control_outcomes: ['ingrown toenail', 'dental procedures'],
          control_exposures: ['vitamin_c', 'antihistamines']
        },
        rationale: 'Assess potential for unmeasured confounding'
      },
      'dose-response': {
        type: 'dose_response_analysis',
        parameters: {
          exposure_levels: 'quartiles',
          trend_test: true
        },
        rationale: 'Examine biological gradient for causal inference'
      },
      'falsification test': {
        type: 'falsification_endpoint',
        parameters: {
          pre_exposure_outcome: true,
          placebo_phase: true
        },
        rationale: 'Test for bias and confounding'
      }
    };
    
    for (const suggestion of suggestedAnalyses) {
      const lowerSuggestion = suggestion.toLowerCase();
      
      // Check if this analysis type is already included
      for (const [key, analysisConfig] of Object.entries(analysisMapping)) {
        if (lowerSuggestion.includes(key) && 
            !analysisPlan.some(p => p.type === analysisConfig.type)) {
          enhancedPlan.push(analysisConfig);
        }
      }
    }
    
    return enhancedPlan;
  }

  private static inferDataModel(parsedQuery: ParsedQuery): 'OMOP' | 'CLIF' {
    // Check for ICU-specific terms
    const icuTerms = ['icu', 'intensive care', 'critical care', 'ventilator', 'vasopressor'];
    const hasICUTerms = parsedQuery.entities.some(e => 
      icuTerms.some(term => e.text.toLowerCase().includes(term))
    );
    
    // Check for high-frequency data needs
    const needsHighFrequency = parsedQuery.entities.some(e =>
      e.type === 'lab' && e.attributes?.temporal === 'hourly'
    );
    
    return hasICUTerms || needsHighFrequency ? 'CLIF' : 'OMOP';
  }

  private static extractOutcomes(parsedQuery: ParsedQuery): string[] {
    const outcomes: string[] = [];
    
    // Common outcome indicators
    const outcomeIndicators = [
      'mortality', 'death', 'survival', 'readmission', 'admission',
      'length of stay', 'los', 'complication', 'adverse event',
      'response', 'remission', 'progression', 'recurrence'
    ];
    
    // Extract from entities
    parsedQuery.entities.forEach(entity => {
      if (entity.type === 'condition') {
        // Check if it's described as an outcome
        const isOutcome = outcomeIndicators.some(indicator => 
          entity.text.toLowerCase().includes(indicator)
        );
        if (isOutcome) {
          outcomes.push(entity.text);
        }
      }
    });
    
    // Extract from query text patterns
    const query = parsedQuery.entities.map(e => e.text).join(' ');
    const outcomePatterns = [
      /(?:predict|risk of|incidence of|rate of)\s+([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+)\s+(?:as outcome|as endpoint)/gi
    ];
    
    outcomePatterns.forEach(pattern => {
      const matches = [...query.matchAll(pattern)];
      matches.forEach(match => {
        const outcome = match[1].trim();
        if (!outcomes.includes(outcome)) {
          outcomes.push(outcome);
        }
      });
    });
    
    // Default outcomes if none found
    if (outcomes.length === 0 && parsedQuery.intent === 'prediction') {
      outcomes.push('clinical outcome');
    }
    
    return outcomes;
  }

  private static extractPredictors(parsedQuery: ParsedQuery): string[] {
    const predictors: string[] = [];
    
    // For comparison studies
    if (parsedQuery.intent === 'comparison') {
      const medications = parsedQuery.entities
        .filter(e => e.type === 'medication' && !e.negated)
        .map(e => e.text);
      
      if (medications.length >= 2) {
        predictors.push('treatment_group');
      } else if (medications.length === 1) {
        predictors.push(`${medications[0]}_exposure`);
      }
    }
    
    // For association/prediction studies
    if (parsedQuery.intent === 'association' || parsedQuery.intent === 'prediction') {
      // Add conditions as predictors if they're not outcomes
      const conditions = parsedQuery.entities
        .filter(e => e.type === 'condition' && !e.negated)
        .map(e => e.text);
      
      predictors.push(...conditions);
      
      // Add labs with thresholds
      const labs = parsedQuery.entities
        .filter(e => e.type === 'lab' && e.attributes?.value)
        .map(e => `${e.text}_${e.attributes?.operator}_${e.attributes?.value}`);
      
      predictors.push(...labs);
    }
    
    return [...new Set(predictors)]; // Remove duplicates
  }
  
  private static inferStudyType(parsedQuery: ParsedQuery): string {
    // Infer study type based on query characteristics
    if (parsedQuery.temporalConstraints?.followUpDuration || 
        parsedQuery.entities.some(e => e.temporal === 'outcome')) {
      return 'cohort';
    }
    
    if (parsedQuery.intent === 'comparison' && 
        parsedQuery.entities.filter(e => e.type === 'medication').length >= 2) {
      return 'comparative_effectiveness';
    }
    
    if (parsedQuery.intent === 'association' && 
        !parsedQuery.temporalConstraints) {
      return 'cross_sectional';
    }
    
    return 'observational'; // Default
  }

  private static extractCovariates(parsedQuery: ParsedQuery): string[] {
    const covariates: string[] = [];
    
    // Standard demographics
    covariates.push('age', 'sex');
    
    // Add from statistical requirements
    if (parsedQuery.statisticalRequirements?.adjustFor) {
      covariates.push(...parsedQuery.statisticalRequirements.adjustFor);
    }
    
    // Add common clinical covariates based on context
    const hasCardiac = parsedQuery.entities.some(e => 
      e.text.toLowerCase().match(/heart|cardiac|coronary/)
    );
    if (hasCardiac) {
      covariates.push('hypertension', 'diabetes', 'smoking_status');
    }
    
    const hasRenal = parsedQuery.entities.some(e =>
      e.text.toLowerCase().match(/kidney|renal|nephro/)
    );
    if (hasRenal) {
      covariates.push('baseline_creatinine', 'egfr');
    }
    
    // Add comorbidity scores
    covariates.push('charlson_comorbidity_index');
    
    return [...new Set(covariates)];
  }

  private static buildCriteria(parsedQuery: ParsedQuery): {
    inclusion: EnhancedAnalysisSpec['inclusion_criteria'];
    exclusion: EnhancedAnalysisSpec['exclusion_criteria'];
  } {
    const inclusion: EnhancedAnalysisSpec['inclusion_criteria'] = [];
    const exclusion: EnhancedAnalysisSpec['exclusion_criteria'] = [];
    
    // Build from entities
    parsedQuery.entities.forEach(entity => {
      const criterion: any = {
        type: entity.type
      };
      
      if (entity.codes && entity.codes.length > 0) {
        criterion.codes = entity.codes.map(c => c.code);
      }
      
      if (entity.attributes?.value) {
        criterion.values = [entity.attributes.value];
        criterion.operator = entity.attributes.operator || '=';
      }
      
      // Add to appropriate list
      if (entity.negated) {
        exclusion.push(criterion);
      } else {
        inclusion.push(criterion);
      }
    });
    
    // Add population filters
    if (parsedQuery.populationFilters) {
      parsedQuery.populationFilters.forEach(filter => {
        inclusion.push({
          type: 'demographic',
          values: [filter.value],
          operator: filter.operator
        });
      });
    }
    
    // Add temporal constraints as criteria
    if (parsedQuery.temporalConstraints?.window) {
      inclusion.push({
        type: 'temporal',
        values: [parsedQuery.temporalConstraints.window]
      });
    }
    
    return { inclusion, exclusion };
  }

  private static async generateAnalysisPlan(
    parsedQuery: ParsedQuery,
    outcomes: string[],
    predictors: string[],
    covariates: string[]
  ): Promise<EnhancedAnalysisSpec['analysis_plan']> {
    const plan: EnhancedAnalysisSpec['analysis_plan'] = [];
    
    // Always start with descriptive statistics
    plan.push({
      type: 'descriptive_statistics',
      parameters: {
        variables: [...outcomes, ...predictors, ...covariates],
        by_group: predictors[0] || null,
        include_missing: true
      },
      rationale: 'Characterize study population and check data quality'
    });
    
    // Add main analysis based on intent
    switch (parsedQuery.intent) {
      case 'comparison':
        if (outcomes.some(o => o.includes('time') || o.includes('survival'))) {
          plan.push({
            type: 'kaplan_meier',
            parameters: {
              time: 'time_to_event',
              event: outcomes[0],
              strata: predictors[0]
            },
            rationale: 'Visualize survival differences between groups'
          });
          
          plan.push({
            type: 'cox_regression',
            parameters: {
              time: 'time_to_event',
              event: outcomes[0],
              predictors,
              covariates
            },
            rationale: 'Estimate hazard ratios adjusting for confounders'
          });
        } else {
          plan.push({
            type: 'logistic_regression',
            parameters: {
              outcome: outcomes[0],
              predictors,
              covariates
            },
            rationale: 'Compare outcomes between groups with adjustment'
          });
        }
        
        // Add propensity score analysis for causal inference
        plan.push({
          type: 'propensity_matching',
          parameters: {
            treatment: predictors[0],
            outcome: outcomes[0],
            covariates,
            method: 'nearest',
            caliper: 0.2
          },
          rationale: 'Reduce confounding through matching'
        });
        break;
      
      case 'prediction':
        plan.push({
          type: 'machine_learning',
          parameters: {
            outcome: outcomes[0],
            features: [...predictors, ...covariates],
            algorithms: ['logistic_regression', 'random_forest', 'xgboost'],
            validation: 'cross_validation',
            cv_folds: 5
          },
          rationale: 'Develop and validate prediction model'
        });
        
        plan.push({
          type: 'calibration_analysis',
          parameters: {
            predicted: 'model_predictions',
            observed: outcomes[0]
          },
          rationale: 'Assess model calibration'
        });
        break;
      
      case 'association':
        const isBinary = this.isOutcomeBinary(outcomes[0]);
        plan.push({
          type: isBinary ? 'logistic_regression' : 'linear_regression',
          parameters: {
            outcome: outcomes[0],
            predictors,
            covariates
          },
          rationale: 'Estimate associations with multivariable adjustment'
        });
        
        // Add interaction testing if mentioned
        if (parsedQuery.statisticalRequirements?.stratifyBy) {
          plan.push({
            type: 'interaction_analysis',
            parameters: {
              outcome: outcomes[0],
              predictors,
              effect_modifiers: parsedQuery.statisticalRequirements.stratifyBy
            },
            rationale: 'Test for effect modification'
          });
        }
        break;
      
      case 'temporal':
        plan.push({
          type: 'time_series_analysis',
          parameters: {
            outcome: outcomes[0],
            time_variable: 'measurement_date',
            group_by: predictors[0] || null
          },
          rationale: 'Analyze temporal trends'
        });
        break;
    }
    
    // Add sensitivity analyses
    if (parsedQuery.statisticalRequirements?.sensitivity ||
        plan.some(p => p.type.includes('regression'))) {
      plan.push({
        type: 'sensitivity_analysis',
        parameters: {
          methods: [
            'complete_case',
            'multiple_imputation',
            'e_value',
            'unmeasured_confounding'
          ]
        },
        rationale: 'Assess robustness of findings'
      });
    }
    
    return plan;
  }

  private static defineCohort(parsedQuery: ParsedQuery): EnhancedAnalysisSpec['cohort_definition'] {
    const cohort: EnhancedAnalysisSpec['cohort_definition'] = {};
    
    // Identify index event
    const conditions = parsedQuery.entities.filter(e => e.type === 'condition' && !e.negated);
    if (conditions.length > 0) {
      cohort.index_event = conditions[0].text;
    } else {
      const medications = parsedQuery.entities.filter(e => e.type === 'medication' && !e.negated);
      if (medications.length > 0) {
        cohort.index_event = `First ${medications[0].text} prescription`;
      }
    }
    
    // Set washout period (default 365 days)
    cohort.washout_period = 365;
    
    // Set follow-up based on temporal constraints
    if (parsedQuery.temporalConstraints?.relative) {
      const match = parsedQuery.temporalConstraints.relative.match(/(\d+)\s*(day|week|month|year)/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const days = unit === 'day' ? value :
                     unit === 'week' ? value * 7 :
                     unit === 'month' ? value * 30 :
                     value * 365;
        cohort.follow_up = { min: 1, max: days };
      }
    } else {
      // Default follow-up
      cohort.follow_up = { min: 1, max: 365 };
    }
    
    return cohort;
  }

  private static async estimateSampleSize(
    parsedQuery: ParsedQuery,
    dataModel: 'OMOP' | 'CLIF'
  ): Promise<EnhancedAnalysisSpec['sample_size_estimate']> {
    try {
      const researchDb = db.getResearchDb();
      
      // Get historical cohort sizes
      const historicalSizes = researchDb.prepare(`
        SELECT AVG(expected_size) as avg_size, COUNT(*) as cohort_count
        FROM cohort_definitions
        WHERE data_model = ?
      `).get(dataModel);
      
      const estimate: EnhancedAnalysisSpec['sample_size_estimate'] = {};
      
      if (historicalSizes?.avg_size) {
        estimate.expected_n = Math.round(historicalSizes.avg_size);
      }
      
      // Basic power calculation for common scenarios
      if (parsedQuery.intent === 'comparison') {
        estimate.power_calculation = {
          alpha: 0.05,
          power: 0.80,
          effect_size: 'medium (0.5)',
          required_n_per_group: 64,
          total_n: 128
        };
      } else if (parsedQuery.intent === 'prediction') {
        // Events per variable rule
        const predictorCount = parsedQuery.entities.filter(e => 
          e.type === 'condition' || e.type === 'medication'
        ).length;
        estimate.power_calculation = {
          events_per_variable: 10,
          n_predictors: predictorCount,
          required_events: predictorCount * 10,
          estimated_event_rate: 0.2,
          required_n: Math.round((predictorCount * 10) / 0.2)
        };
      }
      
      return estimate;
    } catch (error) {
      contextLogger.warn('Could not estimate sample size', { error: error.message });
      return undefined;
    }
  }

  private static assessFeasibility(
    parsedQuery: ParsedQuery,
    analysisPlan: EnhancedAnalysisSpec['analysis_plan']
  ): EnhancedAnalysisSpec['feasibility_assessment'] {
    let dataScore = 0;
    let complexityScore = 0;
    
    // Assess data availability
    parsedQuery.entities.forEach(entity => {
      if (entity.codes && entity.codes.length > 0) {
        dataScore += 2; // Has standardized codes
      } else {
        dataScore += 1; // Text only
      }
    });
    
    const dataAvailability = dataScore / parsedQuery.entities.length >= 1.5 ? 'high' :
                             dataScore / parsedQuery.entities.length >= 1.0 ? 'medium' : 'low';
    
    // Assess technical complexity
    analysisPlan.forEach(step => {
      if (['machine_learning', 'propensity_matching', 'time_series_analysis'].includes(step.type)) {
        complexityScore += 3;
      } else if (['cox_regression', 'interaction_analysis'].includes(step.type)) {
        complexityScore += 2;
      } else {
        complexityScore += 1;
      }
    });
    
    const technicalComplexity = complexityScore / analysisPlan.length >= 2.5 ? 'high' :
                                 complexityScore / analysisPlan.length >= 1.5 ? 'medium' : 'low';
    
    // Estimate timeline
    const baseWeeks = analysisPlan.length * 2;
    const complexityMultiplier = technicalComplexity === 'high' ? 2 :
                                 technicalComplexity === 'medium' ? 1.5 : 1;
    const estimatedWeeks = Math.round(baseWeeks * complexityMultiplier);
    const estimatedTimeline = `${estimatedWeeks}-${estimatedWeeks + 4} weeks`;
    
    return {
      data_availability: dataAvailability,
      technical_complexity: technicalComplexity,
      estimated_timeline: estimatedTimeline
    };
  }

  private static isOutcomeBinary(outcome: string): boolean {
    const binaryIndicators = [
      'mortality', 'death', 'readmission', 'admission',
      'complication', 'event', 'positive', 'negative',
      'presence', 'absence', 'yes', 'no'
    ];
    
    return binaryIndicators.some(indicator => 
      outcome.toLowerCase().includes(indicator)
    );
  }

  private static validateSpec(spec: EnhancedAnalysisSpec): void {
    const errors: string[] = [];
    
    if (spec.outcomes.length === 0) {
      errors.push('No outcomes identified');
    }
    
    if (spec.analysis_plan.length === 0) {
      errors.push('No analysis plan generated');
    }
    
    if (spec.inclusion_criteria.length === 0) {
      errors.push('No inclusion criteria defined');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Invalid analysis specification', errors.map(e => ({ message: e })));
    }
  }
}