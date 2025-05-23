/**
 * @fileoverview Tests for tool helper functions
 */

import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

// Import after mocking
const { parseErrorMessage, formatError, logToolInvocation, logToolResult, logAndFormatError } =
  await import('../../server/tool-helpers.js');

describe('Tool Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseErrorMessage', () => {
    it('should parse JSON error message with error field', () => {
      const jsonError = JSON.stringify({ error: 'API rate limit exceeded' });
      const result = parseErrorMessage(jsonError);
      expect(result).toBe('DeepSource API Error: API rate limit exceeded');
    });

    it('should parse JSON error message with error and details', () => {
      const jsonError = JSON.stringify({
        error: 'Invalid request',
        details: 'Missing required field: apiKey',
      });
      const result = parseErrorMessage(jsonError);
      expect(result).toBe('DeepSource API Error: Invalid request - Missing required field: apiKey');
    });

    it('should return original message if not JSON', () => {
      const plainError = 'This is not JSON';
      const result = parseErrorMessage(plainError);
      expect(result).toBe('This is not JSON');
    });

    it('should return original message if JSON but no error field', () => {
      const jsonWithoutError = JSON.stringify({ message: 'Something went wrong' });
      const result = parseErrorMessage(jsonWithoutError);
      expect(result).toBe(jsonWithoutError);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      const result = parseErrorMessage(invalidJson);
      expect(result).toBe(invalidJson);
      expect(mockLogger.debug).toHaveBeenCalledWith('Failed to parse error message as JSON', {
        message: invalidJson,
      });
    });

    it('should handle malformed JSON that starts with { and ends with }', () => {
      const malformedJson = '{ "error": "test", }'; // Trailing comma makes it invalid
      const result = parseErrorMessage(malformedJson);
      expect(result).toBe(malformedJson);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('formatError', () => {
    it('should format Error object', () => {
      const error = new Error('Something went wrong');
      const result = formatError(error);
      expect(result).toBe('Something went wrong');
    });

    it('should parse JSON error message from Error object', () => {
      const error = new Error(JSON.stringify({ error: 'API error' }));
      const result = formatError(error);
      expect(result).toBe('DeepSource API Error: API error');
    });

    it('should return default message for non-Error objects', () => {
      const result = formatError('string error');
      expect(result).toBe('Unknown error occurred');
    });

    it('should return default message for null', () => {
      const result = formatError(null);
      expect(result).toBe('Unknown error occurred');
    });

    it('should return default message for undefined', () => {
      const result = formatError(undefined);
      expect(result).toBe('Unknown error occurred');
    });
  });

  describe('logToolInvocation', () => {
    it('should log tool invocation without params', () => {
      logToolInvocation('testTool');
      expect(mockLogger.info).toHaveBeenCalledWith('MCP testTool tool handler invoked', {});
    });

    it('should log tool invocation with params', () => {
      const params = { projectKey: 'test-key', limit: 10 };
      logToolInvocation('listProjects', params);
      expect(mockLogger.info).toHaveBeenCalledWith('MCP listProjects tool handler invoked', {
        params,
      });
    });
  });

  describe('logToolResult', () => {
    it('should log result with content', () => {
      const result = {
        content: [{ text: 'This is a very long response that should be truncated in the preview' }],
      };
      logToolResult('testTool', result);
      expect(mockLogger.debug).toHaveBeenCalledWith('testTool handler result received', {
        contentLength: result.content[0].text.length,
        contentPreview: 'This is a very long response that should be trunca...',
      });
    });

    it('should handle result without content', () => {
      const result = {};
      logToolResult('testTool', result);
      expect(mockLogger.debug).toHaveBeenCalledWith('testTool handler result received', {
        contentLength: 0,
        contentPreview: 'No content',
      });
    });

    it('should handle result with empty content array', () => {
      const result = { content: [] };
      logToolResult('testTool', result);
      expect(mockLogger.debug).toHaveBeenCalledWith('testTool handler result received', {
        contentLength: 0,
        contentPreview: 'No content',
      });
    });

    it('should handle result with content but no text', () => {
      const result = { content: [{}] };
      logToolResult('testTool', result);
      expect(mockLogger.debug).toHaveBeenCalledWith('testTool handler result received', {
        contentLength: 0,
        contentPreview: 'No content',
      });
    });

    it('should handle short content without truncation', () => {
      const result = { content: [{ text: 'Short content' }] };
      logToolResult('testTool', result);
      expect(mockLogger.debug).toHaveBeenCalledWith('testTool handler result received', {
        contentLength: 13,
        contentPreview: 'Short content...',
      });
    });
  });

  describe('logAndFormatError', () => {
    it('should log and format Error object', () => {
      const error = new Error('Test error');
      const result = logAndFormatError(error, 'testTool');

      expect(mockLogger.error).toHaveBeenCalledWith('Error in testTool tool handler', {
        errorType: 'object',
        errorName: 'Error',
        errorMessage: 'Test error',
        errorStack: expect.stringContaining('Error: Test error'),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Returning error response to MCP client for testTool',
        { errorMessage: 'Test error' }
      );

      expect(result).toBe('Test error');
    });

    it('should handle JSON error message', () => {
      const error = new Error(JSON.stringify({ error: 'API error', details: 'Rate limited' }));
      const result = logAndFormatError(error, 'apiTool');

      expect(result).toBe('DeepSource API Error: API error - Rate limited');
    });

    it('should handle non-Error objects', () => {
      const error = { custom: 'error' };
      const result = logAndFormatError(error, 'customTool');

      expect(mockLogger.error).toHaveBeenCalledWith('Error in customTool tool handler', {
        errorType: 'object',
        errorName: 'Unknown',
        errorMessage: '[object Object]',
        errorStack: 'No stack available',
      });

      expect(result).toBe('Unknown error occurred');
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const result = logAndFormatError(error, 'stringTool');

      expect(mockLogger.error).toHaveBeenCalledWith('Error in stringTool tool handler', {
        errorType: 'string',
        errorName: 'Unknown',
        errorMessage: 'String error message',
        errorStack: 'No stack available',
      });

      expect(result).toBe('Unknown error occurred');
    });

    it('should handle custom Error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error occurred');
      const result = logAndFormatError(error, 'customErrorTool');

      expect(mockLogger.error).toHaveBeenCalledWith('Error in customErrorTool tool handler', {
        errorType: 'object',
        errorName: 'CustomError',
        errorMessage: 'Custom error occurred',
        errorStack: expect.stringContaining('CustomError: Custom error occurred'),
      });

      expect(result).toBe('Custom error occurred');
    });
  });
});
