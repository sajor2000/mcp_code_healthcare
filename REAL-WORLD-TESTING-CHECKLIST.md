# Real-World MCP Server Testing Checklist

## ✅ Pre-Flight Checklist

### 1. Environment Setup
- [ ] Node.js v18+ installed
- [ ] Git repository initialized
- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Directories created (`npm run setup:dirs`)
- [ ] Databases initialized (`npm run db:init`)

### 2. API Keys Configuration
- [ ] At least one LLM provider configured:
  - [ ] Anthropic API key (recommended)
  - [ ] OpenAI API key
  - [ ] Ollama running locally
- [ ] External search APIs (optional but recommended):
  - [ ] Brave Search API key
  - [ ] Perplexity API key

### 3. Quick Verification
```bash
# Run this to check everything:
node scripts/verify-setup.js
node scripts/quick-test.js
```

## 🧪 Testing Scenarios

### Scenario 1: Basic Natural Language Query
```javascript
// Test the exact use case from requirements
{
  tool: "natural_language_query",
  arguments: {
    query: "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days",
    dataset_info: {
      path: "./data/sample_icu.csv",
      data_model: "OMOP"
    },
    execution_mode: "plan_only"
  }
}
```

Expected Output:
- ✓ Sepsis definition with ICD-10/SNOMED codes
- ✓ Cohort definition for sepsis patients
- ✓ Statistical plan for mortality analysis
- ✓ R/Python code template
- ✓ STROBE compliance check

### Scenario 2: Medical Knowledge Lookup
```javascript
// Test knowledge base
{
  tool: "lookup_medical_knowledge",
  arguments: {
    concept: "ARDS",
    concept_type: "condition",
    include_details: ["definition", "diagnosis_criteria"]
  }
}
```

Expected Output:
- ✓ ARDS definition
- ✓ Berlin criteria with P/F ratios
- ✓ ICD-10 codes

### Scenario 3: External Search
```javascript
// Test Brave/Perplexity integration
{
  tool: "search_external_sources",
  arguments: {
    query: "latest sepsis treatment guidelines 2024",
    search_type: "clinical_guidelines",
    providers: ["brave", "perplexity"]
  }
}
```

Expected Output:
- ✓ Current guidelines found
- ✓ Key findings extracted
- ✓ Synthesis of results

### Scenario 4: Complete Workflow
```bash
# Run the full example
node examples/search-before-analysis.js
```

## 🔌 Integration Testing

### Claude Desktop Integration
1. **Add to config**: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "healthcare-research": {
      "command": "node",
      "args": ["/Users/JCR/healthcare-research-mcp/dist/server/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key",
        "BRAVE_API_KEY": "your-key"
      }
    }
  }
}
```

2. **Restart Claude Desktop**

3. **Test Commands**:
   - "What MCP tools are available?"
   - "Use natural_language_query to analyze sepsis mortality"
   - "Look up medical knowledge about ARDS"
   - "Search for current vancomycin guidelines"

### Standalone Testing
```bash
# Start server directly
node dist/server/index.js

# In another terminal, use MCP client
mcp-client connect stdio
```

## 📊 Performance Testing

### Load Test
```bash
# Test multiple concurrent queries
for i in {1..5}; do
  node examples/test-natural-language.js &
done
wait
```

### Memory Usage
```bash
# Monitor memory while running
/usr/bin/time -l node dist/server/index.js
```

## 🐛 Common Issues & Solutions

### Issue: "No LLM provider available"
**Solution**: Check `.env` has valid API key or Ollama is running
```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test Anthropic
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages
```

### Issue: "Database not found"
**Solution**: Ensure databases are initialized
```bash
ls -la data/databases/
# Should show ontology.db and research.db
```

### Issue: "Module not found"
**Solution**: Rebuild the project
```bash
npm run build
ls -la dist/server/index.js
```

### Issue: "External search returns mock data"
**Solution**: Add API keys to `.env`
```bash
BRAVE_API_KEY=your_actual_key
PERPLEXITY_API_KEY=your_actual_key
```

## 📈 Monitoring in Production

### Logging
```bash
# Check logs
tail -f logs/combined.log
tail -f logs/error.log

# Enable debug mode
LOG_LEVEL=debug npm start
```

### Health Checks
```javascript
// Add health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    tools: server.tools.size,
    uptime: process.uptime()
  });
});
```

## 🚀 Production Deployment

### Docker
```bash
# Build and run
docker build -t healthcare-mcp .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  healthcare-mcp
```

### Process Manager (PM2)
```bash
npm install -g pm2
pm2 start dist/server/index.js --name healthcare-mcp
pm2 logs healthcare-mcp
```

### Environment Variables
```bash
# Production .env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_CACHE=true
HIPAA_COMPLIANT=true
```

## 📝 Final Testing Checklist

Before going live:

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests complete
- [ ] API keys configured and tested
- [ ] Database populated with ontologies
- [ ] Natural language queries return expected results
- [ ] External search APIs working
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Performance acceptable
- [ ] Documentation complete

## 🎯 Success Criteria

Your MCP server is ready when:

1. **Natural Language Works**: Can process "define sepsis... vancomycin... 30-day mortality"
2. **Knowledge Base Active**: Returns accurate medical information
3. **External Search Functions**: Brave/Perplexity return current data
4. **Code Generation Works**: Produces valid R/Python code
5. **STROBE Compliance**: All analyses follow guidelines
6. **Claude Integration**: Works seamlessly in Claude Desktop

## 🔧 Debugging Commands

```bash
# Test specific tool
node -e "
  import('./dist/server/index.js').then(({HealthcareResearchMCPServer}) => {
    const server = new HealthcareResearchMCPServer();
    server.callTool('natural_language_query', {
      query: 'test query',
      execution_mode: 'plan_only'
    }).then(console.log);
  });
"

# Check tool registration
node -e "
  import('./dist/server/index.js').then(({HealthcareResearchMCPServer}) => {
    const server = new HealthcareResearchMCPServer();
    console.log('Available tools:', Array.from(server.tools.keys()));
  });
"
```

## 📞 Support Resources

- GitHub Issues: Report bugs
- Documentation: `/docs` folder
- Examples: `/examples` folder
- Logs: `/logs` folder

Ready for real-world testing! 🚀