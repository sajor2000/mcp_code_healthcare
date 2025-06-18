/**
 * TRIPOD+AI Guidelines for AI Prediction Models
 * Updated guidance for reporting clinical prediction models using regression or machine learning methods
 * Published: BMJ 2024; doi: 10.1136/bmj-2023-078378
 */

// TRIPOD+AI Complete 27-Item Checklist
export const TRIPOD_AI_CHECKLIST = {
  title: 'TRIPOD+AI Statement: Updated Guidance for Reporting Clinical Prediction Models',
  version: '2024',
  publication: 'BMJ 2024;385:q902',
  doi: '10.1136/bmj.q902',
  description: 'A 27-item checklist for transparent reporting of prediction model studies using regression or machine learning methods',
  
  sections: {
    title_abstract: {
      title: 'Title and Abstract',
      items: {
        1: {
          section: 'Title',
          item: 'Title',
          description: 'Identify the study as developing, validating, updating, or extending a prediction model, and specify the target population and outcome to be predicted.',
          ai_specific: 'Include mention of AI/ML methods if used (e.g., "machine learning", "deep learning", "artificial intelligence")',
          explanation: 'The title should clearly indicate this is a prediction model study and what is being predicted'
        },
        2: {
          section: 'Abstract',
          item: 'Abstract',
          description: 'Provide a structured summary of study design, methods, results, and conclusions.',
          ai_specific: 'Follow TRIPOD+AI for Abstracts checklist for AI/ML models',
          subitems: {
            '2a': 'Background and objectives',
            '2b': 'Methods (study design, setting, participants, predictors, outcome, sample size, missing data, development, validation)',
            '2c': 'Results (participants, model performance, model equation)',
            '2d': 'Conclusions (interpretation, implications)'
          }
        }
      }
    },
    
    introduction: {
      title: 'Introduction',
      items: {
        3: {
          section: 'Background',
          item: 'Background',
          description: 'Explain the medical context and rationale for the prediction model.',
          ai_specific: 'Justify why AI/ML methods are appropriate for this prediction problem',
          explanation: 'Establish clinical need and current prediction landscape'
        },
        4: {
          section: 'Objectives',
          item: 'Objectives',
          description: 'Specify the study objectives and hypotheses.',
          ai_specific: 'State whether developing a new AI model, validating existing, or comparing AI vs traditional methods',
          explanation: 'Clear statement of what the study aims to achieve'
        }
      }
    },
    
    methods: {
      title: 'Methods',
      items: {
        5: {
          section: 'Study design',
          item: 'Study design',
          description: 'Describe the study design and setting.',
          ai_specific: 'Specify if using supervised, unsupervised, or reinforcement learning approaches',
          explanation: 'Provide context for data collection and study conduct'
        },
        6: {
          section: 'Participants',
          item: 'Participants',
          description: 'Describe study participants and data sources.',
          subitems: {
            '6a': 'Eligibility criteria and data sources',
            '6b': 'Details of treatments received if relevant'
          },
          ai_specific: 'Describe any data preprocessing, augmentation, or synthetic data generation'
        },
        7: {
          section: 'Outcome',
          item: 'Outcome',
          description: 'Clearly define the outcome predicted by the model.',
          subitems: {
            '7a': 'Definition and measurement of outcome',
            '7b': 'Definition of time horizon for predictions'
          },
          ai_specific: 'Specify how outcome labels were generated, including any automated labeling processes'
        },
        8: {
          section: 'Predictors',
          item: 'Predictors',
          description: 'Describe predictor variables and their measurement.',
          ai_specific: 'Detail feature engineering, selection methods, and high-dimensional data handling (e.g., imaging, genomics, text)',
          explanation: 'Include information about predictor selection and coding'
        },
        9: {
          section: 'Sample size',
          item: 'Sample size',
          description: 'Explain how study size was determined.',
          ai_specific: 'Justify sample size for ML complexity, including considerations for training/validation/test splits',
          explanation: 'Sample size calculations specific to prediction modeling'
        },
        10: {
          section: 'Missing data',
          item: 'Missing data',
          description: 'Describe handling of missing predictor and outcome data.',
          ai_specific: 'Detail imputation methods, handling of missing data in neural networks, and impact on model performance',
          explanation: 'Missing data strategy and assumptions'
        },
        11: {
          section: 'Statistical analysis methods',
          item: 'Statistical analysis methods',
          description: 'Describe statistical methods for model development.',
          subitems: {
            '11a': 'Modeling method and assumptions',
            '11b': 'Predictor selection procedures',
            '11c': 'Model specification and complexity',
            '11d': 'Hyperparameter tuning approach'
          },
          ai_specific: 'Provide algorithm details, architecture specifications, training procedures, regularization, and optimization methods'
        },
        12: {
          section: 'Risk of bias and applicability',
          item: 'Risk of bias and applicability',
          description: 'Describe methods to assess risk of bias and applicability.',
          ai_specific: 'Address algorithmic bias, fairness metrics, and generalizability across populations and settings',
          explanation: 'Assessment of internal and external validity'
        },
        13: {
          section: 'Development vs validation',
          item: 'Development vs validation',
          description: 'Specify whether developing, validating, or updating a model.',
          ai_specific: 'Distinguish between model development, internal validation, and external validation datasets',
          explanation: 'Clear delineation of study purpose'
        },
        14: {
          section: 'Validation',
          item: 'Validation',
          description: 'Describe validation methods.',
          subitems: {
            '14a': 'Resampling procedures',
            '14b': 'Measures of model performance'
          },
          ai_specific: 'Detail cross-validation strategies, holdout procedures, and performance metrics appropriate for AI models'
        },
        15: {
          section: 'Presentation',
          item: 'Presentation',
          description: 'Describe approach to model presentation.',
          ai_specific: 'Address model interpretability, explainability methods (SHAP, LIME, etc.), and clinical decision support integration',
          explanation: 'How the model will be presented to users'
        },
        16: {
          section: 'Software',
          item: 'Software',
          description: 'Report statistical software and version used.',
          ai_specific: 'Include ML frameworks, libraries, hardware specifications, and computational requirements',
          explanation: 'Enable reproducibility of analyses'
        },
        17: {
          section: 'Data availability',
          item: 'Data availability',
          description: 'State where study data are available.',
          ai_specific: 'Address code availability, model sharing, and compliance with AI/ML reproducibility standards',
          explanation: 'Support open science and reproducibility'
        }
      }
    },
    
    open_science: {
      title: 'Open Science and Stakeholder Involvement',
      items: {
        18: {
          section: 'Open science',
          item: 'Open science',
          description: 'Describe efforts to make research materials openly available.',
          ai_specific: 'Include model checkpoints, training scripts, preprocessing pipelines, and evaluation code',
          explanation: 'Promote transparency and reproducibility'
        },
        19: {
          section: 'Patient and public involvement',
          item: 'Patient and public involvement',
          description: 'Describe patient and public involvement in the research.',
          ai_specific: 'Address stakeholder input on AI model development, fairness considerations, and implementation planning',
          explanation: 'Ensure research relevance and acceptability'
        }
      }
    },
    
    results: {
      title: 'Results',
      items: {
        20: {
          section: 'Participants',
          item: 'Participants',
          description: 'Describe study participants and data flow.',
          subitems: {
            '20a': 'Participant flow and baseline characteristics',
            '20b': 'Model development and validation cohort descriptions'
          },
          ai_specific: 'Include data preprocessing effects, outlier handling, and dataset splitting procedures'
        },
        21: {
          section: 'Model specification',
          item: 'Model specification',
          description: 'Present the final model specification.',
          ai_specific: 'Provide model architecture details, hyperparameters, and feature importance/selection results',
          explanation: 'Complete model specification for reproducibility'
        },
        22: {
          section: 'Model performance',
          item: 'Model performance',
          description: 'Report model performance measures.',
          ai_specific: 'Include multiple performance metrics, confidence intervals, and performance across subgroups',
          explanation: 'Comprehensive performance evaluation'
        },
        23: {
          section: 'Model evaluation',
          item: 'Model evaluation',
          description: 'Present model evaluation results.',
          subitems: {
            '23a': 'Measures of calibration',
            '23b': 'Assessment of model fit',
            '23c': 'Residual analysis where appropriate'
          },
          ai_specific: 'Include algorithmic fairness metrics, robustness testing, and failure mode analysis'
        },
        24: {
          section: 'Model updating',
          item: 'Model updating',
          description: 'Report any model updating or recalibration.',
          ai_specific: 'Describe continual learning, model drift monitoring, and update procedures',
          explanation: 'Document model maintenance and evolution'
        }
      }
    },
    
    discussion: {
      title: 'Discussion',
      items: {
        25: {
          section: 'Interpretation',
          item: 'Interpretation',
          description: 'Interpret the results in context of existing evidence.',
          subitems: {
            '25a': 'Clinical implications and actionability',
            '25b': 'Comparison with existing models',
            '25c': 'Practical implementation considerations'
          },
          ai_specific: 'Address AI-specific considerations including explainability, user trust, and integration challenges'
        },
        26: {
          section: 'Limitations',
          item: 'Limitations',
          description: 'Discuss study limitations and potential sources of bias.',
          ai_specific: 'Address AI-specific limitations including dataset bias, distribution shift, and generalizability constraints',
          explanation: 'Transparent discussion of study weaknesses'
        },
        27: {
          section: 'Conclusions',
          item: 'Conclusions',
          description: 'State the general interpretation and clinical implications.',
          ai_specific: 'Include implications for AI model deployment, monitoring requirements, and future research needs',
          explanation: 'Key takeaways and next steps'
        }
      }
    }
  }
};

// Key AI-Specific Considerations
export const TRIPOD_AI_PRINCIPLES = {
  trustworthiness: {
    title: 'Trustworthiness and Transparency',
    description: 'AI models must be developed and reported with transparency to build trust',
    requirements: [
      'Clear documentation of algorithmic choices',
      'Transparent reporting of model limitations',
      'Accessible explanations of model behavior',
      'Evidence of robustness across populations'
    ]
  },
  
  fairness: {
    title: 'Fairness and Bias Mitigation',
    description: 'Address potential biases and ensure equitable performance',
    requirements: [
      'Assessment of performance across demographic groups',
      'Identification and mitigation of algorithmic bias',
      'Consideration of health equity implications',
      'Documentation of fairness metrics used'
    ]
  },
  
  reproducibility: {
    title: 'Reproducibility and Replicability',
    description: 'Enable independent verification and replication of results',
    requirements: [
      'Detailed methodology documentation',
      'Code and data availability (where possible)',
      'Computational environment specifications',
      'Random seed and versioning information'
    ]
  },
  
  validation: {
    title: 'Rigorous Validation',
    description: 'Comprehensive evaluation beyond traditional metrics',
    requirements: [
      'Multiple performance metrics',
      'External validation when possible',
      'Robustness testing',
      'Clinical validation studies'
    ]
  },
  
  interpretability: {
    title: 'Model Interpretability',
    description: 'Provide explanations for model predictions',
    requirements: [
      'Use of explainable AI methods when appropriate',
      'Clinical interpretation of model outputs',
      'Documentation of decision boundaries',
      'Feature importance analysis'
    ]
  }
};

// Integration with existing guidelines
export const TRIPOD_AI_INTEGRATION = {
  with_strobe: {
    title: 'TRIPOD+AI and STROBE Integration',
    description: 'Combining prediction model guidelines with observational study reporting',
    considerations: [
      'STROBE for observational data collection and cohort description',
      'TRIPOD+AI for prediction model development and validation',
      'Joint compliance for studies using observational data for AI prediction',
      'Emphasis on both epidemiological rigor and AI best practices'
    ]
  },
  
  implementation_workflow: {
    title: 'Implementation in Healthcare Research Pipeline',
    steps: [
      '1. Study Design: Apply STROBE principles for data collection design',
      '2. Data Preparation: Document preprocessing with TRIPOD+AI standards',
      '3. Model Development: Follow AI-specific methodology requirements',
      '4. Validation: Implement comprehensive validation framework',
      '5. Reporting: Ensure compliance with both guideline sets',
      '6. Deployment: Consider implementation and monitoring requirements'
    ]
  }
};

// Performance metrics specific to AI models
export const TRIPOD_AI_METRICS = {
  classification: {
    traditional: ['Accuracy', 'Sensitivity', 'Specificity', 'PPV', 'NPV', 'AUC-ROC'],
    ai_specific: ['Precision-Recall AUC', 'F1-Score', 'Matthews Correlation Coefficient'],
    fairness: ['Demographic Parity', 'Equalized Odds', 'Calibration by Group']
  },
  
  regression: {
    traditional: ['RMSE', 'MAE', 'R-squared'],
    ai_specific: ['MAPE', 'Explained Variance', 'Max Error'],
    robustness: ['Cross-validation scores', 'Bootstrap confidence intervals']
  },
  
  survival: {
    traditional: ['C-index', 'Calibration slope', 'Brier score'],
    ai_specific: ['Time-dependent AUC', 'Integrated Brier Score'],
    clinical: ['Net benefit', 'Clinical utility index']
  }
};

// Helper functions
export function generateTripodAIChecklist(studyType: string, modelType: string): any {
  const relevantItems = [];
  
  // Always include core items
  const coreItems = [1, 2, 3, 4, 11, 15, 16, 21, 22, 25, 26, 27];
  
  // Add study-type specific items
  if (studyType === 'development') {
    relevantItems.push(...[5, 6, 7, 8, 9, 10, 13, 18, 19, 20]);
  }
  
  if (studyType === 'validation') {
    relevantItems.push(...[12, 14, 23, 24]);
  }
  
  // Add model-type specific considerations
  const modelSpecific = {
    'machine_learning': 'Enhanced focus on hyperparameter tuning, cross-validation, and feature engineering',
    'deep_learning': 'Additional requirements for architecture description and interpretability methods',
    'ensemble': 'Documentation of base models and combination strategies',
    'traditional': 'Standard statistical modeling considerations'
  };
  
  return {
    applicable_items: relevantItems.sort(),
    model_specific_notes: modelSpecific[modelType] || modelSpecific['traditional'],
    compliance_checklist: relevantItems.map(item => ({
      item_number: item,
      description: getTripodAIItemDescription(item),
      status: 'pending'
    }))
  };
}

export function getTripodAIItemDescription(itemNumber: number): string {
  // Navigate through the checklist structure to find the item
  for (const section of Object.values(TRIPOD_AI_CHECKLIST.sections)) {
    if (section.items[itemNumber]) {
      return section.items[itemNumber].description;
    }
  }
  return `TRIPOD+AI Item ${itemNumber}`;
}

export function assessTripodAICompliance(studyFeatures: any): any {
  const compliance = {
    overall_score: 0,
    section_scores: {},
    recommendations: [],
    missing_elements: []
  };
  
  // Assess each section
  for (const [sectionKey, section] of Object.entries(TRIPOD_AI_CHECKLIST.sections)) {
    let sectionScore = 0;
    let totalItems = Object.keys(section.items).length;
    
    for (const [itemKey, item] of Object.entries(section.items)) {
      // This would be replaced with actual compliance checking logic
      sectionScore += assessItemCompliance(item, studyFeatures);
    }
    
    compliance.section_scores[sectionKey] = sectionScore / totalItems;
  }
  
  // Calculate overall score
  const sectionScores = Object.values(compliance.section_scores) as number[];
  compliance.overall_score = sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
  
  // Generate recommendations
  if (compliance.overall_score < 0.8) {
    compliance.recommendations.push('Consider additional validation studies');
    compliance.recommendations.push('Enhance model interpretability documentation');
    compliance.recommendations.push('Provide more detailed methodology description');
  }
  
  return compliance;
}

function assessItemCompliance(item: any, studyFeatures: any): number {
  // Simplified compliance assessment - would be more sophisticated in practice
  if (studyFeatures.has_ai_methods && item.ai_specific) {
    return studyFeatures.addresses_ai_considerations ? 1 : 0.5;
  }
  return studyFeatures.has_basic_documentation ? 1 : 0;
}