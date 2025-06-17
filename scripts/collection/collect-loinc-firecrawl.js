import { brave_web_search } from '@brave/search';
import { firecrawl_scrape, firecrawl_extract, firecrawl_crawl } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectLOINCWithFirecrawl() {
  console.log('Collecting LOINC data using Firecrawl...');
  
  // 1. Search for LOINC sources
  const searchResults = await brave_web_search({
    query: "LOINC laboratory codes download Regenstrief Institute clinical observations"
  });
  
  // 2. Scrape LOINC website
  const loincSite = await firecrawl_scrape({
    url: "https://loinc.org/",
    formats: ["html", "markdown", "links"],
    onlyMainContent: true
  });
  
  // 3. Extract LOINC structure and components
  const loincStructure = await firecrawl_extract({
    urls: [
      "https://loinc.org/get-started/",
      "https://loinc.org/kb/users-guide/"
    ],
    schema: {
      type: "object",
      properties: {
        components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              componentName: { type: "string" },
              description: { type: "string" },
              examples: { type: "array", items: { type: "string" } }
            }
          }
        },
        classes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              className: { type: "string" },
              abbreviation: { type: "string" },
              description: { type: "string" },
              subclasses: { type: "array", items: { type: "string" } }
            }
          }
        },
        axes: {
          type: "object",
          properties: {
            component: { type: "string" },
            property: { type: "string" },
            time: { type: "string" },
            system: { type: "string" },
            scale: { type: "string" },
            method: { type: "string" }
          }
        }
      }
    },
    prompt: "Extract LOINC structure including the six axes (Component, Property, Time, System, Scale, Method), major classes, and how LOINC codes are constructed"
  });
  
  // 4. Get common laboratory tests
  const commonLabTests = await firecrawl_extract({
    urls: [
      "https://loinc.org/kb/users-guide/loinc-class-list/",
      "https://loinc.org/top-2000-plus/"
    ],
    schema: {
      type: "object",
      properties: {
        topLabTests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              loincNum: { type: "string" },
              longCommonName: { type: "string" },
              component: { type: "string" },
              system: { type: "string" },
              units: { type: "string" },
              referenceRange: { type: "string" }
            }
          }
        },
        criticalCareTests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              testName: { type: "string" },
              loincCode: { type: "string" },
              frequency: { type: "string" },
              clinicalUse: { type: "string" }
            }
          }
        },
        panels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              panelName: { type: "string" },
              loincCode: { type: "string" },
              includedTests: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    prompt: "Extract common laboratory tests including CBC, metabolic panels, blood gases, and critical care tests. Include LOINC codes, units, and typical reference ranges."
  });
  
  // 5. Get LOINC to SNOMED mappings
  const loincMappings = await firecrawl_extract({
    urls: ["https://loinc.org/collaboration/snomed-international/"],
    schema: {
      type: "object",
      properties: {
        mappingScope: { type: "string" },
        mappingTypes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              loincCategory: { type: "string" },
              snomedDomain: { type: "string" },
              mappingApproach: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract information about LOINC to SNOMED CT mappings and collaboration"
  });
  
  // 6. Get clinical observation categories
  const clinicalCategories = await firecrawl_extract({
    urls: ["https://loinc.org/clinical/"],
    schema: {
      type: "object",
      properties: {
        clinicalMeasures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              examples: { type: "array", items: { type: "string" } },
              loincCodes: { type: "array", items: { type: "string" } }
            }
          }
        },
        documentTypes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              documentName: { type: "string" },
              loincCode: { type: "string" },
              description: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract clinical observation categories including vital signs, clinical documents, and survey instruments with LOINC codes"
  });
  
  // 7. Save collected LOINC data
  const dataDir = './data/raw/ontologies/loinc/';
  await fs.mkdir(dataDir, { recursive: true });
  
  await fs.writeFile(
    path.join(dataDir, 'loinc-structure.json'),
    JSON.stringify(loincStructure, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'loinc-common-tests.json'),
    JSON.stringify(commonLabTests, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'loinc-mappings.json'),
    JSON.stringify(loincMappings, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'loinc-clinical-categories.json'),
    JSON.stringify(clinicalCategories, null, 2)
  );
  
  console.log('✓ LOINC data collection complete');
  
  return {
    structure: loincStructure,
    labTests: commonLabTests,
    mappings: loincMappings,
    clinicalCategories: clinicalCategories
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectLOINCWithFirecrawl().catch(console.error);
}