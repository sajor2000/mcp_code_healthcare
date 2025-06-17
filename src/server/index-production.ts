import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from 'better-sqlite3';
import { HypothesisGeneratorTool } from '../tools/research/hypothesis-generator.js';
import { CohortBuilderTool } from '../tools/research/cohort-builder.js';
import { ResearchCodeGeneratorTool } from '../tools/research/code-generator.js';
import { FigureGeneratorTool } from '../tools/research/figure-generator.js';
import { ExecuteAnalysisTool } from '../tools/research/execute-analysis.js';
import { ManuscriptGeneratorTool } from '../tools/research/manuscript-generator.js';
import { ComplianceGuard, createComplianceMiddleware } from '../middleware/compliance-guard.js';
import { DatabaseConnection } from '../database/connection.js';
import { logger, createModuleLogger, logToolExecution, PerformanceLogger } from '../utils/logger.js';
import { MCPError, ErrorHandler, ToolExecutionError } from '../utils/errors.js';
import { Validator, toolSchemas } from '../utils/validation.js';
import { analysisCache } from '../utils/cache.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverLogger = createModuleLogger('server');

interface ServerConfig {
  ontologyDbPath?: string;
  researchDbPath?: string;
  auditDbPath?: string;
  name?: string;
  version?: string;
  hipaaCompliant?: boolean;
  cacheEnabled?: boolean;
}

export class HealthcareResearchMCPServer {
  private server: Server;
  private db: DatabaseConnection;
  private auditDb: Database.Database | null = null;
  private complianceGuard: ComplianceGuard | null = null;
  private tools: Map<string, any> = new Map();
  private config: ServerConfig;
  private isRunning = false;

  constructor(config: ServerConfig = {}) {
    this.config = {
      name: config.name || 'healthcare-research-mcp',
      version: config.version || '1.0.0',
      hipaaCompliant: config.hipaaCompliant ?? true,
      cacheEnabled: config.cacheEnabled ?? true,
      ...config
    };

    // Initialize database connection
    this.db = DatabaseConnection.getInstance({
      ontologyDbPath: config.ontologyDbPath,
      researchDbPath: config.researchDbPath,
      readonly: true
    });

    // Initialize audit database if HIPAA compliant
    if (this.config.hipaaCompliant) {
      this.initializeAuditDb();
    }

    // Initialize MCP server with proper configuration
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupErrorHandling();
    this.setupTools();
    this.setupResources();
    
    serverLogger.info('Server initialized', {
      name: this.config.name,
      version: this.config.version,
      hipaaCompliant: this.config.hipaaCompliant
    });
  }

  private initializeAuditDb() {
    const auditPath = this.config.auditDbPath || 
      path.join(process.cwd(), 'data', 'audit', 'compliance.db');
    
    try {
      this.auditDb = new Database(auditPath);
      this.auditDb.pragma('journal_mode = WAL');
      
      this.complianceGuard = new ComplianceGuard(
        {
          hipaaCompliant: true,
          allowRowLevelData: false,
          deIdentificationLevel: 'safe-harbor',
          auditLevel: 'detailed',
          dataRetentionDays: 365
        },
        this.auditDb
      );
      
      serverLogger.info('Audit database initialized', { path: auditPath });
    } catch (error) {
      serverLogger.error('Failed to initialize audit database', { error: error.message });
      throw new MCPError('Audit database initialization failed', 'INIT_ERROR', 500);
    }
  }

  private setupErrorHandling() {
    // Global error handlers
    process.on('uncaughtException', (error) => {
      serverLogger.error('Uncaught exception', { 
        error: error.message, 
        stack: error.stack 
      });
      
      if (!ErrorHandler.isOperationalError(error)) {
        this.shutdown(1);
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      serverLogger.error('Unhandled rejection', { 
        reason: reason instanceof Error ? reason.message : reason,
        promise 
      });
    });

    // Server error handler
    this.server.onerror = (error) => {
      serverLogger.error('MCP server error', { 
        error: error.message,
        code: error.code 
      });
    };
  }

  private setupTools() {
    const perf = new PerformanceLogger('tool-setup');
    
    try {
      const ontologyDb = this.db.getOntologyDb();
      const researchDb = this.db.getResearchDb();

      // Initialize tools with error handling
      const toolClasses = [
        { Class: HypothesisGeneratorTool, db: researchDb },
        { Class: CohortBuilderTool, db: researchDb },
        { Class: ResearchCodeGeneratorTool, db: researchDb },
        { Class: FigureGeneratorTool, db: researchDb },
        { Class: ExecuteAnalysisTool, db: researchDb },
        { Class: ManuscriptGeneratorTool, db: researchDb }
      ];

      for (const { Class, db } of toolClasses) {
        try {
          const tool = new Class(this.server, db);
          this.tools.set(tool.name, tool);
          
          // Wrap tool execution with error handling and caching
          this.wrapToolExecution(tool);
          
          serverLogger.info('Tool registered', { 
            name: tool.name,
            description: tool.description 
          });
        } catch (error) {
          serverLogger.error('Failed to register tool', { 
            tool: Class.name,
            error: error.message 
          });
        }
      }

      perf.end({ toolCount: this.tools.size });
    } catch (error) {
      perf.end({ success: false });
      throw new MCPError('Tool setup failed', 'INIT_ERROR', 500);
    }
  }

  private wrapToolExecution(tool: any) {
    const originalExecute = tool.execute.bind(tool);
    
    tool.execute = async (args: any) => {
      const startTime = Date.now();
      const executionId = `${tool.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Validate input
        const validationSchema = toolSchemas[tool.name];
        if (validationSchema) {
          args = Validator.validate(validationSchema, args);
        }

        // Check cache if enabled
        if (this.config.cacheEnabled && tool.cacheable) {
          const cacheKey = analysisCache.getAnalysisKey(tool.name, args);
          const cached = analysisCache.get(cacheKey);
          if (cached) {
            serverLogger.debug('Cache hit for tool execution', { 
              tool: tool.name,
              executionId 
            });
            return cached;
          }
        }

        // Apply compliance checks if enabled
        if (this.config.hipaaCompliant && this.complianceGuard) {
          const accessRequest = {
            userId: 'system', // Would come from auth context
            toolName: tool.name,
            requestId: executionId,
            timestamp: new Date(),
            dataRequested: this.extractDataRequested(tool.name, args),
            purpose: 'research_analysis'
          };

          const decision = await this.complianceGuard.evaluateRequest(accessRequest);
          if (!decision.allowed) {
            throw new MCPError(
              `Compliance check failed: ${decision.reason}`,
              'COMPLIANCE_ERROR',
              403
            );
          }

          // Apply modifications if needed
          if (decision.modifications) {
            args = this.applyComplianceModifications(args, decision.modifications);
          }
        }

        // Execute tool
        const result = await originalExecute(args);
        
        // Log execution
        const duration = Date.now() - startTime;
        logToolExecution(tool.name, args, result, duration);

        // Cache result if applicable
        if (this.config.cacheEnabled && tool.cacheable && result) {
          const cacheKey = analysisCache.getAnalysisKey(tool.name, args);
          analysisCache.set(cacheKey, result, tool.cacheTTL || 3600);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logToolExecution(tool.name, args, null, duration);
        
        if (error instanceof MCPError) {
          throw error;
        } else {
          throw new ToolExecutionError(tool.name, error.message, error);
        }
      }
    };
  }

  private extractDataRequested(toolName: string, args: any): any {
    // Extract data access requirements based on tool and arguments
    const dataRequested = {
      tables: [],
      fields: [],
      filters: {},
      rowLevel: false
    };

    // Tool-specific extraction logic
    switch (toolName) {
      case 'build_cohort':
        dataRequested.tables = args.data_model === 'OMOP' 
          ? ['person', 'condition_occurrence', 'drug_exposure']
          : ['patients', 'admissions', 'medications'];
        dataRequested.rowLevel = true;
        break;
      
      case 'execute_analysis':
        dataRequested.rowLevel = !args.hipaa_compliant;
        break;
    }

    return dataRequested;
  }

  private applyComplianceModifications(args: any, modifications: any): any {
    const modified = { ...args };
    
    if (modifications.aggregateOnly) {
      modified.aggregate_results = true;
      modified.include_patient_ids = false;
    }
    
    if (modifications.limitFields) {
      modified.allowed_fields = modifications.limitFields;
    }
    
    return modified;
  }

  private setupResources() {
    // Define available resources
    const resources = [
      {
        uri: 'healthcare://schemas/omop-cdm-v5.4',
        name: 'OMOP CDM v5.4 Schema',
        description: 'Complete OMOP Common Data Model schema documentation',
        mimeType: 'application/json'
      },
      {
        uri: 'healthcare://schemas/clif-latest',
        name: 'CLIF Schema',
        description: 'Common Longitudinal ICU Format schema',
        mimeType: 'application/json'
      },
      {
        uri: 'healthcare://templates/hypothesis',
        name: 'Hypothesis Templates',
        description: 'Research hypothesis generation templates',
        mimeType: 'application/json'
      },
      {
        uri: 'healthcare://guides/statistical-methods',
        name: 'Statistical Methods Guide',
        description: 'Guide to statistical methods for health services research',
        mimeType: 'text/markdown'
      }
    ];

    resources.forEach(resource => {
      try {
        this.server.setResourceHandler(resource.uri, async () => {
          // This would fetch actual resource content
          return {
            contents: [{
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: `Resource content for ${resource.name}`
            }]
          };
        });
        
        serverLogger.debug('Resource registered', { uri: resource.uri });
      } catch (error) {
        serverLogger.error('Failed to register resource', { 
          uri: resource.uri,
          error: error.message 
        });
      }
    });
  }

  async start() {
    if (this.isRunning) {
      throw new MCPError('Server is already running', 'STATE_ERROR', 400);
    }

    const perf = new PerformanceLogger('server-start');
    
    try {
      // Verify database connections
      const health = await this.db.healthCheck();
      if (!health.ontology || !health.research) {
        throw new MCPError('Database health check failed', 'DB_ERROR', 500);
      }

      // Create transport and connect
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isRunning = true;
      
      perf.end({ success: true });
      serverLogger.info('Server started successfully', {
        tools: Array.from(this.tools.keys()),
        hipaaCompliant: this.config.hipaaCompliant,
        cacheEnabled: this.config.cacheEnabled
      });
    } catch (error) {
      perf.end({ success: false });
      serverLogger.error('Failed to start server', { error: error.message });
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    serverLogger.info('Shutting down server...');
    
    try {
      // Close server connection
      await this.server.close();
      
      // Close database connections
      this.db.close();
      
      if (this.auditDb) {
        this.auditDb.close();
      }
      
      // Clear caches
      analysisCache.flushAll();
      
      this.isRunning = false;
      serverLogger.info('Server shutdown complete');
    } catch (error) {
      serverLogger.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }

  private async shutdown(exitCode: number = 0) {
    try {
      await this.stop();
    } catch (error) {
      serverLogger.error('Forced shutdown due to error', { error: error.message });
    } finally {
      process.exit(exitCode);
    }
  }

  // Public methods for testing
  getServer(): Server {
    return this.server;
  }

  getTools(): Map<string, any> {
    return this.tools;
  }

  isHealthy(): boolean {
    return this.isRunning;
  }
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new HealthcareResearchMCPServer({
    hipaaCompliant: process.env.HIPAA_COMPLIANT !== 'false',
    cacheEnabled: process.env.CACHE_ENABLED !== 'false'
  });

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    serverLogger.info(`Received ${signal}, shutting down gracefully...`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start server
  server.start().catch((error) => {
    serverLogger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
}