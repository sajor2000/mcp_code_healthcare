# Publishing to NPM

To make installation easier for users, you can publish to npm:

## 1. Create NPM account
https://www.npmjs.com/signup

## 2. Update package.json
```json
{
  "name": "@sajor2000/healthcare-research-mcp",
  "version": "1.0.0",
  "description": "MCP server for healthcare research with OMOP/CLIF support",
  "keywords": ["mcp", "healthcare", "medical", "research", "omop", "clif"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/sajor2000/mcp_code_healthcare.git"
  },
  "files": [
    "dist/",
    "data/mock-icu-data/sample-*.csv",
    "data/mock-icu-data/*.py",
    "data/mock-icu-data/*.json",
    "data/mock-icu-data/*.md",
    "bin/",
    "README.md",
    "LICENSE"
  ]
}
```

## 3. Build and publish
```bash
npm run build:standalone
npm login
npm publish --access public
```

## 4. Users can then install with:
```bash
npm install -g @sajor2000/healthcare-research-mcp
```

Then in Claude Desktop config:
```json
{
  "mcpServers": {
    "healthcare-research": {
      "command": "healthcare-research-mcp"
    }
  }
}
```