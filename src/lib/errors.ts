/**
 * Base error class for MCP tool errors
 * Provides structured error information for AI consumption
 */
export class McpToolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}

export class UpstreamApiError extends McpToolError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly upstream: string,
    details?: Record<string, unknown>,
  ) {
    super(message, 'UPSTREAM_API_ERROR', { statusCode, upstream, ...details });
    this.name = 'UpstreamApiError';
  }
}

export class NotFoundError extends McpToolError {
  constructor(resourceType: string, identifier: string) {
    super(`${resourceType} not found: ${identifier}`, 'NOT_FOUND', { resourceType, identifier });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends McpToolError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}
