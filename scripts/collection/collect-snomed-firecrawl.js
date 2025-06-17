import { brave_web_search } from '@brave/search';
import { firecrawl_scrape, firecrawl_extract, firecrawl_crawl } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectSNOMEDWithFirecrawl() {
  console.log('Collecting SNOMED CT data using Firecrawl...');
  
  // 1. Search for SNOMED CT sources
  const searchResults = await brave_web_search({
    query: "SNOMED CT browser international edition download NLM UMLS"
  });
  
  // 2. Scrape SNOMED browser
  const snomedBrowser = await firecrawl_scrape({
    url: "https://browser.ihtsdotools.org/",
    formats: ["html", "markdown"],
    onlyMainContent: true
  });
  
  // 3. Extract SNOMED hierarchy and concepts
  const snomedStructure = await firecrawl_extract({
    urls: [
      "https://www.nlm.nih.gov/healthit/snomedct/index.html",
      "https://confluence.ihtsdotools.org/display/DOCSTART/SNOMED+CT+Starter+Guide"
    ],
    schema: {
      type: "object",
      properties: {
        hierarchies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hierarchy: { type: "string" },
              rootConcept: { type: "string" },
              description: { type: "string" },
              exampleConcepts: { type: "array", items: { type: "string" } }
            }
          }
        },
        conceptModel: {
          type: "object",
          properties: {
            attributes: { type: "array", items: { type: "string" } },
            relationships: { type: "array", items: { type: "string" } },
            descriptions: { type: "array", items: { type: "string" } }
          }
        },
        clinicalFindings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conceptId: { type: "string" },
              fullySpecifiedName: { type: "string" },
              synonyms: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    prompt: "Extract SNOMED CT hierarchies including Clinical Findings, Procedures, Substances, Body Structures, and Observable Entities. Include the concept model and example clinical concepts."
  });
  
  // 4. Get SNOMED to ICD-10 mappings
  const snomedMappings = await firecrawl_extract({
    urls: ["https://www.nlm.nih.gov/research/umls/mapping_projects/snomedct_to_icd10cm.html"],
    schema: {
      type: "object",
      properties: {
        mappingVersion: { type: "string" },
        mappingRules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              snomedId: { type: "string" },
              snomedTerm: { type: "string" },
              icd10Code: { type: "string" },
              mapCategory: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract SNOMED CT to ICD-10-CM mapping information"
  });
  
  // 5. Get common SNOMED codes for research
  const researchConcepts = await firecrawl_extract({
    urls: ["https://www.snomed.org/use-snomed-ct"],
    schema: {
      type: "object",
      properties: {
        commonConditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: { type: "string" },
              snomedCode: { type: "string" },
              category: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract common SNOMED CT codes used in clinical research including conditions, procedures, and findings"
  });
  
  // 6. Save collected SNOMED data
  const dataDir = './data/raw/ontologies/snomed/';
  await fs.mkdir(dataDir, { recursive: true });
  
  await fs.writeFile(
    path.join(dataDir, 'snomed-structure.json'),
    JSON.stringify(snomedStructure, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'snomed-mappings.json'),
    JSON.stringify(snomedMappings, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'snomed-research-concepts.json'),
    JSON.stringify(researchConcepts, null, 2)
  );
  
  console.log('✓ SNOMED CT data collection complete');
  
  return {
    structure: snomedStructure,
    mappings: snomedMappings,
    researchConcepts: researchConcepts
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectSNOMEDWithFirecrawl().catch(console.error);
}