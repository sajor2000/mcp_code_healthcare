#!/usr/bin/env node

import { DatabaseInitializer } from '../src/database/init-db.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'init';

const ontologyDbPath = process.env.ONTOLOGY_DB_PATH || 
  path.join(process.cwd(), 'data', 'processed', 'medical-ontology.db');
const researchDbPath = process.env.RESEARCH_DB_PATH || 
  path.join(process.cwd(), 'data', 'processed', 'research-schemas.db');

console.log('Database Initialization Script');
console.log('=============================');
console.log(`Command: ${command}`);
console.log(`Ontology DB: ${ontologyDbPath}`);
console.log(`Research DB: ${researchDbPath}`);
console.log('');

const initializer = new DatabaseInitializer(ontologyDbPath, researchDbPath);

async function main() {
  try {
    switch (command) {
      case 'init':
        console.log('Initializing databases...');
        await initializer.initialize();
        console.log('✓ Databases initialized successfully');
        break;
        
      case 'migrate':
        const fromVersion = args[1];
        const toVersion = args[2];
        if (!fromVersion || !toVersion) {
          console.error('Usage: npm run init-db migrate <from-version> <to-version>');
          process.exit(1);
        }
        console.log(`Migrating from ${fromVersion} to ${toVersion}...`);
        await initializer.migrate(fromVersion, toVersion);
        console.log('✓ Migration completed');
        break;
        
      case 'check':
        console.log('Checking database status...');
        // Simple check - try to open and query
        const { Database } = require('better-sqlite3');
        
        try {
          const ontologyDb = new Database(ontologyDbPath, { readonly: true });
          const ontologyTables = ontologyDb.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
          ).all();
          console.log(`✓ Ontology database: ${ontologyTables.length} tables`);
          ontologyDb.close();
        } catch (error) {
          console.error(`✗ Ontology database error: ${error.message}`);
        }
        
        try {
          const researchDb = new Database(researchDbPath, { readonly: true });
          const researchTables = researchDb.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
          ).all();
          console.log(`✓ Research database: ${researchTables.length} tables`);
          researchDb.close();
        } catch (error) {
          console.error(`✗ Research database error: ${error.message}`);
        }
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Available commands: init, migrate, check');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    initializer.close();
  }
}

main();