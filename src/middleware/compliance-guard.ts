import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';
import crypto from 'crypto';

export interface ComplianceConfig {
  hipaaCompliant: boolean;
  allowRowLevelData: boolean;
  deIdentificationLevel: 'none' | 'safe-harbor' | 'expert-determination';
  auditLevel: 'none' | 'basic' | 'detailed' | 'forensic';
  dataRetentionDays: number;
}

export interface DataAccessRequest {
  userId: string;
  toolName: string;
  requestId: string;
  timestamp: Date;
  dataRequested: {
    tables: string[];
    fields: string[];
    filters: any;
    rowLevel: boolean;
  };
  purpose: string;
  studyId?: string;
}

export interface ComplianceDecision {
  allowed: boolean;
  reason?: string;
  modifications?: {
    deIdentify: boolean;
    aggregateOnly: boolean;
    limitFields: string[];
    addNoise: boolean;
  };
  auditId: string;
}

export class ComplianceGuard {
  private config: ComplianceConfig;
  private auditDb: Database;
  private policyRules: Map<string, PolicyRule> = new Map();
  
  constructor(config: ComplianceConfig, auditDb: Database) {
    this.config = config;
    this.auditDb = auditDb;
    this.initializeAuditTables();
    this.loadPolicyRules();
  }
  
  private initializeAuditTables() {
    this.auditDb.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        audit_id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_requested TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT,
        modifications TEXT,
        execution_time_ms INTEGER,
        data_hash TEXT,
        INDEX idx_user_timestamp (user_id, timestamp),
        INDEX idx_study (study_id)
      );
      
      CREATE TABLE IF NOT EXISTS field_access_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        audit_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        field_name TEXT NOT NULL,
        access_type TEXT NOT NULL,
        phi_flag BOOLEAN DEFAULT FALSE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (audit_id) REFERENCES audit_log(audit_id)
      );
      
      CREATE TABLE IF NOT EXISTS data_use_agreements (
        dua_id TEXT PRIMARY KEY,
        study_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        allowed_tables TEXT NOT NULL,
        allowed_fields TEXT NOT NULL,
        restrictions TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        active BOOLEAN DEFAULT TRUE
      );
    `);
  }
  
  private loadPolicyRules() {
    // HIPAA Safe Harbor identifiers that must be removed/masked
    this.policyRules.set('safe-harbor', {
      name: 'HIPAA Safe Harbor',
      check: (request: DataAccessRequest) => {
        const phiFields = [
          'name', 'address', 'city', 'zip', 'phone', 'fax', 'email',
          'ssn', 'mrn', 'health_plan_number', 'account_number',
          'certificate_number', 'vehicle_id', 'device_id', 'url',
          'ip_address', 'biometric_id', 'photo', 'birth_date'
        ];
        
        const requestedPHI = request.dataRequested.fields.filter(field => 
          phiFields.some(phi => field.toLowerCase().includes(phi))
        );
        
        return {
          hasPHI: requestedPHI.length > 0,
          phiFields: requestedPHI
        };
      }
    });
    
    // Row-level data access policy
    this.policyRules.set('row-level', {
      name: 'Row Level Data Access',
      check: (request: DataAccessRequest) => {
        return {
          allowed: !this.config.hipaaCompliant || this.config.allowRowLevelData,
          requiresAggregation: this.config.hipaaCompliant && !this.config.allowRowLevelData
        };
      }
    });
    
    // Minimum cell size policy
    this.policyRules.set('cell-size', {
      name: 'Minimum Cell Size',
      check: (request: DataAccessRequest) => {
        return {
          minimumCellSize: this.config.hipaaCompliant ? 11 : 0,
          suppressSmallCells: this.config.hipaaCompliant
        };
      }
    });
  }
  
  async evaluateRequest(request: DataAccessRequest): Promise<ComplianceDecision> {
    const startTime = Date.now();
    const auditId = this.generateAuditId();
    
    try {
      // Check if user has active DUA for requested data
      const duaCheck = await this.checkDataUseAgreement(request);
      if (!duaCheck.valid) {
        return this.createDecision(false, duaCheck.reason, auditId);
      }
      
      // Apply policy rules
      const safeHarborCheck = this.policyRules.get('safe-harbor').check(request);
      const rowLevelCheck = this.policyRules.get('row-level').check(request);
      const cellSizeCheck = this.policyRules.get('cell-size').check(request);
      
      // Determine modifications needed
      const modifications: any = {};
      
      if (safeHarborCheck.hasPHI && this.config.hipaaCompliant) {
        if (this.config.deIdentificationLevel === 'none') {
          return this.createDecision(false, 'PHI fields requested but de-identification disabled', auditId);
        }
        modifications.deIdentify = true;
        modifications.limitFields = request.dataRequested.fields.filter(
          field => !safeHarborCheck.phiFields.includes(field)
        );
      }
      
      if (request.dataRequested.rowLevel && !rowLevelCheck.allowed) {
        modifications.aggregateOnly = true;
      }
      
      if (cellSizeCheck.suppressSmallCells) {
        modifications.addNoise = true;
        modifications.minimumCellSize = cellSizeCheck.minimumCellSize;
      }
      
      // Log the access request
      await this.logAccess(request, auditId, true, 'Access granted with modifications', modifications, startTime);
      
      // Log field-level access
      await this.logFieldAccess(auditId, request.dataRequested);
      
      return this.createDecision(true, 'Access granted with compliance modifications', auditId, modifications);
      
    } catch (error) {
      await this.logAccess(request, auditId, false, `Error: ${error.message}`, null, startTime);
      return this.createDecision(false, `Compliance check failed: ${error.message}`, auditId);
    }
  }
  
  private async checkDataUseAgreement(request: DataAccessRequest): Promise<{valid: boolean; reason?: string}> {
    if (!request.studyId) {
      return { valid: true }; // No study-specific restrictions
    }
    
    const dua = this.auditDb.prepare(`
      SELECT * FROM data_use_agreements
      WHERE study_id = ? AND user_id = ? AND active = 1
      AND date('now') BETWEEN start_date AND end_date
    `).get(request.studyId, request.userId);
    
    if (!dua) {
      return { valid: false, reason: 'No active Data Use Agreement found' };
    }
    
    // Check if requested tables/fields are allowed
    const allowedTables = JSON.parse(dua.allowed_tables);
    const allowedFields = JSON.parse(dua.allowed_fields);
    
    const unauthorizedTables = request.dataRequested.tables.filter(
      table => !allowedTables.includes(table) && !allowedTables.includes('*')
    );
    
    if (unauthorizedTables.length > 0) {
      return { 
        valid: false, 
        reason: `Access denied to tables: ${unauthorizedTables.join(', ')}`
      };
    }
    
    return { valid: true };
  }
  
  private async logAccess(
    request: DataAccessRequest,
    auditId: string,
    allowed: boolean,
    reason: string,
    modifications: any,
    startTime: number
  ) {
    const executionTime = Date.now() - startTime;
    
    const stmt = this.auditDb.prepare(`
      INSERT INTO audit_log (
        audit_id, request_id, user_id, tool_name, 
        data_requested, decision, reason, modifications,
        execution_time_ms, study_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      auditId,
      request.requestId,
      request.userId,
      request.toolName,
      JSON.stringify(request.dataRequested),
      allowed ? 'ALLOWED' : 'DENIED',
      reason,
      modifications ? JSON.stringify(modifications) : null,
      executionTime,
      request.studyId || null
    );
    
    // Forensic logging if enabled
    if (this.config.auditLevel === 'forensic') {
      await this.logForensicDetails(auditId, request);
    }
  }
  
  private async logFieldAccess(auditId: string, dataRequested: any) {
    const stmt = this.auditDb.prepare(`
      INSERT INTO field_access_log (
        audit_id, table_name, field_name, access_type, phi_flag
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const table of dataRequested.tables) {
      for (const field of dataRequested.fields) {
        const isPHI = this.isPhiField(field);
        stmt.run(
          auditId,
          table,
          field,
          dataRequested.rowLevel ? 'ROW_LEVEL' : 'AGGREGATE',
          isPHI
        );
      }
    }
  }
  
  private isPhiField(fieldName: string): boolean {
    const phiPatterns = [
      /name/i, /address/i, /phone/i, /email/i, /ssn/i,
      /mrn/i, /birth.*date/i, /ip.*address/i
    ];
    
    return phiPatterns.some(pattern => pattern.test(fieldName));
  }
  
  private async logForensicDetails(auditId: string, request: DataAccessRequest) {
    // Log additional forensic information
    const forensicData = {
      auditId,
      environment: process.env.NODE_ENV,
      serverHost: process.env.HOSTNAME,
      clientInfo: {
        userAgent: request.userAgent,
        ipAddress: request.clientIp
      },
      stackTrace: new Error().stack,
      systemTime: new Date().toISOString(),
      processId: process.pid
    };
    
    // Store in separate forensic log or external SIEM
    console.log('[FORENSIC]', JSON.stringify(forensicData));
  }
  
  private createDecision(
    allowed: boolean,
    reason: string,
    auditId: string,
    modifications?: any
  ): ComplianceDecision {
    return {
      allowed,
      reason,
      modifications,
      auditId
    };
  }
  
  private generateAuditId(): string {
    return `AUD-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }
  
  // De-identification methods
  async deIdentifyData(data: any[], schema: any): Promise<any[]> {
    if (this.config.deIdentificationLevel === 'none') {
      return data;
    }
    
    return data.map(row => {
      const deIdentified = { ...row };
      
      // Apply Safe Harbor de-identification
      if (this.config.deIdentificationLevel === 'safe-harbor') {
        // Remove/generalize identifiers
        if (deIdentified.birth_date) {
          deIdentified.birth_year = new Date(deIdentified.birth_date).getFullYear();
          delete deIdentified.birth_date;
        }
        
        if (deIdentified.zip_code) {
          deIdentified.zip_code = deIdentified.zip_code.substring(0, 3) + '00';
        }
        
        // Remove direct identifiers
        const directIdentifiers = ['name', 'address', 'phone', 'email', 'ssn', 'mrn'];
        directIdentifiers.forEach(field => {
          if (field in deIdentified) {
            deIdentified[field] = '[REDACTED]';
          }
        });
      }
      
      return deIdentified;
    });
  }
  
  // Apply differential privacy noise
  addDifferentialPrivacy(results: any, epsilon: number = 1.0): any {
    // Add Laplace noise to numeric results
    const sensitivity = 1.0; // Adjust based on query
    const scale = sensitivity / epsilon;
    
    if (typeof results === 'number') {
      const noise = this.laplaceSample(scale);
      return Math.round(results + noise);
    }
    
    if (Array.isArray(results)) {
      return results.map(r => this.addDifferentialPrivacy(r, epsilon));
    }
    
    if (typeof results === 'object') {
      const noisyResults = {};
      for (const [key, value] of Object.entries(results)) {
        if (typeof value === 'number') {
          noisyResults[key] = this.addDifferentialPrivacy(value, epsilon);
        } else {
          noisyResults[key] = value;
        }
      }
      return noisyResults;
    }
    
    return results;
  }
  
  private laplaceSample(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
  
  // Utility methods for compliance reports
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const summary = this.auditDb.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN decision = 'ALLOWED' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN decision = 'DENIED' THEN 1 ELSE 0 END) as denied,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(execution_time_ms) as avg_execution_time
      FROM audit_log
      WHERE timestamp BETWEEN ? AND ?
    `).get(startDate.toISOString(), endDate.toISOString());
    
    const phiAccess = this.auditDb.prepare(`
      SELECT 
        COUNT(*) as phi_field_accesses,
        COUNT(DISTINCT audit_id) as requests_with_phi
      FROM field_access_log
      WHERE phi_flag = 1
      AND timestamp BETWEEN ? AND ?
    `).get(startDate.toISOString(), endDate.toISOString());
    
    return {
      period: { start: startDate, end: endDate },
      summary,
      phiAccess,
      complianceRate: summary.total_requests > 0 
        ? (summary.allowed / summary.total_requests * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

// Policy Rule interface
interface PolicyRule {
  name: string;
  check: (request: DataAccessRequest) => any;
}

// Export middleware factory
export function createComplianceMiddleware(config: ComplianceConfig, auditDb: Database) {
  const guard = new ComplianceGuard(config, auditDb);
  
  return async (request: any, next: Function) => {
    const accessRequest: DataAccessRequest = {
      userId: request.userId || 'anonymous',
      toolName: request.tool,
      requestId: request.id,
      timestamp: new Date(),
      dataRequested: request.params.dataRequested || {
        tables: [],
        fields: [],
        filters: {},
        rowLevel: false
      },
      purpose: request.params.purpose || 'research',
      studyId: request.params.studyId
    };
    
    const decision = await guard.evaluateRequest(accessRequest);
    
    if (!decision.allowed) {
      throw new Error(`Compliance check failed: ${decision.reason}`);
    }
    
    // Attach compliance metadata to request
    request.compliance = {
      auditId: decision.auditId,
      modifications: decision.modifications,
      guard
    };
    
    return next();
  };
}