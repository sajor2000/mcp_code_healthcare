# Enhanced Code Generation

The Healthcare MCP Server now includes comprehensive code generation capabilities that produce complete, validated, and STROBE-compliant analysis code.

## Overview

The enhanced code generation system provides:
- **Query Parsing**: Natural language to structured analysis specifications
- **Validation**: Ensures analyses are feasible with available data
- **Complete Code**: Generates full analysis pipelines, not just snippets
- **STROBE Compliance**: Includes guideline references and checklist items
- **CDC Definitions**: Implements official sepsis surveillance criteria
- **Multi-format Support**: Works with MIMIC, CLIF, and OMOP data

## Key Features

### 1. Intelligent Query Parsing

The system understands complex research questions:

```javascript
// Example query
"Find all patients over age 40 who have been diagnosed with sepsis using CDC criteria. 
Analyze demographics, mortality rates, length of stay, and medication use including 
vancomycin. Create visualizations showing age distribution and mortality by age group."

// Parsed result
{
  "condition": "sepsis",
  "entities": [
    { "text": "sepsis", "type": "condition", "codes": ["A41.9", "A41.0", ...] },
    { "text": "vancomycin", "type": "medication" },
    { "text": "CDC", "type": "guideline" }
  ],
  "analyses": ["demographics", "mortality", "length of stay", "medications"],
  "visualizations": ["age distribution", "mortality by age"],
  "cohort_criteria": {
    "inclusion": ["Age > 40"],
    "exclusion": []
  }
}
```

### 2. Data Format Validation

Before generating code, the system validates that required tables exist:

```javascript
// Validation result
{
  "is_valid": true,
  "errors": [],
  "warnings": ["30-day follow-up requested but date range not specified"],
  "suggestions": ["Consider using survival analysis for time-to-event data"]
}
```

### 3. Complete Code Generation

Generated code includes:
- Required library imports
- Data loading with proper date conversions
- Cohort definition with inclusion/exclusion criteria
- All requested analyses
- Visualizations with publication-quality settings
- Results export

Example R code structure:
```r
# STROBE Item 4: Study Design
study_design <- "Retrospective cohort study"

# STROBE Item 5: Setting
# Load data files
patient <- read_csv("data/clif_format/patient.csv")
hospitalization <- read_csv("data/clif_format/hospitalization.csv")

# STROBE Item 6: Participants
# Define cohort with CDC sepsis criteria
# [Complete implementation...]

# STROBE Item 7: Variables
# Define outcomes, exposures, and confounders
# [Complete implementation...]

# STROBE Items 13-14: Descriptive Data
# [Table One and descriptive statistics...]

# STROBE Item 16: Main Results
# [Primary analysis with adjusted models...]

# STROBE Item 12e: Sensitivity Analysis
# [Robustness checks...]
```

### 4. CDC Sepsis Implementation

The system correctly implements CDC Adult Sepsis Event criteria:

```r
# CDC Adult Sepsis Event Definition
# Step 1: Suspected infection (blood culture + antibiotics ≥4 days)
suspected_infection <- medications %>%
  filter(drug %in% c("vancomycin", "meropenem", "piperacillin-tazobactam")) %>%
  group_by(subject_id, hadm_id) %>%
  summarize(
    antibiotic_days = n_distinct(as.Date(starttime)),
    has_qad = antibiotic_days >= 4
  )

# Step 2: Organ dysfunction
# [Implementation of all 6 CDC criteria...]
```

### 5. Visualization Generation

Creates publication-ready plots:
- Age distributions
- Mortality by subgroups
- Length of stay histograms
- Medication use charts
- Vital signs trends
- Patient timelines

## Available Tools

### parse_research_question
Parses natural language queries into structured specifications.

### validate_analysis
Checks if an analysis is feasible with available data.

### generate_complete_code
Produces complete analysis code with all features.

### get_table_schemas
Returns available tables and columns for each data format.

### get_condition_knowledge
Provides medical knowledge including ICD codes and treatments.

### generate_strobe_checklist
Creates customized STROBE checklist for the study.

## Usage Examples

### Basic Analysis
```bash
# Simple mortality analysis
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_complete_code","arguments":{"query":"Analyze mortality rates in ICU patients with pneumonia","language":"R"}},"id":1}' | node dist/server/index-complete.js
```

### Complex CDC Sepsis Study
```bash
# CDC sepsis with vancomycin analysis
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_complete_code","arguments":{"query":"Using CDC sepsis criteria, compare outcomes between early vs late vancomycin administration","dataset_info":{"format":"clif","n_patients":500},"include_cdc_sepsis":true}},"id":1}' | node dist/server/index-complete.js
```

### Multi-format Support
```bash
# OMOP format analysis
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_complete_code","arguments":{"query":"Analyze heart failure readmissions using OMOP data","dataset_info":{"format":"omop"},"language":"Python"}},"id":1}' | node dist/server/index-complete.js
```

## Supported Data Formats

### MIMIC
- patients, admissions, diagnoses_icd
- prescriptions, chartevents, icustays

### CLIF
- patient, hospitalization
- vitals, labs, medication_admin_continuous
- respiratory_support, procedures

### OMOP
- person, visit_occurrence
- condition_occurrence, drug_exposure
- measurement, observation

## Code Quality Features

1. **Type Safety**: Proper data type handling
2. **Error Handling**: Graceful handling of missing data
3. **Performance**: Efficient data operations
4. **Reproducibility**: Set seeds, versioning
5. **Documentation**: Inline comments explain each step

## Integration with Claude Desktop

```json
{
  "mcpServers": {
    "healthcare-research-complete": {
      "command": "node",
      "args": ["/path/to/dist/server/index-complete.js"]
    }
  }
}
```

## Best Practices

1. **Always validate first**: Use `validate_analysis` before generating code
2. **Specify data format**: Include dataset_info for accurate code
3. **Use CDC for sepsis**: Enable `include_cdc_sepsis` for sepsis studies
4. **Include STROBE**: Keep comments for publication readiness
5. **Test with samples**: Use sample datasets before full analysis

## Troubleshooting

### Missing Tables Error
```json
{
  "is_valid": false,
  "errors": ["Missing required tables: labs, vitals"],
  "suggestions": ["Reduce analysis scope or use different dataset"]
}
```

### Condition Not Found
```json
{
  "warnings": ["Condition 'rare_disease' not in knowledge base"],
  "suggestions": ["Use ICD-10 codes directly"]
}
```

## Future Enhancements

- Machine learning model generation
- Power analysis calculations
- Meta-analysis support
- Real-time code execution
- Export to Jupyter notebooks