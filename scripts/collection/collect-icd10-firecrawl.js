import { brave_web_search } from '@brave/search';
import { firecrawl_scrape, firecrawl_extract, firecrawl_crawl } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectICD10WithFirecrawl() {
  console.log('Collecting ICD-10 data using Firecrawl...');
  
  // 1. Search for official ICD-10 sources
  const searchResults = await brave_web_search({
    query: "ICD-10-CM 2024 complete code files download CMS.gov WHO classification"
  });
  
  // 2. Scrape CMS ICD-10 page for download links
  const cmsPage = await firecrawl_scrape({
    url: "https://www.cms.gov/medicare/coding-billing/icd-10-codes/2024-icd-10-cm",
    formats: ["html", "links", "markdown"],
    onlyMainContent: true
  });
  
  // 3. Extract ICD-10 download URLs and metadata
  const icd10Downloads = await firecrawl_extract({
    urls: [cmsPage.url],
    schema: {
      type: "object",
      properties: {
        version: { type: "string" },
        releaseDate: { type: "string" },
        downloads: {
          type: "object",
          properties: {
            xmlFile: { type: "string", pattern: ".*\\.xml.*\\.zip$" },
            txtFile: { type: "string", pattern: ".*\\.txt.*\\.zip$" },
            tabularFile: { type: "string", pattern: ".*tabular.*\\.zip$" },
            addendumFile: { type: "string", pattern: ".*addendum.*" },
            guidelinesFile: { type: "string", pattern: ".*guidelines.*\\.pdf$" }
          }
        },
        updateHighlights: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    prompt: "Extract all ICD-10-CM download links including XML, TXT, tabular formats, guidelines, and any addendum files. Also extract version information and update highlights."
  });
  
  // 4. Crawl WHO ICD-10 browser for international codes
  const whoICD10 = await firecrawl_crawl({
    url: "https://icd.who.int/browse10/2019/en",
    maxDepth: 2,
    limit: 100,
    scrapeOptions: {
      formats: ["markdown", "html"],
      onlyMainContent: true
    }
  });
  
  // 5. Extract ICD-10 hierarchical structure
  const icd10Structure = await firecrawl_extract({
    urls: [
      "https://www.cms.gov/medicare/coding-billing/icd-10-codes",
      "https://icd.who.int/browse10/2019/en"
    ],
    schema: {
      type: "object",
      properties: {
        chapters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              chapterNumber: { type: "string" },
              chapterTitle: { type: "string" },
              codeRange: { type: "string" },
              description: { type: "string" },
              categories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    categoryCode: { type: "string" },
                    categoryTitle: { type: "string" },
                    subcategories: { type: "array" }
                  }
                }
              }
            }
          }
        },
        excludes: {
          type: "object",
          properties: {
            excludes1: { type: "array", items: { type: "object" } },
            excludes2: { type: "array", items: { type: "object" } }
          }
        },
        includes: {
          type: "array",
          items: { type: "object" }
        }
      }
    },
    prompt: "Extract the complete ICD-10 hierarchical structure including all chapters (I-XXII), categories, subcategories, excludes notes (Excludes1 and Excludes2), includes notes, and code ranges."
  });
  
  // 6. Get ICD-10 to SNOMED mappings
  const icd10Mappings = await firecrawl_extract({
    urls: ["https://www.nlm.nih.gov/research/umls/mapping_projects/icd10cm_to_snomedct.html"],
    schema: {
      type: "object",
      properties: {
        mappingVersion: { type: "string" },
        mappingRules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              icd10Code: { type: "string" },
              snomedCodes: { type: "array", items: { type: "string" } },
              mappingType: { type: "string" },
              mapPriority: { type: "number" }
            }
          }
        }
      }
    },
    prompt: "Extract ICD-10 to SNOMED CT mapping information"
  });
  
  // 7. Search and extract ICD-10 coding guidelines
  const guidelinesSearch = await brave_web_search({
    query: "ICD-10-CM Official Guidelines for Coding and Reporting 2024 PDF"
  });
  
  const guidelines = await firecrawl_extract({
    urls: [guidelinesSearch.results[0]?.url],
    schema: {
      type: "object",
      properties: {
        generalGuidelines: { type: "array", items: { type: "string" } },
        chapterSpecificGuidelines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              chapter: { type: "string" },
              guidelines: { type: "array", items: { type: "string" } }
            }
          }
        },
        sequencingRules: { type: "array", items: { type: "string" } }
      }
    },
    prompt: "Extract ICD-10-CM coding guidelines including general rules, chapter-specific guidelines, and sequencing priorities"
  });
  
  // 8. Save all collected ICD-10 data
  const dataDir = './data/raw/ontologies/icd10/';
  await fs.mkdir(dataDir, { recursive: true });
  
  // Save structure
  await fs.writeFile(
    path.join(dataDir, 'icd10-structure.json'),
    JSON.stringify(icd10Structure, null, 2)
  );
  
  // Save download info
  await fs.writeFile(
    path.join(dataDir, 'icd10-downloads.json'),
    JSON.stringify(icd10Downloads, null, 2)
  );
  
  // Save mappings
  await fs.writeFile(
    path.join(dataDir, 'icd10-snomed-mappings.json'),
    JSON.stringify(icd10Mappings, null, 2)
  );
  
  // Save guidelines
  await fs.writeFile(
    path.join(dataDir, 'icd10-guidelines.json'),
    JSON.stringify(guidelines, null, 2)
  );
  
  console.log('✓ ICD-10 data collection complete');
  
  return {
    structure: icd10Structure,
    downloads: icd10Downloads,
    mappings: icd10Mappings,
    guidelines: guidelines,
    whoData: whoICD10
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectICD10WithFirecrawl().catch(console.error);
}