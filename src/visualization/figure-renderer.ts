import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { promises as fs } from 'fs';
import path from 'path';
import { createModuleLogger } from '../utils/logger.js';
import { MCPError } from '../utils/errors.js';

const vizLogger = createModuleLogger('figure-renderer');

export interface FigureConfig {
  type: string;
  data: any;
  style: JournalStyle;
  width?: number;
  height?: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  colors?: string[];
}

export interface JournalStyle {
  name: string;
  fonts: {
    family: string;
    sizes: {
      title: number;
      axis: number;
      legend: number;
      annotation: number;
    };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string[];
    grid: string;
    text: string;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  grid: {
    show: boolean;
    style: string;
  };
}

export class FigureRenderer {
  private static readonly JOURNAL_STYLES: Record<string, JournalStyle> = {
    NEJM: {
      name: 'New England Journal of Medicine',
      fonts: {
        family: 'Helvetica Neue, Arial, sans-serif',
        sizes: { title: 14, axis: 12, legend: 11, annotation: 10 }
      },
      colors: {
        primary: '#0066CC',
        secondary: '#DC3545',
        accent: ['#28A745', '#FFC107', '#6C757D', '#17A2B8'],
        grid: '#E0E0E0',
        text: '#333333'
      },
      margins: { top: 40, right: 40, bottom: 60, left: 80 },
      grid: { show: true, style: 'dotted' }
    },
    JAMA: {
      name: 'Journal of the American Medical Association',
      fonts: {
        family: 'Arial, sans-serif',
        sizes: { title: 13, axis: 11, legend: 10, annotation: 9 }
      },
      colors: {
        primary: '#000000',
        secondary: '#666666',
        accent: ['#0056B3', '#DC3545', '#28A745', '#FFC107'],
        grid: '#CCCCCC',
        text: '#000000'
      },
      margins: { top: 30, right: 30, bottom: 50, left: 70 },
      grid: { show: true, style: 'solid' }
    },
    Lancet: {
      name: 'The Lancet',
      fonts: {
        family: 'Times New Roman, serif',
        sizes: { title: 14, axis: 11, legend: 10, annotation: 9 }
      },
      colors: {
        primary: '#00457C',
        secondary: '#C8102E',
        accent: ['#00A19A', '#F39200', '#6A1E74', '#95C11F'],
        grid: '#D3D3D3',
        text: '#2C2C2C'
      },
      margins: { top: 35, right: 35, bottom: 55, left: 75 },
      grid: { show: true, style: 'dashed' }
    },
    Generic: {
      name: 'Generic Style',
      fonts: {
        family: 'Arial, sans-serif',
        sizes: { title: 14, axis: 12, legend: 11, annotation: 10 }
      },
      colors: {
        primary: '#1F77B4',
        secondary: '#FF7F0E',
        accent: ['#2CA02C', '#D62728', '#9467BD', '#8C564B'],
        grid: '#DDDDDD',
        text: '#000000'
      },
      margins: { top: 40, right: 40, bottom: 60, left: 60 },
      grid: { show: true, style: 'solid' }
    }
  };

  static async render(config: FigureConfig): Promise<{
    svg: string;
    png?: Buffer;
    metadata: any;
  }> {
    vizLogger.info('Rendering figure', { type: config.type, style: config.style.name });
    
    try {
      let svg: string;
      
      switch (config.type) {
        case 'kaplan_meier':
          svg = await this.renderKaplanMeier(config);
          break;
        case 'forest_plot':
          svg = await this.renderForestPlot(config);
          break;
        case 'roc_curve':
          svg = await this.renderROCCurve(config);
          break;
        case 'box_plot':
          svg = await this.renderBoxPlot(config);
          break;
        case 'scatter_plot':
          svg = await this.renderScatterPlot(config);
          break;
        case 'heatmap':
          svg = await this.renderHeatmap(config);
          break;
        default:
          throw new MCPError(`Unsupported figure type: ${config.type}`, 'INVALID_FIGURE', 400);
      }
      
      const metadata = {
        type: config.type,
        style: config.style.name,
        dimensions: { width: config.width || 800, height: config.height || 600 },
        created: new Date().toISOString()
      };
      
      return { svg, metadata };
    } catch (error) {
      vizLogger.error('Figure rendering failed', { type: config.type, error: error.message });
      throw error;
    }
  }

  private static createSVGContext(config: FigureConfig): {
    document: Document;
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    g: d3.Selection<SVGGElement, unknown, null, undefined>;
    width: number;
    height: number;
  } {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const document = dom.window.document;
    
    const totalWidth = config.width || 800;
    const totalHeight = config.height || 600;
    const margin = config.style.margins;
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;
    
    const svg = d3.select(document.body)
      .append('svg')
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .style('font-family', config.style.fonts.family);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add title if provided
    if (config.title) {
      svg.append('text')
        .attr('x', totalWidth / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${config.style.fonts.sizes.title}px`)
        .style('font-weight', 'bold')
        .style('fill', config.style.colors.text)
        .text(config.title);
    }
    
    return { document, svg, g, width, height };
  }

  private static async renderKaplanMeier(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data.timePoints) as number])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d => `${d}`);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${(d as number) * 100}%`);
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', style.colors.text)
      .style('text-anchor', 'middle')
      .style('font-size', `${style.fonts.sizes.axis}px`)
      .text(config.xLabel || 'Time (days)');
    
    g.append('g')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('fill', style.colors.text)
      .style('text-anchor', 'middle')
      .style('font-size', `${style.fonts.sizes.axis}px`)
      .text(config.yLabel || 'Survival Probability');
    
    // Add grid
    if (style.grid.show) {
      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis.tickSize(-height).tickFormat(() => ''))
        .style('stroke-dasharray', style.grid.style === 'dotted' ? '2,2' : '')
        .style('opacity', 0.3);
      
      g.append('g')
        .attr('class', 'grid')
        .call(yAxis.tickSize(-width).tickFormat(() => ''))
        .style('stroke-dasharray', style.grid.style === 'dotted' ? '2,2' : '')
        .style('opacity', 0.3);
    }
    
    // Draw survival curves
    const line = d3.line<any>()
      .x((d, i) => xScale(data.timePoints[i]))
      .y(d => yScale(d))
      .curve(d3.curveStepAfter);
    
    const colors = config.colors || [style.colors.primary, style.colors.secondary, ...style.colors.accent];
    
    data.groups.forEach((group: any, i: number) => {
      // Draw line
      g.append('path')
        .datum(group.survival)
        .attr('fill', 'none')
        .attr('stroke', colors[i % colors.length])
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add confidence intervals if available
      if (group.ci_lower && group.ci_upper) {
        const area = d3.area<any>()
          .x((d, i) => xScale(data.timePoints[i]))
          .y0((d, i) => yScale(group.ci_lower[i]))
          .y1((d, i) => yScale(group.ci_upper[i]))
          .curve(d3.curveStepAfter);
        
        g.append('path')
          .datum(group.survival)
          .attr('fill', colors[i % colors.length])
          .attr('opacity', 0.2)
          .attr('d', area);
      }
      
      // Add censoring marks
      if (group.censored) {
        group.censored.forEach((censored: number, j: number) => {
          if (censored > 0) {
            g.append('line')
              .attr('x1', xScale(data.timePoints[j]))
              .attr('x2', xScale(data.timePoints[j]))
              .attr('y1', yScale(group.survival[j]) - 3)
              .attr('y2', yScale(group.survival[j]) + 3)
              .attr('stroke', colors[i % colors.length])
              .attr('stroke-width', 1);
          }
        });
      }
    });
    
    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 20)`);
    
    data.groups.forEach((group: any, i: number) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colors[i % colors.length])
        .attr('stroke-width', 2);
      
      legendRow.append('text')
        .attr('x', 25)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', `${style.fonts.sizes.legend}px`)
        .style('fill', style.colors.text)
        .text(group.name);
    });
    
    // Add p-value if provided
    if (data.pValue) {
      g.append('text')
        .attr('x', width - 10)
        .attr('y', height - 10)
        .attr('text-anchor', 'end')
        .style('font-size', `${style.fonts.sizes.annotation}px`)
        .style('fill', style.colors.text)
        .text(`p = ${data.pValue.toFixed(3)}`);
    }
    
    return svg.node()?.outerHTML || '';
  }

  private static async renderForestPlot(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    // Sort data by effect size
    const sortedData = [...data.studies].sort((a, b) => a.effect - b.effect);
    
    // Set up scales
    const xScale = d3.scaleLog()
      .domain([0.1, 10])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(sortedData.map(d => d.name))
      .range([0, height])
      .padding(0.3);
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0.1, 0.2, 0.5, 1, 2, 5, 10])
      .tickFormat(d => d.toString());
    
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);
    
    g.append('g')
      .call(d3.axisLeft(yScale));
    
    // Add reference line at 1
    g.append('line')
      .attr('x1', xScale(1))
      .attr('x2', xScale(1))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', style.colors.text)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.5);
    
    // Draw forest plot
    sortedData.forEach(study => {
      const y = yScale(study.name)! + yScale.bandwidth() / 2;
      
      // Confidence interval line
      g.append('line')
        .attr('x1', xScale(study.ci_lower))
        .attr('x2', xScale(study.ci_upper))
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', style.colors.text)
        .attr('stroke-width', 1);
      
      // Point estimate
      const size = study.weight ? Math.sqrt(study.weight) * 5 : 5;
      g.append('rect')
        .attr('x', xScale(study.effect) - size / 2)
        .attr('y', y - size / 2)
        .attr('width', size)
        .attr('height', size)
        .attr('fill', style.colors.primary);
      
      // Add text labels
      g.append('text')
        .attr('x', width + 10)
        .attr('y', y)
        .attr('dy', '0.35em')
        .style('font-size', `${style.fonts.sizes.annotation}px`)
        .text(`${study.effect.toFixed(2)} (${study.ci_lower.toFixed(2)}-${study.ci_upper.toFixed(2)})`);
    });
    
    // Add overall effect if provided
    if (data.overall) {
      const overallY = height + 30;
      
      g.append('polygon')
        .attr('points', [
          `${xScale(data.overall.ci_lower)},${overallY}`,
          `${xScale(data.overall.effect)},${overallY - 10}`,
          `${xScale(data.overall.ci_upper)},${overallY}`,
          `${xScale(data.overall.effect)},${overallY + 10}`
        ].join(' '))
        .attr('fill', style.colors.secondary);
      
      g.append('text')
        .attr('x', 0)
        .attr('y', overallY)
        .attr('dy', '0.35em')
        .style('font-weight', 'bold')
        .text('Overall');
    }
    
    // X-axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 50)
      .attr('text-anchor', 'middle')
      .style('font-size', `${style.fonts.sizes.axis}px`)
      .text(config.xLabel || 'Hazard Ratio (95% CI)');
    
    return svg.node()?.outerHTML || '';
  }

  private static async renderROCCurve(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    // Set up scales
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    
    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', style.colors.text)
      .style('text-anchor', 'middle')
      .text('False Positive Rate');
    
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', style.colors.text)
      .style('text-anchor', 'middle')
      .text('True Positive Rate');
    
    // Add diagonal reference line
    g.append('line')
      .attr('x1', 0)
      .attr('y1', height)
      .attr('x2', width)
      .attr('y2', 0)
      .attr('stroke', style.colors.grid)
      .attr('stroke-dasharray', '5,5');
    
    // Draw ROC curves
    const line = d3.line<any>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]));
    
    const colors = config.colors || [style.colors.primary, style.colors.secondary, ...style.colors.accent];
    
    data.curves.forEach((curve: any, i: number) => {
      const points = curve.fpr.map((fpr: number, j: number) => [fpr, curve.tpr[j]]);
      
      g.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', colors[i % colors.length])
        .attr('stroke-width', 2)
        .attr('d', line);
      
      // Add AUC text
      g.append('text')
        .attr('x', width - 100)
        .attr('y', 20 + i * 20)
        .style('font-size', `${style.fonts.sizes.legend}px`)
        .style('fill', colors[i % colors.length])
        .text(`${curve.name}: AUC = ${curve.auc.toFixed(3)}`);
    });
    
    return svg.node()?.outerHTML || '';
  }

  private static async renderBoxPlot(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    // Calculate box plot statistics
    const boxData = data.groups.map((group: any) => {
      const sorted = group.values.sort(d3.ascending);
      const q1 = d3.quantile(sorted, 0.25)!;
      const median = d3.quantile(sorted, 0.5)!;
      const q3 = d3.quantile(sorted, 0.75)!;
      const iqr = q3 - q1;
      const min = Math.max(d3.min(sorted)!, q1 - 1.5 * iqr);
      const max = Math.min(d3.max(sorted)!, q3 + 1.5 * iqr);
      const outliers = sorted.filter((d: number) => d < min || d > max);
      
      return { name: group.name, min, q1, median, q3, max, outliers };
    });
    
    // Set up scales
    const xScale = d3.scaleBand()
      .domain(boxData.map(d => d.name))
      .range([0, width])
      .padding(0.4);
    
    const yScale = d3.scaleLinear()
      .domain([
        d3.min(boxData, d => Math.min(d.min, ...d.outliers))! * 0.9,
        d3.max(boxData, d => Math.max(d.max, ...d.outliers))! * 1.1
      ])
      .range([height, 0]);
    
    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    g.append('g')
      .call(d3.axisLeft(yScale));
    
    // Draw box plots
    boxData.forEach((d, i) => {
      const x = xScale(d.name)!;
      const boxWidth = xScale.bandwidth();
      
      // Vertical line (min to max)
      g.append('line')
        .attr('x1', x + boxWidth / 2)
        .attr('y1', yScale(d.min))
        .attr('x2', x + boxWidth / 2)
        .attr('y2', yScale(d.max))
        .attr('stroke', style.colors.text);
      
      // Box (q1 to q3)
      g.append('rect')
        .attr('x', x)
        .attr('y', yScale(d.q3))
        .attr('width', boxWidth)
        .attr('height', yScale(d.q1) - yScale(d.q3))
        .attr('fill', style.colors.primary)
        .attr('fill-opacity', 0.7)
        .attr('stroke', style.colors.text);
      
      // Median line
      g.append('line')
        .attr('x1', x)
        .attr('y1', yScale(d.median))
        .attr('x2', x + boxWidth)
        .attr('y2', yScale(d.median))
        .attr('stroke', style.colors.text)
        .attr('stroke-width', 2);
      
      // Outliers
      d.outliers.forEach((outlier: number) => {
        g.append('circle')
          .attr('cx', x + boxWidth / 2)
          .attr('cy', yScale(outlier))
          .attr('r', 3)
          .attr('fill', 'none')
          .attr('stroke', style.colors.text);
      });
    });
    
    // Add labels
    if (config.xLabel) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', `${style.fonts.sizes.axis}px`)
        .text(config.xLabel);
    }
    
    if (config.yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${style.fonts.sizes.axis}px`)
        .text(config.yLabel);
    }
    
    return svg.node()?.outerHTML || '';
  }

  private static async renderScatterPlot(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data.points, (d: any) => d.x) as [number, number])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain(d3.extent(data.points, (d: any) => d.y) as [number, number])
      .range([height, 0]);
    
    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    g.append('g')
      .call(d3.axisLeft(yScale));
    
    // Add grid if enabled
    if (style.grid.show) {
      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(() => ''))
        .style('stroke-dasharray', '2,2')
        .style('opacity', 0.3);
      
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ''))
        .style('stroke-dasharray', '2,2')
        .style('opacity', 0.3);
    }
    
    // Draw points
    const colorScale = data.groups
      ? d3.scaleOrdinal(config.colors || [style.colors.primary, style.colors.secondary, ...style.colors.accent])
          .domain(data.groups)
      : () => style.colors.primary;
    
    g.selectAll('.point')
      .data(data.points)
      .enter().append('circle')
      .attr('cx', (d: any) => xScale(d.x))
      .attr('cy', (d: any) => yScale(d.y))
      .attr('r', 4)
      .attr('fill', (d: any) => colorScale(d.group || 'default'))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d: any) => colorScale(d.group || 'default'))
      .attr('stroke-width', 1);
    
    // Add regression line if provided
    if (data.regression) {
      const lineGenerator = d3.line<any>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));
      
      g.append('path')
        .datum(data.regression.line)
        .attr('fill', 'none')
        .attr('stroke', style.colors.secondary)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('d', lineGenerator);
      
      // Add R² value
      g.append('text')
        .attr('x', width - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .style('font-size', `${style.fonts.sizes.annotation}px`)
        .text(`R² = ${data.regression.r2.toFixed(3)}`);
    }
    
    // Add labels
    if (config.xLabel) {
      g.append('text')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', `${style.fonts.sizes.axis}px`)
        .text(config.xLabel);
    }
    
    if (config.yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${style.fonts.sizes.axis}px`)
        .text(config.yLabel);
    }
    
    // Add legend if groups exist
    if (data.groups) {
      const legend = g.append('g')
        .attr('transform', `translate(${width - 120}, 20)`);
      
      data.groups.forEach((group: string, i: number) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
        
        legendRow.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 4)
          .attr('fill', colorScale(group));
        
        legendRow.append('text')
          .attr('x', 10)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', `${style.fonts.sizes.legend}px`)
          .text(group);
      });
    }
    
    return svg.node()?.outerHTML || '';
  }

  private static async renderHeatmap(config: FigureConfig): Promise<string> {
    const { document, svg, g, width, height } = this.createSVGContext(config);
    const { data, style } = config;
    
    const rows = data.rows;
    const cols = data.columns;
    const values = data.values;
    
    // Calculate cell dimensions
    const cellWidth = width / cols.length;
    const cellHeight = height / rows.length;
    
    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain(d3.extent(values.flat()) as [number, number]);
    
    // Draw heatmap cells
    rows.forEach((row: string, i: number) => {
      cols.forEach((col: string, j: number) => {
        const value = values[i][j];
        
        g.append('rect')
          .attr('x', j * cellWidth)
          .attr('y', i * cellHeight)
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('fill', colorScale(value))
          .attr('stroke', style.colors.grid)
          .attr('stroke-width', 0.5);
        
        // Add text if cells are large enough
        if (cellWidth > 30 && cellHeight > 20) {
          g.append('text')
            .attr('x', j * cellWidth + cellWidth / 2)
            .attr('y', i * cellHeight + cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .style('fill', Math.abs(value) > 0.5 ? 'white' : style.colors.text)
            .text(value.toFixed(2));
        }
      });
    });
    
    // Add row labels
    g.selectAll('.row-label')
      .data(rows)
      .enter().append('text')
      .attr('x', -5)
      .attr('y', (d: string, i: number) => i * cellHeight + cellHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dy', '0.35em')
      .style('font-size', `${style.fonts.sizes.axis}px`)
      .text(d => d);
    
    // Add column labels
    g.selectAll('.col-label')
      .data(cols)
      .enter().append('text')
      .attr('x', (d: string, i: number) => i * cellWidth + cellWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', `${style.fonts.sizes.axis}px`)
      .text(d => d);
    
    // Add color scale legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append('g')
      .attr('transform', `translate(${(config.width || 800) - legendWidth - 20}, ${config.style.margins.top})`);
    
    // Create gradient
    const gradientId = 'heatmap-gradient';
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', gradientId);
    
    const nStops = 10;
    const colorRange = d3.range(nStops).map(i => i / (nStops - 1));
    
    gradient.selectAll('stop')
      .data(colorRange)
      .enter().append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d3.min(values.flat())! + d * (d3.max(values.flat())! - d3.min(values.flat())!)));
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', `url(#${gradientId})`);
    
    const legendScale = d3.scaleLinear()
      .domain(d3.extent(values.flat()) as [number, number])
      .range([0, legendWidth]);
    
    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5));
    
    return svg.node()?.outerHTML || '';
  }

  static async exportAsReactComponent(svg: string, componentName: string = 'Figure'): Promise<string> {
    // Convert SVG to React component
    const reactComponent = `
import React from 'react';

const ${componentName} = (props) => {
  return (
    <div className="figure-container" {...props}>
      ${svg.replace(/style="([^"]*)"/g, (match, styles) => {
        // Convert inline styles to React style object
        const styleObj = styles.split(';')
          .filter(s => s.trim())
          .map(s => {
            const [key, value] = s.split(':').map(str => str.trim());
            const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            return `${camelKey}: '${value}'`;
          })
          .join(', ');
        return `style={{${styleObj}}}`;
      })}
    </div>
  );
};

export default ${componentName};
`;
    
    return reactComponent;
  }
}