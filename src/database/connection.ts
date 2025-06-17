import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

export interface DatabaseConfig {
  ontologyDbPath?: string;
  researchDbPath?: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private ontologyDb: Database.Database | null = null;
  private researchDb: Database.Database | null = null;
  private config: DatabaseConfig;

  private constructor(config: DatabaseConfig = {}) {
    this.config = {
      ontologyDbPath: config.ontologyDbPath || 
        path.join(process.cwd(), 'data', 'processed', 'medical-ontology.db'),
      researchDbPath: config.researchDbPath || 
        path.join(process.cwd(), 'data', 'processed', 'research-schemas.db'),
      readonly: config.readonly ?? true,
      timeout: config.timeout ?? 5000,
      verbose: config.verbose ?? false
    };
  }

  static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  getOntologyDb(): Database.Database {
    if (!this.ontologyDb) {
      try {
        this.ontologyDb = new Database(this.config.ontologyDbPath!, {
          readonly: this.config.readonly,
          timeout: this.config.timeout,
          verbose: this.config.verbose ? logger.debug : undefined
        });

        // Configure for optimal performance
        this.ontologyDb.pragma('journal_mode = WAL');
        this.ontologyDb.pragma('synchronous = NORMAL');
        this.ontologyDb.pragma('cache_size = -64000'); // 64MB
        this.ontologyDb.pragma('mmap_size = 268435456'); // 256MB
        
        logger.info('Ontology database connected', {
          path: this.config.ontologyDbPath,
          readonly: this.config.readonly
        });
      } catch (error) {
        throw new DatabaseError(`Failed to connect to ontology database: ${error.message}`);
      }
    }
    return this.ontologyDb;
  }

  getResearchDb(): Database.Database {
    if (!this.researchDb) {
      try {
        this.researchDb = new Database(this.config.researchDbPath!, {
          readonly: this.config.readonly,
          timeout: this.config.timeout,
          verbose: this.config.verbose ? logger.debug : undefined
        });

        // Configure for optimal performance
        this.researchDb.pragma('journal_mode = WAL');
        this.researchDb.pragma('synchronous = NORMAL');
        this.researchDb.pragma('cache_size = -64000');
        this.researchDb.pragma('mmap_size = 268435456');
        
        logger.info('Research database connected', {
          path: this.config.researchDbPath,
          readonly: this.config.readonly
        });
      } catch (error) {
        throw new DatabaseError(`Failed to connect to research database: ${error.message}`);
      }
    }
    return this.researchDb;
  }

  close(): void {
    if (this.ontologyDb) {
      this.ontologyDb.close();
      this.ontologyDb = null;
      logger.info('Ontology database connection closed');
    }
    if (this.researchDb) {
      this.researchDb.close();
      this.researchDb = null;
      logger.info('Research database connection closed');
    }
  }

  // Utility methods for common operations
  async transaction<T>(
    db: 'ontology' | 'research',
    callback: (db: Database.Database) => T
  ): Promise<T> {
    const database = db === 'ontology' ? this.getOntologyDb() : this.getResearchDb();
    
    try {
      const result = database.transaction(callback)(database);
      return result;
    } catch (error) {
      logger.error(`Transaction failed on ${db} database`, { error: error.message });
      throw new DatabaseError(`Transaction failed: ${error.message}`);
    }
  }

  // Prepared statement cache
  private preparedStatements = new Map<string, Database.Statement>();

  prepare(db: 'ontology' | 'research', sql: string): Database.Statement {
    const key = `${db}:${sql}`;
    
    if (!this.preparedStatements.has(key)) {
      const database = db === 'ontology' ? this.getOntologyDb() : this.getResearchDb();
      const statement = database.prepare(sql);
      this.preparedStatements.set(key, statement);
    }
    
    return this.preparedStatements.get(key)!;
  }

  // Health check
  async healthCheck(): Promise<{ ontology: boolean; research: boolean }> {
    const results = {
      ontology: false,
      research: false
    };

    try {
      const ontologyDb = this.getOntologyDb();
      ontologyDb.prepare('SELECT 1').get();
      results.ontology = true;
    } catch (error) {
      logger.error('Ontology database health check failed', { error: error.message });
    }

    try {
      const researchDb = this.getResearchDb();
      researchDb.prepare('SELECT 1').get();
      results.research = true;
    } catch (error) {
      logger.error('Research database health check failed', { error: error.message });
    }

    return results;
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();