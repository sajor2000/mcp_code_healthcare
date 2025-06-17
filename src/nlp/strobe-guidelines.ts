/**
 * STROBE Statement (STrengthening the Reporting of OBservational studies in Epidemiology)
 * Version 4 - Hardcoded guidelines for observational studies
 * Source: https://www.strobe-statement.org/
 */

export interface STROBEItem {
  item: string;
  title: string;
  description: string;
  subItems?: string[];
  category: 'title_abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'other';
}

export const STROBE_CHECKLIST: STROBEItem[] = [
  // Title and Abstract
  {
    item: '1a',
    title: 'Title',
    description: 'Indicate the study\'s design with a commonly used term in the title or the abstract',
    category: 'title_abstract'
  },
  {
    item: '1b',
    title: 'Abstract',
    description: 'Provide in the abstract an informative and balanced summary of what was done and what was found',
    category: 'title_abstract'
  },
  
  // Introduction
  {
    item: '2',
    title: 'Background/rationale',
    description: 'Explain the scientific background and rationale for the investigation being reported',
    category: 'introduction'
  },
  {
    item: '3',
    title: 'Objectives',
    description: 'State specific objectives, including any prespecified hypotheses',
    category: 'introduction'
  },
  
  // Methods
  {
    item: '4',
    title: 'Study design',
    description: 'Present key elements of study design early in the paper',
    category: 'methods'
  },
  {
    item: '5',
    title: 'Setting',
    description: 'Describe the setting, locations, and relevant dates, including periods of recruitment, exposure, follow-up, and data collection',
    category: 'methods'
  },
  {
    item: '6a',
    title: 'Participants - Cohort study',
    description: 'Give the eligibility criteria, and the sources and methods of selection of participants. Describe methods of follow-up',
    subItems: [
      'Eligibility criteria for participants',
      'Sources of participants',
      'Methods of selection',
      'Methods of follow-up'
    ],
    category: 'methods'
  },
  {
    item: '6b',
    title: 'Participants - Cohort study matching',
    description: 'For matched studies, give matching criteria and number of exposed and unexposed',
    category: 'methods'
  },
  {
    item: '7',
    title: 'Variables',
    description: 'Clearly define all outcomes, exposures, predictors, potential confounders, and effect modifiers. Give diagnostic criteria, if applicable',
    subItems: [
      'Primary outcome definition',
      'Secondary outcomes',
      'Exposure definition',
      'Covariates/confounders',
      'Effect modifiers',
      'Diagnostic criteria'
    ],
    category: 'methods'
  },
  {
    item: '8',
    title: 'Data sources/measurement',
    description: 'For each variable of interest, give sources of data and details of methods of assessment (measurement). Describe comparability of assessment methods if there is more than one group',
    subItems: [
      'Data sources for each variable',
      'Methods of assessment',
      'Comparability across groups'
    ],
    category: 'methods'
  },
  {
    item: '9',
    title: 'Bias',
    description: 'Describe any efforts to address potential sources of bias',
    subItems: [
      'Selection bias',
      'Information bias',
      'Confounding',
      'Missing data bias'
    ],
    category: 'methods'
  },
  {
    item: '10',
    title: 'Study size',
    description: 'Explain how the study size was arrived at',
    subItems: [
      'Sample size calculation',
      'Power analysis',
      'Precision estimates'
    ],
    category: 'methods'
  },
  {
    item: '11',
    title: 'Quantitative variables',
    description: 'Explain how quantitative variables were handled in the analyses. If applicable, describe which groupings were chosen and why',
    subItems: [
      'Continuous variables handling',
      'Categorization rationale',
      'Cut-points justification'
    ],
    category: 'methods'
  },
  {
    item: '12a',
    title: 'Statistical methods - Main analyses',
    description: 'Describe all statistical methods, including those used to control for confounding',
    subItems: [
      'Descriptive statistics',
      'Main analysis methods',
      'Confounder adjustment',
      'Model selection',
      'Assumptions checking'
    ],
    category: 'methods'
  },
  {
    item: '12b',
    title: 'Statistical methods - Subgroups',
    description: 'Describe any methods used to examine subgroups and interactions',
    category: 'methods'
  },
  {
    item: '12c',
    title: 'Statistical methods - Missing data',
    description: 'Explain how missing data were addressed',
    subItems: [
      'Missing data patterns',
      'Imputation methods',
      'Sensitivity analyses'
    ],
    category: 'methods'
  },
  {
    item: '12d',
    title: 'Statistical methods - Loss to follow-up',
    description: 'Cohort study—If applicable, explain how loss to follow-up was addressed',
    category: 'methods'
  },
  {
    item: '12e',
    title: 'Statistical methods - Sensitivity analyses',
    description: 'Describe any sensitivity analyses',
    subItems: [
      'Alternative definitions',
      'Alternative methods',
      'Unmeasured confounding',
      'Selection bias assessment'
    ],
    category: 'methods'
  },
  
  // Results
  {
    item: '13a',
    title: 'Participants - Numbers',
    description: 'Report numbers of individuals at each stage of study—eg numbers potentially eligible, examined for eligibility, confirmed eligible, included in the study, completing follow-up, and analysed',
    subItems: [
      'Flow diagram',
      'Numbers at each stage',
      'Reasons for non-participation'
    ],
    category: 'results'
  },
  {
    item: '13b',
    title: 'Participants - Non-participation',
    description: 'Give reasons for non-participation at each stage',
    category: 'results'
  },
  {
    item: '13c',
    title: 'Participants - Flow diagram',
    description: 'Consider use of a flow diagram',
    category: 'results'
  },
  {
    item: '14a',
    title: 'Descriptive data - Characteristics',
    description: 'Give characteristics of study participants (eg demographic, clinical, social) and information on exposures and potential confounders',
    subItems: [
      'Table 1 baseline characteristics',
      'Missing data counts',
      'Distribution of exposures'
    ],
    category: 'results'
  },
  {
    item: '14b',
    title: 'Descriptive data - Missing',
    description: 'Indicate number of participants with missing data for each variable of interest',
    category: 'results'
  },
  {
    item: '14c',
    title: 'Descriptive data - Follow-up',
    description: 'Cohort study—Summarise follow-up time (eg, average and total amount)',
    category: 'results'
  },
  {
    item: '15',
    title: 'Outcome data',
    description: 'Cohort study—Report numbers of outcome events or summary measures over time',
    subItems: [
      'Number of events',
      'Person-time',
      'Incidence rates'
    ],
    category: 'results'
  },
  {
    item: '16a',
    title: 'Main results - Unadjusted',
    description: 'Give unadjusted estimates and, if applicable, confounder-adjusted estimates and their precision (eg, 95% confidence interval)',
    category: 'results'
  },
  {
    item: '16b',
    title: 'Main results - Category boundaries',
    description: 'Make clear which confounders were adjusted for and why they were included',
    category: 'results'
  },
  {
    item: '16c',
    title: 'Main results - Continuous variables',
    description: 'Report category boundaries when continuous variables were categorized',
    category: 'results'
  },
  {
    item: '17',
    title: 'Other analyses',
    description: 'Report other analyses done—eg analyses of subgroups and interactions, and sensitivity analyses',
    subItems: [
      'Subgroup analyses',
      'Interaction tests',
      'Sensitivity analyses results'
    ],
    category: 'results'
  },
  
  // Discussion
  {
    item: '18',
    title: 'Key results',
    description: 'Summarise key results with reference to study objectives',
    category: 'discussion'
  },
  {
    item: '19',
    title: 'Limitations',
    description: 'Discuss limitations of the study, taking into account sources of potential bias or imprecision. Discuss both direction and magnitude of any potential bias',
    subItems: [
      'Study design limitations',
      'Potential biases',
      'Measurement error',
      'Confounding',
      'Generalizability'
    ],
    category: 'discussion'
  },
  {
    item: '20',
    title: 'Interpretation',
    description: 'Give a cautious overall interpretation of results considering objectives, limitations, multiplicity of analyses, results from similar studies, and other relevant evidence',
    category: 'discussion'
  },
  {
    item: '21',
    title: 'Generalisability',
    description: 'Discuss the generalisability (external validity) of the study results',
    category: 'discussion'
  },
  
  // Other Information
  {
    item: '22',
    title: 'Funding',
    description: 'Give the source of funding and the role of the funders for the present study and, if applicable, for the original study on which the present article is based',
    category: 'other'
  }
];

/**
 * STROBE-specific recommendations for different study types
 */
export const STROBE_STUDY_TYPE_GUIDANCE = {
  cohort: {
    critical_items: ['6a', '6b', '12d', '14c', '15'],
    additional_considerations: [
      'Clear definition of cohort entry (index date)',
      'Description of follow-up procedures',
      'Handling of competing risks',
      'Time-varying exposures or confounders'
    ]
  },
  case_control: {
    critical_items: ['6a', '7', '8'],
    additional_considerations: [
      'Case definition and validation',
      'Control selection rationale',
      'Matching procedures if used',
      'Recall bias assessment'
    ]
  },
  cross_sectional: {
    critical_items: ['5', '6a', '7', '8'],
    additional_considerations: [
      'Temporal relationship limitations',
      'Prevalence vs incidence distinction',
      'Selection bias in sampling'
    ]
  }
};

/**
 * Common STROBE compliance issues and solutions
 */
export const STROBE_COMMON_ISSUES = {
  missing_flow_diagram: {
    issue: 'No participant flow diagram provided',
    solution: 'Create a CONSORT-style flow diagram showing participant numbers at each stage',
    strobe_items: ['13a', '13b', '13c']
  },
  incomplete_missing_data: {
    issue: 'Missing data not adequately addressed',
    solution: 'Report missing data for each variable, describe patterns, and perform sensitivity analyses',
    strobe_items: ['12c', '14b']
  },
  no_sample_size: {
    issue: 'No sample size justification',
    solution: 'Provide power calculation or precision estimates for main outcomes',
    strobe_items: ['10']
  },
  unclear_definitions: {
    issue: 'Outcome or exposure definitions not clear',
    solution: 'Provide operational definitions with diagnostic criteria or measurement details',
    strobe_items: ['7', '8']
  },
  no_bias_discussion: {
    issue: 'Potential biases not addressed',
    solution: 'Discuss selection bias, information bias, and confounding with mitigation strategies',
    strobe_items: ['9', '19']
  },
  inadequate_sensitivity: {
    issue: 'No sensitivity analyses performed',
    solution: 'Test robustness with alternative definitions, methods, and assumptions',
    strobe_items: ['12e', '17']
  }
};

/**
 * Helper function to check STROBE compliance
 */
export function checkSTROBECompliance(analysisSpec: any): {
  addressed: string[];
  missing: string[];
  recommendations: string[];
  score: number;
} {
  const addressed: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];
  
  // Check each STROBE item
  for (const item of STROBE_CHECKLIST) {
    let isAddressed = false;
    
    // Check based on analysis specification
    switch (item.item) {
      case '4': // Study design
        if (analysisSpec.study_type || analysisSpec.data_model) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '7': // Variables
        if (analysisSpec.outcomes && analysisSpec.predictors) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '9': // Bias
        if (analysisSpec.analysis_plan?.some(a => 
          a.type.includes('sensitivity') || 
          a.type.includes('propensity') ||
          a.type.includes('negative_control')
        )) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '10': // Study size
        if (analysisSpec.sample_size_estimate) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '12a': // Statistical methods
        if (analysisSpec.analysis_plan && analysisSpec.analysis_plan.length > 0) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '12c': // Missing data
        if (analysisSpec.analysis_plan?.some(a => 
          a.type === 'missing_data_analysis' ||
          a.parameters?.methods?.includes('multiple_imputation')
        )) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
        
      case '12e': // Sensitivity analyses
        if (analysisSpec.analysis_plan?.some(a => a.type === 'sensitivity_analysis')) {
          addressed.push(`${item.item}: ${item.title}`);
          isAddressed = true;
        }
        break;
    }
    
    if (!isAddressed && ['methods', 'results'].includes(item.category)) {
      missing.push(`${item.item}: ${item.title}`);
    }
  }
  
  // Generate recommendations based on what's missing
  if (!analysisSpec.sample_size_estimate) {
    recommendations.push('Add sample size calculation or power analysis for primary outcome');
  }
  
  if (!analysisSpec.analysis_plan?.some(a => a.type === 'participant_flow')) {
    recommendations.push('Include participant flow diagram showing numbers at each stage');
  }
  
  if (!analysisSpec.analysis_plan?.some(a => a.type === 'missing_data_analysis')) {
    recommendations.push('Add missing data analysis with patterns and imputation methods');
  }
  
  if (!analysisSpec.analysis_plan?.some(a => a.type.includes('sensitivity'))) {
    recommendations.push('Include sensitivity analyses for key assumptions and definitions');
  }
  
  if (!analysisSpec.analysis_plan?.some(a => 
    a.type === 'negative_control_analysis' || 
    a.parameters?.methods?.includes('e_value')
  )) {
    recommendations.push('Consider negative control analysis or E-value for unmeasured confounding');
  }
  
  // Calculate compliance score
  const totalItems = STROBE_CHECKLIST.filter(item => 
    ['methods', 'results'].includes(item.category)
  ).length;
  const score = (addressed.length / totalItems) * 100;
  
  return {
    addressed,
    missing,
    recommendations,
    score: Math.round(score)
  };
}

/**
 * Generate STROBE-compliant analysis plan additions
 */
export function generateSTROBECompliantAdditions(analysisSpec: any): any[] {
  const additions = [];
  
  // Always include participant flow
  if (!analysisSpec.analysis_plan?.some(a => a.type === 'participant_flow')) {
    additions.push({
      type: 'participant_flow',
      parameters: {
        stages: [
          'potentially_eligible',
          'assessed_for_eligibility',
          'excluded',
          'included_in_analysis',
          'lost_to_followup',
          'discontinued',
          'analyzed'
        ],
        reasons_for_exclusion: true,
        flow_diagram: true
      },
      rationale: 'STROBE 13a-c: Report participant flow through study'
    });
  }
  
  // Table 1 baseline characteristics
  if (!analysisSpec.analysis_plan?.some(a => a.type === 'descriptive_statistics')) {
    additions.push({
      type: 'descriptive_statistics',
      parameters: {
        create_table1: true,
        stratify_by: analysisSpec.predictors?.[0] || 'exposure',
        include_smd: true,
        include_missing: true
      },
      rationale: 'STROBE 14a-b: Baseline characteristics with missing data'
    });
  }
  
  // Missing data analysis
  if (!analysisSpec.analysis_plan?.some(a => a.type === 'missing_data_analysis')) {
    additions.push({
      type: 'missing_data_analysis',
      parameters: {
        methods: [
          'missing_pattern_analysis',
          'complete_case_analysis',
          'multiple_imputation',
          'missing_indicator_method'
        ],
        visualize_patterns: true,
        compare_complete_vs_missing: true
      },
      rationale: 'STROBE 12c, 14b: Address missing data comprehensively'
    });
  }
  
  // Bias assessment
  if (!analysisSpec.analysis_plan?.some(a => 
    a.type === 'bias_analysis' || 
    a.type === 'negative_control_analysis'
  )) {
    additions.push({
      type: 'bias_analysis',
      parameters: {
        selection_bias: {
          method: 'compare_participants_vs_nonparticipants',
          external_data_source: true
        },
        information_bias: {
          method: 'validation_substudy',
          misclassification_analysis: true
        },
        confounding: {
          methods: ['dag_analysis', 'e_value', 'negative_controls'],
          unmeasured_confounders: ['socioeconomic_status', 'health_behaviors']
        }
      },
      rationale: 'STROBE 9: Assess potential sources of bias'
    });
  }
  
  return additions;
}