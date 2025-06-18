# Quick Start Guide for Healthcare Researchers

Welcome! Get started with healthcare research in just 5 minutes. No technical expertise required.

## What You Can Do

Ask questions in plain English and get:
- 📚 **Literature reviews** - Find relevant research papers
- 📊 **Statistical analysis code** - R or Python code for your data
- 📈 **Publication-ready figures** - Journal-quality graphs
- 🏥 **Medical code lookups** - ICD-10, RxNorm, LOINC codes
- 🤖 **AI prediction models** - With fairness checks

## Installation (5 minutes)

```bash
# 1. Download
git clone https://github.com/sajor2000/healthcare-research-mcp.git
cd healthcare-research-mcp

# 2. Install
npm install

# 3. Build
npm run build:simplified

# 4. Start
npm start
```

That's it! You're ready to research.

## How to Use

Just ask your research question:

```javascript
await mcp.call('analyze', {
  query: "Does vancomycin reduce sepsis mortality?"
});
```

## Example Questions You Can Ask

### Finding Studies
- "Find all studies about COVID vaccine effectiveness"
- "What research exists on diabetes and heart failure?"
- "Latest clinical trials for lung cancer treatment"

### Statistical Analysis
- "Compare survival between treatment groups"
- "Analyze readmission rates by age group"
- "Test association between smoking and COPD"

### Creating Figures
- "Create a forest plot of risk factors"
- "Make a survival curve for my cohort"
- "Generate a bar chart of patient demographics"

### Medical Codes
- "What are the ICD-10 codes for sepsis?"
- "Find medication codes for antibiotics"
- "Lab test codes for kidney function"

## Only 5 Simple Tools

1. **`analyze`** - Ask anything in plain English (handles 90% of tasks)
2. **`lookup_codes`** - Find medical codes
3. **`generate_code`** - Get analysis scripts
4. **`create_visualization`** - Make graphs
5. **`check_data`** - Validate your data

## Quick Examples

### Example 1: Literature Review
```javascript
await mcp.call('analyze', {
  query: "Systematic review of ACE inhibitors for heart failure"
});
```

### Example 2: Data Analysis
```javascript
await mcp.call('analyze', {
  query: "Compare 30-day mortality between ICU patients with and without diabetes"
});
```

### Example 3: Create a Figure
```javascript
await mcp.call('analyze', {
  query: "Create a Kaplan-Meier curve for surgical vs medical therapy"
});
```

## Tips for Best Results

1. **Be specific**: "mortality at 30 days" is better than "outcomes"
2. **Include context**: "in elderly patients" or "adjusting for comorbidities"
3. **State your goal**: "for publication" or "for grant proposal"

## Need Help?

- See full examples: [Researcher's Guide](docs/RESEARCHER-GUIDE.md)
- Visual overview: [Tool Simplification](docs/TOOL-SIMPLIFICATION-VISUAL.md)
- Report issues: [GitHub Issues](https://github.com/sajor2000/healthcare-research-mcp/issues)

---

**Start your research now!** Just ask what you want to know. 🔬