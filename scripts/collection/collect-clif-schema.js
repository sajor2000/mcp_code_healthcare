import { brave_web_search, brave_local_search } from '@brave/search';
import { firecrawl_map, firecrawl_crawl, firecrawl_extract, firecrawl_scrape } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectCLIFSchema() {
  console.log('Collecting CLIF schema using Firecrawl...');
  
  // 1. Search for CLIF documentation
  const clifSearch = await brave_web_search({
    query: "Common Longitudinal ICU data Format CLIF schema structure GitHub MIT-LCP"
  });
  
  // 2. Map CLIF GitHub organization
  const clifGithubMap = await firecrawl_map({
    url: "https://github.com/MIT-LCP",
    includeSubdomains: false,
    search: "CLIF common longitudinal ICU format"
  });
  
  // 3. Crawl CLIF repositories and documentation
  const clifRepos = await firecrawl_crawl({
    url: "https://github.com/MIT-LCP/mimic-code",
    maxDepth: 3,
    includePaths: [
      "/mimic-iv",
      "/concepts",
      "/buildmimic"
    ],
    scrapeOptions: {
      formats: ["markdown", "links"],
      waitFor: 2000
    }
  });
  
  // 4. Extract CLIF data model
  const clifModel = await firecrawl_extract({
    urls: [
      "https://mimic.mit.edu/docs/iv/",
      "https://github.com/MIT-LCP/mimic-code/tree/main/mimic-iv/concepts"
    ],
    schema: {
      type: "object",
      properties: {
        tables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tableName: { type: "string" },
              category: { type: "string", enum: ["patient", "encounter", "vitals", "medications", "labs", "procedures", "devices", "notes"] },
              temporalGranularity: { type: "string" },
              updateFrequency: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fieldName: { type: "string" },
                    dataType: { type: "string" },
                    unit: { type: "string" },
                    frequency: { type: "string" },
                    description: { type: "string" },
                    validationRules: { type: "object" }
                  }
                }
              }
            }
          }
        },
        temporalAlignment: {
          type: "object",
          properties: {
            method: { type: "string" },
            anchor: { type: "string" },
            intervals: { type: "array" },
            timeZone: { type: "string" }
          }
        },
        dataQualityMetrics: {
          type: "object",
          properties: {
            completeness: { type: "object" },
            consistency: { type: "object" },
            timeliness: { type: "object" }
          }
        }
      }
    },
    prompt: "Extract CLIF (Common Longitudinal ICU Format) data model including tables for vitals, medications, labs, procedures, devices, and clinical notes. Include temporal granularity, measurement frequencies, validation rules, and field specifications for longitudinal ICU data. Focus on real-time data capture and temporal alignment methods."
  });
  
  // 5. Get CLIF-specific research examples and use cases
  const clifExamples = await firecrawl_extract({
    urls: [
      "https://github.com/MIT-LCP/mimic-code/tree/main/mimic-iv/concepts/sepsis",
      "https://github.com/MIT-LCP/mimic-code/tree/main/mimic-iv/concepts/severity_scores",
      "https://github.com/MIT-LCP/mimic-code/tree/main/mimic-iv/concepts/medication"
    ],
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          studyName: { type: "string" },
          researchQuestion: { type: "string" },
          cohortDefinition: { type: "object" },
          temporalLogic: { type: "object" },
          analysisCode: { type: "string" },
          dataRequirements: { type: "array" }
        }
      }
    },
    prompt: "Extract research examples using CLIF format including cohort definitions, temporal logic, and analysis code for ICU studies"
  });
  
  // 6. Get CLIF data quality and validation methods
  const clifValidation = await firecrawl_extract({
    urls: [
      "https://mimic.mit.edu/docs/iv/modules/core/patients/",
      "https://mimic.mit.edu/docs/iv/modules/icu/"
    ],
    schema: {
      type: "object",
      properties: {
        validationRules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              domain: { type: "string" },
              rule: { type: "string" },
              description: { type: "string" },
              implementation: { type: "string" }
            }
          }
        },
        qualityChecks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              checkName: { type: "string" },
              checkType: { type: "string" },
              threshold: { type: "number" },
              action: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract CLIF data validation rules and quality checks for ICU data"
  });
  
  // 7. Get CLIF temporal alignment specifications
  const temporalSpecs = await firecrawl_extract({
    urls: ["https://github.com/MIT-LCP/mimic-code/tree/main/mimic-iv/concepts/pivot"],
    schema: {
      type: "object",
      properties: {
        alignmentMethods: {
          type: "array",
          items: {
            type: "object",
            properties: {
              method: { type: "string" },
              description: { type: "string" },
              useCase: { type: "string" },
              implementation: { type: "string" }
            }
          }
        },
        timeWindows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              windowName: { type: "string" },
              duration: { type: "string" },
              offset: { type: "string" },
              aggregation: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract temporal alignment methods and time window specifications for CLIF format"
  });
  
  // 8. Save collected data
  const dataDir = './data/raw/schemas/clif/';
  await fs.mkdir(dataDir, { recursive: true });
  
  // Save schema
  await fs.writeFile(
    path.join(dataDir, 'clif-schema.json'),
    JSON.stringify(clifModel, null, 2)
  );
  
  // Save examples
  await fs.writeFile(
    path.join(dataDir, 'clif-research-examples.json'),
    JSON.stringify(clifExamples, null, 2)
  );
  
  // Save validation rules
  await fs.writeFile(
    path.join(dataDir, 'clif-validation.json'),
    JSON.stringify(clifValidation, null, 2)
  );
  
  // Save temporal specifications
  await fs.writeFile(
    path.join(dataDir, 'clif-temporal-specs.json'),
    JSON.stringify(temporalSpecs, null, 2)
  );
  
  console.log('✓ CLIF schema collection complete');
  
  return { 
    model: clifModel, 
    examples: clifExamples,
    validation: clifValidation,
    temporal: temporalSpecs
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectCLIFSchema().catch(console.error);
}