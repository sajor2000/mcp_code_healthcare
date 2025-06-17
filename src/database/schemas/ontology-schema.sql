-- Medical Ontology Database Schema
-- Supports ICD-10, SNOMED CT, RxNorm, and LOINC

-- Core code systems table
CREATE TABLE IF NOT EXISTS code_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    release_date DATE,
    description TEXT,
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ICD-10 codes
CREATE TABLE IF NOT EXISTS icd10_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    long_description TEXT,
    category_code TEXT,
    category_title TEXT,
    chapter_code TEXT,
    chapter_title TEXT,
    valid_for_coding BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_icd10_code (code),
    INDEX idx_icd10_category (category_code)
);

-- SNOMED CT concepts
CREATE TABLE IF NOT EXISTS snomed_concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_id TEXT NOT NULL UNIQUE,
    fully_specified_name TEXT NOT NULL,
    preferred_term TEXT,
    semantic_tag TEXT,
    definition_status TEXT,
    module_id TEXT,
    effective_date DATE,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_snomed_concept (concept_id),
    INDEX idx_snomed_term (preferred_term)
);

-- RxNorm concepts
CREATE TABLE IF NOT EXISTS rxnorm_concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rxcui TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    synonym TEXT,
    tty TEXT, -- Term type (IN, BN, SCD, etc.)
    language TEXT DEFAULT 'ENG',
    suppress TEXT,
    umlscui TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rxnorm_rxcui (rxcui),
    INDEX idx_rxnorm_name (name)
);

-- LOINC codes
CREATE TABLE IF NOT EXISTS loinc_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loinc_num TEXT NOT NULL UNIQUE,
    component TEXT,
    property TEXT,
    time_aspect TEXT,
    system TEXT,
    scale_type TEXT,
    method_type TEXT,
    class TEXT,
    long_common_name TEXT,
    short_name TEXT,
    example_units TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loinc_num (loinc_num),
    INDEX idx_loinc_class (class)
);

-- Cross-mappings between code systems
CREATE TABLE IF NOT EXISTS code_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_system TEXT NOT NULL,
    source_code TEXT NOT NULL,
    target_system TEXT NOT NULL,
    target_code TEXT NOT NULL,
    mapping_type TEXT, -- exact, narrow, broad, related
    confidence_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mapping_source (source_system, source_code),
    INDEX idx_mapping_target (target_system, target_code)
);

-- Relationships between concepts (hierarchies, etc.)
CREATE TABLE IF NOT EXISTS concept_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system TEXT NOT NULL,
    source_code TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- is-a, part-of, etc.
    target_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rel_source (system, source_code),
    INDEX idx_rel_target (system, target_code)
);

-- Search index for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS concept_search USING fts5(
    system,
    code,
    display_name,
    synonyms,
    description
);

-- Audit log for data updates
CREATE TABLE IF NOT EXISTS ontology_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id TEXT,
    changed_data TEXT,
    user_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);