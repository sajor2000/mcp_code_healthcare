#!/usr/bin/env node
/**
 * OMOP-Enhanced MCP Server for Healthcare Research
 * Complete support for OMOP CDM, CLIF, and medical ontologies
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
    name: 'healthcare-research-mcp-omop',
    version: '4.0.0',
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
    // OMOP-specific tools
    {
      name: 'get_omop_schema',
      description: 'Get complete OMOP CDM v5.4 table schema and relationships',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Specific table name or "all" for complete schema'
          },
          include_relationships: {
            type: 'boolean',
            description: 'Include foreign key relationships',
            default: true
          }
        },
        required: ['table_name']
      }
    },
    {
      name: 'validate_omop_data',
      description: 'Validate if your data follows OMOP CDM structure',
      inputSchema: {
        type: 'object',
        properties: {
          available_tables: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tables in your OMOP database'
          }
        },
        required: ['available_tables']
      }
    },
    {
      name: 'generate_omop_query',
      description: 'Generate OMOP-compliant SQL queries',
      inputSchema: {
        type: 'object',
        properties: {
          query_type: {
            type: 'string',
            enum: ['cohort_definition', 'medication_exposure', 'lab_results'],
            description: 'Type of query to generate'
          },
          parameters: {
            type: 'object',
            description: 'Query parameters (e.g., condition_concepts, start_date)'
          }
        },
        required: ['query_type', 'parameters']
      }
    },
    {
      name: 'map_to_omop',
      description: 'Map codes from other formats (MIMIC, CLIF) to OMOP concepts',
      inputSchema: {
        type: 'object',
        properties: {
          source_format: {
            type: 'string',
            enum: ['mimic', 'clif', 'raw'],
            description: 'Source data format'
          },
          mapping_type: {
            type: 'string',
            enum: ['table', 'code', 'concept'],
            description: 'Type of mapping needed'
          },
          source_value: {
            type: 'string',
            description: 'Value to map (table name, code, or concept)'
          }
        },
        required: ['source_format', 'mapping_type', 'source_value']
      }
    },
    
    // Medical ontology tools
    {
      name: 'lookup_medical_code',
      description: 'Look up detailed information for ICD-10, RxNorm, LOINC, or SNOMED codes',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The code to look up'
          },
          code_system: {
            type: 'string',
            enum: ['ICD10', 'RxNorm', 'LOINC', 'SNOMED'],
            description: 'Code system to search in'
          }
        },
        required: ['code', 'code_system']
      }
    },
    {
      name: 'search_medical_codes',
      description: 'Search for medical codes by keyword',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Search keyword (e.g., "sepsis", "vancomycin")'
          },
          code_systems: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['ICD10', 'RxNorm', 'LOINC', 'SNOMED']
            },
            description: 'Code systems to search (default: all)',
            default: ['ICD10', 'RxNorm', 'LOINC', 'SNOMED']
          },
          limit: {
            type: 'number',
            description: 'Maximum results per code system',
            default: 10
          }
        },
        required: ['keyword']
      }
    },
    {
      name: 'get_condition_codes',
      description: 'Get all relevant codes for a medical condition across code systems',
      inputSchema: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Medical condition (e.g., sepsis, pneumonia, heart failure)'
          },
          include_related: {
            type: 'boolean',
            description: 'Include related conditions',
            default: true
          }
        },
        required: ['condition']
      }
    },
    {
      name: 'get_medication_codes',
      description: 'Get all codes for a medication across RxNorm and SNOMED',
      inputSchema: {
        type: 'object',
        properties: {
          medication: {
            type: 'string',
            description: 'Medication name (e.g., vancomycin, furosemide)'
          },
          include_formulations: {
            type: 'boolean',
            description: 'Include all formulations and strengths',
            default: true
          }
        },
        required: ['medication']
      }
    },
    {
      name: 'get_lab_codes',
      description: 'Get LOINC codes for laboratory tests',
      inputSchema: {
        type: 'object',
        properties: {
          lab_test: {
            type: 'string',
            description: 'Lab test name (e.g., glucose, creatinine, troponin)'
          },
          include_methods: {
            type: 'boolean',
            description: 'Include different measurement methods',
            default: true
          }
        },
        required: ['lab_test']
      }
    },
    
    // Enhanced analysis tools with OMOP support
    {
      name: 'analyze_omop_dataset',
      description: 'Analyze OMOP-formatted data with proper concept mappings',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language research question'
          },
          omop_version: {
            type: 'string',
            enum: ['5.3', '5.4', '6.0'],
            description: 'OMOP CDM version',
            default: '5.4'
          },
          vocabulary_available: {
            type: 'boolean',
            description: 'Is OMOP vocabulary available for concept lookups',
            default: true
          }
        },
        required: ['query']
      }
    },
    {
      name: 'generate_omop_cohort',
      description: 'Generate OMOP cohort definition with proper concept sets',
      inputSchema: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Primary condition for cohort'
          },
          inclusion_criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional inclusion criteria'
          },
          exclusion_criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exclusion criteria'
          },
          use_standard_concepts: {
            type: 'boolean',
            description: 'Use only standard OMOP concepts',
            default: true
          }
        },
        required: ['condition']
      }
    },
    
    // TRIPOD+AI Guidelines Tools
    {
      name: 'get_tripod_ai_guidelines',
      description: 'Get TRIPOD+AI checklist for AI prediction model reporting',
      inputSchema: {
        type: 'object',
        properties: {
          study_type: {
            type: 'string',
            enum: ['development', 'validation', 'both'],
            description: 'Type of prediction model study'
          },
          model_type: {
            type: 'string',
            enum: ['traditional', 'machine_learning', 'deep_learning', 'ensemble'],
            description: 'Type of prediction model used'
          }
        },
        required: ['study_type', 'model_type']
      }
    },
    {
      name: 'assess_tripod_ai_compliance',
      description: 'Assess compliance with TRIPOD+AI guidelines for a study',
      inputSchema: {
        type: 'object',
        properties: {
          study_features: {
            type: 'object',
            description: 'Features of the study to assess'
          }
        },
        required: ['study_features']
      }
    },
    {
      name: 'generate_ai_prediction_code',
      description: 'Generate AI prediction model code following TRIPOD+AI guidelines',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of prediction task'
          },
          model_type: {
            type: 'string',
            enum: ['machine_learning', 'deep_learning', 'ensemble'],
            description: 'Type of AI model to generate'
          },
          language: {
            type: 'string',
            enum: ['R', 'Python'],
            description: 'Programming language for code generation',
            default: 'R'
          },
          include_fairness: {
            type: 'boolean',
            description: 'Include algorithmic fairness assessment',
            default: true
          }
        },
        required: ['query', 'model_type']
      }
    }
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // OMOP Schema Tools
    case 'get_omop_schema': {
      const tableName = args.table_name as string;
      const includeRelationships = args.include_relationships !== false;
      
      if (tableName === 'all') {
        const response = {
          version: OMOP_CDM_V54.version,
          release_date: OMOP_CDM_V54.release_date,
          tables: Object.entries(OMOP_CDM_V54.tables).map(([name, schema]) => ({
            name,
            description: schema.description,
            column_count: Object.keys(schema.columns).length,
            required_columns: Object.entries(schema.columns)
              .filter(([_, col]) => col.required)
              .map(([name, _]) => name)
          })),
          total_tables: Object.keys(OMOP_CDM_V54.tables).length
        };
        
        if (includeRelationships) {
          response['relationships'] = OMOP_CDM_V54.relationships;
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }]
        };
      } else {
        const schema = getOMOPTableSchema(tableName);
        if (!schema) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Table '${tableName}' not found in OMOP CDM v5.4`
          );
        }
        
        const response = {
          table: tableName,
          ...schema,
          relationships: includeRelationships 
            ? OMOP_CDM_V54.relationships.filter(
                rel => rel.from.startsWith(tableName + '.') || rel.to.startsWith(tableName + '.')
              )
            : undefined
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }]
        };
      }
    }
    
    case 'validate_omop_data': {
      const availableTables = args.available_tables as string[];
      const validation = validateOMOPStructure(availableTables);
      
      const response = {
        ...validation,
        recommendations: []
      };
      
      if (!validation.isValid) {
        response.recommendations.push(
          'Add missing required tables: ' + validation.missingTables.join(', ')
        );
      }
      
      if (!availableTables.includes('concept') && !availableTables.includes('concept_ancestor')) {
        response.recommendations.push(
          'Consider adding OMOP vocabulary tables for concept mapping'
        );
      }
      
      // Check for commonly needed tables
      const commonTables = ['drug_era', 'condition_era', 'death'];
      const missingCommon = commonTables.filter(t => !availableTables.includes(t));
      if (missingCommon.length > 0) {
        response.recommendations.push(
          `Consider adding commonly used tables: ${missingCommon.join(', ')}`
        );
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
    
    case 'generate_omop_query': {
      const queryType = args.query_type as string;
      const parameters = args.parameters as any;
      
      const query = generateOMOPQuery(queryType, parameters);
      
      if (!query) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown query type: ${queryType}`
        );
      }
      
      return {
        content: [{
          type: 'text',
          text: query
        }]
      };
    }
    
    case 'map_to_omop': {
      const sourceFormat = args.source_format as string;
      const mappingType = args.mapping_type as string;
      const sourceValue = args.source_value as string;
      
      let mapping: any = {};
      
      if (mappingType === 'table') {
        const mappings = OMOP_MAPPINGS[`to${sourceFormat.toUpperCase()}`];
        if (mappings && sourceValue in mappings) {
          mapping = {
            source_table: sourceValue,
            omop_table: mappings[sourceValue],
            notes: `Direct mapping from ${sourceFormat.toUpperCase()} to OMOP`
          };
        } else {
          mapping = {
            source_table: sourceValue,
            omop_table: null,
            notes: 'No direct mapping found. Manual mapping required.'
          };
        }
      } else if (mappingType === 'code') {
        // Map ICD/RxNorm codes to OMOP concepts
        mapping = {
          source_code: sourceValue,
          omop_concepts: [],
          notes: 'Use OMOP vocabulary to find standard concepts'
        };
        
        // Provide guidance based on code type
        if (sourceValue.match(/^[A-Z]\d/)) {
          mapping.code_system = 'ICD-10';
          mapping.omop_vocabulary_id = 'ICD10CM';
        } else if (sourceValue.match(/^\d+$/)) {
          mapping.code_system = 'RxNorm';
          mapping.omop_vocabulary_id = 'RxNorm';
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(mapping, null, 2)
        }]
      };
    }
    
    // Medical Ontology Tools
    case 'lookup_medical_code': {
      const code = args.code as string;
      const codeSystem = args.code_system as string;
      
      let result: any = null;
      
      switch (codeSystem) {
        case 'ICD10':
          result = lookupICD10(code);
          break;
        case 'RxNorm':
          result = lookupRxNorm(code);
          break;
        case 'LOINC':
          result = lookupLOINC(code);
          break;
        case 'SNOMED':
          result = lookupSNOMED(code);
          break;
      }
      
      if (!result) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Code '${code}' not found in ${codeSystem}`
        );
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            code_system: codeSystem,
            ...result,
            omop_mapping: getOMOPMapping(codeSystem, code)
          }, null, 2)
        }]
      };
    }
    
    case 'search_medical_codes': {
      const keyword = args.keyword as string;
      const codeSystems = args.code_systems as string[] || ['ICD10', 'RxNorm', 'LOINC', 'SNOMED'];
      const limit = args.limit as number || 10;
      
      const results: any = {};
      
      if (codeSystems.includes('ICD10')) {
        results.ICD10 = searchICD10ByKeyword(keyword).slice(0, limit);
      }
      
      if (codeSystems.includes('RxNorm')) {
        results.RxNorm = searchRxNormByKeyword(keyword).slice(0, limit);
      }
      
      if (codeSystems.includes('LOINC')) {
        // Search LOINC codes
        const loincResults = [];
        for (const category of Object.values(LOINC_CODES)) {
          for (const [testType, codes] of Object.entries(category)) {
            for (const [code, name] of Object.entries(codes)) {
              if (String(name).toLowerCase().includes(keyword.toLowerCase())) {
                loincResults.push({ code, name, category: testType });
                if (loincResults.length >= limit) break;
              }
            }
            if (loincResults.length >= limit) break;
          }
          if (loincResults.length >= limit) break;
        }
        results.LOINC = loincResults;
      }
      
      if (codeSystems.includes('SNOMED')) {
        // Search SNOMED codes
        const snomedResults = [];
        for (const category of Object.values(SNOMED_CODES)) {
          for (const [subcategory, codes] of Object.entries(category)) {
            for (const [code, name] of Object.entries(codes)) {
              if (String(name).toLowerCase().includes(keyword.toLowerCase())) {
                snomedResults.push({ code, name, category: subcategory });
                if (snomedResults.length >= limit) break;
              }
            }
            if (snomedResults.length >= limit) break;
          }
          if (snomedResults.length >= limit) break;
        }
        results.SNOMED = snomedResults;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            search_keyword: keyword,
            results,
            total_results: Object.values(results).reduce((sum: number, arr: any[]) => sum + arr.length, 0)
          }, null, 2)
        }]
      };
    }
    
    case 'get_condition_codes': {
      const condition = args.condition as string;
      const includeRelated = args.include_related !== false;
      
      const codes = getCodesForCondition(condition);
      
      const response = {
        condition,
        icd10_codes: codes.icd10,
        snomed_codes: codes.snomed,
        omop_concept_recommendation: `Search OMOP vocabulary for '${condition}' in SNOMED domain`
      };
      
      if (includeRelated && condition in CONDITION_KNOWLEDGE) {
        const knowledge = CONDITION_KNOWLEDGE[condition];
        response['related_conditions'] = knowledge.related_conditions;
        response['common_medications'] = knowledge.common_medications;
        response['key_labs'] = knowledge.lab_markers;
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
    
    case 'get_medication_codes': {
      const medication = args.medication as string;
      const includeFormulations = args.include_formulations !== false;
      
      const codes = getCodesForMedication(medication);
      
      const response = {
        medication,
        rxnorm_codes: codes.rxnorm,
        snomed_codes: codes.snomed
      };
      
      if (includeFormulations && codes.rxnorm.length > 0) {
        // Get all formulations from our database
        const formulations = [];
        for (const category of Object.values(RXNORM_CODES)) {
          if (medication.toLowerCase() in category) {
            formulations.push(...Object.entries(category[medication.toLowerCase()]));
          }
        }
        response['formulations'] = formulations.map(([code, name]) => ({ code, name }));
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
    
    case 'get_lab_codes': {
      const labTest = args.lab_test as string;
      const includeMethods = args.include_methods !== false;
      
      const codes = getCodesForLabTest(labTest);
      
      const response = {
        lab_test: labTest,
        loinc_codes: codes.loinc,
        snomed_codes: codes.snomed
      };
      
      if (includeMethods && codes.loinc.length > 0) {
        // Get all methods from our database
        const methods = [];
        const testLower = labTest.toLowerCase().replace(/[^a-z]/g, '_');
        for (const category of Object.values(LOINC_CODES)) {
          if (testLower in category) {
            methods.push(...Object.entries(category[testLower]));
          }
        }
        response['measurement_methods'] = methods.map(([code, name]) => ({ code, name }));
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    }
    
    // Enhanced Analysis Tools
    case 'analyze_omop_dataset': {
      const query = args.query as string;
      const omopVersion = args.omop_version || '5.4';
      const vocabAvailable = args.vocabulary_available !== false;
      
      // Parse query with OMOP awareness
      const spec = analysisPipeline.parseEnhancedQuery(query);
      
      // Generate OMOP-specific code
      const datasetInfo = {
        format: 'omop' as const,
        omop_version: omopVersion,
        vocabulary_available: vocabAvailable,
        available_tables: Object.keys(OMOP_CDM_V54.tables)
      };
      
      const result = analysisPipeline.generateCode(query, datasetInfo, 'R', true);
      
      // Add OMOP-specific enhancements
      let enhancedCode = result.code;
      
      // Add vocabulary joins if available
      if (vocabAvailable) {
        enhancedCode = enhancedCode.replace(
          '# Load data files',
          `# Load data files
# Load OMOP vocabulary for concept lookups
concept <- read_csv("data/omop_vocabulary/CONCEPT.csv")
concept_relationship <- read_csv("data/omop_vocabulary/CONCEPT_RELATIONSHIP.csv")
concept_ancestor <- read_csv("data/omop_vocabulary/CONCEPT_ANCESTOR.csv")

`
        );
      }
      
      return {
        content: [{
          type: 'text',
          text: enhancedCode
        }]
      };
    }
    
    case 'generate_omop_cohort': {
      const condition = args.condition as string;
      const inclusionCriteria = args.inclusion_criteria as string[] || [];
      const exclusionCriteria = args.exclusion_criteria as string[] || [];
      const useStandardConcepts = args.use_standard_concepts !== false;
      
      // Get condition codes
      const conditionCodes = getCodesForCondition(condition);
      
      let cohortDefinition = `-- OMOP Cohort Definition: ${condition}
-- Generated following OMOP best practices

WITH condition_concepts AS (
  -- Get all ${condition} concept IDs
  SELECT concept_id
  FROM concept
  WHERE ${useStandardConcepts ? 'standard_concept = \'S\' AND' : ''}
    (
`;
      
      // Add ICD-10 mappings
      if (conditionCodes.icd10.length > 0) {
        cohortDefinition += `      concept_code IN (${conditionCodes.icd10.map(c => `'${c}'`).join(', ')})
      AND vocabulary_id = 'ICD10CM'
`;
      }
      
      // Add SNOMED mappings
      if (conditionCodes.snomed.length > 0) {
        if (conditionCodes.icd10.length > 0) cohortDefinition += '      OR ';
        cohortDefinition += `concept_code IN (${conditionCodes.snomed.map(c => `'${c}'`).join(', ')})
      AND vocabulary_id = 'SNOMED'
`;
      }
      
      cohortDefinition += `    )
),

-- Get all descendants if using concept hierarchy
all_condition_concepts AS (
  SELECT DISTINCT descendant_concept_id as concept_id
  FROM concept_ancestor
  WHERE ancestor_concept_id IN (SELECT concept_id FROM condition_concepts)
  UNION
  SELECT concept_id FROM condition_concepts
),

-- Define base cohort
base_cohort AS (
  SELECT DISTINCT p.person_id,
    p.year_of_birth,
    p.gender_concept_id,
    p.race_concept_id,
    p.ethnicity_concept_id,
    MIN(co.condition_start_date) as index_date
  FROM person p
  INNER JOIN condition_occurrence co ON p.person_id = co.person_id
  WHERE co.condition_concept_id IN (SELECT concept_id FROM all_condition_concepts)
  GROUP BY p.person_id, p.year_of_birth, p.gender_concept_id, 
           p.race_concept_id, p.ethnicity_concept_id
)`;

      // Add inclusion criteria
      if (inclusionCriteria.length > 0) {
        cohortDefinition += `,

-- Apply inclusion criteria
included_cohort AS (
  SELECT bc.*
  FROM base_cohort bc
  WHERE 1=1
`;
        
        for (const criterion of inclusionCriteria) {
          if (criterion.toLowerCase().includes('age')) {
            const ageMatch = criterion.match(/(\d+)/);
            if (ageMatch) {
              cohortDefinition += `    AND (YEAR(bc.index_date) - bc.year_of_birth) >= ${ageMatch[1]}
`;
            }
          }
          // Add more inclusion criteria patterns as needed
        }
        
        cohortDefinition += ')';
      }
      
      // Final select
      cohortDefinition += `

-- Final cohort
SELECT ${inclusionCriteria.length > 0 ? 'ic' : 'bc'}.*,
  c_gender.concept_name as gender,
  c_race.concept_name as race,
  c_ethnicity.concept_name as ethnicity
FROM ${inclusionCriteria.length > 0 ? 'included_cohort ic' : 'base_cohort bc'}
LEFT JOIN concept c_gender ON ${inclusionCriteria.length > 0 ? 'ic' : 'bc'}.gender_concept_id = c_gender.concept_id
LEFT JOIN concept c_race ON ${inclusionCriteria.length > 0 ? 'ic' : 'bc'}.race_concept_id = c_race.concept_id
LEFT JOIN concept c_ethnicity ON ${inclusionCriteria.length > 0 ? 'ic' : 'bc'}.ethnicity_concept_id = c_ethnicity.concept_id`;

      // Add exclusion criteria as WHERE NOT EXISTS
      if (exclusionCriteria.length > 0) {
        cohortDefinition += `
WHERE NOT EXISTS (
  -- Exclusion criteria
  SELECT 1
  FROM condition_occurrence co_ex
  WHERE co_ex.person_id = ${inclusionCriteria.length > 0 ? 'ic' : 'bc'}.person_id
  -- Add specific exclusion conditions here
)`;
      }
      
      cohortDefinition += ';';
      
      return {
        content: [{
          type: 'text',
          text: cohortDefinition
        }]
      };
    }
    
    // TRIPOD+AI Tools
    case 'get_tripod_ai_guidelines': {
      const studyType = args.study_type as string;
      const modelType = args.model_type as string;
      
      const checklist = generateTripodAIChecklist(studyType, modelType);
      const guidelines = {
        version: TRIPOD_AI_CHECKLIST.version,
        study_type: studyType,
        model_type: modelType,
        checklist,
        principles: TRIPOD_AI_PRINCIPLES,
        key_items: {
          title: TRIPOD_AI_CHECKLIST.sections.title_abstract.items[1],
          methods: TRIPOD_AI_CHECKLIST.sections.methods.items[11],
          validation: TRIPOD_AI_CHECKLIST.sections.methods.items[14],
          presentation: TRIPOD_AI_CHECKLIST.sections.methods.items[15],
          performance: TRIPOD_AI_CHECKLIST.sections.results.items[22],
          fairness: TRIPOD_AI_CHECKLIST.sections.results.items[23]
        }
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(guidelines, null, 2)
        }]
      };
    }
    
    case 'assess_tripod_ai_compliance': {
      const studyFeatures = args.study_features as any;
      const compliance = assessTripodAICompliance(studyFeatures);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(compliance, null, 2)
        }]
      };
    }
    
    case 'generate_ai_prediction_code': {
      const query = args.query as string;
      const modelType = args.model_type as string;
      const language = args.language as string || 'R';
      const includeFairness = args.include_fairness !== false;
      
      // Parse query to create analysis spec with prediction model
      const spec = analysisPipeline.parseEnhancedQuery(query);
      
      // Add prediction model configuration
      spec.prediction_model = {
        type: modelType as any,
        purpose: 'diagnostic', // Could be inferred from query
        outcomes: spec.entities.filter(e => e.type === 'outcome').map(e => e.text),
        features: spec.entities.filter(e => e.type === 'predictor').map(e => e.text),
        validation_strategy: 'cross_validation'
      };
      
      // Generate TRIPOD+AI compliant code
      const modelCode = tripodAIGenerator.generateModelDevelopmentSection(language, spec);
      const validationCode = tripodAIGenerator.generateTripodAIValidationSection(language, spec);
      
      let fullCode = tripodAIGenerator.generateResearchCode(
        spec,
        language as any,
        undefined,
        false, // Don't include STROBE for pure ML studies
        true   // Include TRIPOD+AI
      );
      
      // Add specialized AI sections
      fullCode += modelCode + validationCode;
      
      if (includeFairness) {
        fullCode += `
# ============================================================================
# TRIPOD+AI Algorithmic Fairness Assessment
# ============================================================================

${language === 'R' ? `
# Fairness metrics across demographic groups
fairness_assessment <- function(predictions, true_labels, sensitive_attr) {
  results <- list()
  for (group in unique(sensitive_attr)) {
    mask <- sensitive_attr == group
    if (sum(mask) > 10) {  # Minimum sample size
      results[[group]] <- list(
        n = sum(mask),
        accuracy = mean(predictions[mask] == true_labels[mask]),
        auc = pROC::roc(true_labels[mask], predictions[mask])$auc
      )
    }
  }
  return(results)
}

# Apply fairness assessment
race_fairness <- fairness_assessment(test_predictions, test_labels, test_data$race)
gender_fairness <- fairness_assessment(test_predictions, test_labels, test_data$gender)
` : `
# Fairness metrics across demographic groups
def fairness_assessment(predictions, true_labels, sensitive_attr):
    results = {}
    for group in np.unique(sensitive_attr):
        mask = sensitive_attr == group
        if np.sum(mask) > 10:  # Minimum sample size
            results[group] = {
                'n': np.sum(mask),
                'accuracy': accuracy_score(true_labels[mask], predictions[mask]),
                'auc': roc_auc_score(true_labels[mask], predictions[mask])
            }
    return results

# Apply fairness assessment
race_fairness = fairness_assessment(y_pred, y_test, test_data['race'])
gender_fairness = fairness_assessment(y_pred, y_test, test_data['gender'])
`}
`;
      }
      
      return {
        content: [{
          type: 'text',
          text: fullCode
        }]
      };
    }
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// Helper function to get OMOP mapping info
function getOMOPMapping(codeSystem: string, code: string): any {
  const vocabularyMap = {
    'ICD10': 'ICD10CM',
    'RxNorm': 'RxNorm',
    'LOINC': 'LOINC',
    'SNOMED': 'SNOMED'
  };
  
  return {
    vocabulary_id: vocabularyMap[codeSystem],
    concept_code: code,
    query: `SELECT * FROM concept WHERE vocabulary_id = '${vocabularyMap[codeSystem]}' AND concept_code = '${code}'`
  };
}

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('OMOP-Enhanced MCP Healthcare Research Server running...');