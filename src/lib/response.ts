import type { McpToolError } from './errors';

type TextContent = {
  type: 'text';
  text: string;
};

interface ToolResponse {
  [key: string]: unknown;
  content: TextContent[];
  isError?: boolean;
}

/**
 * Build a successful tool response with JSON data
 */
export function successResponse(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Build an error response that AI can understand
 */
export function errorResponse(error: McpToolError | Error): ToolResponse {
  const isMcpError = error instanceof Error && 'code' in error;
  const errorData = {
    error: true,
    code: isMcpError ? (error as McpToolError).code : 'INTERNAL_ERROR',
    message: error.message,
    ...(isMcpError && { details: (error as McpToolError).details }),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorData, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Wrap a tool handler with standard error handling
 */
export function withErrorHandling<T, R>(handler: (args: T) => Promise<R>): (args: T) => Promise<ToolResponse> {
  return async (args: T) => {
    try {
      const result = await handler(args);
      return successResponse(result);
    } catch (error) {
      console.error('Tool execution error:', error);
      return errorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  };
}
