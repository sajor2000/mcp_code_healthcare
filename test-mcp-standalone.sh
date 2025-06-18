#!/bin/bash
# Test script for the standalone MCP server

echo "🧪 Testing Healthcare Research MCP Server (Standalone)"
echo "====================================================="
echo ""

# Build the standalone server
echo "📦 Building standalone server..."
npm run build:standalone

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Show how to test with the MCP Inspector
echo "🔍 Testing Options:"
echo ""
echo "1. MCP Inspector (Interactive):"
echo "   npx @modelcontextprotocol/inspector dist/server/index-standalone.js"
echo ""

echo "2. Direct Testing:"
echo "   npm run start:standalone"
echo ""

echo "3. Test with Example Queries:"
echo ""
echo "   Query 1: \"What medical conditions are in the synthetic dataset?\""
echo "   Query 2: \"Analyze sepsis patients in the mock ICU data\""
echo "   Query 3: \"Generate R code to compare vancomycin effectiveness in sepsis\""
echo ""

echo "4. Claude Desktop Integration:"
echo "   - Update claude_desktop_config.json to use index-standalone.js"
echo "   - Restart Claude Desktop"
echo "   - Try the queries above"
echo ""

# Optional: Start the inspector
read -p "Would you like to start the MCP Inspector now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx @modelcontextprotocol/inspector dist/server/index-standalone.js
fi