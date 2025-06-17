import { describe, it, expect } from 'vitest';
import { FigureRenderer } from '../../src/visualization/figure-renderer.js';
import { JSDOM } from 'jsdom';

describe('FigureRenderer', () => {
  const testStyle = {
    name: 'Test Style',
    fonts: {
      family: 'Arial, sans-serif',
      sizes: { title: 14, axis: 12, legend: 11, annotation: 10 }
    },
    colors: {
      primary: '#0066CC',
      secondary: '#DC3545',
      accent: ['#28A745', '#FFC107'],
      grid: '#E0E0E0',
      text: '#333333'
    },
    margins: { top: 40, right: 40, bottom: 60, left: 80 },
    grid: { show: true, style: 'dotted' }
  };
  
  describe('Kaplan-Meier Curve', () => {
    it('should render basic survival curve', async () => {
      const config = {
        type: 'kaplan_meier',
        data: {
          timePoints: [0, 30, 60, 90],
          groups: [
            {
              name: 'Group A',
              survival: [1.0, 0.9, 0.8, 0.7]
            }
          ]
        },
        style: testStyle,
        width: 600,
        height: 400
      };
      
      const result = await FigureRenderer.render(config);
      
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('width="600"');
      expect(result.svg).toContain('height="400"');
      expect(result.svg).toContain('Group A');
      expect(result.metadata.type).toBe('kaplan_meier');
    });
    
    it('should include confidence intervals when provided', async () => {
      const config = {
        type: 'kaplan_meier',
        data: {
          timePoints: [0, 30, 60],
          groups: [
            {
              name: 'Treatment',
              survival: [1.0, 0.9, 0.8],
              ci_lower: [1.0, 0.85, 0.73],
              ci_upper: [1.0, 0.95, 0.87]
            }
          ]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const paths = dom.window.document.querySelectorAll('path');
      
      // Should have at least 2 paths: main line + confidence interval area
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should display p-value when provided', async () => {
      const config = {
        type: 'kaplan_meier',
        data: {
          timePoints: [0, 30],
          groups: [
            { name: 'A', survival: [1.0, 0.9] },
            { name: 'B', survival: [1.0, 0.8] }
          ],
          pValue: 0.045
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      expect(result.svg).toContain('p = 0.045');
    });
  });
  
  describe('Forest Plot', () => {
    it('should render forest plot with multiple studies', async () => {
      const config = {
        type: 'forest_plot',
        data: {
          studies: [
            { name: 'Study 1', effect: 0.8, ci_lower: 0.6, ci_upper: 1.0 },
            { name: 'Study 2', effect: 0.9, ci_lower: 0.7, ci_upper: 1.1 }
          ]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      
      expect(result.svg).toContain('Study 1');
      expect(result.svg).toContain('Study 2');
      expect(result.svg).toContain('0.80');
      expect(result.svg).toContain('0.90');
    });
    
    it('should include overall effect diamond', async () => {
      const config = {
        type: 'forest_plot',
        data: {
          studies: [
            { name: 'Study 1', effect: 0.8, ci_lower: 0.6, ci_upper: 1.0 }
          ],
          overall: { effect: 0.85, ci_lower: 0.75, ci_upper: 0.95 }
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const polygons = dom.window.document.querySelectorAll('polygon');
      
      expect(polygons.length).toBeGreaterThan(0);
      expect(result.svg).toContain('Overall');
    });
  });
  
  describe('ROC Curve', () => {
    it('should render ROC curve with AUC', async () => {
      const config = {
        type: 'roc_curve',
        data: {
          curves: [
            {
              name: 'Model A',
              fpr: [0, 0.1, 0.3, 0.5, 1],
              tpr: [0, 0.4, 0.7, 0.9, 1],
              auc: 0.82
            }
          ]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      
      expect(result.svg).toContain('Model A');
      expect(result.svg).toContain('AUC = 0.820');
      expect(result.svg).toContain('False Positive Rate');
      expect(result.svg).toContain('True Positive Rate');
    });
    
    it('should include diagonal reference line', async () => {
      const config = {
        type: 'roc_curve',
        data: {
          curves: [{ name: 'Test', fpr: [0, 1], tpr: [0, 1], auc: 0.5 }]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const lines = dom.window.document.querySelectorAll('line');
      
      // Should have diagonal reference line
      const diagonalLine = Array.from(lines).find(line => 
        line.getAttribute('stroke-dasharray') === '5,5'
      );
      expect(diagonalLine).toBeDefined();
    });
  });
  
  describe('Box Plot', () => {
    it('should calculate box plot statistics correctly', async () => {
      const config = {
        type: 'box_plot',
        data: {
          groups: [
            {
              name: 'Control',
              values: [1, 2, 3, 4, 5, 6, 7, 8, 9]
            }
          ]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      
      // Should have box (rect) and median line
      const rects = dom.window.document.querySelectorAll('rect');
      const lines = dom.window.document.querySelectorAll('line');
      
      expect(rects.length).toBeGreaterThan(0);
      expect(lines.length).toBeGreaterThan(0);
    });
    
    it('should render outliers as circles', async () => {
      const config = {
        type: 'box_plot',
        data: {
          groups: [
            {
              name: 'Test',
              values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 50] // 50 is outlier
            }
          ]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const circles = dom.window.document.querySelectorAll('circle');
      
      expect(circles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Scatter Plot', () => {
    it('should render points with groups', async () => {
      const config = {
        type: 'scatter_plot',
        data: {
          points: [
            { x: 1, y: 2, group: 'A' },
            { x: 2, y: 3, group: 'B' },
            { x: 3, y: 4, group: 'A' }
          ],
          groups: ['A', 'B']
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const circles = dom.window.document.querySelectorAll('circle');
      
      expect(circles.length).toBe(3);
    });
    
    it('should add regression line when provided', async () => {
      const config = {
        type: 'scatter_plot',
        data: {
          points: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 }
          ],
          regression: {
            line: [{ x: 0, y: 0 }, { x: 4, y: 8 }],
            r2: 0.99
          }
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      
      expect(result.svg).toContain('R² = 0.990');
      expect(result.svg).toContain('stroke-dasharray="5,5"');
    });
  });
  
  describe('Heatmap', () => {
    it('should render cells with color scale', async () => {
      const config = {
        type: 'heatmap',
        data: {
          rows: ['Gene1', 'Gene2'],
          columns: ['Sample1', 'Sample2'],
          values: [[0.5, -0.3], [0.8, -0.9]]
        },
        style: testStyle,
        width: 400,
        height: 300
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const rects = dom.window.document.querySelectorAll('rect');
      
      // Should have 4 cells + legend
      expect(rects.length).toBeGreaterThanOrEqual(4);
      expect(result.svg).toContain('Gene1');
      expect(result.svg).toContain('Sample1');
    });
    
    it('should include gradient legend', async () => {
      const config = {
        type: 'heatmap',
        data: {
          rows: ['A'],
          columns: ['B'],
          values: [[0.5]]
        },
        style: testStyle
      };
      
      const result = await FigureRenderer.render(config);
      const dom = new JSDOM(result.svg);
      const gradients = dom.window.document.querySelectorAll('linearGradient');
      
      expect(gradients.length).toBe(1);
      expect(result.svg).toContain('heatmap-gradient');
    });
  });
  
  describe('React Component Export', () => {
    it('should convert SVG to valid React component', async () => {
      const svg = '<svg width="100" height="100" style="font-size: 12px; fill: red;"><text>Test</text></svg>';
      const component = await FigureRenderer.exportAsReactComponent(svg, 'TestFigure');
      
      expect(component).toContain('import React from \'react\';');
      expect(component).toContain('const TestFigure = (props) =>');
      expect(component).toContain('export default TestFigure;');
      expect(component).toContain('fontSize: \'12px\'');
      expect(component).toContain('fill: \'red\'');
    });
    
    it('should handle camelCase conversion for style attributes', async () => {
      const svg = '<rect style="stroke-width: 2; fill-opacity: 0.5;"></rect>';
      const component = await FigureRenderer.exportAsReactComponent(svg);
      
      expect(component).toContain('strokeWidth: \'2\'');
      expect(component).toContain('fillOpacity: \'0.5\'');
    });
  });
  
  describe('Journal Styles', () => {
    it('should have predefined journal styles', () => {
      const styles = FigureRenderer['JOURNAL_STYLES'];
      
      expect(styles).toHaveProperty('NEJM');
      expect(styles).toHaveProperty('JAMA');
      expect(styles).toHaveProperty('Lancet');
      expect(styles).toHaveProperty('Generic');
      
      // Verify NEJM style properties
      expect(styles.NEJM.fonts.family).toContain('Helvetica Neue');
      expect(styles.NEJM.colors.primary).toBe('#0066CC');
      expect(styles.NEJM.margins.left).toBe(80);
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error for unsupported figure type', async () => {
      const config = {
        type: 'unsupported_type',
        data: {},
        style: testStyle
      };
      
      await expect(FigureRenderer.render(config)).rejects.toThrow('Unsupported figure type');
    });
  });
});