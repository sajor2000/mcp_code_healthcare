import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Mock external services
global.fetch = vi.fn();

// Setup test directories
const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');

beforeAll(async () => {
  // Create test data directory
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  
  // Set test database paths
  process.env.ONTOLOGY_DB_PATH = path.join(TEST_DATA_DIR, 'test-ontology.db');
  process.env.RESEARCH_DB_PATH = path.join(TEST_DATA_DIR, 'test-research.db');
  
  // Disable caching for tests
  process.env.DISABLE_CACHE = 'true';
});

afterAll(async () => {
  // Cleanup test data
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset fetch mock
  (global.fetch as any).mockReset();
});

// Mock console methods to reduce noise
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

beforeAll(() => {
  console.log = vi.fn();
  console.info = vi.fn();
  console.warn = vi.fn();
  // Keep console.error for debugging test failures
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
global.testUtils = {
  async createTestDatabase(dbPath: string) {
    const { Database } = await import('../src/database/connection.js');
    const db = new Database(dbPath);
    await db.initialize();
    return db;
  },
  
  generateTestData: {
    patient: (overrides = {}) => ({
      person_id: Math.floor(Math.random() * 100000),
      birth_datetime: '1960-01-01',
      gender_concept_id: 8507, // Male
      race_concept_id: 8527, // White
      ethnicity_concept_id: 38003564, // Not Hispanic
      ...overrides
    }),
    
    condition: (overrides = {}) => ({
      condition_occurrence_id: Math.floor(Math.random() * 100000),
      person_id: 1,
      condition_concept_id: 316866, // Hypertension
      condition_start_date: '2023-01-01',
      condition_type_concept_id: 32020, // EHR encounter diagnosis
      ...overrides
    }),
    
    drug: (overrides = {}) => ({
      drug_exposure_id: Math.floor(Math.random() * 100000),
      person_id: 1,
      drug_concept_id: 1308216, // Lisinopril
      drug_exposure_start_date: '2023-01-01',
      drug_type_concept_id: 38000177, // Prescription written
      quantity: 30,
      days_supply: 30,
      ...overrides
    }),
    
    measurement: (overrides = {}) => ({
      measurement_id: Math.floor(Math.random() * 100000),
      person_id: 1,
      measurement_concept_id: 3004249, // Creatinine
      measurement_date: '2023-01-01',
      measurement_type_concept_id: 44818702, // Lab result
      value_as_number: 1.2,
      unit_concept_id: 8840, // mg/dL
      ...overrides
    })
  },
  
  async waitForAsync(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Extend global type definitions
declare global {
  var testUtils: {
    createTestDatabase: (dbPath: string) => Promise<any>;
    generateTestData: {
      patient: (overrides?: any) => any;
      condition: (overrides?: any) => any;
      drug: (overrides?: any) => any;
      measurement: (overrides?: any) => any;
    };
    waitForAsync: (ms?: number) => Promise<void>;
  };
}