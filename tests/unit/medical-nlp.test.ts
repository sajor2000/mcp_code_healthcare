import { describe, it, expect, vi } from 'vitest';
import { MedicalNLP } from '../../src/nlp/medical-nlp.js';
import { db } from '../../src/database/connection.js';

// Mock database connection
vi.mock('../../src/database/connection.js', () => ({
  db: {
    getOntologyDb: vi.fn(() => ({
      prepare: vi.fn(() => ({
        all: vi.fn(() => [])
      }))
    }))
  }
}));

describe('MedicalNLP', () => {
  describe('parseQuery', () => {
    it('should detect comparison intent', async () => {
      const queries = [
        'Compare drug A versus drug B',
        'What is the difference between treatment X and Y',
        'Drug A vs Drug B effectiveness'
      ];
      
      for (const query of queries) {
        const result = await MedicalNLP.parseQuery(query);
        expect(result.intent).toBe('comparison');
      }
    });
    
    it('should detect prediction intent', async () => {
      const queries = [
        'Predict readmission risk',
        'Build a model for mortality prediction',
        'Machine learning classifier for diagnosis'
      ];
      
      for (const query of queries) {
        const result = await MedicalNLP.parseQuery(query);
        expect(result.intent).toBe('prediction');
      }
    });
    
    it('should extract condition entities', async () => {
      const query = 'Patients diagnosed with heart failure and diabetes';
      const result = await MedicalNLP.parseQuery(query);
      
      expect(result.entities.some(e => e.text === 'heart failure' && e.type === 'condition')).toBe(true);
      expect(result.entities.some(e => e.text === 'diabetes' && e.type === 'condition')).toBe(true);
    });
    
    it('should extract medication entities', async () => {
      const query = 'Patients on metformin 1000mg and lisinopril';
      const result = await MedicalNLP.parseQuery(query);
      
      const metformin = result.entities.find(e => e.text.includes('metformin'));
      expect(metformin).toBeDefined();
      expect(metformin?.type).toBe('medication');
    });
    
    it('should extract lab values with operators', async () => {
      const query = 'Patients with creatinine > 2.0 mg/dL';
      const result = await MedicalNLP.parseQuery(query);
      
      const creatinine = result.entities.find(e => e.text === 'creatinine');
      expect(creatinine).toBeDefined();
      expect(creatinine?.type).toBe('lab');
      expect(creatinine?.attributes?.operator).toBe('>');
      expect(creatinine?.attributes?.value).toBe(2.0);
      expect(creatinine?.attributes?.unit).toBe('mg/dL');
    });
    
    it('should handle negation', async () => {
      const query = 'Patients with hypertension but no diabetes';
      const result = await MedicalNLP.parseQuery(query);
      
      const hypertension = result.entities.find(e => e.text === 'hypertension');
      const diabetes = result.entities.find(e => e.text === 'diabetes');
      
      expect(hypertension?.negated).toBeFalsy();
      expect(diabetes?.negated).toBe(true);
    });
    
    it('should extract temporal constraints', async () => {
      const query = 'Outcomes within 30 days after surgery';
      const result = await MedicalNLP.parseQuery(query);
      
      expect(result.temporalConstraints?.relative).toBe('30 days');
      expect(result.temporalConstraints?.anchor).toBe('surgery');
    });
    
    it('should extract population filters', async () => {
      const query = 'Female patients age > 65 in the ICU';
      const result = await MedicalNLP.parseQuery(query);
      
      expect(result.populationFilters).toContainEqual({
        type: 'gender',
        operator: '=',
        value: 'female'
      });
      
      expect(result.populationFilters).toContainEqual({
        type: 'age',
        operator: '>',
        value: 65
      });
      
      expect(result.populationFilters).toContainEqual({
        type: 'setting',
        operator: '=',
        value: 'icu'
      });
    });
    
    it('should extract statistical requirements', async () => {
      const query = 'Compare outcomes adjusting for age and comorbidities, stratified by severity';
      const result = await MedicalNLP.parseQuery(query);
      
      expect(result.statisticalRequirements?.adjustFor).toContain('age');
      expect(result.statisticalRequirements?.adjustFor).toContain('comorbidities');
      expect(result.statisticalRequirements?.stratifyBy).toContain('severity');
    });
    
    it('should expand medical abbreviations', async () => {
      const query = 'Patients with HTN and DM on ACE inhibitors';
      const result = await MedicalNLP.parseQuery(query);
      
      // Abbreviations should be expanded
      expect(result.entities.some(e => e.text === 'hypertension')).toBe(true);
      expect(result.entities.some(e => e.text === 'diabetes mellitus')).toBe(true);
      expect(result.entities.some(e => e.text === 'ace inhibitor')).toBe(true);
    });
  });
  
  describe('enhanceWithClinicalContext', () => {
    it('should add related medications to conditions', async () => {
      const entities = [
        {
          text: 'hypertension',
          type: 'condition' as const,
          codes: [{ system: 'ICD-10', code: 'I10', display: 'Essential hypertension' }]
        }
      ];
      
      const enhanced = await MedicalNLP.enhanceWithClinicalContext(entities);
      
      expect(enhanced[0].attributes?.relatedMedications).toBeDefined();
      expect(enhanced[0].attributes?.relatedMedications).toContain('lisinopril');
      expect(enhanced[0].attributes?.relatedMedications).toContain('amlodipine');
    });
    
    it('should add related labs to conditions', async () => {
      const entities = [
        {
          text: 'diabetes',
          type: 'condition' as const,
          codes: [{ system: 'ICD-10', code: 'E11', display: 'Type 2 diabetes mellitus' }]
        }
      ];
      
      const enhanced = await MedicalNLP.enhanceWithClinicalContext(entities);
      
      expect(enhanced[0].attributes?.relatedLabs).toBeDefined();
      expect(enhanced[0].attributes?.relatedLabs).toContain('glucose');
      expect(enhanced[0].attributes?.relatedLabs).toContain('hemoglobin a1c');
    });
  });
});