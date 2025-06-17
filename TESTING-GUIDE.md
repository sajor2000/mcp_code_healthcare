# Healthcare Research MCP Server - Testing Guide

## Quick Test Setup

### 1. Install Dependencies and Build
```bash
# Install all dependencies
npm install

# Build the TypeScript code
npm run build

# Initialize databases
npm run setup:dirs
npm run db:init
```

### 2. Configure Environment
```bash
# Copy the example configuration
cp .env.example .env

# Edit .env and add at least one LLM provider:
# For cloud (best accuracy):
ANTHROPIC_API_KEY=your-anthropic-key
# OR for local (privacy):
# Just ensure Ollama is running: ollama serve
```

### 3. Test the Server Manually

#### Option A: Direct Node Execution
```bash
# Run directly with Node.js
node dist/server/index.js
```

#### Option B: Using NPM Script
```bash
# Run in development mode (auto-reload)
npm run dev
```

### 4. Test with Claude Desktop App

If you're using the Claude Desktop app:

1. **Add to Claude's MCP settings** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

2. **Restart Claude Desktop**

3. **Test the integration**:
   - Ask Claude: "What MCP tools are available?"
   - You should see the healthcare research tools listed

### 5. Test Natural Language Queries

Once connected, try these example queries:

#### Basic Test
```
Using the natural_language_query tool, analyze: "What are the common medications for diabetes?"
```

#### Complex Test (exactly as requested)
```
Using the natural_language_query tool with this query: "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days"
```

### 6. Run Automated Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test natural-language
```

### 7. Test Individual Tools

#### Test Natural Language Query
```javascript
// test-query.js
import { HealthcareResearchMCPServer } from './dist/server/index.js';

async function test() {
  const server = new HealthcareResearchMCPServer();
  
  const result = await server.callTool('natural_language_query', {
    query: "Compare mortality rates in COVID-19 patients with and without diabetes",
    execution_mode: "plan_only"
  });
  
  console.log(JSON.stringify(result, null, 2));
}

test();
```

Run: `node test-query.js`

### 8. Docker Testing
```bash
# Build Docker image
docker build -t healthcare-mcp .

# Run container
docker run -it --rm \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  healthcare-mcp

# Test with docker-compose
docker-compose up
```

### 9. Common Test Scenarios

#### Scenario 1: Medical Entity Extraction
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Patients with type 2 diabetes on metformin",
    "execution_mode": "plan_only"
  }
}
```

Expected: Should extract "type 2 diabetes" (ICD-10: E11) and "metformin" (RxNorm: 6809)

#### Scenario 2: Hypothesis Generation
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Does early antibiotic administration improve sepsis outcomes?",
    "execution_mode": "analyze"
  }
}
```

Expected: Should generate hypothesis, cohort definition, and analysis plan

#### Scenario 3: Code Generation
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Generate code to analyze readmission rates",
    "output_format": "code_only"
  }
}
```

Expected: Should return executable R/Python code

### 10. Debugging Tips

#### Check Server Logs
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check specific module
DEBUG=healthcare:* npm run dev
```

#### Verify LLM Connection
```bash
# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"

# Test Ollama
curl http://localhost:11434/api/tags
```

#### Database Issues
```bash
# Reset databases
rm -rf data/databases/*
npm run db:init

# Check database contents
sqlite3 data/databases/ontology.db "SELECT COUNT(*) FROM icd10;"
```

### 11. Performance Testing

```bash
# Simple load test
for i in {1..10}; do
  time node -e "
    import('./dist/server/index.js').then(({HealthcareResearchMCPServer}) => {
      const server = new HealthcareResearchMCPServer();
      server.callTool('natural_language_query', {
        query: 'Test query $i',
        execution_mode: 'plan_only'
      });
    });
  " &
done
wait
```

### 12. Integration Testing with MCP Clients

#### Using the MCP Inspector
```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector ./bin/healthcare-research-mcp
```

#### Using Python MCP Client
```python
# test_client.py
import asyncio
from mcp import ClientSession, StdioServerParameters

async def test():
    async with ClientSession(
        StdioServerParameters(
            command="node",
            args=["./dist/server/index.js"]
        )
    ) as session:
        # List available tools
        tools = await session.list_tools()
        print("Available tools:", [t.name for t in tools])
        
        # Call natural language query
        result = await session.call_tool(
            "natural_language_query",
            arguments={
                "query": "What causes heart failure?",
                "execution_mode": "plan_only"
            }
        )
        print("Result:", result)

asyncio.run(test())
```

## Troubleshooting

### "No LLM provider available"
- Ensure at least one API key is set in .env
- Check that Ollama is running if using local models
- Verify API keys are valid

### "Database not found"
- Run `npm run setup:dirs` and `npm run db:init`
- Check file permissions in data/ directory

### "Module not found" errors
- Run `npm run build` to compile TypeScript
- Check that all dependencies are installed: `npm install`

### Server won't start
- Check port 3000 is available
- Verify Node.js version is 18+
- Check logs for specific errors

## Next Steps

1. **For Development**: Use `npm run dev` for hot-reloading
2. **For Production**: Use Docker deployment
3. **For CI/CD**: See `.github/workflows/` for GitHub Actions
4. **For Monitoring**: Check logs in `logs/` directory

The server is now ready for testing! Try the natural language query examples above to see the full capabilities.