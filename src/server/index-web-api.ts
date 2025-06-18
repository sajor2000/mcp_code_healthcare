#!/usr/bin/env node
/**
 * Web API version of Healthcare Research MCP Server
 * For hosting on Replit/Vercel - provides REST API instead of MCP protocol
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
app.use(cors());
app.use(express.json());

// Port for Replit/Vercel
const PORT = process.env.PORT || 3000;

// Medical knowledge base (same as standalone)
const MEDICAL_KNOWLEDGE = {
  sepsis: {
    definition: 'Life-threatening organ dysfunction caused by dysregulated host response to infection',
    icd10_codes: ['A41.9', 'A41.0', 'A41.1', 'A41.2'],
    treatment: ['Early antibiotics', 'Fluid resuscitation', 'Source control']
  },
  vancomycin: {
    class: 'Glycopeptide antibiotic',
    rxnorm_code: '11124',
    dosing: 'Weight-based, typically 15-20 mg/kg IV q8-12h'
  }
};

// REST API endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'Healthcare Research API',
    version: '1.0.0',
    endpoints: {
      '/api/query': 'POST - Natural language medical query',
      '/api/knowledge/:concept': 'GET - Medical knowledge lookup',
      '/api/generate-code': 'POST - Generate analysis code',
      '/health': 'GET - Health check'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Natural language query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    // Simple pattern matching (in production, would use LLM)
    const queryLower = query.toLowerCase();
    const hasSepsis = queryLower.includes('sepsis');
    const hasVancomycin = queryLower.includes('vancomycin');
    
    const response = {
      parsed_query: {
        original: query,
        entities: [
          ...(hasSepsis ? [{ text: 'sepsis', type: 'condition', codes: ['A41.9'] }] : []),
          ...(hasVancomycin ? [{ text: 'vancomycin', type: 'medication', codes: ['11124'] }] : [])
        ]
      },
      hypothesis: hasSepsis && hasVancomycin ? 
        'Vancomycin may reduce mortality in sepsis patients' : null,
      suggested_analysis: 'Cohort comparison with propensity matching'
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Medical knowledge lookup
app.get('/api/knowledge/:concept', (req, res) => {
  const { concept } = req.params;
  const knowledge = MEDICAL_KNOWLEDGE[concept.toLowerCase()];
  
  if (knowledge) {
    res.json({ concept, ...knowledge });
  } else {
    res.status(404).json({ 
      error: 'Concept not found',
      available: Object.keys(MEDICAL_KNOWLEDGE)
    });
  }
});

// Generate code endpoint
app.post('/api/generate-code', (req, res) => {
  const { analysis_spec, language = 'R' } = req.body;
  
  const code = language === 'R' ? `
# Generated R code
library(tidyverse)
# Load your data here
data <- read_csv("your_data.csv")
# Analysis code...` : `
# Generated Python code  
import pandas as pd
# Load your data here
data = pd.read_csv("your_data.csv")
# Analysis code...`;
  
  res.json({ code, language });
});

// Start server
app.listen(PORT, () => {
  console.log(`Healthcare Research API running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} for API documentation`);
});

// For Vercel
export default app;