// Custom error classes for the Healthcare Research MCP Server

export class MCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database errors
export class DatabaseError extends MCPError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class DataNotFoundError extends MCPError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

// Validation errors
export class ValidationError extends MCPError {
  public readonly validationErrors: any[];

  constructor(message: string, errors: any[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.validationErrors = errors;
  }
}

export class InvalidInputError extends ValidationError {
  constructor(field: string, value: any, reason: string) {
    super(`Invalid input for field '${field}': ${reason}`, [
      { field, value, reason }
    ]);
  }
}

// Tool execution errors
export class ToolExecutionError extends MCPError {
  public readonly toolName: string;
  public readonly originalError?: Error;

  constructor(toolName: string, message: string, originalError?: Error) {
    super(`Tool '${toolName}' execution failed: ${message}`, 'TOOL_ERROR', 500);
    this.toolName = toolName;
    this.originalError = originalError;
  }
}

// Compliance errors
export class ComplianceError extends MCPError {
  public readonly complianceType: string;
  public readonly violation: string;

  constructor(complianceType: string, violation: string) {
    super(
      `Compliance violation (${complianceType}): ${violation}`,
      'COMPLIANCE_ERROR',
      403
    );
    this.complianceType = complianceType;
    this.violation = violation;
  }
}

export class HIPAAViolationError extends ComplianceError {
  constructor(violation: string) {
    super('HIPAA', violation);
  }
}

// Authentication/Authorization errors
export class AuthenticationError extends MCPError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends MCPError {
  constructor(resource: string, action: string) {
    super(
      `Not authorized to ${action} ${resource}`,
      'AUTHORIZATION_ERROR',
      403
    );
  }
}

// External service errors
export class ExternalServiceError extends MCPError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message: string, originalError?: Error) {
    super(
      `External service '${service}' error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502
    );
    this.service = service;
    this.originalError = originalError;
  }
}

// Rate limiting error
export class RateLimitError extends MCPError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      'RATE_LIMIT_ERROR',
      429
    );
    this.retryAfter = retryAfter;
  }
}

// Error handler utility
export class ErrorHandler {
  static handle(error: Error): MCPError {
    // If it's already an MCPError, return it
    if (error instanceof MCPError) {
      return error;
    }

    // Convert common errors to MCPErrors
    if (error.message.includes('SQLITE_')) {
      return new DatabaseError(error.message, error);
    }

    if (error.message.includes('ECONNREFUSED')) {
      return new ExternalServiceError('unknown', 'Connection refused', error);
    }

    if (error.message.includes('ETIMEDOUT')) {
      return new ExternalServiceError('unknown', 'Request timeout', error);
    }

    // Default to internal error
    return new MCPError(
      error.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      false
    );
  }

  static isOperationalError(error: Error): boolean {
    if (error instanceof MCPError) {
      return error.isOperational;
    }
    return false;
  }

  static sanitizeError(error: MCPError): any {
    // Remove sensitive information before sending to client
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && {
          validationErrors: error.validationErrors
        }),
        ...(error instanceof RateLimitError && {
          retryAfter: error.retryAfter
        })
      }
    };
  }
}