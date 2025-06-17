# Healthcare Research MCP Server - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Verify Setup (30 seconds)
```bash
node scripts/verify-setup.js
```

This checks:
- ✅ Node.js version
- ✅ Dependencies installed  
- ✅ TypeScript compiled
- ✅ Directories created
- ✅ Environment configured
- ✅ LLM provider available

### Step 2: Quick Build (1 minute)
```bash
# If verification shows issues, run:
npm install
npm run build
npm run setup:dirs
npm run db:init
```

### Step 3: Configure LLM (30 seconds)

**Option A: Use Anthropic (Best)**
```bash
# Add to .env file:
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Option B: Use Local Ollama (Private)**
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3:8b
ollama serve  # Keep running
```

### Step 4: Test It! (1 minute)
```bash
node scripts/quick-test.js
```

### Step 5: Use with Claude Desktop (2 minutes)

1. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "healthcare-research": {
      "command": "node",
      "args": ["/Users/JCR/healthcare-research-mcp/dist/server/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Test by asking Claude:
> "What MCP tools are available?"

## 🧪 Test the Natural Language Query

Once connected, try this exact query (as requested by the user):

> "Use the natural_language_query tool to analyze: Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days"

## 📋 Available Tools

- **natural_language_query** - Process research questions in plain English
- **generate_hypothesis** - Create evidence-based hypotheses  
- **build_cohort** - Define patient cohorts
- **generate_research_code** - Create R/Python analysis code
- **create_figure** - Generate publication-quality visualizations
- **phenotype_definition** - Define clinical phenotypes
- **code_lookup** - Search medical codes (ICD-10, SNOMED, etc.)
- **code_translator** - Translate between coding systems

## 🔧 Troubleshooting

### "No LLM provider available"
```bash
# Check .env has an API key, or ensure Ollama is running:
curl http://localhost:11434/api/tags
```

### "Database not found"
```bash
npm run setup:dirs
npm run db:init
```

### "Module not found"
```bash
npm install
npm run build
```

## 📚 More Examples

### Simple Query
```javascript
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "What are the risk factors for diabetes?",
    "execution_mode": "plan_only"
  }
}
```

### Complex Analysis
```javascript
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Compare 30-day mortality between COVID patients with and without remdesivir treatment",
    "execution_mode": "analyze",
    "output_format": "full_report"
  }
}
```

### Code Generation
```javascript
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Generate R code for propensity score matching in heart failure patients",
    "output_format": "code_only"
  }
}
```

## ✅ Success Checklist

- [ ] Verification script shows all green checkmarks
- [ ] Quick test completes successfully
- [ ] Claude Desktop shows the tools
- [ ] Natural language query returns results

Ready to revolutionize healthcare research! 🏥✨