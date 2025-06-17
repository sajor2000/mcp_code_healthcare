#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ontologyDbPath = process.env.ONTOLOGY_DB_PATH || 
  path.join(__dirname, '../data/databases/ontology.db');
const researchDbPath = process.env.RESEARCH_DB_PATH || 
  path.join(__dirname, '../data/databases/research.db');

console.log('Initializing databases...\n');
console.log(`Ontology DB: ${ontologyDbPath}`);
console.log(`Research DB: ${researchDbPath}\n`);

// Initialize Ontology Database
const ontologyDb = new Database(ontologyDbPath);

ontologyDb.exec(`
  -- ICD-10 Codes
  CREATE TABLE IF NOT EXISTS icd10 (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT,
    parent_code TEXT
  );

  -- SNOMED CT
  CREATE TABLE IF NOT EXISTS snomed (
    concept_id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    semantic_type TEXT,
    is_active INTEGER DEFAULT 1
  );

  -- RxNorm
  CREATE TABLE IF NOT EXISTS rxnorm (
    rxcui TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tty TEXT,
    drug_class TEXT
  );

  -- LOINC
  CREATE TABLE IF NOT EXISTS loinc (
    loinc_num TEXT PRIMARY KEY,
    long_name TEXT NOT NULL,
    short_name TEXT,
    component TEXT,
    property TEXT,
    time_aspect TEXT,
    system TEXT,
    scale_type TEXT
  );

  -- Cross-mappings
  CREATE TABLE IF NOT EXISTS code_mappings (
    source_system TEXT,
    source_code TEXT,
    target_system TEXT,
    target_code TEXT,
    mapping_type TEXT,
    PRIMARY KEY (source_system, source_code, target_system, target_code)
  );
`);

// Add some sample data
ontologyDb.prepare(`
  INSERT OR IGNORE INTO icd10 (code, description, category) VALUES 
  ('A41.9', 'Sepsis, unspecified', 'Infectious diseases'),
  ('E11', 'Type 2 diabetes mellitus', 'Endocrine'),
  ('I10', 'Essential (primary) hypertension', 'Circulatory'),
  ('J44.0', 'COPD with acute lower respiratory infection', 'Respiratory')
`).run();

ontologyDb.prepare(`
  INSERT OR IGNORE INTO rxnorm (rxcui, name, drug_class) VALUES 
  ('11124', 'Vancomycin', 'Glycopeptide antibiotic'),
  ('6809', 'Metformin', 'Biguanide'),
  ('1998', 'Lisinopril', 'ACE inhibitor'),
  ('197381', 'Atorvastatin', 'Statin')
`).run();

console.log('✓ Ontology database initialized');
ontologyDb.close();

// Initialize Research Database
const researchDb = new Database(researchDbPath);

researchDb.exec(`
  -- Study templates
  CREATE TABLE IF NOT EXISTS study_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    template_json TEXT
  );

  -- Phenotype definitions
  CREATE TABLE IF NOT EXISTS phenotypes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    criteria_json TEXT,
    validated INTEGER DEFAULT 0
  );

  -- Analysis templates
  CREATE TABLE IF NOT EXISTS analysis_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    analysis_type TEXT,
    language TEXT,
    code_template TEXT
  );
`);

console.log('✓ Research database initialized');
researchDb.close();

console.log('\n✅ All databases initialized successfully!');