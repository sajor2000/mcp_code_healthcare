# STROBE and CDC Guidelines Integration

This MCP server implements clinical research best practices following STROBE guidelines and CDC definitions.

## Overview

The enhanced MCP server includes:
1. **STROBE Statement** compliance for observational studies
2. **CDC Adult Sepsis Event (ASE)** surveillance definition
3. Sequential thinking for organizing analysis tasks
4. Automated code generation with guideline compliance

## STROBE Statement Integration

### What is STROBE?

STROBE (STrengthening the Reporting of OBservational studies in Epidemiology) provides a 22-item checklist for reporting observational studies including cohort, case-control, and cross-sectional studies.

### How We Use STROBE

1. **Analysis Planning**: The `generate_strobe_analysis` tool creates analysis plans following STROBE structure
2. **Code Generation**: Generated R/Python code includes STROBE item numbers as comments
3. **Sequential Task Organization**: Tasks are ordered to address STROBE items systematically

### Key STROBE Items Implemented

- **Item 4**: Study Design - Clearly stated in all analyses
- **Item 6**: Participants - Eligibility criteria defined
- **Item 7**: Variables - Clear definitions of outcomes, exposures, confounders
- **Item 12**: Statistical Methods - Comprehensive analysis plans
- **Items 13-14**: Descriptive Statistics - Table 1 generation
- **Item 16**: Main Results - Primary analysis structure

## CDC Adult Sepsis Event Definition

### Implementation Details

The CDC ASE definition requires:

1. **Suspected Infection**:
   - Blood culture order AND
   - Qualifying Antibiotic Days (QAD): ≥4 consecutive days of antibiotics

2. **Organ Dysfunction** (at least one):
   - Cardiovascular: Vasopressor initiation
   - Pulmonary: Mechanical ventilation initiation
   - Renal: Creatinine doubling or ≥50% eGFR decrease
   - Hepatic: Bilirubin ≥2.0 mg/dL AND doubling
   - Coagulation: Platelets <100 AND ≥50% decrease
   - Lactate: ≥2.0 mmol/L

3. **Septic Shock**: Sepsis + cardiovascular dysfunction + lactate ≥2.0

### Usage Example

```javascript
// Using CDC sepsis criteria in analysis
{
  "name": "natural_language_query",
  "arguments": {
    "query": "Identify sepsis patients using CDC criteria and analyze mortality",
    "use_cdc_sepsis": true
  }
}
```

## Sequential Thinking

The server organizes analysis tasks in optimal order:

1. Define study population (STROBE 6)
2. Define exposure/intervention (STROBE 7)
3. Define outcome (STROBE 7)
4. Identify confounders (STROBE 7)
5. Plan statistical analysis (STROBE 12)
6. Handle missing data (STROBE 12c)
7. Plan sensitivity analyses (STROBE 12e)

## Tool Enhancements

### 1. natural_language_query
- Now includes `use_cdc_sepsis` parameter
- Returns sequential task organization
- Aligns with STROBE structure

### 2. generate_strobe_analysis (NEW)
- Creates complete STROBE-compliant analysis plans
- Customizes based on research question
- Includes CDC definitions when relevant

### 3. lookup_medical_knowledge
- Enhanced with CDC sepsis criteria
- Includes relevant clinical guidelines
- Links to STROBE recommendations

### 4. analyze_synthetic_dataset
- New `apply_cdc_sepsis` parameter
- Implements CDC ASE surveillance logic
- Reports sepsis incidence using CDC criteria

### 5. generate_research_code
- New `include_strobe_comments` parameter
- Generated code includes STROBE item references
- Implements CDC sepsis definitions in code

## Example Workflow

### Research Question
"Does early vancomycin administration reduce mortality in sepsis patients?"

### Step 1: Parse with STROBE alignment
```bash
./test-strobe-cdc.sh
```

### Step 2: Analysis Plan Output
```json
{
  "sequential_tasks": [
    "Define study population and eligibility criteria",
    "Define exposure: medication administration criteria and timing",
    "Define outcome: mortality (in-hospital vs 30-day)",
    "Identify potential confounders: age, sex, comorbidities, severity scores",
    "Plan statistical analysis: descriptive statistics, unadjusted analysis, adjusted models",
    "Plan approach for missing data",
    "Plan sensitivity analyses to test robustness"
  ],
  "strobe_alignment": {
    "study_design": "Retrospective cohort study",
    "key_items_addressed": [4, 5, 6, 7, 8, 12]
  }
}
```

### Step 3: Generated Code (R Example)
```r
# STROBE Item 7: Variables - Define sepsis using CDC criteria
# CDC Adult Sepsis Event definition
# Step 1: Identify suspected infection (blood culture + antibiotics ≥4 days)
antibiotics <- medications %>%
  filter(medication_category %in% c("antibiotic", "antimicrobial")) %>%
  group_by(hospitalization_id) %>%
  summarize(
    antibiotic_days = n_distinct(floor_date(order_dttm, "day")),
    has_qad = antibiotic_days >= 4
  )

# Step 2: Identify organ dysfunction
# [Implementation of CDC organ dysfunction criteria]
```

## Configuration

### Environment Variables
```bash
# Optional: Firecrawl API for updating guidelines
FIRECRAWL_API_KEY=your_api_key_here

# LLM provider keys (optional)
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

### Using the Enhanced Server

1. Build: `npm run build:enhanced`
2. Run: `npm run start:enhanced`
3. Test: `./test-strobe-cdc.sh`

## Benefits

1. **Reproducible Research**: Following STROBE ensures complete reporting
2. **Standardized Definitions**: CDC sepsis criteria enable comparison across studies
3. **Quality Assurance**: Built-in checks for guideline compliance
4. **Education**: Generated code teaches best practices

## References

- [STROBE Statement](https://www.strobe-statement.org/)
- [CDC Adult Sepsis Event](https://www.cdc.gov/sepsis/clinicaltools/adult-sepsis-event.html)
- [EQUATOR Network](https://www.equator-network.org/)