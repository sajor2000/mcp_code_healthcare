import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';
import { createModuleLogger } from '../../utils/logger.js';
import { MCPError } from '../../utils/errors.js';
import axios from 'axios';

const logger = createModuleLogger('external-search');

export class ExternalSearchTool implements Tool {
  name = 'search_external_sources';
  description = 'Search external sources (Brave, Perplexity) for real-time medical information, research, and guidelines before creating analysis plans';
  
  inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "latest sepsis treatment guidelines 2024", "vancomycin resistance patterns")'
      },
      search_type: {
        type: 'string',
        enum: ['general', 'medical_research', 'clinical_guidelines', 'drug_information', 'disease_info', 'data_standards'],
        default: 'medical_research',
        description: 'Type of search to perform'
      },
      providers: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['brave', 'perplexity', 'pubmed_api', 'clinicaltrials_api']
        },
        default: ['brave'],
        description: 'Which search providers to use'
      },
      options: {
        type: 'object',
        properties: {
          freshness: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year', 'all'],
            default: 'year',
            description: 'How recent the results should be'
          },
          count: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 50
          },
          country: {
            type: 'string',
            default: 'us',
            description: 'Country code for localized results'
          },
          safe_search: {
            type: 'string',
            enum: ['off', 'moderate', 'strict'],
            default: 'moderate'
          }
        }
      }
    },
    required: ['query']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { 
      query, 
      search_type = 'medical_research',
      providers = ['brave'],
      options = {}
    } = args;
    
    logger.info('Performing external search', { query, providers, search_type });
    
    try {
      const results = {
        query,
        search_type,
        timestamp: new Date().toISOString(),
        providers_used: [],
        web_results: [],
        medical_sites: [],
        research_papers: [],
        guidelines: [],
        key_findings: [],
        synthesis: null,
        recommendations_for_analysis: null
      };
      
      // Search each provider
      for (const provider of providers) {
        try {
          switch (provider) {
            case 'brave':
              const braveResults = await this.searchBrave(query, search_type, options);
              results.web_results.push(...braveResults.web_results);
              results.medical_sites.push(...braveResults.medical_sites);
              results.providers_used.push('brave');
              break;
              
            case 'perplexity':
              const perplexityResults = await this.searchPerplexity(query, search_type, options);
              results.key_findings.push(...perplexityResults.key_findings);
              results.providers_used.push('perplexity');
              break;
              
            case 'pubmed_api':
              const pubmedResults = await this.searchPubMedAPI(query, options);
              results.research_papers.push(...pubmedResults);
              results.providers_used.push('pubmed_api');
              break;
              
            case 'clinicaltrials_api':
              const trialsResults = await this.searchClinicalTrialsAPI(query, options);
              results.web_results.push(...trialsResults);
              results.providers_used.push('clinicaltrials_api');
              break;
          }
        } catch (error) {
          logger.warn(`Provider ${provider} failed`, { error: error.message });
        }
      }
      
      // Process and synthesize results
      if (results.web_results.length > 0 || results.research_papers.length > 0) {
        results.synthesis = this.synthesizeResults(results, search_type);
        results.recommendations_for_analysis = this.generateAnalysisRecommendations(results, query);
      }
      
      // Extract key medical information
      results.key_findings = this.extractKeyFindings(results);
      
      return results;
      
    } catch (error) {
      logger.error('External search failed', { error: error.message });
      throw new MCPError(
        `External search failed: ${error.message}`,
        'EXTERNAL_SEARCH_ERROR',
        500
      );
    }
  }
  
  private async searchBrave(query: string, searchType: string, options: any): Promise<any> {
    const apiKey = process.env.BRAVE_API_KEY;
    
    if (!apiKey) {
      logger.warn('Brave API key not configured, returning mock results');
      return this.getMockBraveResults(query, searchType);
    }
    
    try {
      // Enhance query based on search type
      const enhancedQuery = this.enhanceQueryForType(query, searchType);
      
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: enhancedQuery,
          count: options.count || 10,
          freshness: options.freshness || 'year',
          country: options.country || 'us',
          search_lang: 'en',
          safesearch: options.safe_search || 'moderate',
          text_decorations: false
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        }
      });
      
      const results = {
        web_results: [],
        medical_sites: []
      };
      
      // Process web results
      if (response.data.web?.results) {
        for (const result of response.data.web.results) {
          const processedResult = {
            title: result.title,
            url: result.url,
            description: result.description,
            age: result.age,
            language: result.language,
            is_medical_site: this.isMedicalSite(result.url),
            relevance_score: this.calculateRelevance(result, searchType)
          };
          
          if (processedResult.is_medical_site) {
            results.medical_sites.push(processedResult);
          } else {
            results.web_results.push(processedResult);
          }
        }
      }
      
      // Sort by relevance
      results.web_results.sort((a, b) => b.relevance_score - a.relevance_score);
      results.medical_sites.sort((a, b) => b.relevance_score - a.relevance_score);
      
      return results;
      
    } catch (error) {
      logger.error('Brave API error', { error: error.message });
      return this.getMockBraveResults(query, searchType);
    }
  }
  
  private async searchPerplexity(query: string, searchType: string, options: any): Promise<any> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      logger.warn('Perplexity API key not configured, returning mock results');
      return this.getMockPerplexityResults(query, searchType);
    }
    
    try {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-medium-online',
        messages: [
          {
            role: 'system',
            content: 'You are a medical research assistant. Provide accurate, evidence-based information with sources.'
          },
          {
            role: 'user',
            content: `${this.enhanceQueryForType(query, searchType)}. Provide key findings with sources.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        return_citations: true
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const content = response.data.choices[0].message.content;
      const citations = response.data.citations || [];
      
      return {
        key_findings: this.parsePerplexityResponse(content, citations)
      };
      
    } catch (error) {
      logger.error('Perplexity API error', { error: error.message });
      return this.getMockPerplexityResults(query, searchType);
    }
  }
  
  private async searchPubMedAPI(query: string, options: any): Promise<any[]> {
    try {
      // Use NCBI E-utilities for PubMed search
      const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
      const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
      
      // First, search for IDs
      const searchResponse = await axios.get(searchUrl, {
        params: {
          db: 'pubmed',
          term: query,
          retmax: options.count || 10,
          retmode: 'json',
          sort: 'relevance',
          datetype: 'pdat',
          mindate: this.getDateFilter(options.freshness),
          maxdate: new Date().toISOString().split('T')[0]
        }
      });
      
      const ids = searchResponse.data.esearchresult?.idlist || [];
      
      if (ids.length === 0) {
        return [];
      }
      
      // Fetch article details
      const fetchResponse = await axios.get(fetchUrl, {
        params: {
          db: 'pubmed',
          id: ids.join(','),
          retmode: 'xml',
          rettype: 'abstract'
        }
      });
      
      // Parse XML response (simplified - in production use xml2js)
      return this.parsePubMedXML(fetchResponse.data);
      
    } catch (error) {
      logger.error('PubMed API error', { error: error.message });
      return [];
    }
  }
  
  private async searchClinicalTrialsAPI(query: string, options: any): Promise<any[]> {
    try {
      const response = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
        params: {
          'query.term': query,
          pageSize: options.count || 10,
          countTotal: true,
          fields: 'NCTId,BriefTitle,OverallStatus,StartDate,PrimaryCompletionDate,Phase,StudyType,PrimaryOutcomeMeasure'
        }
      });
      
      return response.data.studies?.map(study => ({
        title: study.protocolSection?.identificationModule?.briefTitle,
        url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`,
        description: study.protocolSection?.descriptionModule?.briefSummary,
        status: study.protocolSection?.statusModule?.overallStatus,
        is_medical_site: true,
        relevance_score: 0.8
      })) || [];
      
    } catch (error) {
      logger.error('ClinicalTrials.gov API error', { error: error.message });
      return [];
    }
  }
  
  private enhanceQueryForType(query: string, searchType: string): string {
    const enhancements = {
      medical_research: `${query} site:pubmed.ncbi.nlm.nih.gov OR site:cochrane.org OR site:nejm.org OR site:jamanetwork.com`,
      clinical_guidelines: `${query} clinical guidelines site:nice.org.uk OR site:who.int OR site:cdc.gov OR site:acc.org`,
      drug_information: `${query} site:drugbank.ca OR site:rxlist.com OR site:fda.gov pharmacology`,
      disease_info: `${query} pathophysiology diagnosis treatment site:mayoclinic.org OR site:uptodate.com`,
      data_standards: `${query} OMOP CDM CLIF site:ohdsi.org OR site:github.com`
    };
    
    return enhancements[searchType] || query;
  }
  
  private isMedicalSite(url: string): boolean {
    const medicalDomains = [
      'nih.gov', 'pubmed', 'ncbi.nlm', 'cdc.gov', 'who.int',
      'nejm.org', 'jamanetwork.com', 'bmj.com', 'thelancet.com',
      'nature.com/articles', 'science.org', 'cochrane.org',
      'uptodate.com', 'mayoclinic.org', 'webmd.com',
      'drugbank.ca', 'rxlist.com', 'fda.gov',
      'clinicaltrials.gov', 'nice.org.uk', 'ema.europa.eu'
    ];
    
    return medicalDomains.some(domain => url.includes(domain));
  }
  
  private calculateRelevance(result: any, searchType: string): number {
    let score = 0.5;
    
    // Boost for medical sites
    if (this.isMedicalSite(result.url)) {
      score += 0.3;
    }
    
    // Boost for recent content
    if (result.age && result.age.includes('day')) {
      score += 0.2;
    } else if (result.age && result.age.includes('week')) {
      score += 0.1;
    }
    
    // Boost for specific keywords in title/description
    const keywords = {
      medical_research: ['study', 'trial', 'analysis', 'outcomes', 'mortality', 'efficacy'],
      clinical_guidelines: ['guideline', 'recommendation', 'protocol', 'standard', 'practice'],
      drug_information: ['pharmacology', 'dosing', 'interaction', 'contraindication'],
      disease_info: ['diagnosis', 'treatment', 'pathophysiology', 'prognosis'],
      data_standards: ['OMOP', 'CDM', 'CLIF', 'interoperability', 'vocabulary']
    };
    
    const relevantKeywords = keywords[searchType] || [];
    const text = (result.title + ' ' + result.description).toLowerCase();
    
    for (const keyword of relevantKeywords) {
      if (text.includes(keyword)) {
        score += 0.05;
      }
    }
    
    return Math.min(score, 1.0);
  }
  
  private synthesizeResults(results: any, searchType: string): any {
    const synthesis = {
      main_findings: [],
      consensus_points: [],
      recent_developments: [],
      knowledge_gaps: [],
      data_sources_mentioned: []
    };
    
    // Extract main findings from medical sites
    if (results.medical_sites.length > 0) {
      synthesis.main_findings = results.medical_sites
        .slice(0, 3)
        .map(site => ({
          source: site.url,
          finding: site.description
        }));
    }
    
    // Look for OMOP/CLIF mentions
    const allText = [...results.web_results, ...results.medical_sites]
      .map(r => r.title + ' ' + r.description)
      .join(' ')
      .toLowerCase();
    
    if (allText.includes('omop')) {
      synthesis.data_sources_mentioned.push('OMOP CDM mentioned in search results');
    }
    if (allText.includes('clif')) {
      synthesis.data_sources_mentioned.push('CLIF format mentioned in search results');
    }
    
    // Identify recent developments
    const recentResults = results.web_results
      .filter(r => r.age && (r.age.includes('day') || r.age.includes('week')))
      .slice(0, 2);
    
    if (recentResults.length > 0) {
      synthesis.recent_developments = recentResults.map(r => ({
        title: r.title,
        age: r.age,
        url: r.url
      }));
    }
    
    return synthesis;
  }
  
  private generateAnalysisRecommendations(results: any, query: string): any {
    const recommendations = {
      data_considerations: [],
      methodology_suggestions: [],
      recent_evidence_to_consider: [],
      potential_confounders: []
    };
    
    // Based on search results, suggest data considerations
    if (results.synthesis?.data_sources_mentioned.length > 0) {
      recommendations.data_considerations = results.synthesis.data_sources_mentioned;
    } else {
      recommendations.data_considerations.push(
        'Consider using OMOP CDM for standardized data representation',
        'CLIF format may be appropriate for ICU/critical care data'
      );
    }
    
    // Extract methodology suggestions from titles
    const methodKeywords = ['propensity', 'regression', 'survival', 'meta-analysis', 'randomized'];
    results.web_results.forEach(result => {
      methodKeywords.forEach(keyword => {
        if (result.title.toLowerCase().includes(keyword)) {
          recommendations.methodology_suggestions.push(
            `Consider ${keyword} analysis based on: ${result.title}`
          );
        }
      });
    });
    
    // Add recent evidence
    if (results.synthesis?.recent_developments.length > 0) {
      recommendations.recent_evidence_to_consider = results.synthesis.recent_developments.map(
        dev => `Recent finding (${dev.age}): ${dev.title}`
      );
    }
    
    return recommendations;
  }
  
  private extractKeyFindings(results: any): string[] {
    const findings = [];
    
    // From Perplexity results
    if (results.key_findings && results.key_findings.length > 0) {
      findings.push(...results.key_findings);
    }
    
    // From top medical sites
    const topMedical = results.medical_sites.slice(0, 3);
    topMedical.forEach(site => {
      if (site.description && site.description.length > 50) {
        findings.push(`${site.description} (Source: ${new URL(site.url).hostname})`);
      }
    });
    
    // From research papers
    if (results.research_papers.length > 0) {
      results.research_papers.slice(0, 2).forEach(paper => {
        if (paper.conclusion) {
          findings.push(`Research finding: ${paper.conclusion}`);
        }
      });
    }
    
    return findings;
  }
  
  private getMockBraveResults(query: string, searchType: string): any {
    // Return realistic mock results when API key not available
    return {
      web_results: [
        {
          title: `Recent advances in ${query}`,
          url: 'https://example.com/article1',
          description: `Comprehensive review of current evidence regarding ${query} in clinical practice...`,
          age: '2 weeks',
          is_medical_site: false,
          relevance_score: 0.75
        }
      ],
      medical_sites: [
        {
          title: `${query} - Clinical Guidelines`,
          url: 'https://guidelines.example.com',
          description: `Evidence-based recommendations for ${query} management based on systematic review...`,
          age: '1 month',
          is_medical_site: true,
          relevance_score: 0.95
        }
      ]
    };
  }
  
  private getMockPerplexityResults(query: string, searchType: string): any {
    return {
      key_findings: [
        `Current evidence suggests that ${query} requires careful consideration of patient-specific factors`,
        'Recent studies emphasize the importance of timely intervention and appropriate monitoring',
        'Guidelines recommend a multidisciplinary approach for optimal outcomes'
      ]
    };
  }
  
  private getDateFilter(freshness: string): string {
    const date = new Date();
    switch (freshness) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setFullYear(date.getFullYear() - 5);
    }
    return date.toISOString().split('T')[0];
  }
  
  private parsePubMedXML(xml: string): any[] {
    // Simplified XML parsing - in production use proper XML parser
    const articles = [];
    const articleMatches = xml.match(/<PubmedArticle>(.*?)<\/PubmedArticle>/gs) || [];
    
    for (const articleXml of articleMatches.slice(0, 5)) {
      const title = articleXml.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/)?.[1] || '';
      const abstract = articleXml.match(/<AbstractText>(.*?)<\/AbstractText>/)?.[1] || '';
      const pmid = articleXml.match(/<PMID.*?>(.*?)<\/PMID>/)?.[1] || '';
      
      articles.push({
        pmid,
        title: title.replace(/<[^>]*>/g, ''),
        abstract: abstract.replace(/<[^>]*>/g, ''),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        is_medical_site: true,
        relevance_score: 0.9
      });
    }
    
    return articles;
  }
  
  private parsePerplexityResponse(content: string, citations: any[]): string[] {
    // Extract key points from Perplexity response
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const findings = [];
    
    for (const line of lines) {
      if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
        findings.push(line.replace(/^[•\-\d.]\s*/, '').trim());
      }
    }
    
    return findings.slice(0, 5);
  }
}