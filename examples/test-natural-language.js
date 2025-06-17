#!/usr/bin/env node
/**
 * Test script for the Natural Language Query tool
 * Run with: node examples/test-natural-language.js
 */

import { HealthcareResearchMCPServer } from '../dist/server/index.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function testNaturalLanguageQuery() {
  console.log('🏥 Healthcare Research MCP - Natural Language Query Test\n');
  
  try {
    // Initialize server
    const server = new HealthcareResearchMCPServer();
    console.log('✅ Server initialized\n');
    
    // Test queries
    const testQueries = [
      {
        name: "Simple medication query",
        query: "What medications are commonly used for treating diabetes?",
        mode: "plan_only"
      },
      {
        name: "Sepsis analysis (as requested by user)",
        query: "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days",
        mode: "analyze"
      },
      {
        name: "Comparative effectiveness",
        query: "Compare 30-day readmission rates between heart failure patients taking ACE inhibitors vs beta blockers",
        mode: "analyze"
      },
      {
        name: "Code generation only",
        query: "Generate R code to analyze the association between smoking and lung cancer adjusting for age and gender",
        mode: "code_only"
      }
    ];
    
    // Run each test
    for (const test of testQueries) {
      console.log(`📊 Test: ${test.name}`);
      console.log(`📝 Query: "${test.query}"`);
      console.log(`⚙️  Mode: ${test.mode}\n`);
      
      try {
        const result = await server.callTool('natural_language_query', {
          query: test.query,
          execution_mode: test.mode,
          output_format: test.mode === 'code_only' ? 'code_only' : 'summary'
        });
        
        console.log('✅ Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n' + '='.repeat(80) + '\n');
        
      } catch (error) {
        console.error(`❌ Error in test "${test.name}":`, error.message);
        console.log('\n' + '='.repeat(80) + '\n');
      }
    }
    
    // Test with dataset info
    console.log('📊 Test: With dataset information');
    const datasetResult = await server.callTool('natural_language_query', {
      query: "Analyze mortality predictors in this ICU cohort",
      dataset_info: {
        path: "./data/icu_cohort.csv",
        format: "csv",
        data_model: "OMOP"
      },
      execution_mode: "plan_only"
    });
    
    console.log('✅ Result with dataset:');
    console.log(JSON.stringify(datasetResult, null, 2));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Check if LLM provider is configured
if (!process.env.ANTHROPIC_API_KEY && 
    !process.env.OPENAI_API_KEY && 
    !process.env.GOOGLE_API_KEY) {
  console.warn('⚠️  Warning: No LLM API keys found in environment');
  console.warn('   The system will attempt to use Ollama (local) as fallback');
  console.warn('   For best results, set ANTHROPIC_API_KEY in your .env file\n');
}

// Run the test
testNaturalLanguageQuery().then(() => {
  console.log('\n✅ All tests completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});