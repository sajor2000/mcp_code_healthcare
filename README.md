# Healthcare Research MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP-SDK-purple)](https://modelcontextprotocol.io)

A production-ready Model Context Protocol (MCP) server for health services research, supporting OMOP CDM and CLIF data formats with LLM-powered natural language processing, automated code generation, and publication-quality figure rendering.

🏥 **Transform natural language medical questions into complete, STROBE-compliant research analyses**

✨ **NEW: Complete OMOP CDM v5.4 support with comprehensive medical ontology integration (ICD-10, RxNorm, LOINC, SNOMED CT)**

🔬 **Enhanced with STROBE guidelines and CDC Adult Sepsis Event definitions for rigorous observational research**

## Features

### 🔍 Natural Language Query Processing with LLM Support
- Parse complex medical research questions in plain English using multiple LLM providers
- Support for 8+ LLM providers: Anthropic Claude, OpenAI GPT, Google Gemini, Mistral, Cohere, Ollama, LM Studio, and custom endpoints
- Automatic fallback to local models for privacy-sensitive data
- Extract medical entities (conditions, medications, labs) with automatic code mapping
- Understand temporal constraints and statistical requirements
- Support for multiple query intents: comparison, prediction, association, temporal analysis
- STROBE Statement compliance checking and recommendations
- CDC Adult Sepsis Event (ASE) surveillance definition implementation
- Sequential thinking for optimal task organization

### 📊 Automated Research Code Generation
- Generate complete analysis pipelines in R or Python
- Support for multiple frameworks (tidyverse, scikit-learn)
- Built-in HIPAA compliance and privacy protection
- Automatic cohort definition and data validation

### 📈 Publication-Quality Figure Generation
- Kaplan-Meier survival curves
- Forest plots for meta-analysis
- ROC curves with AUC
- Box plots, scatter plots, and heatmaps
- Export to journal styles (NEJM, JAMA, Lancet)
- React component export for web integration

### 🏥 Healthcare Data Standards & Medical Ontologies
- **Complete OMOP CDM v5.4 Support**: All 15 core tables with proper relationships
- **CLIF v2.0.0**: Full 23-table Critical Care format support
- **Comprehensive Medical Ontology Integration**:
  - **ICD-10**: 100+ sepsis, pneumonia, heart failure codes with descriptions
  - **SNOMED CT**: Clinical terminology with hierarchical relationships
  - **RxNorm**: Medication codes with formulations and strengths
  - **LOINC**: Laboratory test codes with measurement methods
- **Advanced OMOP Features**:
  - Automatic data structure validation with recommendations
  - OMOP-compliant SQL query generation
  - Concept mapping between vocabularies
  - Standard concept usage enforcement

### 🔒 Enterprise Features
- HIPAA-compliant data handling
- Row-level security and audit logging
- Caching for performance optimization
- Comprehensive error handling and logging
- Production-grade architecture

## 🚀 Quick Start

**Get running in 5 minutes!** See [QUICK_START.md](QUICK_START.md) for the fastest setup.

```bash
# Clone and install
git clone https://github.com/sajor2000/mcp_code_healthcare.git
cd mcp_code_healthcare
npm install

# Quick test (no database needed)
npm run build:standalone
./test-mcp-standalone.sh

# Test OMOP-enhanced features
npm run build:omop
./test-omop-enhanced.sh
```

## Installation (Full Version)

```bash
# Install with all features
npm install

# Set up directories and databases
npm run setup:dirs
npm run db:init

# Download medical ontologies (optional, for code mapping)
npm run collect:ontologies
```

> **Note**: If you have issues with `better-sqlite3`, use the standalone version which works without it.

## Configuration

Create a `.env` file (see `.env.example` for all options):

```env
# Database paths
ONTOLOGY_DB_PATH=./data/databases/ontology.db
RESEARCH_DB_PATH=./data/databases/research.db

# API Keys (for web scraping)
FIRECRAWL_API_KEY=your_key_here
BRAVE_API_KEY=your_key_here

# LLM Configuration (choose one or multiple for fallback)
# Cloud Providers
ANTHROPIC_API_KEY=sk-ant-...      # Recommended for best results
OPENAI_API_KEY=sk-...              # Alternative cloud provider
GOOGLE_API_KEY=...                 # Supports medical models

# Local Models (for privacy)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=meditron:70b          # Medical-specialized model

# Server settings
PORT=3000
LOG_LEVEL=info
HIPAA_COMPLIANT=true
```

### LLM Provider Setup

The system supports multiple LLM providers for natural language understanding:

1. **Cloud Providers** (for best accuracy):
   - Anthropic Claude (recommended)
   - OpenAI GPT-4
   - Google Gemini (with MedPaLM access)
   
2. **Local Models** (for privacy):
   - Ollama with medical models (Meditron, BioGPT)
   - LM Studio with custom GGUF models
   
3. **Custom Endpoints**:
   - Any OpenAI-compatible API

See [docs/LLM-PROVIDERS.md](docs/LLM-PROVIDERS.md) for detailed setup instructions.

## Quick Start

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build:prod
npm run start:prod
```

### Example Usage

```javascript
// Natural language query - exactly as the user would ask
const query = "Using this dataset I have uploaded, define sepsis, provide 
               descriptive statistics, and see if the medication vancomycin 
               reduces sepsis mortality at 30 days";

// The server will:
// 1. Use LLM to understand the research question
// 2. Extract medical concepts (sepsis, vancomycin, mortality)
// 3. Map to standard codes (ICD-10, RxNorm)
// 4. Generate hypothesis and cohort definition
// 5. Create complete R/Python analysis code
// 6. Generate publication-ready figures
// 7. Ensure STROBE compliance
```

## API Documentation

### Available Tools

#### 1. Natural Language Query (Primary Interface)
```typescript
{
  tool: "natural_language_query",
  arguments: {
    query: string,              // Natural language research question
    dataset_info?: {
      path: string,             // Path to uploaded dataset
      format: "csv" | "parquet",
      data_model: "OMOP" | "CLIF" | "custom"
    },
    execution_mode?: "analyze" | "plan_only" | "code_only",
    output_format?: "full_report" | "summary" | "code_only",
    use_llm?: boolean          // Default: true
  }
}
```

#### 2. Medical Knowledge Lookup
```typescript
{
  tool: "lookup_medical_knowledge",
  arguments: {
    concept: string,            // e.g., "sepsis", "ARDS", "vancomycin"
    concept_type: "condition" | "medication" | "procedure" | "data_model",
    include_details?: string[], // What information to include
    sources?: string[]          // Which sources to consult
  }
}
```

#### 3. Medical Literature Search
```typescript
{
  tool: "search_medical_literature",
  arguments: {
    query: string,              // e.g., "vancomycin sepsis mortality"
    sources?: string[],         // ["pubmed", "guidelines", "clinical_trials"]
    filters?: {
      publication_years?: number[],
      study_types?: string[]
    },
    limit?: number
  }
}
```

#### 4. External Search (Brave/Perplexity)
```typescript
{
  tool: "search_external_sources",
  arguments: {
    query: string,              // e.g., "latest sepsis guidelines 2024"
    search_type: "medical_research" | "clinical_guidelines" | "data_standards",
    providers?: ["brave", "perplexity", "pubmed_api"],
    options?: {
      freshness?: "day" | "week" | "month" | "year",
      count?: number
    }
  }
}
```

#### 2. Generate Analysis Code
```typescript
{
  tool: "generate_research_code",
  arguments: {
    query: string,
    analysis_spec: object,  // From analyze_research_query
    language: "R" | "Python",
    framework?: string
  }
}
```

#### 3. Create Publication Figure
```typescript
{
  tool: "create_publication_figure",
  arguments: {
    type: "kaplan_meier" | "forest_plot" | "roc_curve" | ...,
    data: object,
    style: "NEJM" | "JAMA" | "Lancet" | "Generic",
    title?: string,
    export_format?: "svg" | "react"
  }
}
```

### OMOP-Enhanced Tools (New!)

The server now includes comprehensive OMOP CDM v5.4 support with 10 specialized tools:

#### 1. OMOP Schema Access
```typescript
{
  tool: "get_omop_schema",
  arguments: {
    table_name: string,              // Specific table or "all"
    include_relationships?: boolean  // Include foreign keys
  }
}
```

#### 2. Medical Code Lookup
```typescript
{
  tool: "lookup_medical_code",
  arguments: {
    code: string,                    // e.g., "A41.9", "11124"
    code_system: "ICD10" | "RxNorm" | "LOINC" | "SNOMED"
  }
}
```

#### 3. Search Medical Codes
```typescript
{
  tool: "search_medical_codes",
  arguments: {
    keyword: string,                 // e.g., "sepsis", "vancomycin"
    code_systems?: string[],        // Which ontologies to search
    limit?: number                  // Results per system
  }
}
```

#### 4. Condition Code Retrieval
```typescript
{
  tool: "get_condition_codes",
  arguments: {
    condition: string,              // e.g., "sepsis", "heart failure"
    include_related?: boolean       // Include related conditions
  }
}
```

#### 5. Generate OMOP Cohorts
```typescript
{
  tool: "generate_omop_cohort",
  arguments: {
    condition: string,              // Primary condition
    inclusion_criteria?: string[],  // Additional criteria
    use_standard_concepts?: boolean // OMOP standard concepts only
  }
}
```

#### 6. Legacy Medical Ontology Tool
```typescript
{
  tool: "query_medical_ontology",
  arguments: {
    term: string,
    ontology: "ICD10" | "SNOMED" | "RxNorm" | "LOINC",
    limit?: number
  }
}
```

## Synthetic ICU Dataset Included

This repository includes a **synthetic ICU dataset** with 500 patients for testing and learning:

- **Location**: `data/mock-icu-data/`
- **Formats**: MIMIC, CLIF, and OMOP CDM
- **Contents**: 
  - 666 ICU admissions
  - 261 sepsis cases  
  - Complete vital signs, labs, medications
  - Realistic mortality rates (24.3%)

### Quick Start with Synthetic Data:
```bash
# Generate the dataset (already included)
python3 data/mock-icu-data/generate-synthetic-data.py

# View usage examples
node examples/use-synthetic-data.js

# Query with MCP
"Using the mock ICU dataset, analyze if vancomycin reduces sepsis mortality"
```

## Example Workflows

### 1. Survival Analysis
```bash
# Query
"Compare survival between early and late stage lung cancer patients 
 receiving chemotherapy versus immunotherapy"

# Generated R code includes:
- Cohort definition with ICD-10 codes
- Kaplan-Meier curves
- Cox proportional hazards model
- Propensity score matching
- Publication-ready figures
```

### 2. Prediction Model
```bash
# Query
"Predict 90-day readmission risk in heart failure patients using 
 demographics, labs, and medications"

# Generated Python code includes:
- Feature engineering pipeline
- Multiple ML algorithms comparison
- Cross-validation
- ROC curves and calibration plots
- SHAP values for interpretability
```

### 3. Comparative Effectiveness
```bash
# Query  
"Compare effectiveness of ACE inhibitors versus ARBs in reducing 
 cardiovascular events in diabetic patients"

# Generated analysis includes:
- Propensity score matching
- Sensitivity analyses
- Forest plot of subgroup effects
- Number needed to treat (NNT)
```

### 4. Complete Natural Language Analysis Example

Here's exactly how you can use the system as described:

```javascript
// Your natural language query
const result = await mcp.call('natural_language_query', {
  query: "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days",
  dataset_info: {
    path: "./data/icu_cohort.csv",
    format: "csv",
    data_model: "OMOP"
  },
  execution_mode: "analyze",
  output_format: "full_report"
});

// The system will return:
{
  "parsed_query": {
    "intent": "comparison",
    "entities": [
      {
        "text": "sepsis",
        "type": "condition",
        "codes": [
          { "system": "ICD-10", "code": "A41.9", "display": "Sepsis, unspecified" },
          { "system": "SNOMED", "code": "91302008", "display": "Sepsis" }
        ]
      },
      {
        "text": "vancomycin",
        "type": "medication",
        "codes": [
          { "system": "RxNorm", "code": "11124", "display": "Vancomycin" }
        ]
      },
      {
        "text": "mortality at 30 days",
        "type": "outcome",
        "temporal": "30 days"
      }
    ]
  },
  "hypothesis": {
    "primary": "Vancomycin administration in sepsis patients is associated with reduced 30-day mortality compared to alternative antibiotics",
    "mechanisms": ["Direct antimicrobial effect", "Reduced endotoxin release"],
    "confounders": ["Sepsis severity", "Comorbidities", "Time to antibiotic"]
  },
  "cohort_definition": {
    "exposure_group": "Sepsis patients receiving vancomycin within 24h",
    "control_group": "Sepsis patients receiving alternative antibiotics",
    "sample_size_estimate": 2847
  },
  "analysis_code": "# Complete R analysis code...",
  "visualizations": [
    {
      "type": "kaplan_meier",
      "svg": "<svg>...</svg>",
      "interpretation": "Vancomycin group shows improved survival (HR 0.72, 95% CI 0.58-0.89, p=0.003)"
    }
  ],
  "strobe_compliance": {
    "score": 95,
    "addressed_items": ["Study design", "Setting", "Participants", ...],
    "recommendations": ["Consider sensitivity analysis for antibiotic timing"]
  }
}
```

## Architecture

```
healthcare-research-mcp/
├── src/
│   ├── server/              # MCP server implementation
│   ├── tools/               # MCP tool definitions
│   ├── nlp/                 # Medical NLP engine
│   ├── visualization/       # Figure generation
│   ├── runtime/             # Code execution
│   ├── database/            # Data management
│   └── utils/               # Utilities
├── tests/
│   ├── integration/         # End-to-end tests
│   └── unit/                # Component tests
└── data/
    ├── databases/           # SQLite databases
    ├── ontologies/          # Medical terminologies
    └── cache/               # Performance cache
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- medical-nlp
```

## Development

### Adding New Figure Types

```typescript
// In src/visualization/figure-renderer.ts
static async renderCustomPlot(config: FigureConfig): Promise<string> {
  const { document, svg, g, width, height } = this.createSVGContext(config);
  // Add your D3.js visualization code here
  return svg.node()?.outerHTML || '';
}
```

### Extending Medical NLP

```typescript
// In src/nlp/medical-nlp.ts
private static readonly MEDICAL_PATTERNS = {
  // Add new pattern
  procedures: [
    /(?:underwent|had|received)\s+([a-zA-Z\s]+)/gi
  ]
};
```

### Adding Statistical Methods

```typescript
// In src/tools/code-generator.ts
private static generateCustomAnalysis(): string {
  return `
    # Your custom statistical method
    result <- your_function(data)
  `;
}
```

## Performance Optimization

- **Caching**: NLP results and figure renders are cached for 1 hour
- **Database Indexes**: Optimized for medical code lookups
- **Concurrent Processing**: Parallel execution where possible
- **Lazy Loading**: Ontologies loaded on-demand

## Security Considerations

- **Code Execution**: R/Python code runs in sandboxed environment
- **Data Access**: Row-level security for patient data
- **Audit Logging**: All queries and results are logged
- **Input Validation**: Strict validation of all inputs
- **PHI Protection**: Automatic small cell suppression

## Troubleshooting

### Common Issues

1. **Database initialization fails**
   ```bash
   # Reset databases
   rm -rf data/databases/*
   npm run db:init
   ```

2. **Missing ontology codes**
   ```bash
   # Download ontologies
   npm run collect:ontologies
   ```

3. **R/Python execution errors**
   ```bash
   # Check runtime requirements
   R --version
   python --version
   ```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Citation

If you use this software in your research, please cite:

```bibtex
@software{healthcare_research_mcp,
  title = {Healthcare Research MCP Server},
  author = {Your Name},
  year = {2024},
  url = {https://github.com/yourusername/healthcare-research-mcp}
}
```

## Support

- **Documentation**: [https://docs.your-domain.com](https://docs.your-domain.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/healthcare-research-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/healthcare-research-mcp/discussions)