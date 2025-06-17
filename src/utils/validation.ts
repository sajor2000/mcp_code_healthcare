import Joi from 'joi';
import { ValidationError } from './errors.js';

// Common validation schemas
export const commonSchemas = {
  // Medical code validation
  icd10Code: Joi.string()
    .pattern(/^[A-Z]\d{2}\.?\d{0,2}$/)
    .message('Invalid ICD-10 code format'),
  
  snomedCode: Joi.string()
    .pattern(/^\d{6,18}$/)
    .message('Invalid SNOMED CT code format'),
  
  rxcui: Joi.string()
    .pattern(/^\d{1,7}$/)
    .message('Invalid RxNorm RXCUI format'),
  
  loincCode: Joi.string()
    .pattern(/^\d{1,5}-\d{1}$/)
    .message('Invalid LOINC code format'),
  
  // Date validation
  dateString: Joi.string()
    .isoDate()
    .message('Date must be in ISO format (YYYY-MM-DD)'),
  
  dateRange: Joi.object({
    start: Joi.string().isoDate().required(),
    end: Joi.string().isoDate().required()
  }).custom((value, helpers) => {
    if (new Date(value.start) > new Date(value.end)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'date range validation').message('Start date must be before end date'),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    sort: Joi.string().valid('asc', 'desc').default('asc'),
    sortBy: Joi.string()
  }),
  
  // Clinical values
  labValue: Joi.object({
    test: Joi.string().required(),
    operator: Joi.string().valid('<', '>', '<=', '>=', '=', '!=').required(),
    value: Joi.number().required(),
    unit: Joi.string()
  })
};

// Tool-specific validation schemas
export const toolSchemas = {
  // Hypothesis generator
  hypothesisGenerator: Joi.object({
    clinical_area: Joi.string().required()
      .min(2).max(100)
      .description('Clinical area of interest'),
    outcome_of_interest: Joi.string().required()
      .min(2).max(100)
      .description('Primary outcome'),
    population: Joi.string()
      .min(2).max(100)
      .default('general adult')
      .description('Target population'),
    data_sources: Joi.array()
      .items(Joi.string().valid('OMOP', 'CLIF', 'both'))
      .default(['both'])
      .description('Available data sources'),
    hypothesis_types: Joi.array()
      .items(Joi.string().valid(
        'association',
        'prediction',
        'comparative_effectiveness',
        'trajectory',
        'subgroup'
      ))
      .default(['association', 'prediction', 'comparative_effectiveness'])
      .description('Types of hypotheses to generate')
  }),
  
  // Cohort builder
  cohortBuilder: Joi.object({
    cohort_name: Joi.string().required()
      .min(3).max(100),
    description: Joi.string().max(500),
    data_model: Joi.string()
      .valid('OMOP', 'CLIF')
      .required(),
    inclusion_criteria: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('diagnosis', 'procedure', 'medication', 'lab', 'demographic').required(),
        codes: Joi.array().items(Joi.string()).when('type', {
          is: Joi.valid('diagnosis', 'procedure', 'medication'),
          then: Joi.required()
        }),
        code_system: Joi.string().when('type', {
          is: Joi.valid('diagnosis', 'procedure', 'medication'),
          then: Joi.valid('ICD10', 'SNOMED', 'CPT', 'RxNorm').required()
        }),
        values: Joi.array().items(commonSchemas.labValue).when('type', {
          is: 'lab',
          then: Joi.required()
        }),
        age_range: Joi.object({
          min: Joi.number().integer().min(0),
          max: Joi.number().integer().max(150)
        }).when('type', {
          is: 'demographic',
          then: Joi.required()
        })
      })
    ).min(1).required(),
    exclusion_criteria: Joi.array().items(Joi.object()),
    time_window: commonSchemas.dateRange
  }),
  
  // Code generator
  codeGenerator: Joi.object({
    study_type: Joi.string()
      .valid('cohort', 'case-control', 'cross-sectional', 'rct_emulation')
      .required(),
    analysis_plan: Joi.object({
      primary_outcome: Joi.string().required(),
      predictors: Joi.array().items(Joi.string()).min(1).required(),
      covariates: Joi.array().items(Joi.string()),
      statistical_methods: Joi.array().items(Joi.string()).min(1).required()
    }).required(),
    programming_language: Joi.string()
      .valid('R', 'Python', 'SAS', 'Stata')
      .default('R'),
    data_model: Joi.string()
      .valid('OMOP', 'CLIF', 'custom')
      .default('OMOP'),
    output_components: Joi.array()
      .items(Joi.string().valid(
        'data_import',
        'data_cleaning',
        'table_one',
        'primary_analysis',
        'sensitivity_analysis',
        'figures',
        'report'
      ))
      .default(['data_import', 'data_cleaning', 'table_one', 'primary_analysis', 'figures'])
  }),
  
  // Figure generator
  figureGenerator: Joi.object({
    figure_type: Joi.string()
      .valid('kaplan_meier', 'forest_plot', 'roc_curve', 'consort_diagram', 'box_plot', 'scatter_plot', 'heatmap')
      .required(),
    data: Joi.object().required(),
    journal_style: Joi.string()
      .valid('NEJM', 'JAMA', 'Lancet', 'BMJ', 'Nature', 'Science', 'Generic')
      .default('Generic'),
    customizations: Joi.object({
      title: Joi.string(),
      x_label: Joi.string(),
      y_label: Joi.string(),
      color_scheme: Joi.array().items(Joi.string()),
      width: Joi.number().min(300).max(2400),
      height: Joi.number().min(200).max(1600),
      dpi: Joi.number().min(72).max(600).default(300)
    }),
    export_format: Joi.string()
      .valid('svg', 'png', 'pdf', 'react_component', 'html')
      .default('svg')
  })
};

// Validation helper class
export class Validator {
  static validate<T>(schema: Joi.Schema, data: any): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      throw new ValidationError('Validation failed', errors);
    }
    
    return value as T;
  }
  
  static async validateAsync<T>(schema: Joi.Schema, data: any): Promise<T> {
    try {
      const value = await schema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      return value as T;
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));
        
        throw new ValidationError('Validation failed', errors);
      }
      throw error;
    }
  }
  
  // Convenience methods for common validations
  static isValidICD10(code: string): boolean {
    const { error } = commonSchemas.icd10Code.validate(code);
    return !error;
  }
  
  static isValidSNOMED(code: string): boolean {
    const { error } = commonSchemas.snomedCode.validate(code);
    return !error;
  }
  
  static isValidRxNorm(code: string): boolean {
    const { error } = commonSchemas.rxcui.validate(code);
    return !error;
  }
  
  static isValidLOINC(code: string): boolean {
    const { error } = commonSchemas.loincCode.validate(code);
    return !error;
  }
  
  // Sanitization methods
  static sanitizeSQL(input: string): string {
    // Basic SQL injection prevention
    return input.replace(/['";\\]/g, '');
  }
  
  static sanitizeFilename(filename: string): string {
    // Remove potentially dangerous characters from filenames
    return filename.replace(/[^a-zA-Z0-9.-_]/g, '_');
  }
}