-- Research Database Schema
-- Supports OMOP CDM and CLIF schemas, plus research metadata

-- OMOP CDM table definitions
CREATE TABLE IF NOT EXISTS omop_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL UNIQUE,
    table_type TEXT, -- clinical, vocabulary, derived, etc.
    description TEXT,
    standard_concepts BOOLEAN DEFAULT 0,
    cdm_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OMOP CDM field definitions
CREATE TABLE IF NOT EXISTS omop_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT 0,
    is_primary_key BOOLEAN DEFAULT 0,
    is_foreign_key BOOLEAN DEFAULT 0,
    foreign_table TEXT,
    foreign_field TEXT,
    description TEXT,
    standard_concept_id TEXT,
    value_constraints TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES omop_tables(id),
    INDEX idx_omop_field (table_id, field_name)
);

-- CLIF schema definitions
CREATE TABLE IF NOT EXISTS clif_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL UNIQUE,
    category TEXT, -- vitals, labs, medications, devices
    temporal_resolution TEXT, -- minute, hour, event-based
    description TEXT,
    mimic_equivalent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLIF field definitions
CREATE TABLE IF NOT EXISTS clif_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    units TEXT,
    normal_range_low REAL,
    normal_range_high REAL,
    description TEXT,
    loinc_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES clif_tables(id),
    INDEX idx_clif_field (table_id, field_name)
);

-- Research hypothesis templates
CREATE TABLE IF NOT EXISTS hypothesis_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypothesis_type TEXT NOT NULL,
    template_text TEXT NOT NULL,
    required_variables TEXT, -- JSON array
    statistical_approach TEXT,
    sample_size_formula TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved cohort definitions
CREATE TABLE IF NOT EXISTS cohort_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cohort_name TEXT NOT NULL,
    description TEXT,
    data_model TEXT NOT NULL, -- OMOP or CLIF
    inclusion_criteria TEXT NOT NULL, -- JSON
    exclusion_criteria TEXT, -- JSON
    sql_query TEXT,
    expected_size INTEGER,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis templates
CREATE TABLE IF NOT EXISTS analysis_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    study_type TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    programming_language TEXT NOT NULL,
    code_template TEXT NOT NULL,
    required_packages TEXT, -- JSON array
    output_format TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Figure style specifications
CREATE TABLE IF NOT EXISTS figure_styles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_name TEXT NOT NULL,
    figure_type TEXT NOT NULL,
    style_specifications TEXT NOT NULL, -- JSON
    example_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(journal_name, figure_type)
);

-- Research project metadata
CREATE TABLE IF NOT EXISTS research_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    description TEXT,
    principal_investigator TEXT,
    irb_number TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis execution history
CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    analysis_type TEXT NOT NULL,
    input_parameters TEXT NOT NULL, -- JSON
    output_results TEXT, -- JSON
    execution_time_ms INTEGER,
    status TEXT,
    error_message TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES research_projects(project_id)
);

-- Compliance and audit log
CREATE TABLE IF NOT EXISTS compliance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    data_accessed TEXT, -- JSON
    purpose TEXT,
    hipaa_compliant BOOLEAN DEFAULT 1,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_compliance_user (user_id),
    INDEX idx_compliance_date (created_at)
);