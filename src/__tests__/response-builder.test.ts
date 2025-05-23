/**
 * @fileoverview Tests for the response builder utility
 */

import {
  ToolResponseBuilder,
  successResponse,
  errorResponse,
  parseToolResponse,
} from '../utils/response-builder.js';

describe('ToolResponseBuilder', () => {
  describe('success responses', () => {
    it('should create a success response with data', () => {
      const data = { message: 'Hello', count: 42 };
      const response = ToolResponseBuilder.success(data).build();

      expect(response.isError).toBe(false);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(JSON.parse(response.content[0].text)).toEqual(data);
    });

    it('should create a success response with structured content', () => {
      const data = { items: ['a', 'b', 'c'] };
      const structured = { count: 3 };

      const response = ToolResponseBuilder.success(data).withStructuredContent(structured).build();

      expect(response.structuredContent).toEqual(structured);
    });

    it('should use helper function correctly', () => {
      const data = { test: true };
      const response = successResponse(data);

      expect(response.isError).toBe(false);
      expect(JSON.parse(response.content[0].text)).toEqual(data);
    });
  });

  describe('error responses', () => {
    it('should create an error response from Error object', () => {
      const error = new Error('Something went wrong');
      const response = ToolResponseBuilder.error(error).build();

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);

      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.error).toBe('Something went wrong');
      expect(errorData.details).toBe('Operation failed');
    });

    it('should create an error response from string', () => {
      const response = errorResponse('Custom error message');

      expect(response.isError).toBe(true);
      const errorData = JSON.parse(response.content[0].text);
      expect(errorData.error).toBe('Custom error message');
    });
  });

  describe('parseToolResponse', () => {
    it('should parse success response', () => {
      const data = { value: 123 };
      const response = successResponse(data);

      const parsed = parseToolResponse(response);
      expect(parsed).toEqual(data);
    });

    it('should throw on error response', () => {
      const response = errorResponse('Test error');

      expect(() => parseToolResponse(response)).toThrow('Test error');
    });

    it('should validate parsed data when validator provided', () => {
      const data = { name: 'test', age: 25 };
      const response = successResponse(data);

      const validator = (d: unknown): d is { name: string; age: number } => {
        return (
          typeof d === 'object' &&
          d !== null &&
          'name' in d &&
          'age' in d &&
          typeof (d as any).name === 'string' &&
          typeof (d as any).age === 'number'
        );
      };

      const parsed = parseToolResponse(response, validator);
      expect(parsed).toEqual(data);
    });

    it('should throw when validation fails', () => {
      const data = { invalid: 'data' };
      const response = successResponse(data);

      const validator = (d: unknown): d is { name: string } => {
        return typeof d === 'object' && d !== null && 'name' in d;
      };

      expect(() => parseToolResponse(response, validator)).toThrow(
        'Response data failed validation'
      );
    });
  });
});
