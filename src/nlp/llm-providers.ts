import axios from 'axios';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('llm-providers');

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  customHeaders?: Record<string, string>;
}

export abstract class LLMProvider {
  protected config: LLMProviderConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = config;
  }
  
  abstract sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
  abstract isAvailable(): Promise<boolean>;
  abstract getModelCapabilities(): ModelCapabilities;
}

export interface ModelCapabilities {
  maxContextTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  medicalSpecialized: boolean;
  costPerMillion: number; // Cost per million tokens
}

// OpenAI Provider
export class OpenAIProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      this.config.baseUrl || 'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      },
      model: response.data.model,
      provider: 'openai'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(
        this.config.baseUrl || 'https://api.openai.com/v1/models',
        {
          headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
          timeout: 5000
        }
      );
      return true;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    const model = this.config.model || 'gpt-4-turbo-preview';
    if (model.includes('gpt-4')) {
      return {
        maxContextTokens: 128000,
        supportsFunctions: true,
        supportsVision: model.includes('vision'),
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 10.0
      };
    } else {
      return {
        maxContextTokens: 16385,
        supportsFunctions: true,
        supportsVision: false,
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 0.5
      };
    }
  }
}

// Anthropic Claude Provider
export class AnthropicProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      this.config.baseUrl || 'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model || 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000
      },
      {
        headers: {
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.content[0].text,
      usage: {
        promptTokens: response.data.usage?.input_tokens || 0,
        completionTokens: response.data.usage?.output_tokens || 0,
        totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
      },
      model: response.data.model,
      provider: 'anthropic'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Anthropic doesn't have a models endpoint, so we'll do a minimal test
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    const model = this.config.model || 'claude-3-opus-20240229';
    if (model.includes('opus')) {
      return {
        maxContextTokens: 200000,
        supportsFunctions: false,
        supportsVision: true,
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 15.0
      };
    } else if (model.includes('sonnet')) {
      return {
        maxContextTokens: 200000,
        supportsFunctions: false,
        supportsVision: true,
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 3.0
      };
    } else {
      return {
        maxContextTokens: 200000,
        supportsFunctions: false,
        supportsVision: false,
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 0.25
      };
    }
  }
}

// Google Gemini Provider
export class GoogleProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/${this.config.model || 'gemini-pro'}:generateContent`,
      {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature || 0.1,
          maxOutputTokens: this.config.maxTokens || 4000
        }
      },
      {
        headers: {
          'x-goog-api-key': this.config.apiKey!,
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.candidates[0].content.parts[0].text,
      model: this.config.model || 'gemini-pro',
      provider: 'google'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 32000,
      supportsFunctions: true,
      supportsVision: this.config.model?.includes('vision') || false,
      supportsStreaming: true,
      medicalSpecialized: this.config.model?.includes('med') || false,
      costPerMillion: 0.5
    };
  }
}

// Mistral Provider
export class MistralProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      this.config.baseUrl || 'https://api.mistral.ai/v1/chat/completions',
      {
        model: this.config.model || 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'mistral'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 32000,
      supportsFunctions: true,
      supportsVision: false,
      supportsStreaming: true,
      medicalSpecialized: false,
      costPerMillion: 2.0
    };
  }
}

// Cohere Provider
export class CohereProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      this.config.baseUrl || 'https://api.cohere.ai/v1/chat',
      {
        model: this.config.model || 'command-r-plus',
        message: userPrompt,
        preamble: systemPrompt,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.text,
      model: this.config.model || 'command-r-plus',
      provider: 'cohere'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 128000,
      supportsFunctions: true,
      supportsVision: false,
      supportsStreaming: true,
      medicalSpecialized: false,
      costPerMillion: 0.5
    };
  }
}

// Ollama Local Provider
export class OllamaProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.config.baseUrl || 'http://localhost:11434'}/api/generate`,
      {
        model: this.config.model || 'llama3:70b',
        prompt: `${systemPrompt}\n\nUser: ${userPrompt}\nAssistant:`,
        temperature: this.config.temperature || 0.1,
        stream: false,
        format: 'json'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 60000 // Longer timeout for local models
      }
    );
    
    return {
      content: response.data.response,
      model: this.config.model || 'llama3:70b',
      provider: 'ollama'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl || 'http://localhost:11434'}/api/tags`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    // Capabilities depend on the specific model
    const model = this.config.model || 'llama3:70b';
    if (model.includes('70b') || model.includes('65b')) {
      return {
        maxContextTokens: 8192,
        supportsFunctions: false,
        supportsVision: model.includes('llava'),
        supportsStreaming: true,
        medicalSpecialized: model.includes('med') || model.includes('bio'),
        costPerMillion: 0 // Free for local
      };
    } else {
      return {
        maxContextTokens: 4096,
        supportsFunctions: false,
        supportsVision: false,
        supportsStreaming: true,
        medicalSpecialized: false,
        costPerMillion: 0
      };
    }
  }
}

// LM Studio Provider
export class LMStudioProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.config.baseUrl || 'http://localhost:1234'}/v1/chat/completions`,
      {
        model: this.config.model || 'local-model',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 60000
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'lmstudio'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl || 'http://localhost:1234'}/v1/models`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 8192,
      supportsFunctions: true,
      supportsVision: false,
      supportsStreaming: true,
      medicalSpecialized: false,
      costPerMillion: 0
    };
  }
}

// Custom/Generic OpenAI-compatible Provider
export class CustomProvider extends LLMProvider {
  async sendRequest(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.config.baseUrl}/v1/chat/completions`,
      {
        model: this.config.model || 'custom-model',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 4000
      },
      {
        headers: {
          'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : undefined,
          'Content-Type': 'application/json',
          ...this.config.customHeaders
        },
        timeout: this.config.timeout || 30000
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
      provider: 'custom'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/v1/models`,
        {
          headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
          timeout: 5000
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  getModelCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 4096,
      supportsFunctions: false,
      supportsVision: false,
      supportsStreaming: false,
      medicalSpecialized: false,
      costPerMillion: 0
    };
  }
}

// Provider Factory
export class LLMProviderFactory {
  static createProvider(config: LLMProviderConfig): LLMProvider {
    switch (config.provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
      case 'claude':
        return new AnthropicProvider(config);
      case 'google':
      case 'gemini':
        return new GoogleProvider(config);
      case 'mistral':
        return new MistralProvider(config);
      case 'cohere':
        return new CohereProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'lmstudio':
      case 'lm-studio':
        return new LMStudioProvider(config);
      case 'custom':
        return new CustomProvider(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
  
  static async findAvailableProvider(preferredOrder?: string[]): Promise<LLMProvider | null> {
    const order = preferredOrder || [
      'anthropic',
      'openai',
      'google',
      'mistral',
      'cohere',
      'ollama',
      'lmstudio'
    ];
    
    for (const providerName of order) {
      const envKey = `${providerName.toUpperCase()}_API_KEY`;
      const apiKey = process.env[envKey];
      
      if (apiKey || ['ollama', 'lmstudio'].includes(providerName)) {
        const config: LLMProviderConfig = {
          provider: providerName,
          apiKey
        };
        
        try {
          const provider = this.createProvider(config);
          if (await provider.isAvailable()) {
            logger.info(`Found available LLM provider: ${providerName}`);
            return provider;
          }
        } catch (error) {
          logger.debug(`Provider ${providerName} not available: ${error.message}`);
        }
      }
    }
    
    return null;
  }
}

// Medical-specialized models registry
export const MEDICAL_MODELS = {
  'med-palm': {
    provider: 'google',
    model: 'medpalm2',
    specialized: true,
    description: 'Google\'s medical-specific LLM'
  },
  'biomedlm': {
    provider: 'custom',
    model: 'BioMedLM',
    baseUrl: 'https://api.biomedlm.com',
    specialized: true,
    description: 'Stanford\'s biomedical language model'
  },
  'clinical-bert': {
    provider: 'custom',
    model: 'clinical-bert-v1',
    specialized: true,
    description: 'BERT model fine-tuned on clinical notes'
  },
  'meditron': {
    provider: 'ollama',
    model: 'meditron:70b',
    specialized: true,
    description: 'Open-source medical LLM'
  }
};