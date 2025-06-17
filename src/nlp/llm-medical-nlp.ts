import { createModuleLogger } from '../utils/logger.js';
import { MCPError } from '../utils/errors.js';
import { Cacheable } from '../utils/cache.js';
import { MedicalEntity, ParsedQuery } from './medical-nlp.js';
import { STROBE_CHECKLIST, checkSTROBECompliance, generateSTROBECompliantAdditions } from './strobe-guidelines.js';
import { LLMProvider, LLMProviderFactory, LLMProviderConfig, MEDICAL_MODELS } from './llm-providers.js';

const llmLogger = createModuleLogger('llm-medical-nlp');

export interface LLMConfig extends LLMProviderConfig {
  preferMedicalModels?: boolean;
  fallbackProviders?: string[];
}

export interface LLMParsedQuery extends ParsedQuery {
  confidence: number;
  reasoning?: string;
  suggestedAnalyses?: string[];
  strobeCompliance?: {
    addressed: string[];
    missing: string[];
    recommendations: string[];
  };
}

export class LLMMedicalNLP {
  private provider: LLMProvider;
  private config: LLMConfig;
  
  constructor(config?: LLMConfig) {
    this.config = config || this.getDefaultConfig();
    this.provider = this.initializeProvider();
  }
  
  private getDefaultConfig(): LLMConfig {
    // Auto-detect provider from environment
    const provider = process.env.LLM_PROVIDER || 
                    (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 
                     process.env.OPENAI_API_KEY ? 'openai' : 
                     process.env.GOOGLE_API_KEY ? 'google' : 
                     'ollama');
    
    return {
      provider,
      apiKey: process.env[`${provider.toUpperCase()}_API_KEY`],
      model: process.env.LLM_MODEL,
      baseUrl: process.env.LLM_BASE_URL,
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),
      preferMedicalModels: process.env.PREFER_MEDICAL_MODELS === 'true',
      fallbackProviders: process.env.LLM_FALLBACK_PROVIDERS?.split(',') || ['ollama', 'lmstudio']
    };
  }
  
  private initializeProvider(): LLMProvider {
    // Check if medical model is requested and available
    if (this.config.preferMedicalModels) {
      for (const [name, modelConfig] of Object.entries(MEDICAL_MODELS)) {
        if (modelConfig.provider === this.config.provider) {
          this.config.model = modelConfig.model;
          if (modelConfig.baseUrl) {
            this.config.baseUrl = modelConfig.baseUrl;
          }
          llmLogger.info(`Using medical-specialized model: ${name}`);
          break;
        }
      }
    }
    
    try {
      return LLMProviderFactory.createProvider(this.config);
    } catch (error) {
      llmLogger.error('Failed to create primary provider', { error: error.message });
      throw error;
    }
  }
  
  async ensureProviderAvailable(): Promise<void> {
    if (!await this.provider.isAvailable()) {
      llmLogger.warn('Primary provider not available, attempting fallback');
      
      // Try fallback providers
      for (const fallbackName of this.config.fallbackProviders || []) {
        try {
          const fallbackProvider = LLMProviderFactory.createProvider({
            provider: fallbackName,
            apiKey: process.env[`${fallbackName.toUpperCase()}_API_KEY`],
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
          });
          
          if (await fallbackProvider.isAvailable()) {
            this.provider = fallbackProvider;
            llmLogger.info(`Switched to fallback provider: ${fallbackName}`);
            return;
          }
        } catch (error) {
          llmLogger.debug(`Fallback provider ${fallbackName} not available`);
        }
      }
      
      throw new MCPError('No LLM providers available', 'PROVIDER_ERROR', 503);
    }
  }
  
  @Cacheable('llm-query', 3600)
  async parseQuery(query: string): Promise<LLMParsedQuery> {
    llmLogger.info('Parsing query with LLM', { query, provider: this.config.provider });
    
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query);
      
      // Ensure provider is available
      await this.ensureProviderAvailable();
      
      // Send request through provider
      const llmResponse = await this.provider.sendRequest(systemPrompt, userPrompt);
      
      // Parse response
      let response: any;
      try {
        response = JSON.parse(llmResponse.content);
      } catch (error) {
        llmLogger.error('Failed to parse LLM response as JSON', { 
          content: llmResponse.content.substring(0, 200) 
        });
        throw new MCPError('Invalid LLM response format', 'PARSE_ERROR', 500);
      }
      
      // Log usage if available
      if (llmResponse.usage) {
        llmLogger.info('LLM usage', {
          provider: llmResponse.provider,
          model: llmResponse.model,
          tokens: llmResponse.usage.totalTokens,
          cost: this.estimateCost(llmResponse.usage.totalTokens)
        });
      }
      
      const parsed = this.validateAndEnhanceParsedQuery(response);
      
      llmLogger.info('LLM parsing complete', {
        confidence: parsed.confidence,
        entityCount: parsed.entities.length,
        strobeCompliance: parsed.strobeCompliance?.addressed.length
      });
      
      return parsed;
    } catch (error) {
      llmLogger.error('LLM parsing failed', { error: error.message });
      throw new MCPError('Failed to parse query with LLM', 'LLM_ERROR', 500);
    }
  }
  
  private getSTROBEGuidelines(): string {
    // Format STROBE checklist for LLM context
    const guidelines = STROBE_CHECKLIST.map(item => {
      let text = `${item.item}. ${item.title}: ${item.description}`;
      if (item.subItems) {
        text += '\n   ' + item.subItems.map(sub => `- ${sub}`).join('\n   ');
      }
      return text;
    }).join('\n\n');
    
    return `STROBE Statement - Checklist for Observational Studies:\n\n${guidelines}`;
  }
  
  private buildSystemPrompt(): string {
    const strobeGuidelines = this.getSTROBEGuidelines();
    
    return `You are an expert medical research analyst specializing in observational health studies. 
Your task is to parse natural language research questions and extract structured information 
following best practices from the STROBE statement.

${strobeGuidelines}

For each query, you must:
1. Extract all medical entities (conditions, medications, procedures, labs)
2. Map them to standard medical codes when possible (ICD-10, SNOMED, RxNorm, LOINC)
3. Identify the research intent and study design
4. Determine appropriate statistical analyses
5. Ensure compliance with STROBE guidelines by checking against all items
6. Suggest any missing elements needed for STROBE compliance

Important STROBE compliance checks:
- Study design must be clearly stated (Item 4)
- All variables must be clearly defined (Item 7)
- Statistical methods must address confounding (Item 12a)
- Missing data approach must be specified (Item 12c)
- Sensitivity analyses should be included (Item 12e)
- Sample size justification needed (Item 10)
- Bias assessment required (Item 9)

Provide your response as a JSON object with clear structure and reasoning.`;
  }
  
  private buildUserPrompt(query: string): string {
    return `
Analyze this research question and extract structured information:

"${query}"

Provide a JSON response with the following structure:
{
  "intent": "comparison|association|prediction|descriptive|temporal",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your interpretation",
  "entities": [
    {
      "text": "extracted term",
      "type": "condition|medication|procedure|lab|symptom",
      "codes": [
        {
          "system": "ICD-10|SNOMED|RxNorm|LOINC",
          "code": "code value",
          "display": "code description"
        }
      ],
      "negated": false,
      "temporal": "baseline|outcome|exposure",
      "role": "primary_exposure|outcome|confounder|effect_modifier"
    }
  ],
  "temporalConstraints": {
    "followUpDuration": "e.g., 30 days",
    "indexEvent": "e.g., sepsis diagnosis",
    "measurementWindows": {}
  },
  "populationFilters": [
    {
      "type": "age|gender|setting|condition",
      "operator": "=", ">", "<", etc.",
      "value": "filter value"
    }
  ],
  "statisticalRequirements": {
    "primaryAnalysis": "e.g., Cox regression",
    "adjustFor": ["list of confounders"],
    "stratifyBy": ["subgroup variables"],
    "sensitivityAnalyses": ["planned sensitivity analyses"]
  },
  "suggestedAnalyses": [
    "Descriptive statistics (Table 1)",
    "Primary outcome analysis",
    "Subgroup analyses",
    "Sensitivity analyses"
  ],
  "strobeCompliance": {
    "addressed": ["STROBE items covered by the query"],
    "missing": ["STROBE items that should be considered"],
    "recommendations": ["Specific suggestions to improve the analysis plan"]
  },
  "cohortDefinition": {
    "exposureGroup": "Clear definition of exposure group",
    "controlGroup": "Clear definition of control group",
    "inclusionCriteria": [],
    "exclusionCriteria": []
  },
  "outcomeMeasures": {
    "primary": "Primary outcome with time frame",
    "secondary": ["List of secondary outcomes"]
  }
}

Ensure all medical terms are properly coded and the analysis plan follows STROBE guidelines.`;
  }
  
  private estimateCost(totalTokens: number): number {
    const capabilities = this.provider.getModelCapabilities();
    return (totalTokens / 1_000_000) * capabilities.costPerMillion;
  }
  
  static async autoDetectAndCreate(): Promise<LLMMedicalNLP> {
    // Try to find any available provider
    const provider = await LLMProviderFactory.findAvailableProvider();
    
    if (!provider) {
      throw new MCPError(
        'No LLM provider available. Please configure at least one provider.',
        'NO_PROVIDER',
        503
      );
    }
    
    // Get provider name from the found provider
    const providerName = provider.constructor.name.replace('Provider', '').toLowerCase();
    
    return new LLMMedicalNLP({
      provider: providerName,
      temperature: 0.1,
      maxTokens: 4000
    });
  }
  
  private validateAndEnhanceParsedQuery(response: any): LLMParsedQuery {
    // Validate required fields
    if (!response.intent || !response.entities || !Array.isArray(response.entities)) {
      throw new MCPError('Invalid LLM response structure', 'VALIDATION_ERROR', 400);
    }
    
    // Ensure confidence score
    const confidence = response.confidence || 0.8;
    
    // Convert to our ParsedQuery format
    const parsed: LLMParsedQuery = {
      intent: response.intent,
      entities: response.entities.map((e: any) => ({
        text: e.text,
        type: e.type,
        codes: e.codes || [],
        negated: e.negated || false,
        temporal: e.temporal,
        certainty: 'confirmed',
        attributes: {
          role: e.role,
          ...e.attributes
        }
      })),
      confidence,
      reasoning: response.reasoning,
      suggestedAnalyses: response.suggestedAnalyses || [],
      strobeCompliance: response.strobeCompliance
    };
    
    // Add optional fields if present
    if (response.temporalConstraints) {
      parsed.temporalConstraints = response.temporalConstraints;
    }
    
    if (response.populationFilters && response.populationFilters.length > 0) {
      parsed.populationFilters = response.populationFilters;
    }
    
    if (response.statisticalRequirements) {
      parsed.statisticalRequirements = response.statisticalRequirements;
    }
    
    // Store additional analysis metadata
    (parsed as any).cohortDefinition = response.cohortDefinition;
    (parsed as any).outcomeMeasures = response.outcomeMeasures;
    
    return parsed;
  }
  
  async enhanceWithLocalOntologies(parsedQuery: LLMParsedQuery): Promise<LLMParsedQuery> {
    // Import the original MedicalNLP for local code lookups
    const { MedicalNLP } = await import('./medical-nlp.js');
    
    // Enhance entities with local ontology lookups
    for (const entity of parsedQuery.entities) {
      if (!entity.codes || entity.codes.length === 0) {
        // Try to find codes in local database
        const localCodes = await (MedicalNLP as any).findMedicalCodes(entity.text, entity.type);
        if (localCodes.length > 0) {
          entity.codes = localCodes;
        }
      }
    }
    
    // Add clinical context
    parsedQuery.entities = await MedicalNLP.enhanceWithClinicalContext(parsedQuery.entities);
    
    return parsedQuery;
  }
  
  async generateSTROBECompliantAnalysisPlan(parsedQuery: LLMParsedQuery): Promise<any> {
    const prompt = `
Based on this parsed research query, generate a complete STROBE-compliant analysis plan:

Query Intent: ${parsedQuery.intent}
Entities: ${JSON.stringify(parsedQuery.entities, null, 2)}
Temporal Constraints: ${JSON.stringify(parsedQuery.temporalConstraints, null, 2)}
Statistical Requirements: ${JSON.stringify(parsedQuery.statisticalRequirements, null, 2)}

Generate a detailed analysis plan that addresses all STROBE checklist items:
1. Study design specification
2. Setting and participants
3. Variables (clearly define all outcomes, exposures, confounders)
4. Data sources and measurement methods
5. Bias mitigation strategies
6. Sample size justification
7. Statistical methods (including missing data handling)
8. Planned sensitivity analyses

Format as a structured JSON object.`;
    
    const systemPrompt = 'You are an expert biostatistician creating STROBE-compliant analysis plans.';
    
    await this.ensureProviderAvailable();
    const llmResponse = await this.provider.sendRequest(systemPrompt, prompt);
    
    try {
      return JSON.parse(llmResponse.content);
    } catch (error) {
      throw new MCPError('Failed to parse analysis plan', 'PARSE_ERROR', 500);
    }
  }
  
  async validateWithSTROBE(analysisSpec: any): Promise<{
    compliant: boolean;
    score: number;
    issues: string[];
    suggestions: any[];
  }> {
    const compliance = checkSTROBECompliance(analysisSpec);
    const additions = generateSTROBECompliantAdditions(analysisSpec);
    
    return {
      compliant: compliance.score >= 80,
      score: compliance.score,
      issues: compliance.missing,
      suggestions: additions
    };
  }
}