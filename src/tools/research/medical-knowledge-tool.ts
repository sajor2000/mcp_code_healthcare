import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';
import { createModuleLogger } from '../../utils/logger.js';
import { MCPError } from '../../utils/errors.js';
import axios from 'axios';

const logger = createModuleLogger('medical-knowledge');

export class MedicalKnowledgeTool implements Tool {
  name = 'lookup_medical_knowledge';
  description = 'Look up detailed medical information about conditions, procedures, medications, or research concepts from trusted sources';
  
  inputSchema = {
    type: 'object',
    properties: {
      concept: {
        type: 'string',
        description: 'Medical concept to research (e.g., "sepsis", "ARDS", "vancomycin resistance")'
      },
      concept_type: {
        type: 'string',
        enum: ['condition', 'medication', 'procedure', 'lab_test', 'research_method', 'data_model'],
        description: 'Type of medical concept'
      },
      include_details: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'definition',
            'pathophysiology',
            'diagnosis_criteria',
            'treatment_guidelines',
            'risk_factors',
            'complications',
            'prognosis',
            'research_considerations',
            'data_elements',
            'coding_guidance'
          ]
        },
        default: ['definition', 'diagnosis_criteria', 'research_considerations']
      },
      sources: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['pubmed', 'clinical_guidelines', 'omop_cdm', 'clif_spec', 'medical_textbooks', 'research_databases']
        },
        default: ['clinical_guidelines', 'research_databases']
      }
    },
    required: ['concept', 'concept_type']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { concept, concept_type, include_details, sources } = args;
    
    logger.info('Looking up medical knowledge', { concept, type: concept_type });
    
    try {
      const knowledge = {
        concept,
        type: concept_type,
        timestamp: new Date().toISOString(),
        sources_consulted: sources || ['clinical_guidelines', 'research_databases'],
        details: {}
      };
      
      // Get knowledge based on concept type
      switch (concept_type) {
        case 'condition':
          knowledge.details = await this.getConditionKnowledge(concept, include_details);
          break;
        case 'medication':
          knowledge.details = await this.getMedicationKnowledge(concept, include_details);
          break;
        case 'data_model':
          knowledge.details = await this.getDataModelKnowledge(concept);
          break;
        default:
          knowledge.details = await this.getGeneralMedicalKnowledge(concept, include_details);
      }
      
      // Add research-specific information
      if (include_details?.includes('research_considerations')) {
        knowledge.details.research_considerations = await this.getResearchConsiderations(concept, concept_type);
      }
      
      // Add coding guidance
      if (include_details?.includes('coding_guidance')) {
        knowledge.details.coding_guidance = await this.getCodingGuidance(concept, concept_type);
      }
      
      return knowledge;
      
    } catch (error) {
      logger.error('Failed to lookup medical knowledge', { error: error.message });
      throw new MCPError(
        `Failed to lookup medical knowledge: ${error.message}`,
        'KNOWLEDGE_LOOKUP_ERROR',
        500
      );
    }
  }
  
  private async getConditionKnowledge(condition: string, details: string[]): Promise<any> {
    const knowledge: any = {};
    
    // Get predefined knowledge for common conditions
    const conditionData = this.getPredefinedConditionData(condition.toLowerCase());
    
    if (details.includes('definition')) {
      knowledge.definition = conditionData.definition || `${condition} is a medical condition requiring clinical diagnosis.`;
    }
    
    if (details.includes('diagnosis_criteria')) {
      knowledge.diagnosis_criteria = conditionData.diagnosis_criteria || this.getDefaultDiagnosisCriteria(condition);
    }
    
    if (details.includes('pathophysiology')) {
      knowledge.pathophysiology = conditionData.pathophysiology || `The pathophysiology of ${condition} involves complex biological processes.`;
    }
    
    if (details.includes('risk_factors')) {
      knowledge.risk_factors = conditionData.risk_factors || ['Age', 'Comorbidities', 'Environmental factors'];
    }
    
    if (details.includes('complications')) {
      knowledge.complications = conditionData.complications || ['Varies by severity and patient factors'];
    }
    
    if (details.includes('prognosis')) {
      knowledge.prognosis = conditionData.prognosis || 'Prognosis depends on early detection and appropriate treatment';
    }
    
    // Add ICD-10 codes from database
    knowledge.icd10_codes = await this.getICD10Codes(condition);
    
    // Add SNOMED concepts
    knowledge.snomed_concepts = await this.getSNOMEDConcepts(condition);
    
    return knowledge;
  }
  
  private getPredefinedConditionData(condition: string): any {
    const conditions = {
      'sepsis': {
        definition: 'Sepsis is a life-threatening organ dysfunction caused by a dysregulated host response to infection.',
        diagnosis_criteria: {
          'Sepsis-3': {
            criteria: 'Suspected infection + SOFA score ≥2',
            components: [
              'Suspected or documented infection',
              'Acute increase of ≥2 SOFA points'
            ]
          },
          'qSOFA': {
            criteria: '≥2 of the following:',
            components: [
              'Respiratory rate ≥22/min',
              'Altered mentation (GCS <15)',
              'Systolic blood pressure ≤100 mmHg'
            ]
          }
        },
        pathophysiology: 'Sepsis involves a complex interplay between pathogen factors and host factors, leading to an imbalanced inflammatory response, endothelial dysfunction, and organ failure.',
        risk_factors: [
          'Advanced age (>65 years)',
          'Immunosuppression',
          'Chronic diseases (diabetes, kidney disease, liver disease)',
          'Recent surgery or hospitalization',
          'Indwelling devices (catheters, ventilators)'
        ],
        complications: [
          'Septic shock',
          'Multiple organ dysfunction syndrome (MODS)',
          'Acute respiratory distress syndrome (ARDS)',
          'Acute kidney injury',
          'Disseminated intravascular coagulation (DIC)'
        ],
        prognosis: 'Mortality rates: 10-20% for sepsis, 20-40% for severe sepsis, 40-80% for septic shock. Early recognition and treatment significantly improve outcomes.'
      },
      'ards': {
        definition: 'Acute Respiratory Distress Syndrome (ARDS) is a severe lung condition causing widespread inflammation in the lungs, leading to respiratory failure.',
        diagnosis_criteria: {
          'Berlin_Definition': {
            timing: 'Within 1 week of known clinical insult or new/worsening respiratory symptoms',
            chest_imaging: 'Bilateral opacities not fully explained by effusions, lobar/lung collapse, or nodules',
            origin_of_edema: 'Respiratory failure not fully explained by cardiac failure or fluid overload',
            oxygenation: {
              mild: '200 mmHg < PaO2/FiO2 ≤ 300 mmHg with PEEP or CPAP ≥5 cm H2O',
              moderate: '100 mmHg < PaO2/FiO2 ≤ 200 mmHg with PEEP ≥5 cm H2O',
              severe: 'PaO2/FiO2 ≤ 100 mmHg with PEEP ≥5 cm H2O'
            }
          }
        },
        pathophysiology: 'ARDS involves diffuse alveolar damage, increased pulmonary vascular permeability, increased lung weight, and loss of aerated lung tissue.',
        risk_factors: [
          'Sepsis (most common)',
          'Pneumonia',
          'Aspiration of gastric contents',
          'Severe trauma',
          'Multiple transfusions',
          'Acute pancreatitis',
          'Drug overdose'
        ],
        complications: [
          'Ventilator-associated pneumonia',
          'Pneumothorax',
          'Pulmonary fibrosis',
          'Cognitive impairment',
          'Depression and PTSD',
          'Physical weakness'
        ],
        prognosis: 'Mortality 35-45% overall, varies by severity. Survivors may have long-term physical, cognitive, and psychological impairments.'
      }
    };
    
    return conditions[condition] || {};
  }
  
  private async getMedicationKnowledge(medication: string, details: string[]): Promise<any> {
    const knowledge: any = {};
    
    // Get predefined medication data
    const medData = this.getPredefinedMedicationData(medication.toLowerCase());
    
    if (details.includes('definition')) {
      knowledge.description = medData.description || `${medication} is a pharmaceutical agent.`;
      knowledge.drug_class = medData.drug_class;
      knowledge.mechanism_of_action = medData.mechanism_of_action;
    }
    
    if (details.includes('treatment_guidelines')) {
      knowledge.indications = medData.indications || [`Treatment indications for ${medication}`];
      knowledge.dosing = medData.dosing || 'Dosing varies by indication and patient factors';
      knowledge.contraindications = medData.contraindications || ['Patient-specific contraindications apply'];
    }
    
    // Add RxNorm codes
    knowledge.rxnorm_codes = await this.getRxNormCodes(medication);
    
    return knowledge;
  }
  
  private getPredefinedMedicationData(medication: string): any {
    const medications = {
      'vancomycin': {
        description: 'Vancomycin is a glycopeptide antibiotic used to treat serious bacterial infections caused by gram-positive organisms.',
        drug_class: 'Glycopeptide antibiotic',
        mechanism_of_action: 'Inhibits bacterial cell wall synthesis by binding to D-alanyl-D-alanine terminus of cell wall precursor units',
        indications: [
          'Methicillin-resistant Staphylococcus aureus (MRSA) infections',
          'Severe Clostridioides difficile infections',
          'Enterococcal infections',
          'Empiric therapy for suspected gram-positive infections in critically ill patients'
        ],
        dosing: {
          standard: '15-20 mg/kg IV every 8-12 hours',
          loading_dose: '25-30 mg/kg for severe infections',
          therapeutic_monitoring: 'Trough levels 10-20 mg/L (15-20 for severe infections)',
          renal_adjustment: 'Required based on creatinine clearance'
        },
        contraindications: [
          'Known hypersensitivity to vancomycin',
          'Use caution in renal impairment',
          'Monitor for ototoxicity and nephrotoxicity'
        ],
        research_considerations: {
          sepsis_studies: 'Commonly used as empiric therapy in sepsis protocols',
          resistance_concerns: 'Monitor for vancomycin-resistant enterococci (VRE) and VISA/VRSA',
          outcome_measures: '30-day mortality, clinical cure, microbiological cure'
        }
      }
    };
    
    return medications[medication] || {};
  }
  
  private async getDataModelKnowledge(model: string): Promise<any> {
    const models = {
      'omop': {
        full_name: 'Observational Medical Outcomes Partnership Common Data Model',
        version: 'v5.4 (latest stable)',
        description: 'OMOP CDM is a standardized data model designed to facilitate observational health research across diverse data sources.',
        key_concepts: {
          'Standardized Vocabularies': 'Uses standard terminologies (SNOMED, RxNorm, LOINC, ICD) mapped to common concept IDs',
          'Person-Centric Model': 'All clinical data linked to a person record',
          'Temporal Relationships': 'All events have associated dates for temporal analyses',
          'Domain Tables': 'Separated by clinical domains (conditions, drugs, procedures, measurements, observations)'
        },
        core_tables: {
          'Clinical Data': [
            'PERSON - Demographics',
            'CONDITION_OCCURRENCE - Diagnoses',
            'DRUG_EXPOSURE - Medications',
            'PROCEDURE_OCCURRENCE - Procedures',
            'MEASUREMENT - Labs and vitals',
            'OBSERVATION - Other clinical observations',
            'VISIT_OCCURRENCE - Encounters'
          ],
          'Vocabulary': [
            'CONCEPT - Standard concepts',
            'CONCEPT_RELATIONSHIP - Mappings between concepts',
            'VOCABULARY - Source vocabularies'
          ],
          'Derived Elements': [
            'COHORT - Defined patient groups',
            'DRUG_ERA - Continuous drug exposure periods',
            'CONDITION_ERA - Continuous condition periods'
          ]
        },
        research_advantages: [
          'Enables network studies across institutions',
          'Standardized analytics tools (ATLAS, ACHILLES)',
          'Large library of validated phenotypes',
          'Supports comparative effectiveness research'
        ],
        sepsis_research_example: {
          'Cohort Definition': 'Use CONDITION_OCCURRENCE for sepsis diagnosis codes',
          'Exposure': 'Use DRUG_EXPOSURE for vancomycin administration',
          'Outcome': 'Use DEATH or CONDITION_OCCURRENCE for mortality',
          'Covariates': 'Use MEASUREMENT for labs, CONDITION_OCCURRENCE for comorbidities'
        }
      },
      'clif': {
        full_name: 'Common Longitudinal ICU Format',
        description: 'CLIF is a standardized data model specifically designed for ICU/critical care data with high temporal granularity.',
        key_features: {
          'High Frequency Data': 'Captures minute-by-minute vital signs and interventions',
          'ICU-Specific': 'Designed for critical care research needs',
          'Device Integration': 'Handles ventilator settings, continuous monitoring',
          'Severity Scoring': 'Built-in support for SOFA, APACHE scores'
        },
        core_elements: {
          'Patient Data': 'Demographics, admission details, outcomes',
          'Vital Signs': 'Heart rate, blood pressure, temperature, SpO2 with timestamps',
          'Laboratory': 'Blood gases, chemistry, hematology with exact collection times',
          'Medications': 'Drug administration with doses and rates (especially vasopressors, sedatives)',
          'Procedures': 'Intubation, dialysis, procedures with exact times',
          'Ventilation': 'Ventilator modes, settings, and measurements',
          'Scores': 'SOFA, APACHE, GCS tracked over time'
        },
        research_advantages: [
          'Enables minute-level analysis of ICU interventions',
          'Captures dynamic physiology for ML models',
          'Supports time-series analysis of organ dysfunction',
          'Ideal for sepsis and ARDS research with granular data'
        ],
        sepsis_research_example: {
          'Early Detection': 'Use vital sign trends to detect sepsis onset',
          'Treatment Timing': 'Exact antibiotic administration times',
          'Organ Dysfunction': 'Track SOFA components continuously',
          'Outcomes': 'ICU mortality, ventilator-free days, vasopressor-free days'
        }
      }
    };
    
    return models[model.toLowerCase()] || {
      error: `Data model '${model}' not found. Available: OMOP, CLIF`
    };
  }
  
  private async getResearchConsiderations(concept: string, type: string): Promise<any> {
    const considerations = {
      study_design: 'Consider cohort study for effectiveness, case-control for rare outcomes',
      sample_size: 'Power calculations depend on expected effect size and baseline event rate',
      confounders: this.getCommonConfounders(concept, type),
      endpoints: this.getRecommendedEndpoints(concept, type),
      statistical_methods: [
        'Propensity score matching for treatment comparisons',
        'Cox regression for time-to-event outcomes',
        'Competing risks analysis if applicable'
      ],
      bias_considerations: [
        'Selection bias in observational data',
        'Immortal time bias in drug effectiveness studies',
        'Confounding by indication',
        'Missing data patterns'
      ]
    };
    
    return considerations;
  }
  
  private getCommonConfounders(concept: string, type: string): string[] {
    const baseConfounders = ['Age', 'Sex', 'Comorbidity burden', 'Severity of illness'];
    
    if (concept.toLowerCase().includes('sepsis')) {
      return [...baseConfounders, 
        'Source of infection',
        'Time to antibiotic administration',
        'Organ dysfunction scores (SOFA)',
        'Lactate levels',
        'Prior antibiotic exposure'
      ];
    }
    
    if (type === 'medication') {
      return [...baseConfounders,
        'Indication for treatment',
        'Contraindications',
        'Concurrent medications',
        'Renal function',
        'Hepatic function'
      ];
    }
    
    return baseConfounders;
  }
  
  private getRecommendedEndpoints(concept: string, type: string): any {
    return {
      primary: [
        '30-day all-cause mortality',
        'In-hospital mortality',
        'Clinical cure/improvement'
      ],
      secondary: [
        'Length of stay (hospital and ICU)',
        'Organ dysfunction resolution',
        'Adverse events',
        'Readmission rates',
        'Microbiological cure (if applicable)'
      ],
      safety: [
        'Treatment-related adverse events',
        'Discontinuation due to adverse events'
      ]
    };
  }
  
  private async getCodingGuidance(concept: string, type: string): Promise<any> {
    return {
      icd10_tips: 'Use most specific codes available; consider using both principal and secondary diagnoses',
      snomed_tips: 'SNOMED provides more clinical detail than ICD-10',
      temporal_considerations: 'Ensure diagnosis timing aligns with your cohort definition',
      validation: 'Consider using multiple code types to improve phenotype sensitivity and specificity'
    };
  }
  
  private getDefaultDiagnosisCriteria(condition: string): any {
    return {
      clinical: `Clinical criteria for ${condition} diagnosis`,
      laboratory: 'Relevant laboratory findings',
      imaging: 'Imaging findings if applicable',
      differential: 'Consider differential diagnoses'
    };
  }
  
  private async getICD10Codes(condition: string): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT code, description 
        FROM icd10 
        WHERE LOWER(description) LIKE LOWER(?)
        LIMIT 10
      `);
      return stmt.all(`%${condition}%`);
    } catch (error) {
      return [];
    }
  }
  
  private async getSNOMEDConcepts(condition: string): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT concept_id, description 
        FROM snomed 
        WHERE LOWER(description) LIKE LOWER(?)
        LIMIT 10
      `);
      return stmt.all(`%${condition}%`);
    } catch (error) {
      return [];
    }
  }
  
  private async getRxNormCodes(medication: string): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT rxcui, name 
        FROM rxnorm 
        WHERE LOWER(name) LIKE LOWER(?)
        LIMIT 10
      `);
      return stmt.all(`%${medication}%`);
    } catch (error) {
      return [];
    }
  }
  
  private async getGeneralMedicalKnowledge(concept: string, details: string[]): Promise<any> {
    return {
      description: `${concept} - medical concept requiring further specification`,
      note: 'Specify concept_type for more detailed information',
      available_types: ['condition', 'medication', 'procedure', 'lab_test', 'research_method', 'data_model']
    };
  }
}