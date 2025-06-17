#!/usr/bin/env node
/**
 * Example: How the MCP server can learn about medical concepts
 * This demonstrates the knowledge lookup and search capabilities
 */

import { HealthcareResearchMCPServer } from '../dist/server/index.js';
import { config } from 'dotenv';

config();

async function demonstrateKnowledgeTools() {
  console.log('🏥 Healthcare Research MCP - Medical Knowledge Demo\n');
  
  try {
    const server = new HealthcareResearchMCPServer();
    console.log('✅ Server initialized\n');
    
    // Example 1: Learn about sepsis
    console.log('📚 Example 1: What is sepsis?\n');
    const sepsisKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'sepsis',
      concept_type: 'condition',
      include_details: [
        'definition',
        'diagnosis_criteria',
        'pathophysiology',
        'risk_factors',
        'complications',
        'research_considerations',
        'coding_guidance'
      ]
    });
    
    console.log('Sepsis Definition:', sepsisKnowledge.details.definition);
    console.log('\nDiagnosis Criteria:', JSON.stringify(sepsisKnowledge.details.diagnosis_criteria, null, 2));
    console.log('\nRisk Factors:', sepsisKnowledge.details.risk_factors);
    console.log('\nICD-10 Codes:', sepsisKnowledge.details.icd10_codes);
    
    // Example 2: Learn about ARDS
    console.log('\n\n📚 Example 2: What is ARDS?\n');
    const ardsKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'ARDS',
      concept_type: 'condition',
      include_details: ['definition', 'diagnosis_criteria', 'complications']
    });
    
    console.log('ARDS Definition:', ardsKnowledge.details.definition);
    console.log('\nBerlin Criteria:', JSON.stringify(ardsKnowledge.details.diagnosis_criteria.Berlin_Definition, null, 2));
    
    // Example 3: Learn about vancomycin
    console.log('\n\n💊 Example 3: Information about vancomycin\n');
    const vancomycinKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'vancomycin',
      concept_type: 'medication',
      include_details: ['definition', 'treatment_guidelines', 'research_considerations']
    });
    
    console.log('Drug Class:', vancomycinKnowledge.details.drug_class);
    console.log('Mechanism:', vancomycinKnowledge.details.mechanism_of_action);
    console.log('\nIndications:', vancomycinKnowledge.details.indications);
    console.log('\nDosing:', JSON.stringify(vancomycinKnowledge.details.dosing, null, 2));
    
    // Example 4: Learn about OMOP CDM
    console.log('\n\n📊 Example 4: What is OMOP CDM?\n');
    const omopKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'OMOP',
      concept_type: 'data_model',
      include_details: ['definition', 'data_elements']
    });
    
    console.log('Full Name:', omopKnowledge.details.full_name);
    console.log('Description:', omopKnowledge.details.description);
    console.log('\nCore Tables:', JSON.stringify(omopKnowledge.details.core_tables, null, 2));
    console.log('\nSepsis Research Example:', JSON.stringify(omopKnowledge.details.sepsis_research_example, null, 2));
    
    // Example 5: Learn about CLIF
    console.log('\n\n📊 Example 5: What is CLIF?\n');
    const clifKnowledge = await server.callTool('lookup_medical_knowledge', {
      concept: 'CLIF',
      concept_type: 'data_model',
      include_details: ['definition', 'data_elements']
    });
    
    console.log('Full Name:', clifKnowledge.details.full_name);
    console.log('Description:', clifKnowledge.details.description);
    console.log('\nKey Features:', JSON.stringify(clifKnowledge.details.key_features, null, 2));
    
    // Example 6: Search current literature
    console.log('\n\n🔍 Example 6: Search current research\n');
    const literatureSearch = await server.callTool('search_medical_literature', {
      query: 'vancomycin sepsis mortality outcomes',
      sources: ['pubmed', 'guidelines'],
      filters: {
        publication_years: [2022, 2023],
        study_types: ['meta-analysis', 'rct', 'cohort']
      },
      limit: 5
    });
    
    console.log(`Found ${literatureSearch.total_results} relevant articles\n`);
    
    if (literatureSearch.articles.length > 0) {
      console.log('Recent Studies:');
      literatureSearch.articles.forEach(article => {
        console.log(`\n- ${article.title}`);
        console.log(`  Authors: ${article.authors}`);
        console.log(`  Journal: ${article.journal} (${article.year})`);
        console.log(`  Findings: ${article.findings}`);
      });
    }
    
    if (literatureSearch.guidelines.length > 0) {
      console.log('\n\nClinical Guidelines:');
      literatureSearch.guidelines.forEach(guideline => {
        console.log(`\n- ${guideline.title}`);
        console.log(`  Organization: ${guideline.organization} (${guideline.year})`);
        console.log(`  Vancomycin Guidance: ${guideline.vancomycin_guidance}`);
      });
    }
    
    console.log('\n\nResearch Recommendations:', JSON.stringify(literatureSearch.research_recommendations, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the demonstration
demonstrateKnowledgeTools().then(() => {
  console.log('\n✅ Knowledge lookup demonstration complete!');
  console.log('\nThe system now has detailed knowledge about:');
  console.log('- Medical conditions (sepsis, ARDS) with diagnostic criteria');
  console.log('- Medications (vancomycin) with dosing and guidelines');
  console.log('- Data models (OMOP CDM, CLIF) with table structures');
  console.log('- Current research and clinical guidelines');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});