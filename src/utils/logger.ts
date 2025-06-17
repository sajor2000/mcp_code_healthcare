import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'healthcare-research-mcp' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// Create child loggers for specific modules
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

// Utility functions for structured logging
export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logApiCall = (method: string, endpoint: string, duration: number, status: number) => {
  logger.info('API call', {
    method,
    endpoint,
    duration,
    status
  });
};

export const logDatabaseQuery = (query: string, duration: number, rowCount?: number) => {
  logger.debug('Database query', {
    query: query.substring(0, 200), // Truncate long queries
    duration,
    rowCount
  });
};

export const logToolExecution = (toolName: string, args: any, result: any, duration: number) => {
  logger.info('Tool execution', {
    tool: toolName,
    args: JSON.stringify(args).substring(0, 500), // Truncate large args
    success: !!result,
    duration
  });
};

// Performance monitoring
export class PerformanceLogger {
  private startTime: number;
  private operation: string;
  
  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    logger.debug(`Starting operation: ${operation}`);
  }
  
  end(metadata?: any) {
    const duration = Date.now() - this.startTime;
    logger.info(`Operation completed: ${this.operation}`, {
      duration,
      ...metadata
    });
    return duration;
  }
}