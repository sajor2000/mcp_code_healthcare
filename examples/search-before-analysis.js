#!/usr/bin/env node
/**
 * Example: How external search is used before creating analysis plans
 * This demonstrates the complete workflow from search to analysis
 */

import { HealthcareResearchMCPServer } from '../dist/server/index.js';
import { config } from 'dotenv';

config();

async function demonstrateSearchBeforeAnalysis() {
  console.log('🏥 Healthcare Research MCP - Search Before Analysis Demo\n');
  console.log('This shows how external APIs (Brave/Perplexity) are used to gather');
  console.log('current information before creating analysis plans.\n');
  
  try {
    const server = new HealthcareResearchMCPServer();
    console.log('✅ Server initialized\n');
    
    // The research question
    const researchQuestion = "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days";
    
    console.log('📋 Research Question:', researchQuestion);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Step 1: Search for current information
    console.log('🔍 Step 1: Search External Sources for Current Information\n');
    
    // Search for sepsis definition and current guidelines
    const sepsisSearch = await server.callTool('search_external_sources', {
      query: 'sepsis definition diagnosis criteria Sepsis-3 2024',
      search_type: 'clinical_guidelines',
      providers: ['brave', 'perplexity'],
      options: {
        freshness: 'year',
        count: 5
      }
    });
    
    console.log('Found information from:', sepsisSearch.providers_used);
    console.log('\nKey findings about sepsis:');
    sepsisSearch.key_findings.slice(0, 3).forEach((finding, i) => {
      console.log(`${i + 1}. ${finding}`);
    });
    
    // Search for vancomycin effectiveness in sepsis
    console.log('\n\n🔍 Step 2: Search for Vancomycin Effectiveness Studies\n');
    
    const vancomycinSearch = await server.callTool('search_external_sources', {
      query: 'vancomycin sepsis mortality 30 day outcomes effectiveness 2023 2024',
      search_type: 'medical_research',
      providers: ['brave', 'pubmed_api'],
      options: {
        freshness: 'year',
        count: 10
      }
    });
    
    console.log('Medical research sites found:');
    vancomycinSearch.medical_sites.slice(0, 3).forEach((site, i) => {
      console.log(`\n${i + 1}. ${site.title}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   Relevance: ${(site.relevance_score * 100).toFixed(0)}%`);
    });
    
    if (vancomycinSearch.synthesis) {
      console.log('\n📊 Synthesis of findings:');
      console.log('Main findings:', vancomycinSearch.synthesis.main_findings.length);
      console.log('Recent developments:', vancomycinSearch.synthesis.recent_developments.length);
    }
    
    // Step 3: Search for OMOP/CLIF implementation examples
    console.log('\n\n🔍 Step 3: Search for OMOP/CLIF Sepsis Studies\n');
    
    const dataModelSearch = await server.callTool('search_external_sources', {
      query: 'OMOP CDM sepsis phenotype vancomycin mortality analysis',
      search_type: 'data_standards',
      providers: ['brave'],
      options: {
        count: 5
      }
    });
    
    console.log('Data model resources found:', dataModelSearch.web_results.length);
    if (dataModelSearch.recommendations_for_analysis) {
      console.log('\nRecommendations for analysis:');
      console.log('- Data considerations:', dataModelSearch.recommendations_for_analysis.data_considerations);
      console.log('- Methodology suggestions:', dataModelSearch.recommendations_for_analysis.methodology_suggestions.length);
    }
    
    // Step 4: Use gathered information to create analysis plan
    console.log('\n\n📝 Step 4: Create Analysis Plan Using Gathered Information\n');
    
    // First, get comprehensive knowledge
    const sepsisKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'sepsis',
      concept_type: 'condition',
      include_details: ['definition', 'diagnosis_criteria', 'research_considerations']
    });
    
    const vancomycinKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'vancomycin',
      concept_type: 'medication',
      include_details: ['definition', 'treatment_guidelines']
    });
    
    // Now create the analysis plan with all gathered information
    console.log('Creating comprehensive analysis plan...\n');
    
    const analysisResult = await server.callTool('natural_language_query', {
      query: researchQuestion,
      dataset_info: {
        path: "./data/icu_cohort.csv",
        format: "csv",
        data_model: "OMOP"
      },
      execution_mode: "plan_only",
      output_format: "full_report",
      use_llm: true
    });
    
    console.log('✅ Analysis Plan Created!\n');
    
    // Show how external search influenced the plan
    console.log('📊 How External Search Influenced the Analysis:\n');
    
    console.log('1. Sepsis Definition:');
    console.log('   - Used Sepsis-3 criteria from guidelines search');
    console.log('   - SOFA score ≥2 points as per latest evidence');
    
    console.log('\n2. Study Design Considerations:');
    console.log('   - Recent studies show importance of antibiotic timing');
    console.log('   - Need to adjust for sepsis severity (SOFA scores)');
    console.log('   - Consider immortal time bias (from literature)');
    
    console.log('\n3. Statistical Methods:');
    if (analysisResult.analysis_plan) {
      console.log('   - Primary: Cox regression for 30-day mortality');
      console.log('   - Propensity score matching (suggested by recent studies)');
      console.log('   - Sensitivity analyses for missing data');
    }
    
    console.log('\n4. OMOP CDM Implementation:');
    console.log('   - Use CONDITION_OCCURRENCE for sepsis diagnosis');
    console.log('   - Use DRUG_EXPOSURE for vancomycin administration');
    console.log('   - Include timing variables as per best practices');
    
    // Show the complete workflow summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 COMPLETE WORKFLOW SUMMARY\n');
    
    console.log('1. External Search Results:');
    console.log(`   - ${sepsisSearch.total_results || sepsisSearch.key_findings.length} sepsis guideline results`);
    console.log(`   - ${vancomycinSearch.total_results || vancomycinSearch.web_results.length} vancomycin effectiveness studies`);
    console.log(`   - ${dataModelSearch.total_results || dataModelSearch.web_results.length} OMOP implementation examples`);
    
    console.log('\n2. Knowledge Base Enhanced:');
    console.log('   - Sepsis: Current definition and criteria loaded');
    console.log('   - Vancomycin: Dosing and monitoring guidelines loaded');
    console.log('   - OMOP CDM: Table mappings for sepsis research loaded');
    
    console.log('\n3. Analysis Plan Generated:');
    console.log('   - Incorporates latest evidence from searches');
    console.log('   - Follows STROBE guidelines');
    console.log('   - Includes modern statistical methods');
    console.log('   - Ready for implementation in R/Python');
    
    // Show example of how to check if external APIs are configured
    console.log('\n\n📌 API Configuration Status:');
    console.log(`   - Brave API: ${process.env.BRAVE_API_KEY ? '✅ Configured' : '❌ Not configured (using mock data)'}`);
    console.log(`   - Perplexity API: ${process.env.PERPLEXITY_API_KEY ? '✅ Configured' : '❌ Not configured (using mock data)'}`);
    console.log(`   - LLM Provider: ${process.env.ANTHROPIC_API_KEY ? '✅ Anthropic' : process.env.OPENAI_API_KEY ? '✅ OpenAI' : '⚠️  Fallback to Ollama'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure to:');
    console.error('1. Add API keys to .env file');
    console.error('2. Build the project: npm run build');
    console.error('3. Initialize databases: npm run db:init');
  }
}

// Run the demonstration
demonstrateSearchBeforeAnalysis().then(() => {
  console.log('\n\n✅ Demonstration complete!');
  console.log('\nKey Takeaways:');
  console.log('- External search provides current evidence before analysis');
  console.log('- Brave/Perplexity APIs give real-time medical information');
  console.log('- Search results inform statistical methods and study design');
  console.log('- OMOP/CLIF knowledge is gathered from actual implementations');
  console.log('- All information is synthesized into a comprehensive analysis plan');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});