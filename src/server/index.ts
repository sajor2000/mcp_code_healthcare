import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Database } from 'better-sqlite3';
import { HypothesisGeneratorTool } from '../tools/research/hypothesis-generator.js';
import { CohortBuilderTool } from '../tools/research/cohort-builder.js';
import { ResearchCodeGeneratorTool } from '../tools/research/code-generator.js';
import { FigureGeneratorTool } from '../tools/research/figure-generator.js';
import { CodeLookupTool } from '../tools/ontology/code-lookup.js';
import { CodeTranslatorTool } from '../tools/ontology/code-translator.js';
import { PhenotypeTool } from '../tools/research/phenotype.js';
import { NaturalLanguageQueryTool } from '../tools/research/natural-language-query.js';
import { MedicalKnowledgeTool } from '../tools/research/medical-knowledge-tool.js';
import { MedicalWebSearchTool } from '../tools/research/medical-web-search.js';
import { ExternalSearchTool } from '../tools/research/external-search-tool.js';
// Resource and prompt setup are handled inline
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class HealthcareResearchMCPServer {
  private server: Server;
  private ontologyDb: Database;
  private schemaDb: Database;
  public tools: Map<string, any> = new Map();
  
  constructor(config: {
    ontologyDbPath?: string;
    schemaDbPath?: string;
    name?: string;
    version?: string;
  } = {}) {
    // Initialize databases - use environment variables first
    const ontologyPath = config.ontologyDbPath || 
      process.env.ONTOLOGY_DB_PATH ||
      path.join(__dirname, '../../data/databases/ontology.db');
    const schemaPath = config.schemaDbPath || 
      process.env.RESEARCH_DB_PATH ||
      path.join(__dirname, '../../data/databases/research.db');
    
    // Initialize databases - create if they don't exist
    try {
      this.ontologyDb = new Database(ontologyPath);
      this.schemaDb = new Database(schemaPath);
      console.log('✓ Databases connected');
    } catch (error) {
      console.error('Database initialization error:', error);
      console.log('Creating new databases...');
      this.ontologyDb = new Database(ontologyPath);
      this.schemaDb = new Database(schemaPath);
    }
    
    // Initialize MCP server
    this.server = new Server({
      name: config.name || 'healthcare-research-mcp',
      version: config.version || '1.0.0',
      description: 'MCP server for health services research with OMOP/CLIF support, medical ontologies, and hypothesis generation'
    });
    
    this.setupHandlers();
    this.setupTools();
  }
  
  private setupHandlers() {
    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };
    
    // Request logging (optional)
    this.server.onrequest = (request) => {
      console.log(`[MCP Request] ${request.method}`, request.params);
    };
  }
  
  private setupTools() {
    console.log('Setting up MCP tools...');
    
    // Natural Language Query tool (primary interface)
    this.registerTool(new NaturalLanguageQueryTool(this.server, this.schemaDb));
    
    // Knowledge and search tools
    this.registerTool(new MedicalKnowledgeTool(this.server, this.ontologyDb));
    this.registerTool(new MedicalWebSearchTool(this.server, this.schemaDb));
    this.registerTool(new ExternalSearchTool(this.server, this.schemaDb));
    
    // Research tools
    this.registerTool(new HypothesisGeneratorTool(this.server, this.schemaDb));
    this.registerTool(new CohortBuilderTool(this.server, this.schemaDb));
    this.registerTool(new ResearchCodeGeneratorTool(this.server, this.schemaDb));
    this.registerTool(new FigureGeneratorTool(this.server, this.schemaDb));
    this.registerTool(new PhenotypeTool(this.server, this.schemaDb));
    
    // Ontology tools
    this.registerTool(new CodeLookupTool(this.server, this.ontologyDb));
    this.registerTool(new CodeTranslatorTool(this.server, this.ontologyDb));
    
    console.log(`✓ Registered ${this.tools.size} tools`);
  }
  
  private registerTool(tool: any) {
    this.tools.set(tool.name, tool);
  }
  
  private setupResources() {
    console.log('Setting up MCP resources...');
    
    // OMOP CDM documentation
    this.server.addResource({
      uri: 'omop://schema/v5.4',
      mimeType: 'application/json',
      name: 'OMOP CDM v5.4 Schema',
      description: 'Complete OMOP Common Data Model schema with tables, fields, and relationships'
    });
    
    // CLIF documentation
    this.server.addResource({
      uri: 'clif://schema/latest',
      mimeType: 'application/json',
      name: 'CLIF Schema',
      description: 'Common Longitudinal ICU Format schema for real-time ICU data'
    });
    
    // Research templates
    this.server.addResource({
      uri: 'research://templates/phenotypes',
      mimeType: 'application/json',
      name: 'Validated Phenotype Definitions',
      description: 'Library of validated phenotype algorithms for common conditions'
    });
    
    // Study design templates
    this.server.addResource({
      uri: 'research://templates/study-designs',
      mimeType: 'application/json',
      name: 'Study Design Templates',
      description: 'Templates for cohort, case-control, and RCT emulation studies'
    });
    
    // Statistical methods
    this.server.addResource({
      uri: 'research://methods/statistical',
      mimeType: 'application/json',
      name: 'Statistical Methods Guide',
      description: 'Guide to statistical methods for health services research'
    });
    
    // Ontology mappings
    this.server.addResource({
      uri: 'ontology://mappings/cross-system',
      mimeType: 'application/json',
      name: 'Cross-System Code Mappings',
      description: 'Mappings between ICD-10, SNOMED, RxNorm, and LOINC'
    });
    
    console.log('✓ Resources configured');
  }
  
  private setupPrompts() {
    console.log('Setting up MCP prompts...');
    
    // Research hypothesis generation
    this.server.addPrompt({
      name: 'generate_sepsis_study',
      description: 'Generate a complete sepsis outcomes study with hypothesis, cohort, and analysis plan',
      arguments: [
        { 
          name: 'outcome', 
          description: 'Primary outcome of interest (e.g., mortality, readmission)',
          required: true 
        },
        { 
          name: 'population', 
          description: 'Target population (e.g., ICU, elderly)',
          required: false 
        }
      ]
    });
    
    // Cohort extraction
    this.server.addPrompt({
      name: 'extract_icu_cohort',
      description: 'Extract ICU patient cohort with specific clinical criteria',
      arguments: [
        { 
          name: 'condition', 
          description: 'Primary condition (e.g., ARDS, sepsis)',
          required: true 
        },
        { 
          name: 'severity', 
          description: 'Severity criteria (e.g., SOFA > 6)',
          required: false 
        }
      ]
    });
    
    // Comparative effectiveness
    this.server.addPrompt({
      name: 'design_comparative_study',
      description: 'Design a comparative effectiveness study between two treatments',
      arguments: [
        { 
          name: 'treatment1', 
          description: 'First treatment or intervention',
          required: true 
        },
        { 
          name: 'treatment2', 
          description: 'Second treatment or intervention',
          required: true 
        },
        { 
          name: 'outcome', 
          description: 'Primary outcome to compare',
          required: true 
        }
      ]
    });
    
    // Phenotype validation
    this.server.addPrompt({
      name: 'validate_phenotype',
      description: 'Validate a phenotype definition against standard criteria',
      arguments: [
        { 
          name: 'phenotype_name', 
          description: 'Name of the phenotype',
          required: true 
        },
        { 
          name: 'criteria', 
          description: 'Phenotype criteria as JSON',
          required: true 
        }
      ]
    });
    
    console.log('✓ Prompts configured');
  }
  
  async start() {
    console.log('Starting Healthcare Research MCP Server...');
    
    // Verify database connections
    try {
      const ontologyCount = this.ontologyDb.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').get();
      const schemaCount = this.schemaDb.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"').get();
      
      console.log(`✓ Ontology database: ${ontologyCount.count} tables`);
      console.log(`✓ Schema database: ${schemaCount.count} tables`);
    } catch (error) {
      console.error('Database initialization error:', error);
    }
    
    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✓ Healthcare Research MCP Server started');
    console.log(`✓ ${this.tools.size} tools available`);
    console.log('✓ Ready to accept connections');
  }
  
  async stop() {
    console.log('Stopping Healthcare Research MCP Server...');
    
    // Close database connections
    this.ontologyDb.close();
    this.schemaDb.close();
    
    console.log('✓ Server stopped');
  }
  
  // Utility method for direct tool execution (useful for testing)
  async callTool(toolName: string, args: any) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return await tool.execute(args);
  }
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new HealthcareResearchMCPServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  // Start the server
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}