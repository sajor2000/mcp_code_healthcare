import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'database-init.log' })
  ]
});

export class DatabaseInitializer {
  private ontologyDb: Database.Database;
  private researchDb: Database.Database;
  
  constructor(
    private ontologyDbPath: string,
    private researchDbPath: string
  ) {
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const ontologyDir = path.dirname(this.ontologyDbPath);
    const researchDir = path.dirname(this.researchDbPath);
    
    [ontologyDir, researchDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  async initialize(): Promise<void> {
    logger.info('Starting database initialization...');
    
    try {
      // Initialize ontology database
      await this.initializeOntologyDb();
      
      // Initialize research database
      await this.initializeResearchDb();
      
      // Load initial data
      await this.loadInitialData();
      
      logger.info('Database initialization completed successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async initializeOntologyDb(): Promise<void> {
    logger.info('Initializing ontology database...');
    
    this.ontologyDb = new Database(this.ontologyDbPath);
    
    // Enable foreign keys and optimize for read-heavy workload
    this.ontologyDb.pragma('foreign_keys = ON');
    this.ontologyDb.pragma('journal_mode = WAL');
    this.ontologyDb.pragma('synchronous = NORMAL');
    this.ontologyDb.pragma('cache_size = -64000'); // 64MB cache
    
    // Load and execute schema
    const schemaPath = path.join(__dirname, 'schemas', 'ontology-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        this.ontologyDb.prepare(statement).run();
      }
    });
    
    logger.info('Ontology database schema created');
  }

  private async initializeResearchDb(): Promise<void> {
    logger.info('Initializing research database...');
    
    this.researchDb = new Database(this.researchDbPath);
    
    // Enable foreign keys and optimize
    this.researchDb.pragma('foreign_keys = ON');
    this.researchDb.pragma('journal_mode = WAL');
    this.researchDb.pragma('synchronous = NORMAL');
    this.researchDb.pragma('cache_size = -64000');
    
    // Load and execute schema
    const schemaPath = path.join(__dirname, 'schemas', 'research-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        this.researchDb.prepare(statement).run();
      }
    });
    
    logger.info('Research database schema created');
  }

  private async loadInitialData(): Promise<void> {
    logger.info('Loading initial data...');
    
    // Insert code systems
    const insertCodeSystem = this.ontologyDb.prepare(`
      INSERT OR IGNORE INTO code_systems (system_name, version, description, url)
      VALUES (?, ?, ?, ?)
    `);
    
    const codeSystems = [
      ['ICD-10-CM', '2024', 'International Classification of Diseases, 10th Revision, Clinical Modification', 'https://www.cms.gov/'],
      ['SNOMED CT', '2024-03', 'Systematized Nomenclature of Medicine Clinical Terms', 'https://www.snomed.org/'],
      ['RxNorm', '2024-03', 'Normalized naming system for medications', 'https://www.nlm.nih.gov/research/umls/rxnorm/'],
      ['LOINC', '2.76', 'Logical Observation Identifiers Names and Codes', 'https://loinc.org/']
    ];
    
    codeSystems.forEach(system => insertCodeSystem.run(...system));
    
    // Insert hypothesis templates
    const insertTemplate = this.researchDb.prepare(`
      INSERT OR IGNORE INTO hypothesis_templates (hypothesis_type, template_text, statistical_approach)
      VALUES (?, ?, ?)
    `);
    
    const templates = [
      [
        'association',
        'Association between {exposure} and {outcome} in patients with {condition}',
        'Cox proportional hazards regression'
      ],
      [
        'prediction',
        'Predicting {outcome} using {predictors} in {population}',
        'Machine learning models (XGBoost, Random Forest)'
      ],
      [
        'comparative_effectiveness',
        'Comparing {intervention1} vs {intervention2} for {outcome} in {condition}',
        'Propensity score matching'
      ]
    ];
    
    templates.forEach(template => insertTemplate.run(...template));
    
    // Insert figure styles
    const insertStyle = this.researchDb.prepare(`
      INSERT OR IGNORE INTO figure_styles (journal_name, figure_type, style_specifications)
      VALUES (?, ?, ?)
    `);
    
    const styles = [
      [
        'NEJM',
        'kaplan_meier',
        JSON.stringify({
          fonts: { family: 'Helvetica Neue', size: { axis: 10, title: 12 } },
          colors: { primary: '#0066CC', secondary: '#DC3545' },
          grid: { show: true, style: 'dotted' }
        })
      ],
      [
        'JAMA',
        'forest_plot',
        JSON.stringify({
          fonts: { family: 'Arial', size: { axis: 9, title: 11 } },
          colors: { primary: '#000000', ci: '#666666' },
          symbols: { size: 8, shape: 'square' }
        })
      ]
    ];
    
    styles.forEach(style => insertStyle.run(...style));
    
    logger.info('Initial data loaded successfully');
  }

  async migrate(fromVersion: string, toVersion: string): Promise<void> {
    logger.info(`Migrating database from ${fromVersion} to ${toVersion}`);
    
    // Migration logic here
    // This would be expanded with actual migration scripts
    
    logger.info('Migration completed');
  }

  close(): void {
    if (this.ontologyDb) {
      this.ontologyDb.close();
    }
    if (this.researchDb) {
      this.researchDb.close();
    }
    logger.info('Database connections closed');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const ontologyDbPath = process.env.ONTOLOGY_DB_PATH || 
    path.join(process.cwd(), 'data', 'processed', 'medical-ontology.db');
  const researchDbPath = process.env.RESEARCH_DB_PATH || 
    path.join(process.cwd(), 'data', 'processed', 'research-schemas.db');
  
  const initializer = new DatabaseInitializer(ontologyDbPath, researchDbPath);
  
  initializer.initialize()
    .then(() => {
      logger.info('Database initialization completed');
      initializer.close();
      process.exit(0);
    })
    .catch(error => {
      logger.error('Database initialization failed:', error);
      initializer.close();
      process.exit(1);
    });
}