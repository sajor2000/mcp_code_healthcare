import { brave_web_search } from '@brave/search';
import { firecrawl_extract, firecrawl_crawl, firecrawl_scrape } from '@firecrawl/sdk';
import fs from 'fs/promises';
import path from 'path';

export async function collectResearchResources() {
  console.log('Collecting health services research resources...');
  
  const resources = {
    studyDesigns: {},
    phenotypes: {},
    analyticalMethods: {},
    dataQualityFrameworks: {},
    bestPractices: {}
  };
  
  // 1. Collect study design templates
  const studyDesignSearch = await brave_web_search({
    query: "health services research study designs cohort case-control RCT emulation PCORI"
  });
  
  resources.studyDesigns = await firecrawl_extract({
    urls: [
      "https://www.pcornet.org/data/",
      "https://rethinkingclinicaltrials.org/chapters/conduct/",
      "https://www.equator-network.org/"
    ],
    schema: {
      type: "object",
      properties: {
        cohortStudy: {
          type: "object",
          properties: {
            description: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            limitations: { type: "array", items: { type: "string" } },
            bestPractices: { type: "array", items: { type: "string" } }
          }
        },
        caseControl: {
          type: "object",
          properties: {
            description: { type: "string" },
            matchingStrategies: { type: "array", items: { type: "string" } },
            biasConsiderations: { type: "array", items: { type: "string" } }
          }
        },
        rctEmulation: {
          type: "object",
          properties: {
            description: { type: "string" },
            targetTrial: { type: "object" },
            emulationStrategies: { type: "array", items: { type: "string" } }
          }
        }
      }
    },
    prompt: "Extract health services research study design templates including cohort studies, case-control studies, and RCT emulation approaches"
  });
  
  // 2. Collect validated phenotype algorithms
  const phenotypeSearch = await brave_web_search({
    query: "validated phenotype algorithms eMERGE PheKB OHDSI Phenotype Library"
  });
  
  resources.phenotypes = await firecrawl_extract({
    urls: [
      "https://phekb.org/",
      "https://www.ohdsi.org/data-standardization/phenotype-library/",
      "https://emerge-network.org/"
    ],
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phenotypeName: { type: "string" },
          clinicalDomain: { type: "string" },
          algorithmType: { type: "string" },
          validation: {
            type: "object",
            properties: {
              sensitivity: { type: "number" },
              specificity: { type: "number" },
              ppv: { type: "number" },
              npv: { type: "number" }
            }
          },
          implementation: {
            type: "object",
            properties: {
              requiredData: { type: "array", items: { type: "string" } },
              logic: { type: "string" },
              codeSystemsUsed: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    prompt: "Extract validated phenotype algorithms with their validation metrics, required data elements, and implementation logic"
  });
  
  // 3. Collect analytical methods and statistical approaches
  const methodsSearch = await brave_web_search({
    query: "health services research statistical methods propensity score causal inference IPTW"
  });
  
  resources.analyticalMethods = await firecrawl_extract({
    urls: [
      "https://www.hsrd.research.va.gov/for_researchers/cyber_seminars/archives/",
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3775042/"
    ],
    schema: {
      type: "object",
      properties: {
        causalInference: {
          type: "object",
          properties: {
            propensityScore: {
              type: "object",
              properties: {
                description: { type: "string" },
                methods: { type: "array", items: { type: "string" } },
                assumptions: { type: "array", items: { type: "string" } },
                diagnostics: { type: "array", items: { type: "string" } }
              }
            },
            instrumentalVariables: {
              type: "object",
              properties: {
                description: { type: "string" },
                requirements: { type: "array", items: { type: "string" } },
                applications: { type: "array", items: { type: "string" } }
              }
            },
            differencesInDifferences: {
              type: "object",
              properties: {
                description: { type: "string" },
                assumptions: { type: "array", items: { type: "string" } },
                implementation: { type: "string" }
              }
            }
          }
        },
        machineLearningSurvival: {
          type: "object",
          properties: {
            methods: { type: "array", items: { type: "string" } },
            validation: { type: "array", items: { type: "string" } },
            interpretation: { type: "array", items: { type: "string" } }
          }
        }
      }
    },
    prompt: "Extract analytical methods for health services research including causal inference techniques, propensity scores, and machine learning approaches"
  });
  
  // 4. Collect data quality frameworks
  const qualitySearch = await brave_web_search({
    query: "healthcare data quality framework Kahn OMOP Achilles DQA harmonization"
  });
  
  resources.dataQualityFrameworks = await firecrawl_extract({
    urls: [
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4956168/",
      "https://github.com/OHDSI/Achilles"
    ],
    schema: {
      type: "object",
      properties: {
        kahnFramework: {
          type: "object",
          properties: {
            verification: { type: "array", items: { type: "string" } },
            validation: { type: "array", items: { type: "string" } },
            categories: {
              type: "object",
              properties: {
                conformance: { type: "array", items: { type: "string" } },
                completeness: { type: "array", items: { type: "string" } },
                plausibility: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        achillesChecks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              checkId: { type: "number" },
              checkName: { type: "string" },
              checkDescription: { type: "string" },
              severity: { type: "string" }
            }
          }
        }
      }
    },
    prompt: "Extract data quality frameworks including Kahn framework categories and OMOP Achilles data quality checks"
  });
  
  // 5. Collect best practices and guidelines
  const bestPracticesSearch = await brave_web_search({
    query: "real world evidence FDA guidance best practices ISPOR reporting guidelines"
  });
  
  resources.bestPractices = await firecrawl_extract({
    urls: [
      "https://www.fda.gov/science-research/science-and-research-special-topics/real-world-evidence",
      "https://www.ispor.org/heor-resources/good-practices"
    ],
    schema: {
      type: "object",
      properties: {
        rweGuidance: {
          type: "object",
          properties: {
            studyDesign: { type: "array", items: { type: "string" } },
            dataQuality: { type: "array", items: { type: "string" } },
            analysis: { type: "array", items: { type: "string" } },
            reporting: { type: "array", items: { type: "string" } }
          }
        },
        reportingGuidelines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              guideline: { type: "string" },
              studyType: { type: "string" },
              checklist: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    prompt: "Extract real-world evidence best practices and reporting guidelines for health services research"
  });
  
  // Save research resources
  const dataDir = './data/raw/research-templates/';
  await fs.mkdir(dataDir, { recursive: true });
  
  await fs.writeFile(
    path.join(dataDir, 'research-resources.json'),
    JSON.stringify(resources, null, 2)
  );
  
  console.log('✓ Research resources collection complete');
  
  return resources;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectResearchResources().catch(console.error);
}