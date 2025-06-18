# Healthcare Research MCP - Simplified

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP-SDK-purple)](https://modelcontextprotocol.io)

A researcher-friendly Model Context Protocol (MCP) server for healthcare research. Ask questions in plain English - get comprehensive analysis, code, and visualizations.

🏥 **Transform "Find studies about COVID vaccines" into complete research workflows**

## ✨ What Makes This Special?

### Just Ask Your Question!
```javascript
// Instead of learning complex tools...
await mcp.call('analyze', {
  query: "Does vancomycin reduce sepsis mortality?"
});

// Get everything you need:
// ✓ Literature review
// ✓ Statistical analysis code
// ✓ Publication-ready figures
// ✓ Medical code lookups
// ✓ Study design recommendations
```

## 🚀 Quick Start (5 minutes)

```bash
# Clone the repository
git clone https://github.com/sajor2000/healthcare-research-mcp.git
cd healthcare-research-mcp

# Install dependencies
npm install

# Build the simplified server
npm run build:simplified

# Start the server
npm run start:simplified
```

That's it! You're ready to start researching.

## 🎯 Only 5 Simple Tools

### 1. `analyze` - Your Research Assistant
Ask anything in plain English:
```javascript
await mcp.call('analyze', {
  query: "Find all studies about COVID vaccine effectiveness in elderly patients"
});
```

### 2. `lookup_codes` - Medical Code Search
```javascript
await mcp.call('lookup_codes', {
  search_term: "diabetes"
});
```

### 3. `generate_code` - Statistical Analysis
```javascript
await mcp.call('generate_code', {
  analysis_description: "compare survival between two groups",
  language: "R"  // or "Python"
});
```

### 4. `create_visualization` - Publication Figures
```javascript
await mcp.call('create_visualization', {
  description: "forest plot of risk factors"
});
```

### 5. `check_data` - Data Validation
```javascript
await mcp.call('check_data', {
  data_description: "OMOP patient data"
});
```

## 📚 Real-World Examples

### Systematic Review
```javascript
await mcp.call('analyze', {
  query: "Systematic review of ACE inhibitors vs ARBs for heart failure, focus on mortality outcomes"
});
```

### Clinical Trial Analysis
```javascript
await mcp.call('analyze', {
  query: "Compare 30-day readmission rates between treatment arms in my trial data, adjusting for baseline characteristics"
});
```

### Cohort Study
```javascript
await mcp.call('analyze', {
  query: "Create a cohort of diabetic patients with HbA1c > 9% and analyze their cardiovascular outcomes"
});
```

## 🔧 Configuration

Create a `.env` file:
```env
# API Keys (optional - for enhanced features)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Server settings
PORT=3000
LOG_LEVEL=info
```

## 📊 What You Can Do

- **Literature Reviews**: Find and synthesize research papers
- **Statistical Analysis**: Generate R/Python code for any analysis
- **Data Visualization**: Create publication-ready figures
- **Medical Coding**: Look up ICD-10, RxNorm, LOINC codes
- **Study Design**: Get recommendations for your research
- **Data Validation**: Check OMOP/CLIF compliance

## 🏥 Supported Data Standards

- **OMOP CDM v5.4**: Full support with automatic query generation
- **CLIF v2.0**: Critical care data format
- **Custom CSV/Parquet**: Works with your existing data

## 📖 Documentation

- **[Researcher's Guide](docs/RESEARCHER-GUIDE.md)**: Complete examples and tutorials
- **[Visual Overview](docs/TOOL-SIMPLIFICATION-VISUAL.md)**: See how simple it is

## 🧪 Try It Now

### Example 1: Find Medical Codes
```javascript
await mcp.call('analyze', {
  query: "What are the ICD-10 codes for different types of diabetes?"
});
```

### Example 2: Statistical Analysis
```javascript
await mcp.call('analyze', {
  query: "Generate code to compare mortality rates between vaccinated and unvaccinated COVID patients"
});
```

### Example 3: Create a Figure
```javascript
await mcp.call('analyze', {
  query: "Create a Kaplan-Meier survival curve for my heart failure cohort"
});
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

This project integrates medical standards including OMOP CDM, STROBE guidelines, and TRIPOD+AI principles. See [CITATIONS.md](CITATIONS.md) for full attributions.

---

**Built for researchers, by researchers. No technical expertise required!** 🔬