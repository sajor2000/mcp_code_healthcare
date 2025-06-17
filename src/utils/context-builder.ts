import { Database } from 'better-sqlite3';

export interface AnalysisSpec {
  study_question: string;
  outcomes: string[];
  predictors: string[];
  covariates: string[];
  analysis_plan: AnalysisPlan[];
  table_one: {
    strata?: string;
    variables?: string[];
  };
  figures: string[];
  hipaa: boolean;
  data_model: 'OMOP' | 'CLIF';
  time_window?: {
    start?: string;
    end?: string;
    anchor?: string;
  };
}

export interface AnalysisPlan {
  type: string;
  parameters: Record<string, any>;
}

export class ContextBuilder {
  private db: Database;
  private variableMappings: Map<string, string[]> = new Map();
  private analysisPatterns: Map<string, AnalysisPlan> = new Map();
  
  constructor(db: Database) {
    this.db = db;
    this.initializeMappings();
    this.initializePatterns();
  }
  
  private initializeMappings() {
    // Common variable name mappings
    this.variableMappings.set('readmission', [
      'readmit', 'readmission_flag', 'readmitted', 'return_visit',
      'subsequent_admission', 'readmission_30d', 'readmission_90d'
    ]);
    
    this.variableMappings.set('mortality', [
      'death', 'died', 'mortality_flag', 'deceased', 'vital_status',
      'survival', 'death_date', 'mortality_30d', 'in_hospital_mortality'
    ]);
    
    this.variableMappings.set('age', [
      'age', 'age_at_admission', 'age_years', 'patient_age', 'birth_date'
    ]);
    
    this.variableMappings.set('sex', [
      'sex', 'gender', 'gender_concept_id', 'sex_at_birth', 'biological_sex'
    ]);
    
    this.variableMappings.set('comorbidity', [
      'charlson', 'charlson_score', 'cci', 'comorbidity_index',
      'elixhauser', 'comorbidity_score'
    ]);
    
    this.variableMappings.set('treatment', [
      'treatment_arm', 'intervention', 'drug_exposure', 'medication',
      'therapy', 'treatment_group', 'exposure'
    ]);
  }
  
  private initializePatterns() {
    // Analysis pattern templates
    this.analysisPatterns.set('compare_groups', {
      type: 'group_comparison',
      parameters: {
        test_continuous: 'wilcoxon_rank_sum',
        test_categorical: 'chi_squared',
        adjust_for: []
      }
    });
    
    this.analysisPatterns.set('predict_outcome', {
      type: 'prediction_model',
      parameters: {
        model_type: 'logistic_regression',
        validation: 'cross_validation',
        metrics: ['auc', 'sensitivity', 'specificity']
      }
    });
    
    this.analysisPatterns.set('survival_analysis', {
      type: 'survival',
      parameters: {
        method: 'cox_regression',
        time_to_event: 'days',
        plot: 'kaplan_meier'
      }
    });
  }
  
  async parseNaturalLanguageQuery(query: string): Promise<AnalysisSpec> {
    // Normalize query
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extract key components
    const outcomes = this.extractOutcomes(normalizedQuery);
    const predictors = this.extractPredictors(normalizedQuery);
    const covariates = this.extractCovariates(normalizedQuery);
    const analysisType = this.inferAnalysisType(normalizedQuery);
    const timeWindow = this.extractTimeWindow(normalizedQuery);
    
    // Build analysis plan
    const analysisPlan = this.buildAnalysisPlan(
      normalizedQuery,
      analysisType,
      outcomes,
      predictors,
      covariates
    );
    
    // Determine figures needed
    const figures = this.determineFigures(analysisType, normalizedQuery);
    
    // Check if HIPAA compliance is mentioned
    const hipaa = this.checkHipaaRequirement(normalizedQuery);
    
    // Infer data model
    const dataModel = this.inferDataModel(normalizedQuery);
    
    return {
      study_question: query,
      outcomes,
      predictors,
      covariates,
      analysis_plan: analysisPlan,
      table_one: {
        strata: predictors[0] || undefined,
        variables: [...covariates, ...outcomes]
      },
      figures,
      hipaa,
      data_model: dataModel,
      time_window: timeWindow
    };
  }
  
  private extractOutcomes(query: string): string[] {
    const outcomes = [];
    
    // Look for outcome keywords
    const outcomePatterns = [
      /(?:outcome|endpoint|predict|compare|assess|evaluate)\s+(?:of\s+)?(\w+(?:\s+\w+)*)/g,
      /(\w+(?:\s+\w+)*)\s+(?:risk|rate|incidence|prevalence)/g,
      /(?:30.?day|90.?day|1.?year)\s+(\w+)/g
    ];
    
    for (const pattern of outcomePatterns) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const outcome = this.mapToStandardVariable(match[1]);
        if (outcome && !outcomes.includes(outcome)) {
          outcomes.push(outcome);
        }
      }
    }
    
    // Check for specific outcomes
    if (query.includes('readmission')) outcomes.push('readmission');
    if (query.includes('mortality') || query.includes('death')) outcomes.push('mortality');
    if (query.includes('length of stay') || query.includes('los')) outcomes.push('length_of_stay');
    if (query.includes('complication')) outcomes.push('complications');
    
    return outcomes;
  }
  
  private extractPredictors(query: string): string[] {
    const predictors = [];
    
    // Look for comparison/treatment keywords
    const predictorPatterns = [
      /compare\s+(\w+(?:\s+\w+)*)\s+(?:to|vs|versus|and)\s+(\w+(?:\s+\w+)*)/g,
      /between\s+(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)/g,
      /(?:treatment|intervention|exposure|drug)\s+(\w+(?:\s+\w+)*)/g,
      /(\w+)\s+(?:arm|group|cohort)/g
    ];
    
    for (const pattern of predictorPatterns) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        // Handle comparison patterns (two groups)
        if (match[2]) {
          const pred = 'treatment_group';
          if (!predictors.includes(pred)) {
            predictors.push(pred);
          }
        } else {
          const pred = this.mapToStandardVariable(match[1]);
          if (pred && !predictors.includes(pred)) {
            predictors.push(pred);
          }
        }
      }
    }
    
    return predictors;
  }
  
  private extractCovariates(query: string): string[] {
    const covariates = [];
    
    // Look for adjustment keywords
    const covarPatterns = [
      /adjust(?:ing|ed)?\s+for\s+([^,.]+)/g,
      /control(?:ling|led)?\s+for\s+([^,.]+)/g,
      /account(?:ing|ed)?\s+for\s+([^,.]+)/g,
      /stratif(?:y|ied)\s+by\s+([^,.]+)/g
    ];
    
    for (const pattern of covarPatterns) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const vars = match[1].split(/\s*,\s*|\s+and\s+/);
        for (const v of vars) {
          const covar = this.mapToStandardVariable(v.trim());
          if (covar && !covariates.includes(covar)) {
            covariates.push(covar);
          }
        }
      }
    }
    
    // Add common covariates if mentioned
    if (query.includes('age')) covariates.push('age');
    if (query.includes('sex') || query.includes('gender')) covariates.push('sex');
    if (query.includes('comorbid') || query.includes('charlson')) covariates.push('comorbidity_score');
    
    return [...new Set(covariates)]; // Remove duplicates
  }
  
  private inferAnalysisType(query: string): string {
    // Survival analysis indicators
    if (query.match(/time.to|survival|hazard|cox|kaplan.meier/i)) {
      return 'survival';
    }
    
    // Prediction/ML indicators
    if (query.match(/predict|machine.learning|classifier|auc|roc/i)) {
      return 'prediction';
    }
    
    // Association/comparison indicators
    if (query.match(/associat|correlat|relationship|compare|versus|between/i)) {
      return 'association';
    }
    
    // Trend analysis
    if (query.match(/trend|over.time|temporal|longitudinal/i)) {
      return 'trend';
    }
    
    return 'descriptive';
  }
  
  private buildAnalysisPlan(
    query: string,
    analysisType: string,
    outcomes: string[],
    predictors: string[],
    covariates: string[]
  ): AnalysisPlan[] {
    const plan: AnalysisPlan[] = [];
    
    // Always start with descriptive statistics
    plan.push({
      type: 'descriptive_statistics',
      parameters: {
        variables: [...outcomes, ...predictors, ...covariates],
        by_group: predictors[0] || null
      }
    });
    
    // Add specific analyses based on type
    switch (analysisType) {
      case 'survival':
        plan.push({
          type: 'kaplan_meier',
          parameters: {
            time: 'followup_time',
            event: outcomes[0],
            strata: predictors[0]
          }
        });
        
        plan.push({
          type: 'cox_regression',
          parameters: {
            time: 'followup_time',
            event: outcomes[0],
            predictors,
            covariates,
            interaction_terms: this.extractInteractionTerms(query)
          }
        });
        break;
        
      case 'prediction':
        plan.push({
          type: 'logistic_regression',
          parameters: {
            outcome: outcomes[0],
            predictors: [...predictors, ...covariates],
            interactions: []
          }
        });
        
        if (query.includes('machine learning') || query.includes('ml')) {
          plan.push({
            type: 'machine_learning',
            parameters: {
              outcome: outcomes[0],
              algorithms: ['xgboost', 'random_forest'],
              features: [...predictors, ...covariates],
              validation: 'cross_validation',
              metrics: ['auc', 'accuracy', 'sensitivity', 'specificity']
            }
          });
        }
        break;
        
      case 'association':
        // Bivariate analysis
        plan.push({
          type: 'bivariate_analysis',
          parameters: {
            outcome: outcomes[0],
            predictor: predictors[0],
            test: 'auto' // Will choose based on variable types
          }
        });
        
        // Multivariable analysis
        if (covariates.length > 0) {
          const modelType = this.isOutcomeBinary(outcomes[0]) 
            ? 'logistic_regression' 
            : 'linear_regression';
            
          plan.push({
            type: modelType,
            parameters: {
              outcome: outcomes[0],
              predictors,
              covariates
            }
          });
        }
        break;
    }
    
    // Add sensitivity analyses if mentioned
    if (query.includes('sensitiv')) {
      plan.push({
        type: 'sensitivity_analysis',
        parameters: {
          methods: ['complete_case', 'per_protocol', 'e_value']
        }
      });
    }
    
    return plan;
  }
  
  private determineFigures(analysisType: string, query: string): string[] {
    const figures = [];
    
    // Analysis-specific figures
    switch (analysisType) {
      case 'survival':
        figures.push('kaplan_meier_curve');
        figures.push('forest_plot');
        break;
      case 'prediction':
        figures.push('roc_curve');
        figures.push('calibration_plot');
        if (query.includes('importance')) {
          figures.push('feature_importance');
        }
        break;
      case 'association':
        figures.push('forest_plot');
        break;
    }
    
    // Add requested figures
    if (query.includes('consort')) figures.push('consort_diagram');
    if (query.includes('flow')) figures.push('flow_diagram');
    if (query.includes('box plot')) figures.push('box_plot');
    if (query.includes('scatter')) figures.push('scatter_plot');
    
    return [...new Set(figures)];
  }
  
  private extractTimeWindow(query: string): any {
    const timeWindow: any = {};
    
    // Extract dates
    const datePattern = /(?:from|between|during)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)/g;
    const dates = [...query.matchAll(datePattern)];
    
    if (dates.length > 0) {
      timeWindow.start = dates[0][1];
      if (dates.length > 1) {
        timeWindow.end = dates[1][1];
      }
    }
    
    // Extract relative time
    const relativePattern = /(?:past|last)\s+(\d+)\s+(year|month|day)s?/i;
    const relative = query.match(relativePattern);
    
    if (relative) {
      const amount = parseInt(relative[1]);
      const unit = relative[2];
      const now = new Date();
      
      switch (unit.toLowerCase()) {
        case 'year':
          now.setFullYear(now.getFullYear() - amount);
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
      }
      
      timeWindow.start = now.toISOString().split('T')[0];
      timeWindow.end = new Date().toISOString().split('T')[0];
    }
    
    return Object.keys(timeWindow).length > 0 ? timeWindow : undefined;
  }
  
  private checkHipaaRequirement(query: string): boolean {
    const hipaaIndicators = [
      'hipaa', 'compliant', 'de-identif', 'deidentif', 'phi',
      'protected health', 'privacy', 'anonymous', 'aggregate only'
    ];
    
    return hipaaIndicators.some(indicator => 
      query.toLowerCase().includes(indicator)
    );
  }
  
  private inferDataModel(query: string): 'OMOP' | 'CLIF' {
    if (query.toLowerCase().includes('icu') || 
        query.toLowerCase().includes('intensive care') ||
        query.toLowerCase().includes('critical care') ||
        query.toLowerCase().includes('clif')) {
      return 'CLIF';
    }
    
    return 'OMOP'; // Default to OMOP
  }
  
  private mapToStandardVariable(term: string): string | null {
    const normalized = term.toLowerCase().trim();
    
    // Direct mapping
    for (const [standard, variants] of this.variableMappings) {
      if (normalized === standard || variants.includes(normalized)) {
        return standard;
      }
      
      // Fuzzy matching
      if (variants.some(v => v.includes(normalized) || normalized.includes(v))) {
        return standard;
      }
    }
    
    // Return cleaned version if no mapping found
    return normalized.replace(/\s+/g, '_');
  }
  
  private extractInteractionTerms(query: string): string[] {
    const interactions = [];
    
    const interactionPattern = /interaction\s+between\s+(\w+)\s+and\s+(\w+)/gi;
    const matches = [...query.matchAll(interactionPattern)];
    
    for (const match of matches) {
      const var1 = this.mapToStandardVariable(match[1]);
      const var2 = this.mapToStandardVariable(match[2]);
      if (var1 && var2) {
        interactions.push(`${var1}:${var2}`);
      }
    }
    
    return interactions;
  }
  
  private isOutcomeBinary(outcome: string): boolean {
    const binaryOutcomes = [
      'mortality', 'death', 'readmission', 'complication',
      'event', 'flag', 'status', 'occurrence'
    ];
    
    return binaryOutcomes.some(binary => outcome.includes(binary));
  }
  
  // Utility method to validate and refine the analysis spec
  async validateAnalysisSpec(spec: AnalysisSpec): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues = [];
    const suggestions = [];
    
    // Check for required components
    if (spec.outcomes.length === 0) {
      issues.push('No outcome variables identified');
      suggestions.push('Specify the outcome you want to analyze (e.g., "30-day readmission")');
    }
    
    if (spec.analysis_plan.length === 0) {
      issues.push('No analysis methods identified');
      suggestions.push('Specify the type of analysis (e.g., "compare", "predict", "associate")');
    }
    
    // Check for common issues
    if (spec.predictors.length === 0 && spec.analysis_plan.some(a => a.type !== 'descriptive_statistics')) {
      issues.push('No predictor variables identified for analysis');
      suggestions.push('Specify what you want to compare or use as predictors');
    }
    
    // Validate variable names against schema if database available
    if (this.db) {
      await this.validateVariableNames(spec, issues, suggestions);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }
  
  private async validateVariableNames(
    spec: AnalysisSpec,
    issues: string[],
    suggestions: string[]
  ) {
    // This would check against actual database schema
    // For now, just placeholder validation
    const allVars = [
      ...spec.outcomes,
      ...spec.predictors,
      ...spec.covariates
    ];
    
    for (const variable of allVars) {
      // Check if variable exists in schema
      // If not, suggest closest match
    }
  }
}