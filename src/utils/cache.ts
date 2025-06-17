import NodeCache from 'node-cache';
import crypto from 'crypto';
import { logger } from './logger.js';

interface CacheConfig {
  stdTTL?: number; // default TTL in seconds
  checkperiod?: number; // check period in seconds
  maxKeys?: number;
  useClones?: boolean;
}

export class CacheManager {
  private static instances = new Map<string, CacheManager>();
  private cache: NodeCache;
  private hitCount = 0;
  private missCount = 0;

  private constructor(namespace: string, config: CacheConfig = {}) {
    this.cache = new NodeCache({
      stdTTL: config.stdTTL || 3600, // 1 hour default
      checkperiod: config.checkperiod || 600, // 10 minutes
      maxKeys: config.maxKeys || 10000,
      useClones: config.useClones ?? true
    });

    // Set up event listeners
    this.cache.on('set', (key, value) => {
      logger.debug(`Cache set: ${namespace}:${key}`);
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache delete: ${namespace}:${key}`);
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache expired: ${namespace}:${key}`);
    });
  }

  static getInstance(namespace: string = 'default', config?: CacheConfig): CacheManager {
    if (!CacheManager.instances.has(namespace)) {
      CacheManager.instances.set(namespace, new CacheManager(namespace, config));
    }
    return CacheManager.instances.get(namespace)!;
  }

  // Generate cache key from multiple parts
  static generateKey(...parts: any[]): string {
    const combined = parts.map(part => 
      typeof part === 'object' ? JSON.stringify(part) : String(part)
    ).join(':');
    
    // Use hash for long keys
    if (combined.length > 250) {
      return crypto.createHash('sha256').update(combined).digest('hex');
    }
    
    return combined;
  }

  // Get value from cache
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    
    if (value !== undefined) {
      this.hitCount++;
      logger.debug(`Cache hit: ${key}`);
    } else {
      this.missCount++;
      logger.debug(`Cache miss: ${key}`);
    }
    
    return value;
  }

  // Get or compute value
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    let value = this.get<T>(key);
    
    if (value === undefined) {
      logger.debug(`Computing value for cache key: ${key}`);
      value = await computeFn();
      this.set(key, value, ttl);
    }
    
    return value;
  }

  // Set value in cache
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl);
  }

  // Set multiple values
  mset(items: Array<{ key: string; val: any; ttl?: number }>): boolean {
    return this.cache.mset(items);
  }

  // Delete from cache
  del(keys: string | string[]): number {
    return this.cache.del(keys);
  }

  // Clear all cache
  flushAll(): void {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  // Check if key exists
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Get all keys
  keys(): string[] {
    return this.cache.keys();
  }

  // Get cache statistics
  getStats() {
    const stats = this.cache.getStats();
    const hitRate = this.hitCount / (this.hitCount + this.missCount) || 0;
    
    return {
      keys: stats.keys,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: hitRate.toFixed(2),
      ksize: stats.ksize,
      vsize: stats.vsize
    };
  }

  // TTL management
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  ttl(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }
}

// Specialized caches for different purposes
export class QueryCache extends CacheManager {
  constructor() {
    super('queries', {
      stdTTL: 3600, // 1 hour for query results
      maxKeys: 5000
    });
  }

  getCacheKey(query: string, params: any[]): string {
    return CacheManager.generateKey('query', query, params);
  }
}

export class OntologyCache extends CacheManager {
  constructor() {
    super('ontology', {
      stdTTL: 86400, // 24 hours for ontology data
      maxKeys: 50000 // More keys for code lookups
    });
  }

  getCodeKey(system: string, code: string): string {
    return CacheManager.generateKey('code', system, code);
  }

  getMappingKey(sourceSystem: string, targetSystem: string, code: string): string {
    return CacheManager.generateKey('mapping', sourceSystem, targetSystem, code);
  }
}

export class AnalysisCache extends CacheManager {
  constructor() {
    super('analysis', {
      stdTTL: 7200, // 2 hours for analysis results
      maxKeys: 1000
    });
  }

  getAnalysisKey(toolName: string, args: any): string {
    return CacheManager.generateKey('analysis', toolName, args);
  }
}

// Export singleton instances
export const queryCache = new QueryCache();
export const ontologyCache = new OntologyCache();
export const analysisCache = new AnalysisCache();

// Cache decorator for methods
export function Cacheable(
  namespace: string = 'default',
  ttl?: number,
  keyGenerator?: (...args: any[]) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cache = CacheManager.getInstance(namespace);

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator
        ? keyGenerator(...args)
        : CacheManager.generateKey(target.constructor.name, propertyKey, ...args);

      return cache.getOrCompute(
        key,
        async () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}