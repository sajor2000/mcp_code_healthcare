import { brave_web_search, brave_local_search } from '@brave/search';
import { firecrawl_map, firecrawl_crawl, firecrawl_extract, firecrawl_scrape } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectOMOPSchema() {
  console.log('Collecting OMOP CDM schema using Firecrawl...');
  
  // 1. Search for OMOP documentation
  const omopSearch = await brave_web_search({
    query: "OMOP Common Data Model v5.4 schema tables documentation OHDSI"
  });
  
  // 2. Map OMOP documentation site
  const omopSiteMap = await firecrawl_map({
    url: "https://ohdsi.github.io/CommonDataModel/",
    search: "table field description CDM",
    limit: 100
  });
  
  // 3. Crawl OMOP GitHub for DDL files
  const omopGithub = await firecrawl_crawl({
    url: "https://github.com/OHDSI/CommonDataModel",
    maxDepth: 3,
    includePaths: [
      "/inst/ddl/5.4",
      "/documentation/CommonDataModel_Wiki_Files",
      "/csv"
    ],
    scrapeOptions: {
      formats: ["markdown", "links"],
      onlyMainContent: true
    }
  });
  
  // 4. Extract OMOP table structures
  const omopTables = await firecrawl_extract({
    urls: [
      "https://ohdsi.github.io/CommonDataModel/cdm54.html",
      "https://ohdsi.github.io/TheBookOfOhdsi/CommonDataModel.html"
    ],
    schema: {
      type: "object",
      properties: {
        version: { type: "string" },
        tables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tableName: { type: "string" },
              tableType: { type: "string", enum: ["clinical", "vocabulary", "derived", "metadata"] },
              description: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fieldName: { type: "string" },
                    dataType: { type: "string" },
                    required: { type: "boolean" },
                    primaryKey: { type: "boolean" },
                    foreignKey: { type: "string" },
                    conceptId: { type: "boolean" },
                    description: { type: "string" }
                  }
                }
              },
              relationships: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    targetTable: { type: "string" },
                    joinKey: { type: "string" },
                    relationshipType: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    prompt: "Extract complete OMOP CDM v5.4 schema including all tables (PERSON, VISIT_OCCURRENCE, CONDITION_OCCURRENCE, DRUG_EXPOSURE, PROCEDURE_OCCURRENCE, MEASUREMENT, OBSERVATION, LOCATION, CARE_SITE, PROVIDER, etc.), their fields, data types, primary/foreign keys, and relationships. Include both clinical tables and vocabulary tables."
  });
  
  // 5. Get OMOP SQL templates and research queries
  const omopQueries = await firecrawl_crawl({
    url: "https://github.com/OHDSI/CommonDataModel/tree/main/inst/sql",
    maxDepth: 2,
    scrapeOptions: {
      formats: ["markdown"],
      extract: {
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              queryName: { type: "string" },
              description: { type: "string" },
              sql: { type: "string" },
              parameters: { type: "array" }
            }
          }
        },
        prompt: "Extract SQL query templates for common OMOP operations including cohort building, phenotyping, and analysis"
      }
    }
  });
  
  // 6. Get OMOP concept mappings
  const conceptMappings = await firecrawl_extract({
    urls: ["https://athena.ohdsi.org/search-terms/start"],
    schema: {
      type: "object",
      properties: {
        vocabularies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vocabularyId: { type: "string" },
              vocabularyName: { type: "string" },
              vocabularyVersion: { type: "string" }
            }
          }
        },
        standardConcepts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conceptId: { type: "number" },
              conceptName: { type: "string" },
              domain: { type: "string" },
              vocabulary: { type: "string" },
              conceptClass: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract OMOP vocabulary information and standard concepts for clinical domains"
  });
  
  // 7. Save collected data
  const dataDir = './data/raw/schemas/omop/';
  await fs.mkdir(dataDir, { recursive: true });
  
  // Save schema
  await fs.writeFile(
    path.join(dataDir, 'omop-schema-v5.4.json'),
    JSON.stringify(omopTables, null, 2)
  );
  
  // Save queries
  await fs.writeFile(
    path.join(dataDir, 'omop-queries.json'),
    JSON.stringify(omopQueries, null, 2)
  );
  
  // Save concept mappings
  await fs.writeFile(
    path.join(dataDir, 'omop-concepts.json'),
    JSON.stringify(conceptMappings, null, 2)
  );
  
  console.log('✓ OMOP CDM schema collection complete');
  
  return { 
    schema: omopTables, 
    queries: omopQueries,
    concepts: conceptMappings
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectOMOPSchema().catch(console.error);
}