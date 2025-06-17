import { collectOMOPSchema } from './collect-omop-schema.js';
import { collectCLIFSchema } from './collect-clif-schema.js';
import { collectICD10WithFirecrawl } from './collect-icd10-firecrawl.js';
import { collectSNOMEDWithFirecrawl } from './collect-snomed-firecrawl.js';
import { collectRxNormWithFirecrawl } from './collect-rxnorm-firecrawl.js';
import { collectLOINCWithFirecrawl } from './collect-loinc-firecrawl.js';
import { collectResearchResources } from './collect-research-resources.js';
import fs from 'fs/promises';
import path from 'path';

export async function collectAllDataWithFirecrawl() {
  console.log('===========================================');
  console.log('Starting comprehensive data collection with Firecrawl...');
  console.log('===========================================\n');
  
  const results = {
    schemas: {},
    ontologies: {},
    research: {},
    errors: []
  };
  
  // Collect schemas in parallel
  console.log('📊 Collecting healthcare data schemas...');
  try {
    const [omop, clif] = await Promise.allSettled([
      collectOMOPSchema(),
      collectCLIFSchema()
    ]);
    
    if (omop.status === 'fulfilled') {
      results.schemas.omop = omop.value;
      console.log('✓ OMOP CDM schema collected');
    } else {
      results.errors.push({ type: 'OMOP', error: omop.reason });
      console.error('✗ OMOP collection failed:', omop.reason);
    }
    
    if (clif.status === 'fulfilled') {
      results.schemas.clif = clif.value;
      console.log('✓ CLIF schema collected');
    } else {
      results.errors.push({ type: 'CLIF', error: clif.reason });
      console.error('✗ CLIF collection failed:', clif.reason);
    }
  } catch (error) {
    console.error('Schema collection error:', error);
  }
  
  // Collect ontologies in parallel
  console.log('\n🏥 Collecting medical ontologies...');
  try {
    const [icd10, snomed, rxnorm, loinc] = await Promise.allSettled([
      collectICD10WithFirecrawl(),
      collectSNOMEDWithFirecrawl(),
      collectRxNormWithFirecrawl(),
      collectLOINCWithFirecrawl()
    ]);
    
    const ontologyResults = [
      { name: 'ICD-10', result: icd10 },
      { name: 'SNOMED', result: snomed },
      { name: 'RxNorm', result: rxnorm },
      { name: 'LOINC', result: loinc }
    ];
    
    ontologyResults.forEach(({ name, result }) => {
      if (result.status === 'fulfilled') {
        results.ontologies[name.toLowerCase().replace('-', '')] = result.value;
        console.log(`✓ ${name} ontology collected`);
      } else {
        results.errors.push({ type: name, error: result.reason });
        console.error(`✗ ${name} collection failed:`, result.reason);
      }
    });
  } catch (error) {
    console.error('Ontology collection error:', error);
  }
  
  // Collect research-specific resources
  console.log('\n🔬 Collecting research resources...');
  try {
    results.research = await collectResearchResources();
    console.log('✓ Research resources collected');
  } catch (error) {
    results.errors.push({ type: 'Research', error });
    console.error('✗ Research resources collection failed:', error);
  }
  
  // Save collection summary
  const summaryPath = './data/raw/collection-summary.json';
  await fs.writeFile(
    summaryPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      successfulCollections: {
        schemas: Object.keys(results.schemas),
        ontologies: Object.keys(results.ontologies),
        research: Object.keys(results.research)
      },
      errors: results.errors,
      statistics: {
        totalSchemas: Object.keys(results.schemas).length,
        totalOntologies: Object.keys(results.ontologies).length,
        totalErrors: results.errors.length
      }
    }, null, 2)
  );
  
  console.log('\n===========================================');
  console.log('Data collection complete!');
  console.log(`✓ Schemas collected: ${Object.keys(results.schemas).length}`);
  console.log(`✓ Ontologies collected: ${Object.keys(results.ontologies).length}`);
  console.log(`✗ Errors encountered: ${results.errors.length}`);
  console.log('===========================================');
  
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectAllDataWithFirecrawl()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}