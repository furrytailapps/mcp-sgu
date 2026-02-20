import type { McpToolError } from './errors';

const INTERNAL_DETAIL_KEYS = new Set(['statusCode', 'upstream']);

function filterDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!INTERNAL_DETAIL_KEYS.has(key)) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

type TextContent = {
  type: 'text';
  text: string;
};

interface ToolResponse {
  [key: string]: unknown;
  content: TextContent[];
  isError?: boolean;
}

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

export function errorResponse(error: McpToolError | Error): ToolResponse {
  const isMcpError = error instanceof Error && 'code' in error;
  const errorData = {
    error: true,
    code: isMcpError ? (error as McpToolError).code : 'INTERNAL_ERROR',
    message: error.message,
    ...(isMcpError && { details: filterDetails((error as McpToolError).details) }),
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
