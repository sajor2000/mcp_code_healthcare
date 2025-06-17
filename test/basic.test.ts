import { describe, it, expect } from 'vitest';
import { HypothesisGeneratorTool } from '../src/tools/research/hypothesis-generator.js';
import { CohortBuilderTool } from '../src/tools/research/cohort-builder.js';
import { ResearchCodeGeneratorTool } from '../src/tools/research/code-generator.js';
import { FigureGeneratorTool } from '../src/tools/research/figure-generator.js';

describe('Healthcare Research MCP Tools', () => {
  describe('HypothesisGeneratorTool', () => {
    it('should have correct name and description', () => {
      const tool = new HypothesisGeneratorTool(null as any, null as any);
      expect(tool.name).toBe('generate_research_hypothesis');
      expect(tool.description).toBeTruthy();
    });

    it('should have valid input schema', () => {
      const tool = new HypothesisGeneratorTool(null as any, null as any);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('clinical_area');
      expect(tool.inputSchema.properties).toHaveProperty('outcome_of_interest');
    });
  });

  describe('CohortBuilderTool', () => {
    it('should have correct name and description', () => {
      const tool = new CohortBuilderTool(null as any, null as any);
      expect(tool.name).toBe('build_cohort');
      expect(tool.description).toBeTruthy();
    });

    it('should have valid input schema', () => {
      const tool = new CohortBuilderTool(null as any, null as any);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('data_model');
      expect(tool.inputSchema.properties).toHaveProperty('inclusion_criteria');
    });
  });

  describe('ResearchCodeGeneratorTool', () => {
    it('should have correct name and description', () => {
      const tool = new ResearchCodeGeneratorTool(null as any, null as any);
      expect(tool.name).toBe('generate_research_code');
      expect(tool.description).toBeTruthy();
    });

    it('should have valid input schema', () => {
      const tool = new ResearchCodeGeneratorTool(null as any, null as any);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('study_type');
      expect(tool.inputSchema.properties).toHaveProperty('programming_language');
    });
  });

  describe('FigureGeneratorTool', () => {
    it('should have correct name and description', () => {
      const tool = new FigureGeneratorTool(null as any, null as any);
      expect(tool.name).toBe('generate_figure');
      expect(tool.description).toBeTruthy();
    });

    it('should have valid input schema', () => {
      const tool = new FigureGeneratorTool(null as any, null as any);
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('figure_type');
      expect(tool.inputSchema.properties).toHaveProperty('journal_style');
    });
  });
});