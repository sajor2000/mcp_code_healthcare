import { createModuleLogger } from '../utils/logger.js';
import { MCPError } from '../utils/errors.js';
import { db } from '../database/connection.js';
import { Cacheable } from '../utils/cache.js';

const nlpLogger = createModuleLogger('medical-nlp');

export interface MedicalEntity {
  text: string;
  type: 'condition' | 'medication' | 'procedure' | 'lab' | 'symptom' | 'anatomy';
  codes?: Array<{
    system: string;
    code: string;
    display: string;
  }>;
  negated?: boolean;
  temporal?: string;
  certainty?: 'confirmed' | 'suspected' | 'ruled_out';
  attributes?: Record<string, any>;
}

export interface ParsedQuery {
  intent: 'comparison' | 'association' | 'prediction' | 'descriptive' | 'temporal';
  entities: MedicalEntity[];
  temporalConstraints?: {
    anchor?: string;
    window?: { start: string; end: string };
    relative?: string;
  };
  populationFilters?: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  statisticalRequirements?: {
    adjustFor?: string[];
    stratifyBy?: string[];
    sensitivity?: string[];
  };
}

export class MedicalNLP {
  private static readonly MEDICAL_PATTERNS = {
    // Condition patterns
    conditions: [
      /(?:diagnosed with|diagnosis of|history of|h\/o|hx)\s+([a-zA-Z\s]+)/gi,
      /(?:presents with|presenting with|admitted for)\s+([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+)\s+(?:positive|confirmed|diagnosed)/gi
    ],
    
    // Medication patterns
    medications: [
      /(?:on|taking|prescribed|started)\s+([a-zA-Z]+(?:\s+\d+\s*mg)?)/gi,
      /([a-zA-Z]+)\s+(?:\d+\s*mg|\d+\s*mcg|\d+\s*units)/gi,
      /(?:medication|drug|rx):\s*([a-zA-Z]+)/gi
    ],
    
    // Lab patterns
    labs: [
      /([a-zA-Z\s]+)\s*(?:>|<|>=|<=|=)\s*(\d+\.?\d*)\s*([a-zA-Z/%]*)/gi,
      /(?:elevated|high|low|abnormal)\s+([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+)\s+(?:level|value|result)s?\s+(?:of\s+)?(\d+\.?\d*)/gi
    ],
    
    // Temporal patterns
    temporal: [
      /(?:within|in|after|before)\s+(\d+)\s+(days?|weeks?|months?|years?)/gi,
      /(\d+)[\s-]?(days?|weeks?|months?|years?)\s+(?:ago|prior|before|after)/gi,
      /(?:between|from)\s+(.+?)\s+(?:and|to)\s+(.+?)(?:\s|$)/gi
    ],
    
    // Negation patterns
    negation: [
      /(?:no|not|deny|denies|without|negative for|ruled out)\s+([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+)\s+(?:negative|absent|not present)/gi
    ]
  };

  private static readonly MEDICAL_LEXICON = new Map([
    // Common abbreviations
    ['htn', 'hypertension'],
    ['dm', 'diabetes mellitus'],
    ['cad', 'coronary artery disease'],
    ['chf', 'congestive heart failure'],
    ['copd', 'chronic obstructive pulmonary disease'],
    ['ckd', 'chronic kidney disease'],
    ['aki', 'acute kidney injury'],
    ['mi', 'myocardial infarction'],
    ['cva', 'cerebrovascular accident'],
    ['uti', 'urinary tract infection'],
    ['pna', 'pneumonia'],
    ['afib', 'atrial fibrillation'],
    ['a fib', 'atrial fibrillation'],
    ['dvt', 'deep vein thrombosis'],
    ['pe', 'pulmonary embolism'],
    
    // Lab abbreviations
    ['cr', 'creatinine'],
    ['bun', 'blood urea nitrogen'],
    ['hgb', 'hemoglobin'],
    ['hb', 'hemoglobin'],
    ['wbc', 'white blood cell count'],
    ['plt', 'platelet count'],
    ['inr', 'international normalized ratio'],
    ['pt', 'prothrombin time'],
    ['ptt', 'partial thromboplastin time'],
    ['ast', 'aspartate aminotransferase'],
    ['alt', 'alanine aminotransferase'],
    ['bnp', 'brain natriuretic peptide'],
    ['trop', 'troponin'],
    ['ck', 'creatine kinase'],
    
    // Medication abbreviations
    ['asa', 'aspirin'],
    ['acei', 'ace inhibitor'],
    ['arb', 'angiotensin receptor blocker'],
    ['bb', 'beta blocker'],
    ['ccb', 'calcium channel blocker'],
    ['ppi', 'proton pump inhibitor'],
    ['ssri', 'selective serotonin reuptake inhibitor'],
    ['nsaid', 'non-steroidal anti-inflammatory drug']
  ]);

  private static readonly INTENT_KEYWORDS = {
    comparison: ['compare', 'versus', 'vs', 'between', 'difference', 'better', 'worse'],
    association: ['associate', 'correlate', 'relate', 'link', 'connect', 'relationship'],
    prediction: ['predict', 'forecast', 'risk', 'likelihood', 'probability', 'model'],
    descriptive: ['describe', 'characterize', 'profile', 'distribution', 'prevalence'],
    temporal: ['trend', 'change over time', 'longitudinal', 'trajectory', 'temporal']
  };

  @Cacheable('nlp', 3600)
  static async parseQuery(query: string): Promise<ParsedQuery> {
    nlpLogger.info('Parsing medical query', { query });
    
    try {
      // Normalize and expand abbreviations
      const normalizedQuery = this.normalizeQuery(query);
      
      // Detect intent
      const intent = this.detectIntent(normalizedQuery);
      
      // Extract entities
      const entities = await this.extractEntities(normalizedQuery);
      
      // Extract temporal constraints
      const temporalConstraints = this.extractTemporalConstraints(normalizedQuery);
      
      // Extract population filters
      const populationFilters = this.extractPopulationFilters(normalizedQuery);
      
      // Extract statistical requirements
      const statisticalRequirements = this.extractStatisticalRequirements(normalizedQuery);
      
      const result: ParsedQuery = {
        intent,
        entities,
        ...(temporalConstraints && { temporalConstraints }),
        ...(populationFilters.length > 0 && { populationFilters }),
        ...(Object.keys(statisticalRequirements).length > 0 && { statisticalRequirements })
      };
      
      nlpLogger.info('Query parsed successfully', {
        intent,
        entityCount: entities.length,
        hasTemporalConstraints: !!temporalConstraints
      });
      
      return result;
    } catch (error) {
      nlpLogger.error('Failed to parse query', { error: error.message });
      throw new MCPError('Query parsing failed', 'NLP_ERROR', 400);
    }
  }

  private static normalizeQuery(query: string): string {
    let normalized = query.toLowerCase();
    
    // Expand abbreviations
    for (const [abbr, full] of this.MEDICAL_LEXICON) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    }
    
    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  private static detectIntent(query: string): ParsedQuery['intent'] {
    const scores: Record<ParsedQuery['intent'], number> = {
      comparison: 0,
      association: 0,
      prediction: 0,
      descriptive: 0,
      temporal: 0
    };
    
    // Score based on keywords
    for (const [intent, keywords] of Object.entries(this.INTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          scores[intent as ParsedQuery['intent']] += 1;
        }
      }
    }
    
    // Additional scoring based on patterns
    if (query.match(/\b(between|versus|vs\.?)\b/i)) {
      scores.comparison += 2;
    }
    
    if (query.match(/\b(risk factors?|predictors?|associated with)\b/i)) {
      scores.association += 2;
    }
    
    if (query.match(/\b(predict|machine learning|ml|model|classifier)\b/i)) {
      scores.prediction += 2;
    }
    
    if (query.match(/\b(over time|trend|temporal|longitudinal)\b/i)) {
      scores.temporal += 2;
    }
    
    // Find highest scoring intent
    let maxScore = 0;
    let detectedIntent: ParsedQuery['intent'] = 'descriptive';
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent as ParsedQuery['intent'];
      }
    }
    
    return detectedIntent;
  }

  private static async extractEntities(query: string): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];
    const processedTexts = new Set<string>();
    
    // Extract conditions
    for (const pattern of this.MEDICAL_PATTERNS.conditions) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const text = match[1].trim();
        if (!processedTexts.has(text) && text.length > 2) {
          processedTexts.add(text);
          const entity = await this.createMedicalEntity(text, 'condition');
          if (entity) entities.push(entity);
        }
      }
    }
    
    // Extract medications
    for (const pattern of this.MEDICAL_PATTERNS.medications) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const text = match[1].trim();
        if (!processedTexts.has(text) && text.length > 2) {
          processedTexts.add(text);
          const entity = await this.createMedicalEntity(text, 'medication');
          if (entity) entities.push(entity);
        }
      }
    }
    
    // Extract labs
    for (const pattern of this.MEDICAL_PATTERNS.labs) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const text = match[1].trim();
        if (!processedTexts.has(text) && text.length > 2) {
          processedTexts.add(text);
          const entity = await this.createMedicalEntity(text, 'lab');
          if (match[2]) {
            entity.attributes = {
              operator: match[0].match(/[<>=]+/)?.[0] || '=',
              value: parseFloat(match[2]),
              unit: match[3] || ''
            };
          }
          if (entity) entities.push(entity);
        }
      }
    }
    
    // Check for negations
    for (const pattern of this.MEDICAL_PATTERNS.negation) {
      const matches = [...query.matchAll(pattern)];
      for (const match of matches) {
        const negatedText = match[1].trim();
        const entity = entities.find(e => 
          e.text.includes(negatedText) || negatedText.includes(e.text)
        );
        if (entity) {
          entity.negated = true;
        }
      }
    }
    
    return entities;
  }

  private static async createMedicalEntity(
    text: string,
    type: MedicalEntity['type']
  ): Promise<MedicalEntity> {
    const entity: MedicalEntity = { text, type };
    
    // Try to find codes in database
    try {
      const codes = await this.findMedicalCodes(text, type);
      if (codes.length > 0) {
        entity.codes = codes;
      }
    } catch (error) {
      nlpLogger.debug('Could not find codes for entity', { text, type });
    }
    
    return entity;
  }

  private static async findMedicalCodes(
    text: string,
    type: MedicalEntity['type']
  ): Promise<MedicalEntity['codes']> {
    const codes: MedicalEntity['codes'] = [];
    const ontologyDb = db.getOntologyDb();
    
    // Search strategies based on entity type
    if (type === 'condition') {
      // Search ICD-10
      const icd10 = ontologyDb.prepare(`
        SELECT code, short_description as display
        FROM icd10_codes
        WHERE LOWER(short_description) LIKE ?
           OR LOWER(long_description) LIKE ?
        LIMIT 5
      `).all(`%${text}%`, `%${text}%`);
      
      codes.push(...icd10.map(row => ({
        system: 'ICD-10',
        code: row.code,
        display: row.display
      })));
      
      // Search SNOMED
      const snomed = ontologyDb.prepare(`
        SELECT concept_id as code, preferred_term as display
        FROM snomed_concepts
        WHERE LOWER(preferred_term) LIKE ?
           OR LOWER(fully_specified_name) LIKE ?
        LIMIT 5
      `).all(`%${text}%`, `%${text}%`);
      
      codes.push(...snomed.map(row => ({
        system: 'SNOMED',
        code: row.code,
        display: row.display
      })));
    } else if (type === 'medication') {
      // Search RxNorm
      const rxnorm = ontologyDb.prepare(`
        SELECT rxcui as code, name as display
        FROM rxnorm_concepts
        WHERE LOWER(name) LIKE ?
        LIMIT 5
      `).all(`%${text}%`);
      
      codes.push(...rxnorm.map(row => ({
        system: 'RxNorm',
        code: row.code,
        display: row.display
      })));
    } else if (type === 'lab') {
      // Search LOINC
      const loinc = ontologyDb.prepare(`
        SELECT loinc_num as code, long_common_name as display
        FROM loinc_codes
        WHERE LOWER(long_common_name) LIKE ?
           OR LOWER(component) LIKE ?
        LIMIT 5
      `).all(`%${text}%`, `%${text}%`);
      
      codes.push(...loinc.map(row => ({
        system: 'LOINC',
        code: row.code,
        display: row.display
      })));
    }
    
    return codes;
  }

  private static extractTemporalConstraints(query: string): ParsedQuery['temporalConstraints'] {
    const constraints: ParsedQuery['temporalConstraints'] = {};
    
    // Extract time windows
    const windowMatch = query.match(/between\s+(\S+)\s+and\s+(\S+)/i);
    if (windowMatch) {
      constraints.window = {
        start: windowMatch[1],
        end: windowMatch[2]
      };
    }
    
    // Extract relative times
    const relativeMatches = [...query.matchAll(this.MEDICAL_PATTERNS.temporal[1])];
    if (relativeMatches.length > 0) {
      const match = relativeMatches[0];
      constraints.relative = `${match[1]} ${match[2]}`;
    }
    
    // Extract anchor events
    const anchorMatch = query.match(/(?:after|before|from|since)\s+(?:the\s+)?(\w+\s+\w+)/i);
    if (anchorMatch) {
      constraints.anchor = anchorMatch[1];
    }
    
    return Object.keys(constraints).length > 0 ? constraints : undefined;
  }

  private static extractPopulationFilters(query: string): ParsedQuery['populationFilters'] {
    const filters: ParsedQuery['populationFilters'] = [];
    
    // Age filters
    const ageMatch = query.match(/(?:age|aged?)\s*([><=]+)\s*(\d+)/i);
    if (ageMatch) {
      filters.push({
        type: 'age',
        operator: ageMatch[1],
        value: parseInt(ageMatch[2])
      });
    }
    
    // Gender filters
    const genderMatch = query.match(/\b(male|female|men|women)\b/i);
    if (genderMatch) {
      filters.push({
        type: 'gender',
        operator: '=',
        value: genderMatch[1].toLowerCase().startsWith('m') ? 'male' : 'female'
      });
    }
    
    // Setting filters
    const settingMatch = query.match(/\b(icu|emergency|inpatient|outpatient|ed)\b/i);
    if (settingMatch) {
      filters.push({
        type: 'setting',
        operator: '=',
        value: settingMatch[1].toLowerCase()
      });
    }
    
    return filters;
  }

  private static extractStatisticalRequirements(query: string): ParsedQuery['statisticalRequirements'] {
    const requirements: ParsedQuery['statisticalRequirements'] = {};
    
    // Adjustment variables
    const adjustMatch = query.match(/adjust(?:ing|ed)?\s+for\s+([^,.]+)/i);
    if (adjustMatch) {
      requirements.adjustFor = adjustMatch[1]
        .split(/\s*,\s*|\s+and\s+/)
        .map(v => v.trim());
    }
    
    // Stratification
    const stratifyMatch = query.match(/stratif(?:y|ied)\s+by\s+([^,.]+)/i);
    if (stratifyMatch) {
      requirements.stratifyBy = stratifyMatch[1]
        .split(/\s*,\s*|\s+and\s+/)
        .map(v => v.trim());
    }
    
    // Sensitivity analyses
    if (query.includes('sensitivity')) {
      requirements.sensitivity = ['requested'];
    }
    
    return requirements;
  }

  static async enhanceWithClinicalContext(entities: MedicalEntity[]): Promise<MedicalEntity[]> {
    // Enhance entities with clinical relationships
    for (const entity of entities) {
      if (entity.type === 'condition' && entity.codes) {
        // Find related medications
        const relatedMeds = await this.findRelatedMedications(entity.codes);
        if (relatedMeds.length > 0) {
          entity.attributes = {
            ...entity.attributes,
            relatedMedications: relatedMeds
          };
        }
        
        // Find related labs
        const relatedLabs = await this.findRelatedLabs(entity.codes);
        if (relatedLabs.length > 0) {
          entity.attributes = {
            ...entity.attributes,
            relatedLabs: relatedLabs
          };
        }
      }
    }
    
    return entities;
  }

  private static async findRelatedMedications(conditionCodes: MedicalEntity['codes']): Promise<string[]> {
    // In a real implementation, would query a knowledge base
    // For now, return common medications for certain conditions
    const conditionMedMap: Record<string, string[]> = {
      'hypertension': ['lisinopril', 'amlodipine', 'metoprolol'],
      'diabetes': ['metformin', 'insulin', 'glipizide'],
      'heart failure': ['furosemide', 'carvedilol', 'lisinopril']
    };
    
    for (const code of conditionCodes || []) {
      const condition = code.display.toLowerCase();
      for (const [key, meds] of Object.entries(conditionMedMap)) {
        if (condition.includes(key)) {
          return meds;
        }
      }
    }
    
    return [];
  }

  private static async findRelatedLabs(conditionCodes: MedicalEntity['codes']): Promise<string[]> {
    // Common labs for conditions
    const conditionLabMap: Record<string, string[]> = {
      'diabetes': ['glucose', 'hemoglobin a1c', 'creatinine'],
      'kidney': ['creatinine', 'bun', 'egfr', 'urinalysis'],
      'liver': ['ast', 'alt', 'bilirubin', 'albumin'],
      'heart': ['troponin', 'bnp', 'ck-mb']
    };
    
    for (const code of conditionCodes || []) {
      const condition = code.display.toLowerCase();
      for (const [key, labs] of Object.entries(conditionLabMap)) {
        if (condition.includes(key)) {
          return labs;
        }
      }
    }
    
    return [];
  }
}