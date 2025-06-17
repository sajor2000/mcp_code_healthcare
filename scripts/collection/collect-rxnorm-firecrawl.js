import { brave_web_search } from '@brave/search';
import { firecrawl_scrape, firecrawl_extract, firecrawl_crawl } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectRxNormWithFirecrawl() {
  console.log('Collecting RxNorm data using Firecrawl...');
  
  // 1. Search for RxNorm sources
  const searchResults = await brave_web_search({
    query: "RxNorm API browser NLM medication codes download"
  });
  
  // 2. Scrape RxNorm browser
  const rxnormBrowser = await firecrawl_scrape({
    url: "https://mor.nlm.nih.gov/RxNav/",
    formats: ["html", "markdown", "links"],
    onlyMainContent: true
  });
  
  // 3. Extract RxNorm drug concepts and relationships
  const rxnormStructure = await firecrawl_extract({
    urls: [
      "https://www.nlm.nih.gov/research/umls/rxnorm/overview.html",
      "https://mor.nlm.nih.gov/RxNav/Content/RxNormDoc.html"
    ],
    schema: {
      type: "object",
      properties: {
        termTypes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tty: { type: "string" },
              description: { type: "string" },
              example: { type: "string" }
            }
          }
        },
        drugClasses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              className: { type: "string" },
              classId: { type: "string" },
              classType: { type: "string" }
            }
          }
        },
        relationships: {
          type: "array",
          items: {
            type: "object",
            properties: {
              relationshipName: { type: "string" },
              abbreviation: { type: "string" },
              description: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract RxNorm term types (TTY), drug classes, and relationship types. Include examples of each."
  });
  
  // 4. Get common medications for research
  const commonMedications = await firecrawl_extract({
    urls: ["https://mor.nlm.nih.gov/RxNav/Content/RxNormDoc.html"],
    schema: {
      type: "object",
      properties: {
        topMedications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              genericName: { type: "string" },
              brandNames: { type: "array", items: { type: "string" } },
              rxcui: { type: "string" },
              drugClass: { type: "string" },
              doseForms: { type: "array", items: { type: "string" } }
            }
          }
        },
        criticalCareMeds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              medication: { type: "string" },
              category: { type: "string" },
              commonUses: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    prompt: "Extract commonly prescribed medications including generic names, brand names, and RxCUI codes. Focus on medications used in critical care and hospital settings."
  });
  
  // 5. Get RxNorm to NDC mappings
  const rxnormMappings = await firecrawl_extract({
    urls: ["https://www.nlm.nih.gov/research/umls/rxnorm/docs/techdoc.html"],
    schema: {
      type: "object",
      properties: {
        mappingTypes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceVocabulary: { type: "string" },
              targetVocabulary: { type: "string" },
              mappingDescription: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract information about RxNorm mappings to other drug vocabularies like NDC, CVX, and ATC"
  });
  
  // 6. Get drug interaction data structure
  const drugInteractions = await firecrawl_extract({
    urls: ["https://rxnav.nlm.nih.gov/InteractionAPIs.html"],
    schema: {
      type: "object",
      properties: {
        interactionTypes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string" },
              description: { type: "string" },
              managementStrategy: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract drug interaction severity levels and types available through RxNorm"
  });
  
  // 7. Save collected RxNorm data
  const dataDir = './data/raw/ontologies/rxnorm/';
  await fs.mkdir(dataDir, { recursive: true });
  
  await fs.writeFile(
    path.join(dataDir, 'rxnorm-structure.json'),
    JSON.stringify(rxnormStructure, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'rxnorm-common-medications.json'),
    JSON.stringify(commonMedications, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'rxnorm-mappings.json'),
    JSON.stringify(rxnormMappings, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'rxnorm-interactions.json'),
    JSON.stringify(drugInteractions, null, 2)
  );
  
  console.log('✓ RxNorm data collection complete');
  
  return {
    structure: rxnormStructure,
    medications: commonMedications,
    mappings: rxnormMappings,
    interactions: drugInteractions
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectRxNormWithFirecrawl().catch(console.error);
}