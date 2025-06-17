import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HealthcareResearchMCPServer } from '../../src/server/index-production.js';
import { db } from '../../src/database/connection.js';
import { MedicalNLP } from '../../src/nlp/medical-nlp.js';
import { EnhancedContextBuilder } from '../../src/utils/context-builder-enhanced.js';
import { CodeGenerator } from '../../src/tools/code-generator.js';
import { FigureRenderer } from '../../src/visualization/figure-renderer.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Healthcare Research MCP Pipeline Integration', () => {
  let server: HealthcareResearchMCPServer;
  
  beforeAll(async () => {
    // Initialize server
    server = new HealthcareResearchMCPServer();
    
    // Ensure test databases exist
    const testDataDir = path.join(process.cwd(), 'test-data');
    await fs.mkdir(testDataDir, { recursive: true });
    
    // Initialize test databases
    process.env.ONTOLOGY_DB_PATH = path.join(testDataDir, 'test-ontology.db');
    process.env.RESEARCH_DB_PATH = path.join(testDataDir, 'test-research.db');
    
    // Initialize connections
    await db.initialize();
    
    // Load test data
    await loadTestOntologyData();
  });
  
  afterAll(async () => {
    // Cleanup
    await db.close();
    const testDataDir = path.join(process.cwd(), 'test-data');
    await fs.rm(testDataDir, { recursive: true, force: true });
  });
  
  describe('Natural Language Processing', () => {
    it('should parse a complex medical query', async () => {
      const query = 'Compare 30-day readmission rates between patients with heart failure taking metoprolol versus carvedilol, adjusting for age, sex, and baseline ejection fraction';
      
      const parsed = await MedicalNLP.parseQuery(query);
      
      expect(parsed.intent).toBe('comparison');
      expect(parsed.entities).toHaveLength(3); // heart failure, metoprolol, carvedilol
      expect(parsed.entities.some(e => e.text.includes('heart failure') && e.type === 'condition')).toBe(true);
      expect(parsed.entities.some(e => e.text === 'metoprolol' && e.type === 'medication')).toBe(true);
      expect(parsed.entities.some(e => e.text === 'carvedilol' && e.type === 'medication')).toBe(true);
      expect(parsed.temporalConstraints?.relative).toBe('30 days');
      expect(parsed.statisticalRequirements?.adjustFor).toContain('age');
      expect(parsed.statisticalRequirements?.adjustFor).toContain('sex');
    });
    
    it('should extract medical codes from entities', async () => {
      const query = 'Patients with diabetes mellitus type 2 on metformin';
      const parsed = await MedicalNLP.parseQuery(query);
      
      const diabetesEntity = parsed.entities.find(e => e.text.includes('diabetes'));
      expect(diabetesEntity).toBeDefined();
      expect(diabetesEntity?.codes).toBeDefined();
      expect(diabetesEntity?.codes?.some(c => c.system === 'ICD-10')).toBe(true);
    });
    
    it('should handle negation correctly', async () => {
      const query = 'Patients with hypertension but no diabetes';
      const parsed = await MedicalNLP.parseQuery(query);
      
      const diabetesEntity = parsed.entities.find(e => e.text.includes('diabetes'));
      expect(diabetesEntity?.negated).toBe(true);
    });
  });
  
  describe('Context Building', () => {
    it('should build complete analysis specification from natural language', async () => {
      const query = 'Compare mortality rates between ICU patients with sepsis treated with early versus late antibiotics within 48 hours of admission';
      
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      
      expect(spec.study_question).toBe(query);
      expect(spec.data_model).toBe('CLIF'); // ICU context
      expect(spec.outcomes).toContain('mortality');
      expect(spec.predictors).toContain('treatment_group');
      expect(spec.analysis_plan).toHaveLength(4); // descriptive, kaplan-meier, cox, propensity
      expect(spec.cohort_definition.index_event).toContain('sepsis');
      expect(spec.inclusion_criteria.some(c => c.type === 'condition')).toBe(true);
    });
    
    it('should generate appropriate analysis plan based on intent', async () => {
      const queries = [
        {
          query: 'Predict 90-day readmission risk in heart failure patients',
          expectedAnalysis: ['machine_learning', 'calibration_analysis']
        },
        {
          query: 'Association between smoking and lung cancer',
          expectedAnalysis: ['logistic_regression']
        },
        {
          query: 'Temporal trends in diabetes prevalence over 10 years',
          expectedAnalysis: ['time_series_analysis']
        }
      ];
      
      for (const test of queries) {
        const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(test.query);
        
        for (const expectedType of test.expectedAnalysis) {
          expect(spec.analysis_plan.some(step => step.type === expectedType)).toBe(true);
        }
      }
    });
  });
  
  describe('Code Generation', () => {
    it('should generate valid R code for survival analysis', async () => {
      const query = 'Compare survival between treatment groups in cancer patients';
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      
      const codeResult = await CodeGenerator.generateResearchCode({
        query,
        analysis_spec: spec,
        language: 'R',
        framework: 'tidyverse'
      });
      
      expect(codeResult.code).toContain('library(survival)');
      expect(codeResult.code).toContain('survfit');
      expect(codeResult.code).toContain('coxph');
      expect(codeResult.analysis_steps).toContain('kaplan_meier');
    });
    
    it('should generate valid Python code for machine learning', async () => {
      const query = 'Predict readmission risk using patient demographics and lab values';
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      
      const codeResult = await CodeGenerator.generateResearchCode({
        query,
        analysis_spec: spec,
        language: 'Python',
        framework: 'scikit-learn'
      });
      
      expect(codeResult.code).toContain('import pandas as pd');
      expect(codeResult.code).toContain('from sklearn');
      expect(codeResult.code).toContain('train_test_split');
      expect(codeResult.code).toContain('cross_val_score');
    });
    
    it('should include data validation and error handling', async () => {
      const query = 'Analyze medication effectiveness';
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      
      const codeResult = await CodeGenerator.generateResearchCode({
        query,
        analysis_spec: spec,
        language: 'R'
      });
      
      expect(codeResult.code).toContain('# Check for missing data');
      expect(codeResult.code).toContain('# Validate cohort size');
      expect(codeResult.code).toContain('tryCatch');
    });
  });
  
  describe('Figure Generation', () => {
    it('should render Kaplan-Meier curve with NEJM style', async () => {
      const figureConfig = {
        type: 'kaplan_meier',
        data: {
          timePoints: [0, 30, 60, 90, 120, 150, 180],
          groups: [
            {
              name: 'Treatment A',
              survival: [1.0, 0.95, 0.90, 0.85, 0.82, 0.80, 0.78],
              ci_lower: [1.0, 0.92, 0.86, 0.80, 0.76, 0.73, 0.70],
              ci_upper: [1.0, 0.98, 0.94, 0.90, 0.88, 0.87, 0.86],
              censored: [0, 2, 1, 3, 2, 1, 0]
            },
            {
              name: 'Treatment B',
              survival: [1.0, 0.92, 0.85, 0.78, 0.72, 0.68, 0.65],
              ci_lower: [1.0, 0.88, 0.80, 0.72, 0.65, 0.60, 0.56],
              ci_upper: [1.0, 0.96, 0.90, 0.84, 0.79, 0.76, 0.74],
              censored: [0, 1, 2, 2, 3, 2, 1]
            }
          ],
          pValue: 0.023
        },
        style: FigureRenderer['JOURNAL_STYLES']['NEJM'],
        title: 'Overall Survival by Treatment Group',
        xLabel: 'Time (days)',
        yLabel: 'Survival Probability'
      };
      
      const result = await FigureRenderer.render(figureConfig);
      
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('Treatment A');
      expect(result.svg).toContain('Treatment B');
      expect(result.svg).toContain('p = 0.023');
      expect(result.metadata.type).toBe('kaplan_meier');
      expect(result.metadata.style).toBe('New England Journal of Medicine');
    });
    
    it('should render forest plot for meta-analysis', async () => {
      const figureConfig = {
        type: 'forest_plot',
        data: {
          studies: [
            { name: 'Study A', effect: 0.85, ci_lower: 0.70, ci_upper: 1.03, weight: 25 },
            { name: 'Study B', effect: 0.92, ci_lower: 0.78, ci_upper: 1.08, weight: 30 },
            { name: 'Study C', effect: 0.78, ci_lower: 0.65, ci_upper: 0.94, weight: 20 },
            { name: 'Study D', effect: 0.88, ci_lower: 0.72, ci_upper: 1.07, weight: 25 }
          ],
          overall: { effect: 0.86, ci_lower: 0.78, ci_upper: 0.95 }
        },
        style: FigureRenderer['JOURNAL_STYLES']['JAMA'],
        title: 'Treatment Effect Across Studies'
      };
      
      const result = await FigureRenderer.render(figureConfig);
      
      expect(result.svg).toContain('Study A');
      expect(result.svg).toContain('Overall');
      expect(result.svg).toContain('0.86');
    });
    
    it('should export figure as React component', async () => {
      const figureConfig = {
        type: 'scatter_plot',
        data: {
          points: [
            { x: 1, y: 2, group: 'Control' },
            { x: 2, y: 4, group: 'Treatment' },
            { x: 3, y: 5, group: 'Control' },
            { x: 4, y: 7, group: 'Treatment' }
          ],
          regression: {
            line: [{ x: 0, y: 0.5 }, { x: 5, y: 8.5 }],
            r2: 0.95
          }
        },
        style: FigureRenderer['JOURNAL_STYLES']['Generic']
      };
      
      const result = await FigureRenderer.render(figureConfig);
      const reactComponent = await FigureRenderer.exportAsReactComponent(result.svg, 'ScatterPlot');
      
      expect(reactComponent).toContain('import React from');
      expect(reactComponent).toContain('const ScatterPlot');
      expect(reactComponent).toContain('export default ScatterPlot');
      expect(reactComponent).toContain('style={{');
    });
  });
  
  describe('End-to-End Pipeline', () => {
    it('should process a complete research query from natural language to code', async () => {
      const query = 'Compare 30-day mortality between elderly patients (age > 65) with pneumonia treated with azithromycin versus levofloxacin, stratified by severity';
      
      // Step 1: Parse query
      const parsed = await MedicalNLP.parseQuery(query);
      expect(parsed.intent).toBe('comparison');
      
      // Step 2: Build analysis specification
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      expect(spec.data_model).toBe('OMOP');
      expect(spec.outcomes).toContain('mortality');
      
      // Step 3: Generate code
      const codeResult = await CodeGenerator.generateResearchCode({
        query,
        analysis_spec: spec,
        language: 'R'
      });
      expect(codeResult.code).toContain('azithromycin');
      expect(codeResult.code).toContain('levofloxacin');
      expect(codeResult.code).toContain('age > 65');
      
      // Step 4: Validate generated code structure
      expect(codeResult.code).toMatch(/# Load required libraries[\s\S]*# Connect to database[\s\S]*# Define cohort[\s\S]*# Statistical analysis/);
      expect(codeResult.metadata.estimated_runtime).toBeDefined();
      expect(codeResult.metadata.required_data_elements).toContain('person');
      expect(codeResult.metadata.required_data_elements).toContain('drug_exposure');
    });
    
    it('should handle HIPAA compliance throughout pipeline', async () => {
      const query = 'Analyze depression outcomes in adolescents';
      
      // Build spec with compliance requirements
      const spec = await EnhancedContextBuilder.buildFromNaturalLanguage(query);
      
      // Generate code with privacy protections
      const codeResult = await CodeGenerator.generateResearchCode({
        query,
        analysis_spec: spec,
        language: 'Python',
        options: { include_privacy_protection: true }
      });
      
      // Verify privacy measures
      expect(codeResult.code).toContain('# HIPAA Compliance');
      expect(codeResult.code).toContain('k-anonymity');
      expect(codeResult.code).toContain('suppress_small_cells');
      expect(codeResult.metadata.privacy_measures).toContain('cell_suppression');
      expect(codeResult.metadata.privacy_measures).toContain('age_binning');
    });
  });
});

async function loadTestOntologyData() {
  const ontologyDb = db.getOntologyDb();
  
  // Insert test ICD-10 codes
  const icd10Stmt = ontologyDb.prepare(`
    INSERT OR IGNORE INTO icd10_codes (code, short_description, long_description, category_code)
    VALUES (?, ?, ?, ?)
  `);
  
  const testICD10Codes = [
    ['I50.9', 'Heart failure, unspecified', 'Heart failure, unspecified', 'I50'],
    ['E11.9', 'Type 2 diabetes mellitus without complications', 'Type 2 diabetes mellitus without complications', 'E11'],
    ['J18.9', 'Pneumonia, unspecified organism', 'Pneumonia, unspecified organism', 'J18'],
    ['A41.9', 'Sepsis, unspecified organism', 'Sepsis, unspecified organism', 'A41']
  ];
  
  for (const code of testICD10Codes) {
    icd10Stmt.run(...code);
  }
  
  // Insert test RxNorm concepts
  const rxnormStmt = ontologyDb.prepare(`
    INSERT OR IGNORE INTO rxnorm_concepts (rxcui, name, tty, suppress)
    VALUES (?, ?, ?, ?)
  `);
  
  const testRxNormConcepts = [
    ['6918', 'Metformin', 'IN', 'N'],
    ['8787', 'Metoprolol', 'IN', 'N'],
    ['20352', 'Carvedilol', 'IN', 'N'],
    ['18631', 'Azithromycin', 'IN', 'N'],
    ['82122', 'Levofloxacin', 'IN', 'N']
  ];
  
  for (const concept of testRxNormConcepts) {
    rxnormStmt.run(...concept);
  }
  
  // Insert test LOINC codes
  const loincStmt = ontologyDb.prepare(`
    INSERT OR IGNORE INTO loinc_codes (loinc_num, component, property, time_aspect, system, scale_type, long_common_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const testLOINCCodes = [
    ['2160-0', 'Creatinine', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', 'Creatinine [Mass/volume] in Serum or Plasma'],
    ['33914-3', 'eGFR', 'ArVRat', 'Pt', 'Ser/Plas+BldC', 'Qn', 'Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum, Plasma or Blood by Creatinine-based formula (MDRD)']
  ];
  
  for (const code of testLOINCCodes) {
    loincStmt.run(...code);
  }
}