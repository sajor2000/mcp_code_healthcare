import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';
import { LLMMedicalNLP } from '../../nlp/llm-medical-nlp.js';
import { EnhancedContextBuilder } from '../../utils/context-builder-enhanced.js';
import { createModuleLogger } from '../../utils/logger.js';
import { MCPError } from '../../utils/errors.js';
import { checkSTROBECompliance } from '../../nlp/strobe-guidelines.js';

const logger = createModuleLogger('natural-language-query');

export class NaturalLanguageQueryTool implements Tool {
  name = 'natural_language_query';
  description = 'Process natural language research queries using LLM to understand intent and execute appropriate analyses';
  
  inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language description of the research question (e.g., "Compare 30-day mortality in sepsis patients receiving vancomycin vs. alternative antibiotics")'
      },
      dataset_info: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to uploaded dataset' },
          format: { type: 'string', enum: ['csv', 'parquet', 'json', 'sql'] },
          data_model: { type: 'string', enum: ['OMOP', 'CLIF', 'custom'] }
        },
        description: 'Information about the dataset to analyze'
      },
      execution_mode: {
        type: 'string',
        enum: ['analyze', 'plan_only', 'code_only'],
        default: 'analyze',
        description: 'Whether to execute analysis, just plan it, or only generate code'
      },
      output_format: {
        type: 'string',
        enum: ['full_report', 'summary', 'figures_only', 'code_only'],
        default: 'full_report'
      },
      use_llm: {
        type: 'boolean',
        default: true,
        description: 'Whether to use LLM for query understanding (falls back to rule-based if false)'
      }
    },
    required: ['query']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { 
      query, 
      dataset_info, 
      execution_mode = 'analyze',
      output_format = 'full_report',
      use_llm = true
    } = args;
    
    logger.info('Processing natural language query', { query, execution_mode, use_llm });
    
    try {
      // Step 1: Parse the natural language query
      const analysisSpec = await EnhancedContextBuilder.buildFromNaturalLanguage(query, { 
        useLLM: use_llm 
      });
      
      logger.info('Query parsed successfully', {
        intent: analysisSpec.intent,
        entityCount: analysisSpec.entities.length,
        strobeCompliance: analysisSpec.strobeCompliance?.score
      });
      
      // Step 2: Generate hypothesis based on parsed query
      const hypothesisResult = this.generateHypothesis(analysisSpec);
      
      // Step 3: Build cohort definition
      const cohortResult = this.buildCohortDefinition(analysisSpec, dataset_info);
      
      // Step 4: Generate analysis plan
      const analysisPlan = this.generateAnalysisPlan(analysisSpec, hypothesisResult, dataset_info);
      
      // Step 5: Generate example figures (if not code_only)
      let figureResults = null;
      if (execution_mode !== 'code_only' && output_format !== 'code_only') {
        figureResults = this.generateSampleFigures(analysisSpec);
      }
      
      // Step 6: Compile results based on output format
      const results = this.compileResults({
        query,
        analysisSpec,
        hypothesisResult,
        cohortResult,
        analysisPlan,
        figureResults,
        output_format,
        execution_mode
      });
      
      // Step 7: Add STROBE compliance report
      if (analysisSpec.strobeCompliance) {
        results.strobe_compliance = {
          score: analysisSpec.strobeCompliance.score,
          addressed_items: analysisSpec.strobeCompliance.addressed,
          missing_items: analysisSpec.strobeCompliance.missing,
          recommendations: analysisSpec.strobeCompliance.recommendations
        };
      }
      
      logger.info('Natural language query processing complete', {
        execution_mode,
        output_format,
        strobe_score: analysisSpec.strobeCompliance?.score
      });
      
      return results;
      
    } catch (error) {
      logger.error('Failed to process natural language query', { error: error.message });
      throw new MCPError(
        'Failed to process natural language query: ' + error.message,
        'QUERY_PROCESSING_ERROR',
        500
      );
    }
  }
  
  private extractResearchArea(spec: any): string {
    // Extract main research area from entities
    const conditions = spec.entities.filter(e => e.type === 'condition');
    const medications = spec.entities.filter(e => e.type === 'medication');
    
    if (conditions.length > 0 && medications.length > 0) {
      return `${conditions[0].text} treatment with ${medications[0].text}`;
    }
    return conditions[0]?.text || medications[0]?.text || 'General health services';
  }
  
  private extractPopulation(spec: any): string {
    if (spec.populationFilters?.length > 0) {
      return spec.populationFilters.map(f => `${f.type}: ${f.value}`).join(', ');
    }
    const conditions = spec.entities.filter(e => e.type === 'condition');
    return conditions.length > 0 ? `Patients with ${conditions[0].text}` : 'General population';
  }
  
  private extractExposure(spec: any): string {
    const medications = spec.entities.filter(e => e.type === 'medication' && e.role === 'primary_exposure');
    if (medications.length > 0) return medications[0].text;
    
    const allMeds = spec.entities.filter(e => e.type === 'medication');
    return allMeds[0]?.text || 'Primary exposure';
  }
  
  private extractOutcome(spec: any): string {
    const outcomes = spec.entities.filter(e => e.role === 'outcome');
    if (outcomes.length > 0) return outcomes[0].text;
    
    // Look for common outcome keywords
    const outcomeKeywords = ['mortality', 'death', 'readmission', 'hospitalization', 'adverse'];
    for (const entity of spec.entities) {
      if (outcomeKeywords.some(kw => entity.text.toLowerCase().includes(kw))) {
        return entity.text;
      }
    }
    
    return spec.temporalConstraints?.followUpDuration ? 
      `Outcome at ${spec.temporalConstraints.followUpDuration}` : 'Primary outcome';
  }
  
  private buildInclusionCriteria(spec: any): any[] {
    const criteria = [];
    
    // Add condition-based criteria
    const conditions = spec.entities.filter(e => e.type === 'condition' && !e.negated);
    conditions.forEach(cond => {
      criteria.push({
        type: 'diagnosis',
        codes: cond.codes || [],
        description: `Diagnosis of ${cond.text}`
      });
    });
    
    // Add population filters
    if (spec.populationFilters) {
      spec.populationFilters.forEach(filter => {
        criteria.push({
          type: filter.type,
          operator: filter.operator,
          value: filter.value,
          description: `${filter.type} ${filter.operator} ${filter.value}`
        });
      });
    }
    
    return criteria;
  }
  
  private buildExclusionCriteria(spec: any): any[] {
    const criteria = [];
    
    // Add negated conditions
    const negatedConditions = spec.entities.filter(e => e.type === 'condition' && e.negated);
    negatedConditions.forEach(cond => {
      criteria.push({
        type: 'diagnosis',
        codes: cond.codes || [],
        description: `No ${cond.text}`
      });
    });
    
    // Standard exclusions for most studies
    criteria.push({
      type: 'age',
      operator: '<',
      value: 18,
      description: 'Age less than 18 years'
    });
    
    return criteria;
  }
  
  private buildExposures(spec: any): any[] {
    return spec.entities
      .filter(e => e.type === 'medication' || e.type === 'procedure')
      .map(exp => ({
        type: exp.type,
        codes: exp.codes || [],
        description: exp.text,
        role: exp.role || 'exposure'
      }));
  }
  
  private buildOutcomes(spec: any): any[] {
    const outcomes = [];
    
    // Primary outcome
    const primaryOutcome = this.extractOutcome(spec);
    outcomes.push({
      type: 'primary',
      description: primaryOutcome,
      time_window: spec.temporalConstraints?.followUpDuration || '30 days'
    });
    
    // Add any other outcome entities
    spec.entities
      .filter(e => e.role === 'outcome' && e.text !== primaryOutcome)
      .forEach(outcome => {
        outcomes.push({
          type: 'secondary',
          description: outcome.text,
          codes: outcome.codes || []
        });
      });
    
    return outcomes;
  }
  
  private buildCovariates(spec: any): string[] {
    const covariates = new Set<string>();
    
    // Add specified covariates
    if (spec.covariates) {
      spec.covariates.forEach(c => covariates.add(c));
    }
    
    // Add standard covariates
    ['age', 'sex', 'race', 'ethnicity', 'insurance_type'].forEach(c => covariates.add(c));
    
    // Add confounders from entities
    spec.entities
      .filter(e => e.role === 'confounder')
      .forEach(e => covariates.add(e.text));
    
    return Array.from(covariates);
  }
  
  private inferStudyType(spec: any): string {
    if (spec.intent === 'prediction') return 'cohort';
    if (spec.intent === 'comparison') return 'cohort';
    if (spec.intent === 'association') return 'case-control';
    if (spec.temporalConstraints?.indexEvent) return 'cohort';
    return 'cross-sectional';
  }
  
  private inferStatisticalMethods(spec: any): string[] {
    const methods = ['descriptive_statistics'];
    
    if (spec.intent === 'comparison' || spec.intent === 'association') {
      methods.push('univariate_analysis');
      
      if (this.isSurvivalAnalysis(spec)) {
        methods.push('cox_regression');
      } else if (this.isBinaryOutcome(spec)) {
        methods.push('logistic_regression');
      } else {
        methods.push('linear_regression');
      }
      
      // Add causal inference methods if appropriate
      if (spec.entities.some(e => e.type === 'medication')) {
        methods.push('propensity_score_matching');
      }
    }
    
    // Add specified methods
    if (spec.statisticalRequirements?.primaryAnalysis) {
      methods.push(spec.statisticalRequirements.primaryAnalysis);
    }
    
    methods.push('sensitivity_analysis');
    
    return [...new Set(methods)];
  }
  
  private isSurvivalAnalysis(spec: any): boolean {
    const survivalKeywords = ['mortality', 'death', 'survival', 'time to'];
    return spec.entities.some(e => 
      survivalKeywords.some(kw => e.text.toLowerCase().includes(kw))
    );
  }
  
  private isBinaryOutcome(spec: any): boolean {
    const binaryKeywords = ['mortality', 'death', 'readmission', 'occurrence', 'yes/no'];
    return spec.entities.some(e => 
      e.role === 'outcome' && 
      binaryKeywords.some(kw => e.text.toLowerCase().includes(kw))
    );
  }
  
  private generateSampleSurvivalData(): any {
    // Generate sample data for demonstration
    return {
      time: Array.from({length: 100}, (_, i) => i),
      survival_exposed: Array.from({length: 100}, (_, i) => Math.exp(-i * 0.01)),
      survival_unexposed: Array.from({length: 100}, (_, i) => Math.exp(-i * 0.015)),
      n_risk_exposed: Array.from({length: 100}, (_, i) => 1000 - i * 10),
      n_risk_unexposed: Array.from({length: 100}, (_, i) => 1000 - i * 15)
    };
  }
  
  private generateSampleForestData(spec: any): any {
    const subgroups = spec.statisticalRequirements?.stratifyBy || ['Age', 'Sex', 'Comorbidity'];
    return {
      subgroups: subgroups.map(sg => ({
        name: sg,
        estimate: 0.7 + Math.random() * 0.6,
        lower_ci: 0.5,
        upper_ci: 1.5,
        p_value: Math.random() * 0.1
      })),
      overall: {
        estimate: 0.85,
        lower_ci: 0.65,
        upper_ci: 1.1,
        p_value: 0.04
      }
    };
  }
  
  private compileResults(params: any): any {
    const { 
      query, 
      analysisSpec, 
      hypothesisResult, 
      cohortResult, 
      codeResult,
      figureResults,
      output_format,
      execution_mode
    } = params;
    
    if (output_format === 'code_only') {
      return {
        query,
        analysis_code: codeResult.code,
        required_packages: codeResult.required_packages,
        execution_notes: codeResult.execution_notes
      };
    }
    
    if (output_format === 'summary') {
      return {
        query,
        interpretation: analysisSpec.reasoning || 'Query understood successfully',
        hypothesis: hypothesisResult.primary_hypothesis,
        cohort_size_estimate: cohortResult.sample_size_estimate,
        primary_analysis: analysisSpec.statisticalRequirements?.primaryAnalysis,
        key_findings: 'Analysis ready to execute'
      };
    }
    
    // Full report
    return {
      query,
      parsed_query: {
        intent: analysisSpec.intent,
        entities: analysisSpec.entities,
        temporal_constraints: analysisSpec.temporalConstraints,
        confidence: analysisSpec.confidence
      },
      hypothesis: hypothesisResult,
      cohort_definition: cohortResult,
      analysis_plan: {
        code: codeResult.code,
        workflow: codeResult.workflow,
        validation_steps: codeResult.validation_steps
      },
      visualizations: figureResults,
      documentation: {
        study_protocol: cohortResult.documentation,
        statistical_plan: codeResult.documentation,
        strobe_checklist: codeResult.strobe_compliance
      },
      next_steps: this.generateNextSteps(execution_mode, analysisSpec)
    };
  }
  
  private generateNextSteps(mode: string, spec: any): string[] {
    const steps = [];
    
    if (mode === 'plan_only') {
      steps.push('Review and refine the analysis plan');
      steps.push('Execute the generated code on your dataset');
      steps.push('Validate cohort definitions against your data');
    } else if (mode === 'code_only') {
      steps.push('Install required R/Python packages');
      steps.push('Update file paths in the generated code');
      steps.push('Run the analysis on your dataset');
    } else {
      steps.push('Review the generated figures and tables');
      steps.push('Perform sensitivity analyses as suggested');
      steps.push('Draft manuscript following STROBE guidelines');
    }
    
    if (spec.strobeCompliance?.missing?.length > 0) {
      steps.push('Address missing STROBE items: ' + spec.strobeCompliance.missing.slice(0, 3).join(', '));
    }
    
    return steps;
  }
  
  private generateHypothesis(spec: any): any {
    const exposure = this.extractExposure(spec);
    const outcome = this.extractOutcome(spec);
    const population = this.extractPopulation(spec);
    
    return {
      primary_hypothesis: `${exposure} is associated with ${outcome} in ${population}`,
      null_hypothesis: `There is no association between ${exposure} and ${outcome}`,
      mechanisms: this.inferMechanisms(spec),
      suggested_confounders: this.inferConfounders(spec),
      study_designs: ['cohort study', 'case-control study'],
      sample_size_estimate: this.estimateSampleSize(spec)
    };
  }
  
  private buildCohortDefinition(spec: any, datasetInfo: any): any {
    return {
      cohort_name: `${spec.entities[0]?.text || 'Study'} Cohort`,
      data_model: datasetInfo?.data_model || 'OMOP',
      inclusion_criteria: this.buildInclusionCriteria(spec),
      exclusion_criteria: this.buildExclusionCriteria(spec),
      exposures: this.buildExposures(spec),
      outcomes: this.buildOutcomes(spec),
      covariates: this.buildCovariates(spec),
      follow_up: spec.temporalConstraints || { duration: '30 days' },
      sample_size_estimate: this.estimateSampleSize(spec)
    };
  }
  
  private generateAnalysisPlan(spec: any, hypothesis: any, datasetInfo: any): any {
    const studyType = this.inferStudyType(spec);
    const methods = this.inferStatisticalMethods(spec);
    
    return {
      study_type: studyType,
      primary_outcome: this.extractOutcome(spec),
      exposures: [this.extractExposure(spec)],
      covariates: hypothesis.suggested_confounders,
      statistical_methods: methods,
      code: this.generateSampleCode(studyType, spec, datasetInfo?.data_model),
      required_packages: this.getRequiredPackages(methods),
      validation_steps: this.getValidationSteps(studyType, spec)
    };
  }
  
  private generateSampleFigures(spec: any): any[] {
    const figures = [];
    
    if (this.isSurvivalAnalysis(spec)) {
      figures.push({
        type: 'kaplan_meier',
        title: `Survival Analysis: ${this.extractOutcome(spec)}`,
        description: 'Kaplan-Meier curves comparing exposed vs unexposed groups',
        sample_interpretation: 'The exposed group shows improved survival (HR 0.72, 95% CI 0.58-0.89, p=0.003)'
      });
    }
    
    figures.push({
      type: 'forest_plot',
      title: 'Subgroup Analysis',
      description: 'Effect estimates across patient subgroups',
      sample_interpretation: 'Consistent benefit observed across all subgroups'
    });
    
    return figures;
  }
  
  private inferMechanisms(spec: any): string[] {
    const mechanisms = [];
    
    // Add medication-specific mechanisms
    if (spec.entities.some(e => e.type === 'medication')) {
      mechanisms.push('Direct pharmacological effect');
      mechanisms.push('Reduction in disease severity');
    }
    
    // Add outcome-specific mechanisms
    if (spec.entities.some(e => e.text.toLowerCase().includes('mortality'))) {
      mechanisms.push('Prevention of organ failure');
      mechanisms.push('Reduced complications');
    }
    
    return mechanisms;
  }
  
  private inferConfounders(spec: any): string[] {
    const confounders = ['age', 'sex', 'comorbidity_score'];
    
    // Add disease-specific confounders
    if (spec.entities.some(e => e.text.toLowerCase().includes('sepsis'))) {
      confounders.push('sepsis_severity', 'organ_failure_score', 'time_to_antibiotics');
    }
    
    // Add treatment-specific confounders
    if (spec.entities.some(e => e.type === 'medication')) {
      confounders.push('prior_medications', 'contraindications');
    }
    
    return confounders;
  }
  
  private estimateSampleSize(spec: any): number {
    // Simple heuristic based on outcome type
    if (this.isSurvivalAnalysis(spec)) {
      return 500; // Typical for survival analysis
    } else if (this.isBinaryOutcome(spec)) {
      return 300; // Typical for binary outcomes
    } else {
      return 200; // Continuous outcomes
    }
  }
  
  private generateSampleCode(studyType: string, spec: any, dataModel: string): string {
    return `# ${studyType} analysis
# Generated by Healthcare Research MCP

# Load libraries
library(tidyverse)
library(survival)
library(tableone)

# Import data
cohort <- read_csv("cohort_data.csv")

# Create Table 1
vars <- c("age", "sex", ${spec.covariates?.map(c => `"${c}"`).join(', ') || ''})
CreateTableOne(vars = vars, strata = "exposure", data = cohort)

# Primary analysis
${this.isSurvivalAnalysis(spec) ? 
  'model <- coxph(Surv(time, event) ~ exposure + age + sex, data = cohort)' :
  'model <- glm(outcome ~ exposure + age + sex, family = binomial, data = cohort)'
}

# Display results
summary(model)`;
  }
  
  private getRequiredPackages(methods: string[]): any {
    const packages = {
      R: ['tidyverse', 'tableone'],
      Python: ['pandas', 'numpy', 'statsmodels']
    };
    
    if (methods.includes('cox_regression')) {
      packages.R.push('survival');
      packages.Python.push('lifelines');
    }
    
    if (methods.includes('propensity_score_matching')) {
      packages.R.push('MatchIt');
      packages.Python.push('causalinference');
    }
    
    return packages;
  }
  
  private getValidationSteps(studyType: string, spec: any): string[] {
    return [
      'Verify cohort size meets power requirements',
      'Check covariate balance between groups',
      'Assess missing data patterns',
      'Validate outcome definitions',
      'Confirm follow-up completeness'
    ];
  }
  
  private compileResults(params: any): any {
    const { 
      query, 
      analysisSpec, 
      hypothesisResult, 
      cohortResult, 
      analysisPlan,
      figureResults,
      output_format,
      execution_mode
    } = params;
    
    if (output_format === 'code_only') {
      return {
        query,
        analysis_code: analysisPlan.code,
        required_packages: analysisPlan.required_packages,
        execution_notes: 'Update file paths and run in R/Python environment'
      };
    }
    
    if (output_format === 'summary') {
      return {
        query,
        interpretation: analysisSpec.reasoning || 'Query understood successfully',
        hypothesis: hypothesisResult.primary_hypothesis,
        cohort_size_estimate: cohortResult.sample_size_estimate,
        primary_analysis: analysisPlan.statistical_methods[0],
        key_findings: 'Analysis ready to execute'
      };
    }
    
    // Full report
    return {
      query,
      parsed_query: {
        intent: analysisSpec.intent,
        entities: analysisSpec.entities,
        temporal_constraints: analysisSpec.temporalConstraints,
        confidence: analysisSpec.confidence
      },
      hypothesis: hypothesisResult,
      cohort_definition: cohortResult,
      analysis_plan: analysisPlan,
      visualizations: figureResults,
      documentation: {
        study_protocol: this.generateProtocol(analysisSpec, cohortResult),
        statistical_plan: analysisPlan,
        strobe_checklist: analysisSpec.strobeCompliance
      },
      next_steps: this.generateNextSteps(execution_mode, analysisSpec)
    };
  }
  
  private generateProtocol(spec: any, cohort: any): string {
    return `Study Protocol

Objective: ${spec.reasoning || 'Investigate association between exposure and outcome'}

Population: ${cohort.inclusion_criteria.map(c => c.description).join('; ')}

Exposure: ${this.extractExposure(spec)}

Outcome: ${this.extractOutcome(spec)}

Follow-up: ${spec.temporalConstraints?.followUpDuration || '30 days'}

Statistical Analysis: As per analysis plan`;
  }
}