# Deploying to Replit or Vercel

## Option 1: REST API Version (Recommended for Web)

### Replit Deployment

1. Create new Repl with Node.js template
2. Upload these files:
   - `src/server/index-web-api.ts`
   - `package.json` (modified for web)
   - Sample data files

3. Install dependencies:
```bash
npm install express cors dotenv
npm install -D @types/express @types/cors typescript
```

4. Add to package.json:
```json
{
  "scripts": {
    "start": "node dist/server/index-web-api.js",
    "build": "tsc src/server/index-web-api.ts --outDir dist/server"
  }
}
```

5. Run on Replit → Gets public URL like: `https://healthcare-mcp.username.repl.co`

### Vercel Deployment

1. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server/index-web-api.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server/index-web-api.js"
    }
  ]
}
```

2. Deploy:
```bash
npm run build
vercel --prod
```

## Option 2: True MCP Protocol (Experimental)

MCP typically uses stdio, but you can use Server-Sent Events:

```typescript
// In Claude Desktop config:
{
  "mcpServers": {
    "healthcare-remote": {
      "transport": "sse",
      "url": "https://your-app.vercel.app/mcp"
    }
  }
}
```

## Considerations

### ⚠️ Limitations
1. **No LLM Keys**: Don't put API keys on public servers
2. **Limited Features**: Web version can't use full LLM capabilities
3. **Data Privacy**: Users must trust your server with queries
4. **Costs**: You pay for hosting + any API calls

### ✅ Benefits  
1. **No Installation**: Users just visit URL
2. **Always Latest**: Updates automatically
3. **Demo-able**: Easy to share and try

## Hybrid Approach (Best of Both)

1. **Local MCP**: Full features with user's API keys
2. **Web Demo**: Limited features for trying it out
3. **API for Apps**: REST endpoints for web applications

## Example Web UI

Create a simple web interface:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Healthcare Research Query</title>
</head>
<body>
    <h1>Healthcare Research Assistant</h1>
    <input type="text" id="query" placeholder="Ask about sepsis, vancomycin, etc...">
    <button onclick="search()">Search</button>
    <div id="results"></div>
    
    <script>
    async function search() {
        const query = document.getElementById('query').value;
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query})
        });
        const data = await res.json();
        document.getElementById('results').innerText = JSON.stringify(data, null, 2);
    }
    </script>
</body>
</html>
```

## Which Should You Choose?

- **MCP Protocol**: Best for Claude Desktop integration
- **REST API**: Best for web apps and demos
- **Both**: Offer local MCP + web API for different use cases