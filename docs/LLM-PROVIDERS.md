# LLM Provider Configuration Guide

The Healthcare Research MCP Server supports multiple LLM providers for natural language processing of medical queries. You can use cloud-based services, local models, or custom endpoints.

## Supported Providers

### Cloud Providers

#### 1. Anthropic Claude (Recommended)
```bash
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic  # Optional, auto-detected
LLM_MODEL=claude-3-opus-20240229  # Optional, defaults to best model
```

**Models:**
- `claude-3-opus-20240229` - Most capable, best for complex medical queries
- `claude-3-sonnet-20240229` - Balanced performance and cost
- `claude-3-haiku-20240307` - Fast and affordable

#### 2. OpenAI GPT
```bash
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview  # or gpt-4, gpt-3.5-turbo
```

**Models:**
- `gpt-4-turbo-preview` - Latest GPT-4 with 128k context
- `gpt-4` - Original GPT-4
- `gpt-3.5-turbo` - Faster, more affordable

#### 3. Google Gemini
```bash
GOOGLE_API_KEY=...
LLM_PROVIDER=google
LLM_MODEL=gemini-pro  # or gemini-pro-vision
```

**Models:**
- `gemini-pro` - Text-only model
- `gemini-pro-vision` - Multimodal (can process medical images)
- `medpalm2` - Medical-specialized (requires special access)

#### 4. Mistral AI
```bash
MISTRAL_API_KEY=...
LLM_PROVIDER=mistral
LLM_MODEL=mistral-large-latest
```

#### 5. Cohere
```bash
COHERE_API_KEY=...
LLM_PROVIDER=cohere
LLM_MODEL=command-r-plus
```

### Local Models

#### 1. Ollama (Recommended for Local)

**Installation:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3:70b

# Or pull a medical-specialized model
ollama pull meditron:70b
```

**Configuration:**
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434  # Default
OLLAMA_MODEL=llama3:70b
```

**Recommended Medical Models:**
- `meditron:70b` - Medical-specialized Llama variant
- `medllama2:70b` - Medical fine-tuned Llama 2
- `biogpt` - Biomedical text model

#### 2. LM Studio

**Setup:**
1. Download LM Studio from https://lmstudio.ai/
2. Download a model (e.g., `TheBloke/meditron-70B-GGUF`)
3. Start the local server in LM Studio

**Configuration:**
```bash
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234
LMSTUDIO_MODEL=TheBloke/meditron-70B-GGUF
```

#### 3. Custom OpenAI-Compatible Endpoints

Any service with an OpenAI-compatible API can be used:

```bash
LLM_PROVIDER=custom
CUSTOM_BASE_URL=https://your-endpoint.com
CUSTOM_API_KEY=your-key  # If required
CUSTOM_MODEL=your-model-name
```

Examples:
- Text Generation WebUI
- FastChat
- vLLM
- Triton Inference Server

## Advanced Configuration

### Auto-Detection

The system automatically detects available providers based on environment variables:

```javascript
// Priority order:
1. Explicitly set LLM_PROVIDER
2. ANTHROPIC_API_KEY → Uses Anthropic
3. OPENAI_API_KEY → Uses OpenAI
4. GOOGLE_API_KEY → Uses Google
5. Falls back to Ollama (if running)
6. Falls back to LM Studio (if running)
```

### Fallback Providers

Configure automatic fallbacks for reliability:

```bash
# Primary provider
ANTHROPIC_API_KEY=sk-ant-...

# Fallback providers (comma-separated)
LLM_FALLBACK_PROVIDERS=openai,ollama,lmstudio

# Fallback API keys
OPENAI_API_KEY=sk-...  # Used if Anthropic fails
```

### Medical-Specialized Models

Enable preference for medical models:

```bash
PREFER_MEDICAL_MODELS=true
```

When enabled, the system will use:
- Google: `medpalm2` (if available)
- Ollama: `meditron:70b` (if available)
- Custom medical endpoints

### Performance Tuning

```bash
# Lower temperature for more consistent medical analysis
LLM_TEMPERATURE=0.1  # 0.0-1.0, lower = more deterministic

# Adjust token limits
LLM_MAX_TOKENS=4000  # Maximum response length

# Timeout for slow models
LLM_TIMEOUT=60000  # 60 seconds for local models
```

## Usage Examples

### Example 1: High-Performance Cloud Setup
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-3-opus-20240229
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=8000
```

### Example 2: Privacy-Focused Local Setup
```bash
# .env
LLM_PROVIDER=ollama
OLLAMA_MODEL=meditron:70b
PREFER_MEDICAL_MODELS=true
LLM_TEMPERATURE=0.2
```

### Example 3: Balanced with Fallbacks
```bash
# .env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo-preview
LLM_FALLBACK_PROVIDERS=ollama,lmstudio
OLLAMA_MODEL=llama3:70b
```

### Example 4: Custom Medical Endpoint
```bash
# .env
LLM_PROVIDER=custom
CUSTOM_BASE_URL=https://medical-llm.hospital.internal
CUSTOM_API_KEY=internal-key
CUSTOM_MODEL=clinical-llm-v2
PREFER_MEDICAL_MODELS=true
```

## Programmatic Usage

```typescript
import { LLMMedicalNLP } from './nlp/llm-medical-nlp';

// Auto-detect from environment
const nlp = await LLMMedicalNLP.autoDetectAndCreate();

// Or explicitly configure
const nlp = new LLMMedicalNLP({
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229',
  temperature: 0.1,
  maxTokens: 4000
});

// Parse medical query
const result = await nlp.parseQuery(
  "Compare 30-day mortality in sepsis patients receiving " +
  "vancomycin vs. alternative antibiotics"
);
```

## Model Comparison for Medical Use

| Provider | Model | Medical Knowledge | Speed | Cost | Privacy |
|----------|-------|------------------|-------|------|----------|
| Anthropic | Claude-3 Opus | Excellent | Medium | $$$ | Cloud |
| OpenAI | GPT-4 Turbo | Excellent | Medium | $$$ | Cloud |
| Google | Gemini Pro | Very Good | Fast | $$ | Cloud |
| Google | MedPaLM 2 | Specialized | Medium | $$$$ | Cloud |
| Ollama | Meditron 70B | Good | Slow* | Free | Local |
| Ollama | Llama 3 70B | Good | Slow* | Free | Local |
| Mistral | Large | Good | Fast | $$ | Cloud |

*Speed depends on local hardware (GPU recommended)

## Troubleshooting

### Issue: "No LLM provider available"
**Solution:**
1. Check that at least one API key is set
2. Verify Ollama is running: `curl http://localhost:11434/api/tags`
3. Check LM Studio server is started

### Issue: "LLM response parsing failed"
**Solution:**
1. Ensure model supports JSON output
2. Try lowering temperature: `LLM_TEMPERATURE=0.0`
3. Check model has sufficient context for medical queries

### Issue: "Timeout errors with local models"
**Solution:**
1. Increase timeout: `LLM_TIMEOUT=120000` (2 minutes)
2. Use smaller model: `llama3:13b` instead of `70b`
3. Ensure adequate RAM/VRAM

### Issue: "Medical terms not recognized"
**Solution:**
1. Enable medical models: `PREFER_MEDICAL_MODELS=true`
2. Use specialized models like `meditron`
3. Consider cloud providers for better medical knowledge

## Privacy & Compliance Notes

- **Local Models**: All processing stays on your infrastructure
- **Cloud Providers**: Data is sent to external APIs
- **HIPAA**: For HIPAA compliance, use local models or ensure BAA with cloud provider
- **Caching**: LLM responses are cached locally by default
- **Audit**: All LLM calls are logged with usage metrics

## Cost Optimization

1. **Use Fallbacks**: Configure expensive models as primary, cheap as fallback
2. **Cache Aggressively**: Same queries won't hit LLM twice
3. **Model Selection**: Use smaller models for simple queries
4. **Local for Development**: Use Ollama during development
5. **Batch Processing**: Process multiple queries together when possible