import axios from 'axios';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import { logger, createModuleLogger, PerformanceLogger } from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';
import PQueue from 'p-queue';
import { parse } from 'csv-parse/sync';

const scraperLogger = createModuleLogger('ontology-scraper');

export interface ScrapingConfig {
  concurrency?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  userAgent?: string;
  rateLimit?: number; // requests per second
}

export class OntologyScraper {
  private queue: PQueue;
  private config: Required<ScrapingConfig>;
  
  constructor(config: ScrapingConfig = {}) {
    this.config = {
      concurrency: config.concurrency || 3,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 30000,
      userAgent: config.userAgent || 'HealthcareResearchMCP/1.0',
      rateLimit: config.rateLimit || 2
    };
    
    this.queue = new PQueue({
      concurrency: this.config.concurrency,
      interval: 1000,
      intervalCap: this.config.rateLimit
    });
  }

  async scrapeICD10(outputPath: string): Promise<void> {
    const perf = new PerformanceLogger('icd10-scraping');
    scraperLogger.info('Starting ICD-10 scraping');
    
    try {
      // CMS provides ICD-10 data in various formats
      const sources = [
        {
          name: 'ICD-10-CM Codes',
          url: 'https://www.cms.gov/medicare/coding-billing/icd-10-codes/downloads',
          parser: this.parseICD10CMSPage.bind(this)
        },
        {
          name: 'ICD-10 Browser',
          url: 'https://icd.who.int/browse10/2019/en',
          parser: this.parseICD10WHOPage.bind(this)
        }
      ];
      
      const allCodes: any[] = [];
      
      for (const source of sources) {
        try {
          scraperLogger.info(`Scraping ${source.name}`);
          const codes = await this.queue.add(async () => {
            return await this.scrapeWithRetry(source.url, source.parser);
          });
          allCodes.push(...codes);
        } catch (error) {
          scraperLogger.error(`Failed to scrape ${source.name}`, { error: error.message });
        }
      }
      
      // Remove duplicates
      const uniqueCodes = this.deduplicateCodes(allCodes, 'code');
      
      // Save to file
      await fs.writeFile(
        outputPath,
        JSON.stringify(uniqueCodes, null, 2)
      );
      
      perf.end({ totalCodes: uniqueCodes.length });
      scraperLogger.info('ICD-10 scraping completed', { totalCodes: uniqueCodes.length });
      
    } catch (error) {
      perf.end({ success: false });
      throw new ExternalServiceError('ICD-10 scraping', error.message, error);
    }
  }

  async scrapeSNOMED(outputPath: string): Promise<void> {
    const perf = new PerformanceLogger('snomed-scraping');
    scraperLogger.info('Starting SNOMED CT scraping');
    
    try {
      // SNOMED requires authentication for full access
      // This is a simplified version for demonstration
      const snomedData = await this.scrapeSNOMEDBrowser();
      
      await fs.writeFile(
        outputPath,
        JSON.stringify(snomedData, null, 2)
      );
      
      perf.end({ totalConcepts: snomedData.length });
      scraperLogger.info('SNOMED scraping completed', { totalConcepts: snomedData.length });
      
    } catch (error) {
      perf.end({ success: false });
      throw new ExternalServiceError('SNOMED scraping', error.message, error);
    }
  }

  async scrapeRxNorm(outputPath: string): Promise<void> {
    const perf = new PerformanceLogger('rxnorm-scraping');
    scraperLogger.info('Starting RxNorm scraping');
    
    try {
      // RxNorm API endpoints
      const endpoints = [
        'https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty=IN+BN+SCD',
        'https://rxnav.nlm.nih.gov/REST/Prescribe/allconcepts.json'
      ];
      
      const allConcepts: any[] = [];
      
      for (const endpoint of endpoints) {
        const response = await this.fetchWithRetry(endpoint);
        if (response.data.conceptGroup) {
          const concepts = response.data.conceptGroup
            .filter(group => group.conceptProperties)
            .flatMap(group => group.conceptProperties);
          allConcepts.push(...concepts);
        }
      }
      
      // Enhance with additional details
      const enhancedConcepts = await this.enhanceRxNormConcepts(allConcepts.slice(0, 100)); // Limit for demo
      
      await fs.writeFile(
        outputPath,
        JSON.stringify(enhancedConcepts, null, 2)
      );
      
      perf.end({ totalConcepts: enhancedConcepts.length });
      scraperLogger.info('RxNorm scraping completed', { totalConcepts: enhancedConcepts.length });
      
    } catch (error) {
      perf.end({ success: false });
      throw new ExternalServiceError('RxNorm scraping', error.message, error);
    }
  }

  async scrapeLOINC(outputPath: string): Promise<void> {
    const perf = new PerformanceLogger('loinc-scraping');
    scraperLogger.info('Starting LOINC scraping');
    
    try {
      // LOINC provides a search API
      const categories = [
        'chemistry', 'hematology', 'microbiology',
        'molecular pathology', 'toxicology'
      ];
      
      const allCodes: any[] = [];
      
      for (const category of categories) {
        const codes = await this.searchLOINC(category);
        allCodes.push(...codes);
      }
      
      await fs.writeFile(
        outputPath,
        JSON.stringify(allCodes, null, 2)
      );
      
      perf.end({ totalCodes: allCodes.length });
      scraperLogger.info('LOINC scraping completed', { totalCodes: allCodes.length });
      
    } catch (error) {
      perf.end({ success: false });
      throw new ExternalServiceError('LOINC scraping', error.message, error);
    }
  }

  private async scrapeWithRetry(url: string, parser: Function): Promise<any[]> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: this.config.timeout,
          headers: {
            'User-Agent': this.config.userAgent
          }
        });
        
        return await parser(response.data);
      } catch (error) {
        lastError = error;
        scraperLogger.warn(`Attempt ${attempt} failed for ${url}`, { error: error.message });
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private async fetchWithRetry(url: string): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await axios.get(url, {
          timeout: this.config.timeout,
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'application/json'
          }
        });
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }

  private async parseICD10CMSPage(html: string): Promise<any[]> {
    const $ = cheerio.load(html);
    const codes: any[] = [];
    
    // Parse download links for ICD-10 files
    $('a[href*=".zip"], a[href*=".txt"], a[href*=".xlsx"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      
      if (href && text.toLowerCase().includes('icd-10')) {
        codes.push({
          type: 'download_link',
          url: href,
          description: text.trim()
        });
      }
    });
    
    // For demo, return sample codes
    return [
      { code: 'A00', description: 'Cholera', category: 'Infectious diseases' },
      { code: 'A01', description: 'Typhoid and paratyphoid fevers', category: 'Infectious diseases' },
      { code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory system' },
      { code: 'E11', description: 'Type 2 diabetes mellitus', category: 'Endocrine' }
    ];
  }

  private async parseICD10WHOPage(html: string): Promise<any[]> {
    const $ = cheerio.load(html);
    const codes: any[] = [];
    
    // WHO ICD-10 browser structure
    $('.tree-node').each((i, el) => {
      const code = $(el).find('.code').text().trim();
      const description = $(el).find('.description').text().trim();
      
      if (code && description) {
        codes.push({
          code,
          description,
          source: 'WHO'
        });
      }
    });
    
    return codes;
  }

  private async scrapeSNOMEDBrowser(): Promise<any[]> {
    // SNOMED browser requires authentication
    // This returns sample data for demonstration
    return [
      {
        conceptId: '38341003',
        fullySpecifiedName: 'Hypertensive disorder, systemic arterial (disorder)',
        preferredTerm: 'Hypertension',
        semanticTag: 'disorder'
      },
      {
        conceptId: '73211009',
        fullySpecifiedName: 'Diabetes mellitus (disorder)',
        preferredTerm: 'Diabetes mellitus',
        semanticTag: 'disorder'
      },
      {
        conceptId: '195967001',
        fullySpecifiedName: 'Asthma (disorder)',
        preferredTerm: 'Asthma',
        semanticTag: 'disorder'
      }
    ];
  }

  private async enhanceRxNormConcepts(concepts: any[]): Promise<any[]> {
    const enhanced: any[] = [];
    
    for (const concept of concepts) {
      try {
        // Get additional properties
        const propertiesUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${concept.rxcui}/properties.json`;
        const response = await this.fetchWithRetry(propertiesUrl);
        
        enhanced.push({
          ...concept,
          properties: response.data.properties
        });
        
        // Rate limiting
        await this.delay(500);
      } catch (error) {
        // Keep original if enhancement fails
        enhanced.push(concept);
      }
    }
    
    return enhanced;
  }

  private async searchLOINC(category: string): Promise<any[]> {
    // LOINC search API (simplified for demo)
    try {
      const searchUrl = `https://loinc.org/search/?query=${encodeURIComponent(category)}`;
      // In reality, would parse search results
      
      // Return sample data
      return [
        {
          loinc_num: '2160-0',
          component: 'Creatinine',
          property: 'MCnc',
          system: 'Ser/Plas',
          scale: 'Qn',
          long_common_name: 'Creatinine [Mass/volume] in Serum or Plasma'
        },
        {
          loinc_num: '718-7',
          component: 'Hemoglobin',
          property: 'MCnc',
          system: 'Bld',
          scale: 'Qn',
          long_common_name: 'Hemoglobin [Mass/volume] in Blood'
        }
      ];
    } catch (error) {
      scraperLogger.error(`Failed to search LOINC for ${category}`, { error: error.message });
      return [];
    }
  }

  private deduplicateCodes(codes: any[], key: string): any[] {
    const seen = new Set();
    return codes.filter(code => {
      const value = code[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadAndParseCMS(url: string, outputPath: string): Promise<void> {
    scraperLogger.info('Downloading CMS file', { url });
    
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      
      // Save file
      const filename = path.basename(url);
      const filePath = path.join(outputPath, filename);
      await fs.writeFile(filePath, response.data);
      
      // Parse based on file type
      if (filename.endsWith('.txt')) {
        await this.parseCMSTextFile(filePath, outputPath);
      } else if (filename.endsWith('.csv')) {
        await this.parseCMSCSVFile(filePath, outputPath);
      }
      
      scraperLogger.info('CMS file processed', { filename });
    } catch (error) {
      throw new ExternalServiceError('CMS download', error.message, error);
    }
  }

  private async parseCMSTextFile(filePath: string, outputPath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const codes: any[] = [];
    
    for (const line of lines) {
      // CMS format: CODE DESCRIPTION
      const match = line.match(/^([A-Z]\d{2}\.?\d*)\s+(.+)$/);
      if (match) {
        codes.push({
          code: match[1],
          description: match[2].trim()
        });
      }
    }
    
    await fs.writeFile(
      path.join(outputPath, 'icd10-cms-codes.json'),
      JSON.stringify(codes, null, 2)
    );
  }

  private async parseCMSCSVFile(filePath: string, outputPath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    await fs.writeFile(
      path.join(outputPath, 'icd10-cms-codes-csv.json'),
      JSON.stringify(records, null, 2)
    );
  }
}