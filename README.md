# Healthcare Research MCP Server

A Model Context Protocol (MCP) server for health services research, supporting OMOP CDM and CLIF data formats with advanced hypothesis generation, cohort building, and research code generation capabilities.

## Features

### Core Tools
- **Hypothesis Generation**: Generate testable research hypotheses based on clinical concepts
- **Cohort Builder**: Build patient cohorts with complex inclusion/exclusion criteria
- **Research Code Generator**: Generate analysis code in R, Python, SAS, and Stata
- **Figure Generator**: Create publication-ready figures following journal style guides (NEJM, JAMA, Lancet)

### Advanced Capabilities
- **Natural Language Processing**: Convert plain English queries to structured analysis plans
- **HIPAA Compliance**: Built-in compliance checking and de-identification
- **Manuscript Generation**: Automated manuscript section generation in IMRaD format
- **Execute Analysis**: End-to-end analysis execution from natural language requests

## Architecture

The system consists of several key components:

```
healthcare-research-mcp/
├── src/
│   ├── server/          # MCP server implementation
│   ├── tools/           # Research tools
│   │   ├── research/    # Hypothesis, cohort, code, figure tools
│   │   └── ontology/    # Medical ontology tools
│   ├── middleware/      # Compliance and security layers
│   └── utils/           # Context building and utilities
├── scripts/
│   ├── collection/      # Data collection scripts
│   └── processing/      # Data processing scripts
└── data/               # Collected schemas and ontologies
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for some data processing scripts)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/healthcare-research-mcp.git
cd healthcare-research-mcp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# Run setup scripts
npm run setup:dirs
```

## Configuration

Create a `.env` file with the following variables:

```bash
# API Keys (optional, for data collection)
FIRECRAWL_API_KEY=your_firecrawl_api_key
BRAVE_API_KEY=your_brave_api_key

# Database Configuration
DB_PATH=./data/research.db

# Compliance Settings
HIPAA_COMPLIANT=true
AUDIT_LEVEL=detailed
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Example Tool Usage

#### Generate Research Hypothesis
```json
{
  "tool": "generate_research_hypothesis",
  "arguments": {
    "clinical_area": "sepsis",
    "outcome_of_interest": "30-day mortality",
    "population": "ICU patients",
    "data_sources": ["OMOP", "CLIF"],
    "hypothesis_types": ["association", "prediction"]
  }
}
```

#### Build Cohort
```json
{
  "tool": "build_cohort",
  "arguments": {
    "data_model": "OMOP",
    "inclusion_criteria": [
      {
        "type": "diagnosis",
        "codes": ["A41.9"],
        "code_system": "ICD10"
      }
    ],
    "time_window": {
      "start": "2020-01-01",
      "end": "2023-12-31"
    }
  }
}
```

#### Natural Language Analysis
```json
{
  "tool": "execute_analysis",
  "arguments": {
    "query": "Compare 30-day readmission rates between patients receiving Drug A vs Drug B, adjusting for age, sex, and comorbidity score",
    "dataset": "omop_cdm",
    "output_format": "manuscript"
  }
}
```

## Data Models

### OMOP CDM Support
- Version 5.4 and 6.0
- Standard vocabularies: ICD-10, SNOMED CT, RxNorm, LOINC
- Full cohort definition support

### CLIF (Common Longitudinal ICU Format)
- ICU-specific data elements
- High-frequency vital signs and device data
- Severity scores (SOFA, APACHE, SAPS)

## Security and Compliance

### HIPAA Compliance
- Row-level data protection
- Automatic de-identification
- Audit logging for all data access
- Minimum cell size enforcement

### Access Control
- Data Use Agreement (DUA) management
- Field-level access restrictions
- Purpose-based access control

## Development

### Running Tests
```bash
npm test
```

### Building from Source
```bash
npm run build
```

### Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Architecture Notes

### Enterprise Features
- **Natural Language Processing**: Converts clinical questions to structured queries
- **Compliance Layer**: HIPAA-compliant data access with audit trails
- **Workflow Orchestration**: End-to-end research workflow automation
- **Publication Support**: Journal-specific formatting and style guides

### Extensibility
- Plugin architecture for new data sources
- Custom tool development framework
- Flexible schema mapping system

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

This project integrates with:
- OHDSI OMOP Common Data Model
- CLIF (Common Longitudinal ICU Format)
- Standard medical ontologies (ICD-10, SNOMED CT, RxNorm, LOINC)

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact the maintainers
- See documentation at [docs/](docs/)

## Roadmap

- [ ] Real-time data streaming support
- [ ] Multi-site federated analysis
- [ ] Advanced machine learning pipelines
- [ ] Interactive dashboard generation
- [ ] Integration with EHR systems