import { describe, it, expect, vi } from 'vitest';
import { successResponse, errorResponse, withErrorHandling } from '../response';
import { McpToolError, ValidationError, UpstreamApiError } from '../errors';

describe('response', () => {
  describe('successResponse', () => {
    it('should wrap data in MCP response format', () => {
      const data = { foo: 'bar', count: 42 };
      const response = successResponse(data);

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.isError).toBeUndefined();
    });

    it('should JSON stringify data with formatting', () => {
      const data = { foo: 'bar' };
      const response = successResponse(data);
      const parsed = JSON.parse(response.content[0].text);

      expect(parsed).toEqual(data);
      // Check it's formatted (has newlines)
      expect(response.content[0].text).toContain('\n');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const response = successResponse(data);
      const parsed = JSON.parse(response.content[0].text);

      expect(parsed).toEqual(data);
    });

    it('should handle null', () => {
      const response = successResponse(null);
      const parsed = JSON.parse(response.content[0].text);

      expect(parsed).toBeNull();
    });
  });

  describe('errorResponse', () => {
    it('should format McpToolError correctly', () => {
      const error = new ValidationError('Invalid bbox', 'bbox');
      const response = errorResponse(error);

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);

      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.error).toBe(true);
      expect(errorData.code).toBe('VALIDATION_ERROR');
      expect(errorData.message).toBe('Invalid bbox');
      expect(errorData.details).toEqual({ field: 'bbox' });
    });

    it('should format UpstreamApiError correctly', () => {
      const error = new UpstreamApiError('API down', 503, 'SGU WMS');
      const response = errorResponse(error);

      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.code).toBe('UPSTREAM_API_ERROR');
      expect(errorData.details.statusCode).toBe(503);
      expect(errorData.details.upstream).toBe('SGU WMS');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something broke');
      const response = errorResponse(error);

      expect(response.isError).toBe(true);
      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.code).toBe('INTERNAL_ERROR');
      expect(errorData.message).toBe('Something broke');
      expect(errorData.details).toBeUndefined();
    });
  });

  describe('withErrorHandling', () => {
    it('should return success response on successful handler', async () => {
      const handler = async (args: { x: number }) => ({ result: args.x * 2 });
      const wrapped = withErrorHandling(handler);

      const response = await wrapped({ x: 5 });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.result).toBe(10);
    });

    it('should catch and format ValidationError', async () => {
      const handler = async () => {
        throw new ValidationError('Bad input', 'field');
      };
      const wrapped = withErrorHandling(handler);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await wrapped({});

      expect(response.isError).toBe(true);
      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.code).toBe('VALIDATION_ERROR');

      consoleSpy.mockRestore();
    });

    it('should catch and format generic Error', async () => {
      const handler = async () => {
        throw new Error('Unexpected error');
      };
      const wrapped = withErrorHandling(handler);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await wrapped({});

      expect(response.isError).toBe(true);
      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.code).toBe('INTERNAL_ERROR');

      consoleSpy.mockRestore();
    });

    it('should handle non-Error throws', async () => {
      const handler = async () => {
        throw 'string error';
      };
      const wrapped = withErrorHandling(handler);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await wrapped({});

      expect(response.isError).toBe(true);
      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.message).toBe('string error');

      consoleSpy.mockRestore();
    });

    it('should preserve handler return type in response', async () => {
      interface Result {
        features: string[];
        count: number;
      }
      const handler = async (): Promise<Result> => ({
        features: ['a', 'b'],
        count: 2,
      });
      const wrapped = withErrorHandling(handler);

      const response = await wrapped({});
      const data = JSON.parse(response.content[0].text);

      expect(data.features).toEqual(['a', 'b']);
      expect(data.count).toBe(2);
    });
  });
});
