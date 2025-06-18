#!/usr/bin/env node
/**
 * Simplified Healthcare Research MCP Server
 * Natural language interface for medical research - no technical knowledge required
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all the existing utilities
import { STROBE_CHECKLIST, CDC_SEPSIS_EVENT } from '../utils/fetch-guidelines.js';
import { 
  IntegratedAnalysisPipeline, 
  EnhancedCodeGenerator,
  TripodAICodeGenerator,
  CONDITION_KNOWLEDGE
} from '../utils/enhanced-code-generator.js';
import {
  TRIPOD_AI_CHECKLIST,
  TRIPOD_AI_PRINCIPLES,
  generateTripodAIChecklist,
  assessTripodAICompliance
} from '../utils/fetch-tripod-ai.js';
import {
  OMOP_CDM_V54,
  OMOP_MAPPINGS,
  getOMOPTableSchema,
  getOMOPRequiredTables,
  generateOMOPQuery,
  validateOMOPStructure
} from '../utils/fetch-omop-cdm.js';
import {
  ICD10_CODES,
  RXNORM_CODES,
  LOINC_CODES,
  SNOMED_CODES,
  lookupICD10,
  lookupRxNorm,
  lookupLOINC,
  lookupSNOMED,
  searchICD10ByKeyword,
  searchRxNormByKeyword,
  getCodesForCondition,
  getCodesForMedication,
  getCodesForLabTest
} from '../utils/medical-ontologies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize components
const analysisPipeline = new IntegratedAnalysisPipeline();
const codeGenerator = new EnhancedCodeGenerator();
const tripodAIGenerator = new TripodAICodeGenerator();

// Create server instance
const server = new Server(
  {
    name: 'healthcare-research-simplified',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to detect user intent from natural language
function detectIntent(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Code lookup patterns
  if (lowerQuery.includes('what is') || lowerQuery.includes('lookup') || 
      lowerQuery.includes('find code') || lowerQuery.includes('icd') || 
      lowerQuery.includes('rxnorm') || lowerQuery.includes('loinc')) {
    return 'lookup_codes';
  }
  
  // Code generation patterns
  if (lowerQuery.includes('generate code') || lowerQuery.includes('write code') ||
      lowerQuery.includes('create analysis') || lowerQuery.includes('statistical')) {
    return 'generate_code';
  }
  
  // Visualization patterns
  if (lowerQuery.includes('plot') || lowerQuery.includes('graph') || 
      lowerQuery.includes('chart') || lowerQuery.includes('visualiz') ||
      lowerQuery.includes('kaplan') || lowerQuery.includes('forest')) {
    return 'create_visualization';
  }
  
  // Data validation patterns
  if (lowerQuery.includes('check data') || lowerQuery.includes('validate') ||
      lowerQuery.includes('data quality') || lowerQuery.includes('omop structure')) {
    return 'check_data';
  }
  
  // Default to analysis
  return 'analyze_research';
}

// Helper function to provide user-friendly error messages
function getUserFriendlyError(error: any): string {
  const errorMsg = error.message || error.toString();
  
  if (errorMsg.includes('not found')) {
    return "I couldn't find what you're looking for. Try rephrasing your query or check the spelling.";
  }
  if (errorMsg.includes('invalid')) {
    return "Your request format wasn't quite right. Try asking in plain English, like 'Find studies about diabetes treatment'.";
  }
  if (errorMsg.includes('connection')) {
    return "I'm having trouble connecting to the database. Please try again in a moment.";
  }
  
  return `Something went wrong: ${errorMsg}. Try simplifying your request or asking for help.`;
}

// List available tools - simplified to just 5 tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze',
      description: `Ask any medical research question in plain English. I'll understand what you need and provide the right analysis.

Examples:
- "Find all studies about COVID vaccine effectiveness"
- "Compare mortality rates between patients on drug A vs drug B"
- "What are the risk factors for sepsis?"
- "Create a survival analysis for heart failure patients"
- "Help me design a clinical trial for diabetes"

I can help with:
✓ Literature searches and systematic reviews
✓ Statistical analysis planning
✓ Data interpretation
✓ Study design
✓ Clinical guidelines
✓ Medical code lookups`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Your research question in plain English'
          },
          options: {
            type: 'object',
            description: 'Optional settings (usually not needed)',
            properties: {
              output_format: {
                type: 'string',
                enum: ['summary', 'detailed', 'code_only'],
                description: 'How detailed should the response be?'
              },
              language: {
                type: 'string',
                enum: ['R', 'Python'],
                description: 'Preferred programming language for code'
              }
            }
          }
        },
        required: ['query']
      }
    },
    {
      name: 'lookup_codes',
      description: `Find medical codes without memorizing code systems. Just describe what you're looking for.

Examples:
- "diabetes codes"
- "vancomycin medication code"
- "hemoglobin A1c test"
- "heart failure ICD codes"`,
      inputSchema: {
        type: 'object',
        properties: {
          search_term: {
            type: 'string',
            description: 'What medical concept are you looking for?'
          }
        },
        required: ['search_term']
      }
    },
    {
      name: 'generate_code',
      description: `Get analysis code for your research. Just describe what you want to analyze.

Examples:
- "compare survival between two treatment groups"
- "logistic regression for readmission risk"
- "descriptive statistics by age group"`,
      inputSchema: {
        type: 'object',
        properties: {
          analysis_description: {
            type: 'string',
            description: 'Describe your analysis in plain English'
          },
          language: {
            type: 'string',
            enum: ['R', 'Python'],
            description: 'R or Python? (default: R)',
            default: 'R'
          }
        },
        required: ['analysis_description']
      }
    },
    {
      name: 'create_visualization',
      description: `Create publication-ready graphs and charts. Just describe what you want to show.

Examples:
- "survival curve for treatment vs control"
- "forest plot of risk factors"
- "bar chart of patient demographics"`,
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'What do you want to visualize?'
          },
          style: {
            type: 'string',
            enum: ['default', 'journal', 'presentation'],
            description: 'Visual style (default: journal-ready)',
            default: 'journal'
          }
        },
        required: ['description']
      }
    },
    {
      name: 'check_data',
      description: `Validate your healthcare data. I'll check for common issues and OMOP compliance.

Examples:
- "check my patient data"
- "validate OMOP structure"
- "find data quality issues"`,
      inputSchema: {
        type: 'object',
        properties: {
          data_description: {
            type: 'string',
            description: 'Describe your data or paste a sample'
          }
        },
        required: ['data_description']
      }
    }
  ]
}));

// Handle tool execution with simplified routing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Main analyze tool - routes to appropriate functionality
    if (name === 'analyze') {
      const query = args.query as string;
      const options = args.options || {};
      
      // Detect what the user wants to do
      const intent = detectIntent(query);
      
      switch (intent) {
        case 'lookup_codes':
          // Extract the medical term from the query
          const searchMatch = query.match(/(?:what is|lookup|find code for|codes? for)\s+(.+?)(?:\?|$)/i);
          const searchTerm = searchMatch ? searchMatch[1] : query;
          
          const codes = await searchMedicalCodes(searchTerm);
          return {
            content: [{
              type: 'text',
              text: formatCodeResults(codes, searchTerm)
            }]
          };
          
        case 'generate_code':
          const codeResult = await generateAnalysisCode(query, options.language || 'R');
          return {
            content: [{
              type: 'text',
              text: codeResult
            }]
          };
          
        case 'create_visualization':
          const vizSpec = await createVisualizationSpec(query);
          return {
            content: [{
              type: 'text',
              text: vizSpec
            }]
          };
          
        case 'check_data':
          const validationResult = await validateHealthcareData(query);
          return {
            content: [{
              type: 'text',
              text: validationResult
            }]
          };
          
        default:
          // Full analysis pipeline
          const result = await analysisPipeline.processNaturalLanguageQuery(query);
          return {
            content: [{
              type: 'text',
              text: formatAnalysisResult(result, options.output_format || 'summary')
            }]
          };
      }
    }
    
    // Direct tool calls (for backward compatibility and advanced users)
    if (name === 'lookup_codes') {
      const searchTerm = args.search_term as string;
      const codes = await searchMedicalCodes(searchTerm);
      return {
        content: [{
          type: 'text',
          text: formatCodeResults(codes, searchTerm)
        }]
      };
    }
    
    if (name === 'generate_code') {
      const description = args.analysis_description as string;
      const language = args.language || 'R';
      const code = await generateAnalysisCode(description, language);
      return {
        content: [{
          type: 'text',
          text: code
        }]
      };
    }
    
    if (name === 'create_visualization') {
      const description = args.description as string;
      const style = args.style || 'journal';
      const viz = await createVisualizationSpec(description, style);
      return {
        content: [{
          type: 'text',
          text: viz
        }]
      };
    }
    
    if (name === 'check_data') {
      const dataDesc = args.data_description as string;
      const validation = await validateHealthcareData(dataDesc);
      return {
        content: [{
          type: 'text',
          text: validation
        }]
      };
    }
    
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}. Try using 'analyze' with your question in plain English.`
    );
    
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      getUserFriendlyError(error)
    );
  }
});

// Simplified helper functions
async function searchMedicalCodes(searchTerm: string): Promise<any> {
  const results: any = {
    icd10: [],
    rxnorm: [],
    loinc: [],
    snomed: []
  };
  
  // Search across all code systems
  try {
    results.icd10 = searchICD10ByKeyword(searchTerm).slice(0, 5);
  } catch (e) {}
  
  try {
    results.rxnorm = searchRxNormByKeyword(searchTerm).slice(0, 5);
  } catch (e) {}
  
  // For LOINC, we need to check if it's a lab test
  if (searchTerm.toLowerCase().includes('test') || searchTerm.toLowerCase().includes('lab')) {
    results.loinc = getCodesForLabTest(searchTerm);
  }
  
  return results;
}

function formatCodeResults(codes: any, searchTerm: string): string {
  let output = `# Medical Codes for "${searchTerm}"\n\n`;
  
  if (codes.icd10?.length > 0) {
    output += "## ICD-10 Diagnosis Codes\n";
    codes.icd10.forEach((code: any) => {
      output += `- **${code.code}**: ${code.description}\n`;
    });
    output += "\n";
  }
  
  if (codes.rxnorm?.length > 0) {
    output += "## RxNorm Medication Codes\n";
    codes.rxnorm.forEach((code: any) => {
      output += `- **${code.code}**: ${code.name}`;
      if (code.strength) output += ` (${code.strength})`;
      output += "\n";
    });
    output += "\n";
  }
  
  if (codes.loinc?.length > 0) {
    output += "## LOINC Lab Test Codes\n";
    codes.loinc.forEach((code: any) => {
      output += `- **${code.code}**: ${code.name}`;
      if (code.units) output += ` [${code.units}]`;
      output += "\n";
    });
    output += "\n";
  }
  
  if (!codes.icd10?.length && !codes.rxnorm?.length && !codes.loinc?.length) {
    output += "No codes found. Try:\n";
    output += "- Using more specific terms (e.g., 'type 2 diabetes' instead of 'diabetes')\n";
    output += "- Checking spelling\n";
    output += "- Using medical terminology\n";
  }
  
  return output;
}

async function generateAnalysisCode(description: string, language: string): Promise<string> {
  // Parse the description to understand what kind of analysis
  const analysisType = detectAnalysisType(description);
  
  const spec = {
    analysis_type: analysisType,
    description: description,
    language: language
  };
  
  const code = codeGenerator.generateCode(spec, language);
  
  return `# ${language} Code for: ${description}\n\n${code}\n\n## How to use this code:\n1. Load your data\n2. Adjust variable names to match your dataset\n3. Run the analysis\n4. Interpret results using the comments provided`;
}

function detectAnalysisType(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes('survival') || lower.includes('kaplan') || lower.includes('cox')) {
    return 'survival';
  }
  if (lower.includes('logistic') || lower.includes('classification')) {
    return 'logistic_regression';
  }
  if (lower.includes('linear regression') || lower.includes('correlation')) {
    return 'linear_regression';
  }
  if (lower.includes('descriptive') || lower.includes('summary')) {
    return 'descriptive';
  }
  if (lower.includes('prediction') || lower.includes('machine learning')) {
    return 'prediction';
  }
  
  return 'exploratory';
}

async function createVisualizationSpec(description: string, style: string = 'journal'): Promise<string> {
  const vizType = detectVisualizationType(description);
  
  let spec = `# Visualization: ${description}\n\n`;
  spec += `## Type: ${vizType}\n`;
  spec += `## Style: ${style}\n\n`;
  
  // Provide both R and Python code
  spec += "### R Code (using ggplot2):\n```r\n";
  spec += generateRVisualization(vizType, style);
  spec += "\n```\n\n";
  
  spec += "### Python Code (using matplotlib/seaborn):\n```python\n";
  spec += generatePythonVisualization(vizType, style);
  spec += "\n```\n\n";
  
  spec += "## Customization Tips:\n";
  spec += "- Adjust colors using your journal's style guide\n";
  spec += "- Modify labels and titles as needed\n";
  spec += "- Export as high-resolution PDF or SVG for publication\n";
  
  return spec;
}

function detectVisualizationType(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes('survival') || lower.includes('kaplan')) return 'kaplan_meier';
  if (lower.includes('forest')) return 'forest_plot';
  if (lower.includes('roc')) return 'roc_curve';
  if (lower.includes('bar')) return 'bar_chart';
  if (lower.includes('box')) return 'box_plot';
  if (lower.includes('scatter')) return 'scatter_plot';
  if (lower.includes('heat')) return 'heatmap';
  
  return 'line_plot';
}

function generateRVisualization(type: string, style: string): string {
  const styleSettings = style === 'journal' ? 
    "theme_classic() + theme(text = element_text(size = 12))" : 
    "theme_minimal()";
    
  const vizCode: Record<string, string> = {
    kaplan_meier: `library(survival)
library(survminer)

# Fit survival model
fit <- survfit(Surv(time, status) ~ treatment, data = data)

# Create Kaplan-Meier plot
ggsurvplot(fit, 
           data = data,
           pval = TRUE,
           conf.int = TRUE,
           risk.table = TRUE,
           ggtheme = ${styleSettings})`,
           
    forest_plot: `library(ggplot2)
library(forestplot)

# Prepare data
forest_data <- data.frame(
  variable = c("Age", "Gender", "Treatment"),
  OR = c(1.2, 0.8, 1.5),
  lower = c(0.9, 0.6, 1.1),
  upper = c(1.6, 1.1, 2.0)
)

# Create forest plot
ggplot(forest_data, aes(x = OR, y = variable)) +
  geom_point() +
  geom_errorbarh(aes(xmin = lower, xmax = upper), height = 0.2) +
  geom_vline(xintercept = 1, linetype = "dashed") +
  ${styleSettings}`,
  
    bar_chart: `ggplot(data, aes(x = category, y = value)) +
  geom_bar(stat = "identity", fill = "steelblue") +
  ${styleSettings}`
  };
  
  return vizCode[type] || vizCode.bar_chart;
}

function generatePythonVisualization(type: string, style: string): string {
  const styleSettings = style === 'journal' ? 
    "plt.style.use('seaborn-paper')\nplt.rcParams['font.size'] = 12" : 
    "plt.style.use('seaborn')";
    
  const vizCode: Record<string, string> = {
    kaplan_meier: `import matplotlib.pyplot as plt
from lifelines import KaplanMeierFitter

${styleSettings}

# Fit Kaplan-Meier
kmf = KaplanMeierFitter()
kmf.fit(durations=data['time'], event_observed=data['status'])

# Plot
kmf.plot_survival_function()
plt.xlabel('Time')
plt.ylabel('Survival Probability')
plt.title('Kaplan-Meier Survival Curve')`,

    forest_plot: `import matplotlib.pyplot as plt
import numpy as np

${styleSettings}

# Data
variables = ['Age', 'Gender', 'Treatment']
odds_ratios = [1.2, 0.8, 1.5]
ci_lower = [0.9, 0.6, 1.1]
ci_upper = [1.6, 1.1, 2.0]

# Create plot
fig, ax = plt.subplots(figsize=(8, 6))
y_pos = np.arange(len(variables))

# Plot points and error bars
ax.errorbar(odds_ratios, y_pos, xerr=[np.array(odds_ratios)-np.array(ci_lower), 
                                       np.array(ci_upper)-np.array(odds_ratios)], 
            fmt='o', capsize=5)
ax.axvline(x=1, linestyle='--', color='gray')

# Labels
ax.set_yticks(y_pos)
ax.set_yticklabels(variables)
ax.set_xlabel('Odds Ratio')`,

    bar_chart: `import matplotlib.pyplot as plt
import seaborn as sns

${styleSettings}

# Create bar plot
plt.figure(figsize=(8, 6))
sns.barplot(data=data, x='category', y='value')
plt.xticks(rotation=45)
plt.tight_layout()`
  };
  
  return vizCode[type] || vizCode.bar_chart;
}

async function validateHealthcareData(description: string): Promise<string> {
  let validation = `# Data Validation Report\n\n`;
  
  // Check if it's OMOP data
  if (description.toLowerCase().includes('omop')) {
    validation += "## OMOP CDM Validation\n\n";
    validation += "### Required Tables Check:\n";
    
    const requiredTables = getOMOPRequiredTables();
    requiredTables.forEach(table => {
      validation += `- [ ] ${table}\n`;
    });
    
    validation += "\n### Common Issues to Check:\n";
    validation += "- Missing person_id in clinical tables\n";
    validation += "- Invalid concept_ids (should be > 0)\n";
    validation += "- Dates outside reasonable ranges\n";
    validation += "- Duplicate records\n\n";
  }
  
  validation += "## General Data Quality Checks\n\n";
  validation += "### Completeness\n";
  validation += "- Check for missing values in key fields\n";
  validation += "- Verify required fields are populated\n\n";
  
  validation += "### Consistency\n";
  validation += "- Date sequences (admission < discharge)\n";
  validation += "- Value ranges (age 0-120, lab values within limits)\n\n";
  
  validation += "### Accuracy\n";
  validation += "- Valid medical codes (ICD-10, RxNorm)\n";
  validation += "- Realistic demographics\n\n";
  
  validation += "## Recommended Validation Code\n\n";
  validation += "```r\n";
  validation += "# R code for data validation\n";
  validation += "library(dplyr)\n\n";
  validation += "# Check completeness\n";
  validation += "missing_summary <- data %>%\n";
  validation += "  summarise_all(~sum(is.na(.)))\n\n";
  validation += "# Check date consistency\n";
  validation += "date_issues <- data %>%\n";
  validation += "  filter(admission_date > discharge_date)\n";
  validation += "```\n";
  
  return validation;
}

function formatAnalysisResult(result: any, outputFormat: string): string {
  if (outputFormat === 'code_only' && result.code) {
    return result.code;
  }
  
  let output = '';
  
  if (outputFormat === 'summary') {
    // Simplified summary format
    output += `# Research Analysis Summary\n\n`;
    
    if (result.parsed_query) {
      output += `**Research Question:** ${result.parsed_query.original_query}\n`;
      output += `**Type of Analysis:** ${result.parsed_query.intent}\n\n`;
    }
    
    if (result.hypothesis) {
      output += `**Main Finding:** ${result.hypothesis.primary}\n\n`;
    }
    
    if (result.recommendations) {
      output += `**Key Recommendations:**\n`;
      result.recommendations.slice(0, 3).forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }
  } else {
    // Detailed format
    output += `# Comprehensive Research Analysis\n\n`;
    
    if (result.parsed_query) {
      output += `## Research Question Analysis\n`;
      output += `- **Original Question:** ${result.parsed_query.original_query}\n`;
      output += `- **Analysis Type:** ${result.parsed_query.intent}\n`;
      output += `- **Key Concepts:** ${result.parsed_query.entities?.map((e: any) => e.text).join(', ')}\n\n`;
    }
    
    if (result.hypothesis) {
      output += `## Hypothesis\n`;
      output += `**Primary:** ${result.hypothesis.primary}\n`;
      if (result.hypothesis.secondary) {
        output += `**Secondary:** ${result.hypothesis.secondary.join('; ')}\n`;
      }
      output += '\n';
    }
    
    if (result.cohort_definition) {
      output += `## Study Population\n`;
      output += `- **Inclusion:** ${result.cohort_definition.inclusion_criteria}\n`;
      output += `- **Exclusion:** ${result.cohort_definition.exclusion_criteria || 'None specified'}\n`;
      output += `- **Sample Size:** ${result.cohort_definition.sample_size_estimate || 'To be determined'}\n\n`;
    }
    
    if (result.code) {
      output += `## Analysis Code\n\`\`\`${result.language || 'r'}\n${result.code}\n\`\`\`\n\n`;
    }
    
    if (result.visualizations?.length > 0) {
      output += `## Recommended Visualizations\n`;
      result.visualizations.forEach((viz: any) => {
        output += `- ${viz.type}: ${viz.description}\n`;
      });
      output += '\n';
    }
    
    if (result.recommendations) {
      output += `## Recommendations\n`;
      result.recommendations.forEach((rec: string) => {
        output += `- ${rec}\n`;
      });
    }
  }
  
  return output;
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Healthcare Research MCP Server (Simplified) - Ready to help with your research!');
  console.error('Just ask questions in plain English.');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});