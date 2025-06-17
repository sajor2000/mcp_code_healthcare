#!/usr/bin/env node
/**
 * Test version of MCP server without database dependencies
 * This allows testing the MCP functionality immediately
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Mock medical knowledge data
const MEDICAL_KNOWLEDGE = {
  sepsis: {
    definition: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
    icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2'],
    clinical_criteria: {
      SIRS: ['Temperature >38°C or <36°C', 'Heart rate >90', 'Respiratory rate >20', 'WBC >12k or <4k'],
      qSOFA: ['Respiratory rate ≥22', 'Altered mentation', 'Systolic BP ≤100']
    },
    mortality_rate: '15-30%',
    treatment: ['Early antibiotics', 'Fluid resuscitation', 'Source control']
  },
  vancomycin: {
    class: 'Glycopeptide antibiotic',
    mechanism: 'Inhibits bacterial cell wall synthesis',
    spectrum: 'Gram-positive bacteria including MRSA',
    rxnorm_code: '11124',
    dosing: 'Weight-based, typically 15-20 mg/kg IV q8-12h',
    monitoring: ['Trough levels', 'Renal function']
  }
};

// Create server instance
const server = new Server(
  {
    name: 'healthcare-research-mcp-test',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'natural_language_query',
      description: 'Process natural language medical research queries',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language research question' },
        },
        required: ['query'],
      },
    },
    {
      name: 'lookup_medical_knowledge',
      description: 'Look up medical concepts, conditions, and medications',
      inputSchema: {
        type: 'object',
        properties: {
          concept: { type: 'string', description: 'Medical concept to look up' },
          concept_type: { 
            type: 'string', 
            enum: ['condition', 'medication', 'procedure'],
            description: 'Type of medical concept' 
          },
        },
        required: ['concept'],
      },
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'natural_language_query': {
      const query = args.query as string;
      
      // Simple pattern matching for demo
      const hasSepsis = query.toLowerCase().includes('sepsis');
      const hasVancomycin = query.toLowerCase().includes('vancomycin');
      const hasMortality = query.toLowerCase().includes('mortality');
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              parsed_query: {
                intent: hasMortality ? 'comparison' : 'descriptive',
                entities: [
                  ...(hasSepsis ? [{
                    text: 'sepsis',
                    type: 'condition',
                    codes: [{ system: 'ICD-10', code: 'A41.9', display: 'Sepsis' }]
                  }] : []),
                  ...(hasVancomycin ? [{
                    text: 'vancomycin',
                    type: 'medication',
                    codes: [{ system: 'RxNorm', code: '11124', display: 'Vancomycin' }]
                  }] : []),
                ],
              },
              hypothesis: hasMortality && hasVancomycin ? {
                primary: 'Vancomycin reduces mortality in sepsis patients',
                mechanisms: ['Direct antimicrobial effect'],
                confounders: ['Sepsis severity', 'Comorbidities']
              } : null,
              analysis_code: `# R code for analysis\nlibrary(tidyverse)\n# Analysis would go here...`,
            }, null, 2),
          },
        ],
      };
    }

    case 'lookup_medical_knowledge': {
      const concept = args.concept as string;
      const conceptLower = concept.toLowerCase();
      
      const knowledge = MEDICAL_KNOWLEDGE[conceptLower];
      
      if (knowledge) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                concept,
                ...knowledge,
                data_model_support: {
                  OMOP: 'Full support via concept_id mapping',
                  CLIF: 'Supported for ICU-specific fields'
                }
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `No detailed information found for "${concept}". Try: sepsis, vancomycin`,
            },
          ],
        };
      }
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Healthcare Research MCP Test Server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});