# Quick Start Guide for Healthcare Researchers

Welcome! This guide will help you get started with the Healthcare Research MCP Server in just a few minutes. No technical expertise required.

## What This Tool Does

The Healthcare Research MCP Server helps you:
- 🔍 **Ask medical research questions in plain English** - Just type what you want to know
- 📊 **Generate analysis code automatically** - Get R or Python code for your research
- 🏥 **Work with standard medical data formats** - Supports OMOP CDM and CLIF formats
- 📈 **Create publication-ready figures** - Generate graphs following journal guidelines
- 🤖 **Build AI prediction models** - With built-in fairness checks and clinical utility assessment

## Installation (5 minutes)

1. **Download the tool:**
   ```bash
   git clone https://github.com/sajor2000/mcp_code_healthcare.git
   cd mcp_code_healthcare
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the server:**
   ```bash
   npm run build:omop
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

That's it! The server is now running.

## Available Tools

Here are the tools you can use, explained in simple terms:

### 1. 🔍 Ask Research Questions (`natural_language_query`)
**What it does:** Turn your research questions into complete analysis code

**Example questions you can ask:**
- "How does vancomycin affect 30-day mortality in sepsis patients?"
- "Compare outcomes between diabetic and non-diabetic ICU patients"
- "What factors predict readmission after heart failure?"

**The tool will:**
- Understand your question
- Identify the medical concepts (sepsis, vancomycin, mortality)
- Generate complete analysis code
- Follow research best practices (STROBE guidelines)

### 2. 📚 Look Up Medical Information (`lookup_medical_knowledge`)
**What it does:** Get information about diseases, medications, or lab tests

**Examples:**
- Look up ICD-10 codes for sepsis
- Find all medications for heart failure
- Get normal ranges for laboratory tests

### 3. 🔬 Search Medical Literature (`search_medical_literature`)
**What it does:** Find relevant research papers and guidelines

**Examples:**
- Search for "vancomycin sepsis guidelines"
- Find recent studies on "AI prediction models ICU"
- Look up "OMOP CDM best practices"

### 4. 📊 Generate Research Code (`generate_research_code`)
**What it does:** Create complete analysis scripts in R or Python

**Features:**
- Cohort definition (who to include in your study)
- Statistical analysis (t-tests, regression, survival analysis)
- Data visualization (graphs and tables)
- Results interpretation

### 5. 📈 Create Publication Figures (`create_publication_figure`)
**What it does:** Generate professional graphs for papers

**Types of figures:**
- Kaplan-Meier survival curves
- Forest plots for comparing treatments
- ROC curves for prediction models
- Box plots and scatter plots

**Journal styles:** NEJM, JAMA, Lancet, or generic

### 6. 🤖 Build AI Prediction Models (`generate_ai_prediction_code`)
**What it does:** Create machine learning models for clinical prediction

**Special features:**
- Automatic fairness checking across demographics
- Clinical utility assessment (Decision Curve Analysis)
- Model explanation tools
- Follows TRIPOD+AI guidelines for transparency

### 7. 🗂️ Work with OMOP Data (`get_omop_schema`, `validate_omop_data`)
**What it does:** Help you work with OMOP Common Data Model

**Features:**
- Check if your data follows OMOP standards
- Generate queries for OMOP databases
- Map codes between different systems

## Example Workflow

Here's how a typical research project might look:

1. **Start with a question:**
   ```
   Tool: natural_language_query
   Question: "Does early mobilization reduce ICU length of stay in mechanically ventilated patients?"
   ```

2. **The system will:**
   - Identify key concepts (early mobilization, ICU stay, mechanical ventilation)
   - Suggest appropriate analyses (survival analysis, propensity matching)
   - Generate complete R/Python code
   - Include data quality checks
   - Add statistical tests
   - Create visualizations

3. **Review and run the code:**
   - The generated code includes comments explaining each step
   - Follows research best practices automatically
   - Handles missing data appropriately
   - Produces publication-ready outputs

## Tips for Best Results

1. **Be specific in your questions:**
   - Good: "Compare 30-day mortality between patients receiving vancomycin vs meropenem for sepsis"
   - Less helpful: "antibiotics and outcomes"

2. **Include timeframes when relevant:**
   - "within 48 hours of admission"
   - "30-day mortality"
   - "one-year follow-up"

3. **Specify your data format:**
   - "using OMOP data"
   - "in MIMIC-IV format"
   - "with CLIF critical care data"

## Getting Help

- **Documentation:** See the full [README.md](README.md) for detailed information
- **Examples:** Check the `data/mock-icu-data/` folder for sample datasets
- **Issues:** Report problems at https://github.com/sajor2000/mcp_code_healthcare/issues

## Privacy and Security

- All processing happens locally on your computer
- No patient data is sent to external services
- Supports HIPAA-compliant workflows
- Option to use local AI models for sensitive data

## Next Steps

1. Try the example datasets in `data/mock-icu-data/`
2. Run a simple analysis using `natural_language_query`
3. Explore the generated code to understand the analysis
4. Modify the code for your specific needs

Remember: This tool is designed to help you focus on your research questions rather than coding. Let it handle the technical details while you focus on the clinical insights!