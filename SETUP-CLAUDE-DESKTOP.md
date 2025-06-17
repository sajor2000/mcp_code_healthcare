# Setting Up Healthcare Research MCP with Claude Desktop

## Quick Setup Instructions

### 1. Build the Server
```bash
cd /Users/JCR/healthcare-research-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Initialize databases
npm run setup:dirs
npm run db:init
```

### 2. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Note**: The file `claude_desktop_config.json` in this project is just an example. You need to copy its contents to Claude's actual config file location above.

```json
{
  "mcpServers": {
    "healthcare-research": {
      "command": "node",
      "args": ["/Users/JCR/healthcare-research-mcp/dist/server/index.js"],
      "env": {
        "ONTOLOGY_DB_PATH": "/Users/JCR/healthcare-research-mcp/data/databases/ontology.db",
        "RESEARCH_DB_PATH": "/Users/JCR/healthcare-research-mcp/data/databases/research.db",
        "ANTHROPIC_API_KEY": "your-anthropic-api-key-here",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important**: Replace `your-anthropic-api-key-here` with your actual Anthropic API key for best results.

### 3. Restart Claude Desktop

After saving the configuration, completely quit and restart Claude Desktop.

### 4. Verify Connection

In Claude Desktop, ask:
> "What MCP tools do you have available?"

You should see these healthcare research tools:
- `natural_language_query` - Process natural language research questions
- `generate_hypothesis` - Generate research hypotheses
- `build_cohort` - Build patient cohorts
- `generate_research_code` - Generate analysis code
- `create_figure` - Create publication figures
- `phenotype_definition` - Define clinical phenotypes
- `code_lookup` - Look up medical codes
- `code_translator` - Translate between coding systems

### 5. Test the Natural Language Query

Try this exact query as requested:
> "Use the natural_language_query tool to analyze: Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days"

## Alternative Setup (Without API Keys)

If you don't have API keys, you can use Ollama for local LLM:

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3:70b`
3. Update the config without API keys:

```json
{
  "mcpServers": {
    "healthcare-research": {
      "command": "node",
      "args": ["/Users/JCR/healthcare-research-mcp/dist/server/index.js"],
      "env": {
        "ONTOLOGY_DB_PATH": "/Users/JCR/healthcare-research-mcp/data/databases/ontology.db",
        "RESEARCH_DB_PATH": "/Users/JCR/healthcare-research-mcp/data/databases/research.db",
        "LLM_PROVIDER": "ollama",
        "OLLAMA_MODEL": "llama3:70b",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Troubleshooting

### "Server failed to start"
1. Check that the path is correct: `/Users/JCR/healthcare-research-mcp/dist/server/index.js`
2. Ensure the project is built: `npm run build`
3. Check Node.js version: `node --version` (should be 18+)

### "No tools available"
1. Make sure you completely quit and restarted Claude Desktop
2. Check the logs: `cat ~/Library/Logs/Claude/mcp*.log`
3. Verify the server starts manually: `node /Users/JCR/healthcare-research-mcp/dist/server/index.js`

### "LLM provider not available"
1. Add your API key to the config as shown above
2. Or ensure Ollama is running: `ollama serve`

## Example Queries to Try

Once connected, try these:

1. **Simple Query**:
   > "Use natural_language_query to find common treatments for hypertension"

2. **Complex Analysis**:
   > "Use natural_language_query to compare outcomes between surgical and medical management of appendicitis in elderly patients"

3. **Code Generation**:
   > "Use natural_language_query with output_format='code_only' to generate R code for analyzing diabetes medication adherence"

The server is now ready to use with Claude Desktop!