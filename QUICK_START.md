# 🚀 Quick Start Guide - Healthcare Research MCP

This guide will get you up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Claude Desktop app (for integration)

## 1. Clone and Install

```bash
git clone https://github.com/sajor2000/mcp_code_healthcare.git
cd mcp_code_healthcare
npm install
```

> **Note**: If `better-sqlite3` fails to install, don't worry! Use the standalone version.

## 2. Quick Test (No Database Required)

```bash
# Build the standalone server
npm run build:standalone

# Test it
./test-mcp-standalone.sh
```

## 3. Test with MCP Inspector

The easiest way to test the MCP server:

```bash
npx @modelcontextprotocol/inspector dist/server/index-standalone.js
```

This opens a web interface where you can:
1. See all available tools
2. Test queries interactively
3. View responses in real-time

### Example Queries to Try:

1. **Explore the dataset**:
   ```
   "What medical conditions are in the synthetic dataset?"
   ```

2. **Analyze sepsis cases**:
   ```
   "Analyze sepsis patients in the mock ICU data"
   ```

3. **Generate research code**:
   ```
   "Generate R code to compare vancomycin effectiveness in sepsis patients using the mock dataset"
   ```

4. **Look up medical knowledge**:
   ```
   "What is sepsis and how is it treated?"
   ```

## 4. Claude Desktop Integration

1. **Copy the config file**:
   ```bash
   cp claude_desktop_config.example.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Update the config** to use standalone version:
   ```json
   {
     "mcpServers": {
       "healthcare-research": {
         "command": "node",
         "args": ["/path/to/your/mcp_code_healthcare/dist/server/index-standalone.js"]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

4. **Test it** - Try this query:
   ```
   "Using the mock ICU dataset, analyze if vancomycin reduces sepsis mortality at 30 days"
   ```

## 5. Explore the Synthetic Dataset

The repository includes a 500-patient synthetic ICU dataset:

```bash
# View dataset summary
cat data/mock-icu-data/dataset_summary.json

# Explore the data
ls data/mock-icu-data/mimic_format/
```

### Dataset Contents:
- 500 patients
- 666 ICU admissions
- 261 sepsis cases
- Complete vitals, labs, medications
- Available in MIMIC, CLIF, and OMOP formats

## 🎯 What You Can Do

1. **Natural Language Queries**: Ask research questions in plain English
2. **Medical Knowledge Lookup**: Get information about conditions, medications
3. **Code Generation**: Get complete R/Python analysis scripts
4. **Dataset Analysis**: Explore the synthetic ICU data

## 🆘 Troubleshooting

### Build Issues?
Use the standalone version - it has no database dependencies:
```bash
npm run build:standalone
npm run start:standalone
```

### Can't see MCP in Claude?
1. Make sure config path is correct
2. Restart Claude Desktop completely
3. Check the logs in Claude's developer console

### Need the full version?
Install Xcode command line tools first:
```bash
xcode-select --install
npm install better-sqlite3
npm run build
```

## 📚 Next Steps

- Read the full [README.md](README.md)
- Explore [example scripts](examples/)
- Check out the [synthetic dataset](data/mock-icu-data/README.md)
- Try more complex research queries!

---

**Ready to analyze healthcare data with natural language!** 🏥📊