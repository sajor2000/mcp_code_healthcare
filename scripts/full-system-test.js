#!/usr/bin/env node
/**
 * Full System Test - Comprehensive check of all MCP server capabilities
 * Run this for complete real-world testing
 */

import { HealthcareResearchMCPServer } from '../dist/server/index.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🏥 Healthcare Research MCP Server - Full System Test\n');
console.log('This test checks all components needed for real-world usage.\n');

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0
};

async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await testFn();
    if (result.warning) {
      console.log(`⚠️  ${result.message}`);
      tests.warnings++;
    } else {
      console.log(`✅ ${result.message || 'Passed'}`);
      tests.passed++;
    }
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    tests.failed++;
    return false;
  }
}

async function fullSystemTest() {
  let server;
  
  // Test 1: Server Initialization
  await runTest('Server Initialization', async () => {
    server = new HealthcareResearchMCPServer();
    return { message: 'Server created successfully' };
  });
  
  if (!server) {
    console.error('\n❌ Cannot continue without server initialization');
    return;
  }
  
  // Test 2: Tool Registration
  await runTest('Tool Registration', async () => {
    const expectedTools = [
      'natural_language_query',
      'lookup_medical_knowledge',
      'search_medical_literature',
      'search_external_sources',
      'generate_hypothesis',
      'build_cohort',
      'generate_research_code',
      'create_figure',
      'phenotype_definition',
      'code_lookup',
      'code_translator'
    ];
    
    const registeredTools = Array.from(server.tools.keys());
    const missing = expectedTools.filter(t => !registeredTools.includes(t));
    
    if (missing.length > 0) {
      throw new Error(`Missing tools: ${missing.join(', ')}`);
    }
    
    return { message: `All ${registeredTools.length} tools registered` };
  });
  
  // Test 3: Database Access
  await runTest('Database Access', async () => {
    const dbPath = path.join(__dirname, '../data/databases/ontology.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error('Ontology database not found');
    }
    return { message: 'Databases accessible' };
  });
  
  // Test 4: LLM Provider
  await runTest('LLM Provider Configuration', async () => {
    const hasProvider = !!(
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_API_KEY
    );
    
    if (!hasProvider) {
      // Check if Ollama is running
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          return { message: 'Using Ollama (local)' };
        }
      } catch (e) {
        // Ollama not available
      }
      
      return { 
        warning: true, 
        message: 'No LLM provider configured - will use fallback' 
      };
    }
    
    const provider = process.env.LLM_PROVIDER ||
      (process.env.ANTHROPIC_API_KEY ? 'Anthropic' :
       process.env.OPENAI_API_KEY ? 'OpenAI' : 'Google');
    
    return { message: `Using ${provider}` };
  });
  
  // Test 5: External Search APIs
  await runTest('External Search APIs', async () => {
    const brave = !!process.env.BRAVE_API_KEY;
    const perplexity = !!process.env.PERPLEXITY_API_KEY;
    
    if (!brave && !perplexity) {
      return { 
        warning: true, 
        message: 'No external search APIs configured - using mock data' 
      };
    }
    
    const apis = [];
    if (brave) apis.push('Brave');
    if (perplexity) apis.push('Perplexity');
    
    return { message: `Configured: ${apis.join(', ')}` };
  });
  
  // Test 6: Natural Language Query
  await runTest('Natural Language Query Tool', async () => {
    const result = await server.callTool('natural_language_query', {
      query: 'What are the risk factors for diabetes?',
      execution_mode: 'plan_only',
      output_format: 'summary'
    });
    
    if (!result.hypothesis || !result.interpretation) {
      throw new Error('Incomplete response from natural language query');
    }
    
    return { message: 'Query processed successfully' };
  });
  
  // Test 7: Medical Knowledge
  await runTest('Medical Knowledge Lookup', async () => {
    const result = await server.callTool('lookup_medical_knowledge', {
      concept: 'sepsis',
      concept_type: 'condition',
      include_details: ['definition', 'diagnosis_criteria']
    });
    
    if (!result.details || !result.details.definition) {
      throw new Error('Medical knowledge not found');
    }
    
    return { message: 'Sepsis knowledge retrieved' };
  });
  
  // Test 8: Complex Query (The Main Use Case)
  await runTest('Complex Sepsis Analysis Query', async () => {
    const result = await server.callTool('natural_language_query', {
      query: 'Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days',
      dataset_info: {
        path: './data/sample.csv',
        data_model: 'OMOP'
      },
      execution_mode: 'plan_only'
    });
    
    // Check for expected components
    const hasHypothesis = !!result.hypothesis;
    const hasCohort = !!result.cohort_definition;
    const hasAnalysisPlan = !!result.analysis_plan;
    
    if (!hasHypothesis || !hasCohort || !hasAnalysisPlan) {
      throw new Error('Missing required analysis components');
    }
    
    return { message: 'Complex query handled correctly' };
  });
  
  // Test 9: Code Generation
  await runTest('Code Generation', async () => {
    const result = await server.callTool('generate_research_code', {
      study_type: 'cohort',
      analysis_plan: {
        primary_outcome: 'mortality',
        statistical_methods: ['cox_regression']
      },
      output_format: 'R'
    });
    
    if (!result.code || !result.code.includes('library')) {
      throw new Error('Invalid R code generated');
    }
    
    return { message: 'R code generated successfully' };
  });
  
  // Test 10: OMOP/CLIF Knowledge
  await runTest('Data Model Knowledge', async () => {
    const omop = await server.callTool('lookup_medical_knowledge', {
      concept: 'OMOP',
      concept_type: 'data_model'
    });
    
    const clif = await server.callTool('lookup_medical_knowledge', {
      concept: 'CLIF',
      concept_type: 'data_model'
    });
    
    if (!omop.details.full_name || !clif.details.full_name) {
      throw new Error('Data model knowledge incomplete');
    }
    
    return { message: 'OMOP and CLIF knowledge available' };
  });
  
  // Performance Test
  console.log('\n📊 Performance Test...');
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    promises.push(
      server.callTool('natural_language_query', {
        query: `Test query ${i}`,
        execution_mode: 'plan_only'
      })
    );
  }
  
  await Promise.all(promises);
  const duration = Date.now() - startTime;
  console.log(`✅ Processed 5 concurrent queries in ${duration}ms (${Math.round(duration/5)}ms avg)\n`);
  
  // Summary
  console.log('=' .repeat(60));
  console.log('📋 TEST SUMMARY\n');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`⚠️  Warnings: ${tests.warnings}`);
  console.log(`❌ Failed: ${tests.failed}`);
  console.log('\n' + '=' .repeat(60));
  
  if (tests.failed === 0) {
    console.log('\n✨ System is ready for real-world use!\n');
    
    console.log('Next steps:');
    console.log('1. Add to Claude Desktop using the config in SETUP-CLAUDE-DESKTOP.md');
    console.log('2. Configure external APIs for better results (Brave, Perplexity)');
    console.log('3. Run example workflows in /examples folder');
    console.log('4. Monitor logs during usage');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before production use.\n');
    console.log('Common fixes:');
    console.log('- Run: npm run build');
    console.log('- Run: npm run db:init');
    console.log('- Add API keys to .env file');
    console.log('- Ensure Ollama is running if using local models');
  }
  
  // Show configuration status
  console.log('\n📌 Current Configuration:');
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`- HIPAA Compliant: ${process.env.HIPAA_COMPLIANT || 'false'}`);
  console.log(`- Cache Enabled: ${process.env.ENABLE_CACHE || 'true'}`);
}

// Run the test
fullSystemTest().then(() => {
  process.exit(tests.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('\n❌ System test failed:', error);
  process.exit(1);
});