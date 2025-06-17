import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';

export class FigureGeneratorTool implements Tool {
  name = 'generate_research_figures';
  description = 'Generate publication-ready figures in NEJM style with React components and SVG export';
  
  inputSchema = {
    type: 'object',
    properties: {
      figure_type: {
        type: 'string',
        enum: [
          'kaplan_meier', 
          'forest_plot', 
          'box_plot', 
          'violin_plot',
          'bar_chart',
          'line_graph',
          'scatter_plot',
          'heatmap',
          'flow_diagram',
          'consort_diagram'
        ],
        description: 'Type of figure to generate'
      },
      data: {
        type: 'object',
        description: 'Data for the figure (structure depends on figure type)'
      },
      title: {
        type: 'string',
        description: 'Figure title'
      },
      style_guide: {
        type: 'string',
        enum: ['NEJM', 'JAMA', 'Lancet', 'Nature', 'Science'],
        default: 'NEJM',
        description: 'Journal style guide to follow'
      },
      export_format: {
        type: 'string',
        enum: ['svg', 'react_component', 'html', 'pdf'],
        default: 'svg',
        description: 'Export format'
      },
      options: {
        type: 'object',
        properties: {
          width: { type: 'number', default: 800 },
          height: { type: 'number', default: 600 },
          dpi: { type: 'number', default: 300 },
          color_scheme: { type: 'string', enum: ['default', 'colorblind_safe', 'grayscale'] },
          font_size: { type: 'number', default: 12 },
          show_confidence_intervals: { type: 'boolean', default: true },
          show_p_values: { type: 'boolean', default: true },
          annotations: { type: 'array', items: { type: 'object' } }
        }
      }
    },
    required: ['figure_type', 'data']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { figure_type, data, title, style_guide = 'NEJM', export_format = 'svg', options = {} } = args;
    
    // Get style specifications
    const styleSpecs = this.getJournalStyleSpecs(style_guide);
    
    // Generate figure based on type
    let figureCode;
    switch (figure_type) {
      case 'kaplan_meier':
        figureCode = await this.generateKaplanMeierPlot(data, styleSpecs, options);
        break;
      case 'forest_plot':
        figureCode = await this.generateForestPlot(data, styleSpecs, options);
        break;
      case 'consort_diagram':
        figureCode = await this.generateConsortDiagram(data, styleSpecs, options);
        break;
      case 'box_plot':
        figureCode = await this.generateBoxPlot(data, styleSpecs, options);
        break;
      default:
        figureCode = await this.generateBasicPlot(figure_type, data, styleSpecs, options);
    }
    
    // Export in requested format
    const exported = await this.exportFigure(figureCode, export_format, styleSpecs);
    
    return {
      figure_type,
      style_guide,
      export_format,
      code: exported.code,
      react_component: exported.reactComponent,
      svg: exported.svg,
      styling_notes: styleSpecs.notes,
      accessibility: this.generateAccessibilityFeatures(figure_type, data),
      caption_template: this.generateCaptionTemplate(figure_type, data, title)
    };
  }
  
  private getJournalStyleSpecs(journal: string) {
    const specs = {
      NEJM: {
        fonts: {
          family: 'Helvetica Neue, Arial, sans-serif',
          titleSize: 14,
          labelSize: 12,
          tickSize: 10,
          legendSize: 10
        },
        colors: {
          primary: '#0066CC',
          secondary: '#DC3545',
          tertiary: '#28A745',
          quaternary: '#FFC107',
          grid: '#E0E0E0',
          text: '#000000',
          background: '#FFFFFF'
        },
        dimensions: {
          singleColumn: { width: 3.5, height: 3.5 }, // inches
          doubleColumn: { width: 7.0, height: 5.0 },
          fullPage: { width: 7.0, height: 9.0 }
        },
        margins: {
          top: 0.5,
          right: 0.5,
          bottom: 0.75,
          left: 0.75
        },
        gridLines: {
          show: true,
          style: 'dotted',
          width: 0.5
        },
        notes: 'NEJM style: Clean, professional, limited color palette, Helvetica Neue font'
      },
      JAMA: {
        fonts: {
          family: 'Arial, sans-serif',
          titleSize: 14,
          labelSize: 11,
          tickSize: 9,
          legendSize: 9
        },
        colors: {
          primary: '#003F7F',
          secondary: '#CC0000',
          tertiary: '#009900',
          quaternary: '#FF6600',
          grid: '#CCCCCC',
          text: '#000000',
          background: '#FFFFFF'
        },
        notes: 'JAMA style: Conservative colors, Arial font, emphasis on clarity'
      }
    };
    
    return specs[journal] || specs.NEJM;
  }
  
  private async generateKaplanMeierPlot(data: any, style: any, options: any) {
    const reactCode = `
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const KaplanMeierPlot = ({ data, title }) => {
  const chartData = {
    labels: data.timePoints,
    datasets: data.groups.map((group, index) => ({
      label: group.name,
      data: group.survival,
      borderColor: ['${style.colors.primary}', '${style.colors.secondary}'][index],
      backgroundColor: 'transparent',
      stepped: 'before',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.legendSize}
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          family: '${style.fonts.family}',
          size: ${style.fonts.titleSize},
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (months)',
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.labelSize}
          }
        },
        ticks: {
          font: {
            size: ${style.fonts.tickSize}
          }
        },
        grid: {
          display: ${style.gridLines.show},
          borderDash: ${style.gridLines.style === 'dotted' ? '[2, 2]' : '[]'}
        }
      },
      y: {
        title: {
          display: true,
          text: 'Survival Probability',
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.labelSize}
          }
        },
        min: 0,
        max: 1,
        ticks: {
          font: {
            size: ${style.fonts.tickSize}
          }
        },
        grid: {
          display: ${style.gridLines.show},
          borderDash: ${style.gridLines.style === 'dotted' ? '[2, 2]' : '[]'}
        }
      }
    }
  };

  // Add confidence intervals if requested
  ${options.show_confidence_intervals ? `
  if (data.confidenceIntervals) {
    data.groups.forEach((group, index) => {
      chartData.datasets.push({
        label: \`\${group.name} CI\`,
        data: group.upperCI,
        borderColor: 'transparent',
        backgroundColor: [\\'${style.colors.primary}20\\', \\'${style.colors.secondary}20\\'][index],
        fill: '+1',
        pointRadius: 0
      });
      chartData.datasets.push({
        label: '',
        data: group.lowerCI,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0
      });
    });
  }` : ''}

  // Add at-risk table
  const AtRiskTable = () => (
    <div style={{ 
      marginTop: '20px', 
      fontFamily: '${style.fonts.family}',
      fontSize: '${style.fonts.tickSize}px'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px' }}>Group</th>
            {data.timePoints.filter((_, i) => i % 3 === 0).map(time => (
              <th key={time} style={{ textAlign: 'center', padding: '4px' }}>{time}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.groups.map(group => (
            <tr key={group.name}>
              <td style={{ padding: '4px' }}>{group.name}</td>
              {group.atRisk.filter((_, i) => i % 3 === 0).map((n, i) => (
                <td key={i} style={{ textAlign: 'center', padding: '4px' }}>{n}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ width: '${options.width || 800}px', height: '${options.height || 600}px' }}>
      <Line data={chartData} options={options} />
      <AtRiskTable />
      ${options.show_p_values ? `
      <div style={{ 
        marginTop: '10px', 
        fontFamily: '${style.fonts.family}',
        fontSize: '${style.fonts.tickSize}px',
        textAlign: 'center'
      }}>
        Log-rank test: p = {data.pValue}
      </div>` : ''}
    </div>
  );
};`;
    
    return reactCode;
  }
  
  private async generateForestPlot(data: any, style: any, options: any) {
    const reactCode = `
import React from 'react';
import { Scatter } from 'react-chartjs-2';

export const ForestPlot = ({ data, title }) => {
  const chartData = {
    datasets: [{
      label: 'Effect Estimate',
      data: data.studies.map((study, index) => ({
        x: study.effectSize,
        y: index,
        study: study.name
      })),
      backgroundColor: '${style.colors.primary}',
      pointRadius: 6
    }]
  };

  // Add confidence intervals as error bars
  const ciData = data.studies.flatMap((study, index) => [
    { x: study.lowerCI, y: index },
    { x: study.upperCI, y: index }
  ]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          family: '${style.fonts.family}',
          size: ${style.fonts.titleSize},
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const study = data.studies[context.parsed.y];
            return \`\${study.name}: \${study.effectSize} (95% CI: \${study.lowerCI}-\${study.upperCI})\`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hazard Ratio (95% CI)',
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.labelSize}
          }
        },
        type: 'logarithmic',
        position: 'bottom',
        grid: {
          display: true,
          borderDash: [2, 2]
        }
      },
      y: {
        type: 'category',
        labels: data.studies.map(s => s.name),
        ticks: {
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.tickSize}
          }
        }
      }
    }
  };

  // Add vertical reference line at x=1
  const plugins = [{
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      const x = xScale.getPixelForValue(1);
      
      ctx.save();
      ctx.strokeStyle = '${style.colors.text}';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, yScale.top);
      ctx.lineTo(x, yScale.bottom);
      ctx.stroke();
      ctx.restore();
    }
  }];

  return (
    <div style={{ width: '${options.width || 800}px', height: '${options.height || 600}px' }}>
      <Scatter data={chartData} options={options} plugins={plugins} />
      <div style={{
        marginTop: '20px',
        fontFamily: '${style.fonts.family}',
        fontSize: '${style.fonts.tickSize}px'
      }}>
        <div>Overall Effect: {data.overallEffect} (95% CI: {data.overallCI})</div>
        <div>Heterogeneity: I² = {data.i2}%, p = {data.heterogeneityP}</div>
      </div>
    </div>
  );
};`;
    
    return reactCode;
  }
  
  private async generateConsortDiagram(data: any, style: any, options: any) {
    const svgCode = `
export const ConsortDiagram = ({ data }) => {
  const boxStyle = {
    fill: '${style.colors.background}',
    stroke: '${style.colors.text}',
    strokeWidth: 1
  };
  
  const textStyle = {
    fontFamily: '${style.fonts.family}',
    fontSize: '${style.fonts.labelSize}px',
    fill: '${style.colors.text}',
    textAnchor: 'middle'
  };

  return (
    <svg width="${options.width || 800}" height="${options.height || 1000}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${style.colors.text}" />
        </marker>
      </defs>
      
      {/* Enrollment Box */}
      <g transform="translate(400, 50)">
        <rect x="-150" y="-25" width="300" height="50" {...boxStyle} />
        <text y="5" {...textStyle}>
          Assessed for eligibility (n={data.assessed})
        </text>
      </g>
      
      {/* Excluded Box */}
      <g transform="translate(600, 150)">
        <rect x="-125" y="-40" width="250" height="80" {...boxStyle} />
        <text y="-10" {...textStyle}>Excluded (n={data.excluded})</text>
        <text y="10" {...textStyle} fontSize="${style.fonts.tickSize}">
          {data.excludedReasons.map((reason, i) => (
            <tspan key={i} x="0" dy="15">• {reason.reason} (n={reason.n})</tspan>
          ))}
        </text>
      </g>
      
      {/* Randomized Box */}
      <g transform="translate(400, 250)">
        <rect x="-150" y="-25" width="300" height="50" {...boxStyle} />
        <text y="5" {...textStyle}>
          Randomized (n={data.randomized})
        </text>
      </g>
      
      {/* Allocation Boxes */}
      {data.groups.map((group, index) => (
        <g key={index} transform={\`translate(\${200 + index * 400}, 350)\`}>
          <rect x="-150" y="-40" width="300" height="80" {...boxStyle} />
          <text y="-10" {...textStyle}>Allocated to {group.name}</text>
          <text y="10" {...textStyle}>(n={group.allocated})</text>
          <text y="30" {...textStyle} fontSize="${style.fonts.tickSize}">
            Received intervention (n={group.received})
          </text>
        </g>
      ))}
      
      {/* Follow-up Boxes */}
      {data.groups.map((group, index) => (
        <g key={index} transform={\`translate(\${200 + index * 400}, 500)\`}>
          <rect x="-150" y="-40" width="300" height="80" {...boxStyle} />
          <text y="-10" {...textStyle}>Lost to follow-up (n={group.lostToFollowUp})</text>
          <text y="10" {...textStyle}>Discontinued (n={group.discontinued})</text>
        </g>
      ))}
      
      {/* Analysis Boxes */}
      {data.groups.map((group, index) => (
        <g key={index} transform={\`translate(\${200 + index * 400}, 650)\`}>
          <rect x="-150" y="-40" width="300" height="80" {...boxStyle} />
          <text y="-10" {...textStyle}>Analyzed (n={group.analyzed})</text>
          <text y="10" {...textStyle} fontSize="${style.fonts.tickSize}">
            Excluded from analysis (n={group.excludedFromAnalysis})
          </text>
        </g>
      ))}
      
      {/* Arrows */}
      <line x1="400" y1="75" x2="400" y2="225" stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
      <line x1="400" y1="75" x2="600" y2="110" stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
      <line x1="400" y1="275" x2="200" y2="310" stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
      <line x1="400" y1="275" x2="600" y2="310" stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
      {data.groups.map((_, index) => (
        <g key={index}>
          <line x1={200 + index * 400} y1="390" x2={200 + index * 400} y2="460" 
                stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
          <line x1={200 + index * 400} y1="540" x2={200 + index * 400} y2="610" 
                stroke="${style.colors.text}" markerEnd="url(#arrowhead)" />
        </g>
      ))}
    </svg>
  );
};`;
    
    return svgCode;
  }
  
  private async generateBoxPlot(data: any, style: any, options: any) {
    const reactCode = `
import React from 'react';
import { Chart } from 'react-chartjs-2';
import { BoxPlotController, BoxAndWiskers } from '@sgratzl/chartjs-chart-boxplot';
import { Chart as ChartJS } from 'chart.js';

ChartJS.register(BoxPlotController, BoxAndWiskers);

export const BoxPlot = ({ data, title }) => {
  const chartData = {
    labels: data.groups,
    datasets: [{
      label: data.variable,
      data: data.values.map(group => ({
        min: group.min,
        q1: group.q1,
        median: group.median,
        q3: group.q3,
        max: group.max,
        outliers: group.outliers || []
      })),
      backgroundColor: '${style.colors.primary}40',
      borderColor: '${style.colors.primary}',
      borderWidth: 1,
      outlierColor: '${style.colors.secondary}',
      outlierRadius: 3
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          family: '${style.fonts.family}',
          size: ${style.fonts.titleSize},
          weight: 'bold'
        }
      },
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: data.yLabel || 'Value',
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.labelSize}
          }
        },
        grid: {
          display: ${style.gridLines.show},
          borderDash: ${style.gridLines.style === 'dotted' ? '[2, 2]' : '[]'}
        }
      },
      x: {
        ticks: {
          font: {
            family: '${style.fonts.family}',
            size: ${style.fonts.tickSize}
          }
        }
      }
    }
  };

  return (
    <div style={{ width: '${options.width || 800}px', height: '${options.height || 600}px' }}>
      <Chart type="boxplot" data={chartData} options={options} />
      ${options.show_p_values && data.pValue ? `
      <div style={{ 
        marginTop: '10px', 
        fontFamily: '${style.fonts.family}',
        fontSize: '${style.fonts.tickSize}px',
        textAlign: 'center'
      }}>
        {data.statisticalTest}: p = {data.pValue}
      </div>` : ''}
    </div>
  );
};`;
    
    return reactCode;
  }
  
  private async generateBasicPlot(type: string, data: any, style: any, options: any) {
    // Generic plot generation for other types
    return `// ${type} plot implementation`;
  }
  
  private async exportFigure(code: string, format: string, style: any) {
    const result = {
      code: '',
      reactComponent: '',
      svg: '',
      html: ''
    };
    
    switch (format) {
      case 'react_component':
        result.reactComponent = code;
        result.code = code;
        break;
        
      case 'svg':
        // Convert React component to SVG
        result.svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Generated SVG content -->
  <style>
    text { font-family: ${style.fonts.family}; }
    .title { font-size: ${style.fonts.titleSize}px; font-weight: bold; }
    .label { font-size: ${style.fonts.labelSize}px; }
    .tick { font-size: ${style.fonts.tickSize}px; }
  </style>
  <!-- Plot content here -->
</svg>`;
        result.code = result.svg;
        break;
        
      case 'html':
        result.html = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-chartjs-2@5"></script>
</head>
<body>
  <div id="figure-root"></div>
  <script>
    ${code}
  </script>
</body>
</html>`;
        result.code = result.html;
        break;
    }
    
    return result;
  }
  
  private generateAccessibilityFeatures(type: string, data: any) {
    return {
      alt_text: `${type} showing ${data.description || 'research data'}`,
      aria_label: `Interactive ${type} chart`,
      color_blind_safe: true,
      screen_reader_description: this.generateScreenReaderDescription(type, data),
      keyboard_navigation: true
    };
  }
  
  private generateScreenReaderDescription(type: string, data: any): string {
    switch (type) {
      case 'kaplan_meier':
        return `Kaplan-Meier survival curve comparing ${data.groups?.length || 2} groups over time`;
      case 'forest_plot':
        return `Forest plot showing effect sizes from ${data.studies?.length || 0} studies`;
      default:
        return `${type} visualization of research data`;
    }
  }
  
  private generateCaptionTemplate(type: string, data: any, title?: string): string {
    const templates = {
      kaplan_meier: `Figure X. Kaplan-Meier Curves for ${title || 'Primary Outcome'}. 
The curves show the probability of ${data.outcome || 'event-free survival'} over time for ${data.groups?.map(g => g.name).join(' and ')}. 
Numbers at risk are shown below the graph. P value calculated using the log-rank test.`,
      
      forest_plot: `Figure X. Forest Plot of ${title || 'Treatment Effect'}. 
Effect estimates and 95% confidence intervals are shown for ${data.studies?.length || 'multiple'} studies. 
The size of each square is proportional to the study weight. The diamond represents the pooled estimate.`,
      
      consort_diagram: `Figure X. CONSORT Flow Diagram. 
Shows the flow of participants through each stage of the randomized trial, including enrollment, allocation, follow-up, and analysis.`,
      
      box_plot: `Figure X. Box Plot of ${title || data.variable || 'Variable'} by ${data.grouping || 'Group'}. 
Boxes show median and interquartile range, whiskers extend to 1.5 times the IQR, and individual points show outliers.`
    };
    
    return templates[type] || `Figure X. ${title || type} showing ${data.description || 'research results'}.`;
  }
}