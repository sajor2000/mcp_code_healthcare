#!/bin/bash
# Run the test MCP server without database dependencies

echo "Starting Healthcare Research MCP Test Server..."
echo "This version works without database dependencies for immediate testing."
echo ""

node dist/server/index-test.js