#!/usr/bin/env node
/**
 * Quick test script to verify the server is working
 * Run with: node scripts/quick-test.js
 */

import { HealthcareResearchMCPServer } from '../dist/server/index.js';
import { config } from 'dotenv';

config();

async function quickTest() {
  console.log('🏥 Healthcare Research MCP - Quick Test\n');
  
  try {
    // Initialize server
    console.log('Initializing server...');
    const server = new HealthcareResearchMCPServer();
    
    // List available tools
    console.log('\n📋 Available tools:');
    const tools = Array.from(server.tools.keys());
    tools.forEach(tool => console.log(`  - ${tool}`));
    
    // Test a simple query
    console.log('\n🧪 Testing natural language query...');
    const result = await server.callTool('natural_language_query', {
      query: "What are the risk factors for diabetes?",
      execution_mode: "plan_only",
      output_format: "summary"
    });
    
    console.log('\n✅ Test successful! Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check LLM provider
    const provider = process.env.LLM_PROVIDER || 
                    (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 
                     process.env.OPENAI_API_KEY ? 'openai' : 
                     'ollama (fallback)');
    console.log(`\n🤖 Using LLM provider: ${provider}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure you built the project: npm run build');
    console.error('2. Initialize databases: npm run db:init');
    console.error('3. Add an LLM API key to .env or ensure Ollama is running');
    process.exit(1);
  }
}

quickTest().then(() => {
  console.log('\n✨ Server is working correctly!');
  console.log('\nNext steps:');
  console.log('1. Add to Claude Desktop using the config in SETUP-CLAUDE-DESKTOP.md');
  console.log('2. Or run more tests: node examples/test-natural-language.js');
  process.exit(0);
});