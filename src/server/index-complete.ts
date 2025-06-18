#!/usr/bin/env node
/**
 * Complete MCP Server for Healthcare Research
 * Integrates STROBE guidelines, CDC definitions, and enhanced code generation
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
import { STROBE_CHECKLIST, CDC_SEPSIS_EVENT, generateSTROBEAnalysisPlan } from '../utils/fetch-guidelines.js';
import { 
  IntegratedAnalysisPipeline, 
  EnhancedCodeGenerator,
  CONDITION_KNOWLEDGE,
  TABLE_SCHEMAS
} from '../utils/enhanced-code-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize pipeline and generator
const analysisPipeline = new IntegratedAnalysisPipeline();
const codeGenerator = new EnhancedCodeGenerator();

// Create server instance
const server = new Server(
  {
    name: 'healthcare-research-mcp-complete',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'parse_research_question',
      description: 'Parse natural language research questions into structured analysis specifications',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language research question'
          },
          dataset_format: {
            type: 'string',
            enum: ['mimic', 'clif', 'omop'],
            description: 'Format of the dataset to be analyzed',
            default: 'mimic'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'validate_analysis',
      description: 'Validate if an analysis is feasible with the available data',
      inputSchema: {
        type: 'object',
        properties: {
          analysis_spec: {
            type: 'object',
            description: 'Parsed analysis specification'
          },
          dataset_info: {
            type: 'object',
            description: 'Information about available dataset',
            properties: {
              format: { type: 'string', enum: ['mimic', 'clif', 'omop'] },
              n_patients: { type: 'number' },
              n_encounters: { type: 'number' },
              available_tables: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['analysis_spec', 'dataset_info']
      }
    },
    {
      name: 'generate_complete_code',
      description: 'Generate complete, validated research analysis code with STROBE compliance',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language research question'
          },
          dataset_info: {
            type: 'object',
            description: 'Dataset information for validation'
          },
          language: {
            type: 'string',
            enum: ['R', 'Python'],
            default: 'R'
          },
          include_strobe_comments: {
            type: 'boolean',
            description: 'Include STROBE checklist items as comments',
            default: true
          },
          include_cdc_sepsis: {
            type: 'boolean',
            description: 'Use CDC Adult Sepsis Event definition if applicable',
            default: true
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_table_schemas',
      description: 'Get table schemas for a specific data format',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['mimic', 'clif', 'omop'],
            description: 'Data format'
          }
        },
        required: ['format']
      }
    },
    {
      name: 'get_condition_knowledge',
      description: 'Get detailed medical knowledge for a condition',
      inputSchema: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Medical condition (e.g., sepsis, pneumonia)'
          },
          include_cdc_definition: {
            type: 'boolean',
            description: 'Include CDC definition if available',
            default: true
          }
        },
        required: ['condition']
      }
    },
    {
      name: 'generate_strobe_checklist',
      description: 'Generate a STROBE checklist for the analysis',
      inputSchema: {
        type: 'object',
        properties: {
          research_question: {
            type: 'string',
            description: 'The research question'
          },
          study_type: {
            type: 'string',
            enum: ['cohort', 'case-control', 'cross-sectional'],
            default: 'cohort'
          }
        },
        required: ['research_question']
      }
    }
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'parse_research_question': {
      const query = args.query as string;
      const format = args.dataset_format || 'mimic';
      
      // Parse using the integrated pipeline
      const spec = analysisPipeline.parseEnhancedQuery(query);
      
      // Add format-specific details
      const enhancedSpec = {
        ...spec,
        dataset_format: format,
        required_tables: getRequiredTables(spec, format as string),
        strobe_items: identifyRelevantSTROBEItems(spec),
        uses_cdc_sepsis: spec.condition === 'sepsis' && spec.entities.some(e => e.text === 'CDC')
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(enhancedSpec, null, 2)
          }
        ]
      };
    }
    
    case 'validate_analysis': {
      const spec = args.analysis_spec as any;
      const datasetInfo = args.dataset_info as any;
      
      // Use the validator from enhanced code generator
      const { validation } = analysisPipeline.generateCode(
        spec.query || 'Analysis validation',
        datasetInfo,
        'R',
        false
      );
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validation || { is_valid: true, warnings: [], errors: [] }, null, 2)
          }
        ]
      };
    }
    
    case 'generate_complete_code': {
      const query = args.query as string;
      const datasetInfo = args.dataset_info as any;
      const language = args.language as 'R' | 'Python' || 'R';
      const includeSTROBE = args.include_strobe_comments !== false;
      const includeCDC = args.include_cdc_sepsis !== false;
      
      // Generate code using the integrated pipeline
      const result = analysisPipeline.generateCode(
        query,
        datasetInfo,
        language,
        includeSTROBE
      );
      
      // Add execution instructions
      const instructions = generateExecutionInstructions(language, result.spec);
      
      return {
        content: [
          {
            type: 'text',
            text: result.code + '\n\n' + instructions
          }
        ]
      };
    }
    
    case 'get_table_schemas': {
      const format = args.format as keyof typeof TABLE_SCHEMAS;
      
      if (!(format in TABLE_SCHEMAS)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown data format: ${format}`
        );
      }
      
      const schemas = TABLE_SCHEMAS[format];
      const formattedSchemas = Object.entries(schemas).map(([table, columns]) => ({
        table,
        columns,
        description: getTableDescription(table, format)
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedSchemas, null, 2)
          }
        ]
      };
    }
    
    case 'get_condition_knowledge': {
      const condition = args.condition as string;
      const includeCDC = args.include_cdc_definition !== false;
      
      const conditionLower = condition.toLowerCase();
      const knowledge = CONDITION_KNOWLEDGE[conditionLower];
      
      if (!knowledge) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `No knowledge available for condition: ${condition}`
        );
      }
      
      let response = {
        condition: conditionLower,
        ...knowledge
      };
      
      // Add CDC definition for sepsis
      if (conditionLower === 'sepsis' && includeCDC) {
        response['cdc_definition'] = CDC_SEPSIS_EVENT;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
    
    case 'generate_strobe_checklist': {
      const researchQuestion = args.research_question as string;
      const studyType = args.study_type || 'cohort';
      
      // Parse the question first
      const spec = analysisPipeline.parseEnhancedQuery(researchQuestion);
      
      // Generate customized STROBE checklist
      const checklist = generateCustomSTROBEChecklist(spec, studyType as string);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(checklist, null, 2)
          }
        ]
      };
    }
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// Helper functions
function getRequiredTables(spec: any, format: string): string[] {
  const tables = new Set<string>();
  
  // Base tables
  if (format === 'mimic') {
    tables.add('patients');
    tables.add('admissions');
  } else if (format === 'clif') {
    tables.add('patient');
    tables.add('hospitalization');
  } else if (format === 'omop') {
    tables.add('person');
    tables.add('visit_occurrence');
  }
  
  // Add based on analyses
  spec.analyses.forEach((analysis: string) => {
    const analysisLower = analysis.toLowerCase();
    if (analysisLower.includes('medication')) {
      if (format === 'mimic') tables.add('prescriptions');
      else if (format === 'clif') tables.add('medication_admin_continuous');
      else if (format === 'omop') tables.add('drug_exposure');
    }
    if (analysisLower.includes('diagnosis')) {
      if (format === 'mimic') tables.add('diagnoses_icd');
      else if (format === 'omop') tables.add('condition_occurrence');
    }
  });
  
  return Array.from(tables);
}

function identifyRelevantSTROBEItems(spec: any): number[] {
  const items = [1, 2, 3, 4, 5, 6, 7]; // Always include introduction and methods
  
  if (spec.analyses.length > 0) {
    items.push(13, 14, 15, 16); // Results sections
  }
  
  if (spec.analyses.includes('mortality') || spec.temporal?.follow_up) {
    items.push(12); // Statistical methods
  }
  
  items.push(18, 19, 20, 21, 22); // Discussion and other
  
  return [...new Set(items)].sort((a, b) => a - b);
}

function getTableDescription(table: string, format: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    mimic: {
      patients: 'Patient demographics and dates',
      admissions: 'Hospital admission records',
      diagnoses_icd: 'ICD diagnosis codes',
      prescriptions: 'Medication prescriptions',
      chartevents: 'Charted observations and measurements',
      icustays: 'ICU stay information'
    },
    clif: {
      patient: 'Patient demographics',
      hospitalization: 'Hospitalization encounters',
      vitals: 'Vital sign measurements',
      labs: 'Laboratory results',
      medication_admin_continuous: 'Continuous medication administration'
    },
    omop: {
      person: 'Patient demographics',
      visit_occurrence: 'Healthcare visits',
      condition_occurrence: 'Diagnosed conditions',
      drug_exposure: 'Drug exposures',
      measurement: 'Clinical measurements'
    }
  };
  
  return descriptions[format]?.[table] || 'No description available';
}

function generateExecutionInstructions(language: string, spec: any): string {
  const sep = language === 'R' ? '#' : '#';
  
  let instructions = `
${sep} ============================================
${sep} EXECUTION INSTRUCTIONS
${sep} ============================================

${sep} 1. Ensure data files are in the correct location:
${sep}    data/${spec.dataset_format || 'mimic'}_format/

${sep} 2. Install required packages:
`;

  if (language === 'R') {
    instructions += `${sep}    install.packages(c("tidyverse", "lubridate", "tableone"))
`;
  } else {
    instructions += `${sep}    pip install pandas numpy matplotlib seaborn tableone
`;
  }

  instructions += `
${sep} 3. Run the script:
${sep}    ${language === 'R' ? 'Rscript' : 'python'} analysis_script.${language === 'R' ? 'R' : 'py'}

${sep} 4. Results will be saved as CSV files and plots as PNG files

${sep} 5. For questions about STROBE compliance, see:
${sep}    https://www.strobe-statement.org/
`;

  if (spec.condition === 'sepsis' && spec.uses_cdc_sepsis) {
    instructions += `
${sep} 6. CDC Sepsis Definition Applied:
${sep}    - Suspected infection: Blood culture + ≥4 days antibiotics
${sep}    - Organ dysfunction: At least one CDC-defined criterion
${sep}    See: https://www.cdc.gov/sepsis/clinicaltools/adult-sepsis-event.html
`;
  }

  return instructions;
}

function generateCustomSTROBEChecklist(spec: any, studyType: string): any {
  const checklist = {
    study_type: studyType,
    research_question: spec.query,
    applicable_items: [],
    recommendations: {}
  };
  
  // Title and Abstract
  checklist.applicable_items.push({
    item: 1,
    description: 'Title and Abstract',
    recommendation: `Title should include "${studyType} study" and key terms: ${spec.condition || 'outcome'}`
  });
  
  // Introduction
  checklist.applicable_items.push({
    item: 2,
    description: 'Background/rationale',
    recommendation: 'Explain why studying ' + (spec.condition || 'this question') + ' is important'
  });
  
  // Methods
  checklist.applicable_items.push({
    item: 6,
    description: 'Participants',
    recommendation: 'Define eligibility: ' + spec.cohort_criteria.inclusion.join(', ')
  });
  
  if (spec.condition) {
    checklist.applicable_items.push({
      item: 7,
      description: 'Variables',
      recommendation: `Clearly define ${spec.condition} using ICD-10 codes: ${CONDITION_KNOWLEDGE[spec.condition]?.icd10_codes.join(', ') || 'standard criteria'}`
    });
  }
  
  // Statistical methods
  if (spec.analyses.includes('mortality')) {
    checklist.applicable_items.push({
      item: 12,
      description: 'Statistical methods',
      recommendation: 'Use logistic regression for mortality, report odds ratios with 95% CI'
    });
  }
  
  return checklist;
}

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Complete MCP Healthcare Research Server running...');