# Healthcare Research MCP - Researcher's Guide

## 🚀 Welcome Researchers!

This guide shows how the new simplified Healthcare Research MCP makes your research workflow incredibly easy. No more complex tools or technical parameters - just ask questions in plain English!

## 📊 Before vs After: The Dramatic Simplification

### ❌ The Old Way (Complex)
```javascript
// Finding sepsis studies required multiple steps:
await mcp.call('search_medical_codes', {
  keyword: 'sepsis',
  code_systems: ['ICD10', 'SNOMED'],
  limit: 10
});

await mcp.call('search_medical_literature', {
  query: 'sepsis mortality vancomycin',
  sources: ['pubmed'],
  filters: {
    publication_years: [2020, 2024],
    study_types: ['RCT', 'cohort']
  }
});

await mcp.call('generate_research_code', {
  analysis_spec: {
    type: 'survival',
    exposure: 'vancomycin',
    outcome: 'mortality',
    timeframe: 30
  },
  language: 'R',
  framework: 'tidyverse'
});
```

### ✅ The New Way (Simple)
```javascript
// Just ask what you want!
await mcp.call('analyze', {
  query: "Find studies about whether vancomycin reduces sepsis mortality"
});
```

## 🎯 Common Research Scenarios

### 1. Systematic Literature Review
**Scenario:** You're conducting a systematic review on COVID-19 vaccine effectiveness.

```javascript
// Simply ask:
await mcp.call('analyze', {
  query: "Find all studies about COVID-19 vaccine effectiveness in elderly patients"
});

// Get more specific:
await mcp.call('analyze', {
  query: "Systematic review of mRNA COVID vaccines in patients over 65, focusing on hospitalization outcomes"
});
```

### 2. Clinical Trial Data Analysis
**Scenario:** You have trial data and need to compare treatment groups.

```javascript
// Just describe what you need:
await mcp.call('analyze', {
  query: "Compare survival between patients receiving drug A vs drug B in my clinical trial data"
});

// Or get the code directly:
await mcp.call('generate_code', {
  analysis_description: "Cox regression comparing two treatment arms adjusting for age and comorbidities"
});
```

### 3. Real-World Evidence Study
**Scenario:** Using EHR data to study treatment patterns.

```javascript
// Natural language works:
await mcp.call('analyze', {
  query: "What percentage of diabetic patients are prescribed metformin as first-line therapy?"
});

// Validate your data:
await mcp.call('check_data', {
  data_description: "OMOP database with 10,000 diabetic patients"
});
```

### 4. Publication Figure Creation
**Scenario:** Need a forest plot for your meta-analysis.

```javascript
// Describe the visualization:
await mcp.call('create_visualization', {
  description: "Forest plot showing odds ratios for 5 risk factors for heart failure"
});

// Get journal-ready output:
await mcp.call('create_visualization', {
  description: "Kaplan-Meier curve comparing surgery vs medical therapy",
  style: "journal"  // Formatted for publication
});
```

## 📈 Progressive Examples: From Simple to Advanced

### Level 1: Basic Questions
```javascript
// Simple lookup
await mcp.call('analyze', {
  query: "What is the ICD-10 code for diabetes?"
});

// Basic statistics
await mcp.call('analyze', {
  query: "Calculate mean age by treatment group"
});
```

### Level 2: Intermediate Analysis
```javascript
// Cohort definition
await mcp.call('analyze', {
  query: "Define a cohort of heart failure patients with at least 2 hospitalizations"
});

// Comparative effectiveness
await mcp.call('analyze', {
  query: "Compare effectiveness of ACE inhibitors vs ARBs in reducing stroke risk"
});
```

### Level 3: Complex Studies
```javascript
// Multi-group analysis with confounders
await mcp.call('analyze', {
  query: "Compare 30-day readmission rates across 3 hospitals adjusting for patient severity",
  options: {
    output_format: "detailed",
    language: "R"
  }
});

// Prediction model
await mcp.call('analyze', {
  query: "Build a model to predict ICU mortality using demographics, vitals, and lab values"
});
```

### Level 4: Full Research Pipeline
```javascript
// Complete analysis from question to publication
await mcp.call('analyze', {
  query: `Using the uploaded OMOP data:
    1. Identify patients with new-onset atrial fibrillation
    2. Compare stroke risk between warfarin and DOACs
    3. Adjust for CHA2DS2-VASc score
    4. Create publication-ready figures
    5. Generate STROBE-compliant report`,
  options: {
    output_format: "detailed"
  }
});
```

## 🔧 Quick Reference

### Essential Functions

| What You Want | How to Ask |
|--------------|------------|
| Find studies | `"Find studies about [topic]"` |
| Get medical codes | `"What is the code for [condition]?"` |
| Statistical analysis | `"Compare [outcome] between [groups]"` |
| Create graphs | `"Create a [type] plot showing [data]"` |
| Validate data | `"Check my [dataset type] data"` |

### Common Parameters

**Years:** `"studies from 2020 to 2024"`
**Study types:** `"randomized trials"`, `"cohort studies"`, `"case-control"`
**Statistics:** `"adjusted for age and sex"`, `"with 95% confidence intervals"`
**Outputs:** `"give me R code"`, `"detailed analysis"`, `"just the summary"`

## 💡 Pro Tips

### 1. Be Specific About Your Needs
```javascript
// Good:
"Compare mortality between early vs late surgery for hip fractures in patients over 80"

// Better:
"Compare 30-day mortality between surgery within 48 hours vs after 48 hours for hip fractures in patients over 80, adjusting for comorbidities"
```

### 2. Use Natural Medical Language
```javascript
// The system understands medical terminology:
"Patients with STEMI undergoing primary PCI"
"Type 2 diabetics on SGLT2 inhibitors"
"Post-op complications following CABG"
```

### 3. Iterative Refinement
```javascript
// Start broad:
await mcp.call('analyze', {
  query: "Studies on hypertension treatment"
});

// Then narrow down:
await mcp.call('analyze', {
  query: "RCTs comparing ARBs to ACE inhibitors for resistant hypertension in African Americans"
});
```

## 🐛 Troubleshooting

### "No results found"
- Try broader search terms
- Check spelling of medical terms
- Remove filters and add them back gradually

### "Analysis failed"
- Simplify your question
- Break complex analyses into steps
- Check your data format matches what you specified

### "Code doesn't match my data"
- Provide column names in your query
- Specify your data structure (OMOP, custom, etc.)
- Use the `check_data` tool first

## 📚 Advanced Features (When You Need Them)

While the simplified interface handles 95% of use cases, power users can still:

### Access Specific Code Systems
```javascript
await mcp.call('lookup_codes', {
  search_term: "metformin extended release 500mg"
});
```

### Control Output Detail
```javascript
await mcp.call('analyze', {
  query: "Your research question",
  options: {
    output_format: "code_only",  // Just the analysis code
    language: "Python"           // Python instead of R
  }
});
```

### Direct Tool Access
All original tools remain available for backward compatibility and special cases.

## 🎓 Learning Path

1. **Start Here:** Try the `analyze` tool with a simple question
2. **Next Step:** Use it for your actual research question
3. **Then:** Explore visualization options
4. **Advanced:** Customize outputs and chain multiple analyses

## 🤝 Getting Help

- **Built-in help:** `analyze("help with survival analysis")`
- **Examples:** `analyze("show me examples of logistic regression")`
- **Documentation:** This guide and the README
- **Support:** GitHub issues for bugs or feature requests

## 🎉 You're Ready!

That's it! You now know everything needed to use the Healthcare Research MCP effectively. No more reading complex documentation or memorizing parameters. Just ask your research questions naturally and get comprehensive answers.

Remember: **If you can ask it, we can analyze it!**