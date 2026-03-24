import { describe, it, expect } from 'vitest';
import { McpToolError, UpstreamApiError, ValidationError } from '../errors';

describe('errors', () => {
  describe('McpToolError', () => {
    it('should create error with message and code', () => {
      const error = new McpToolError('Something went wrong', 'TEST_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('McpToolError');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const error = new McpToolError('Something went wrong', 'TEST_ERROR', { foo: 'bar' });
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should be instanceof Error', () => {
      const error = new McpToolError('test', 'TEST');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(McpToolError);
    });
  });

  describe('UpstreamApiError', () => {
    it('should create error with status code and upstream', () => {
      const error = new UpstreamApiError('API failed', 500, 'SGU API');
      expect(error.message).toBe('API failed');
      expect(error.code).toBe('UPSTREAM_API_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.upstream).toBe('SGU API');
      expect(error.name).toBe('UpstreamApiError');
    });

    it('should include statusCode and upstream in details', () => {
      const error = new UpstreamApiError('API failed', 404, 'WMS Service');
      expect(error.details).toEqual({
        statusCode: 404,
        upstream: 'WMS Service',
      });
    });

    it('should merge additional details', () => {
      const error = new UpstreamApiError('API failed', 400, 'OGC API', { endpoint: '/features' });
      expect(error.details).toEqual({
        statusCode: 400,
        upstream: 'OGC API',
        endpoint: '/features',
      });
    });

    it('should be instanceof McpToolError', () => {
      const error = new UpstreamApiError('test', 500, 'test');
      expect(error).toBeInstanceOf(McpToolError);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include field in details when provided', () => {
      const error = new ValidationError('minX must be less than maxX', 'bbox');
      expect(error.details).toEqual({ field: 'bbox' });
    });

    it('should have undefined field when not provided', () => {
      const error = new ValidationError('Invalid input');
      expect(error.details).toEqual({ field: undefined });
    });

    it('should be instanceof McpToolError', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(McpToolError);
    });
  });
});
