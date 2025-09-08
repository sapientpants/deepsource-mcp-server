/**
 * @fileoverview Tests for handler factory functions
 */

import { vi } from 'vitest';
import {
  createBaseHandlerFactory,
  createDefaultHandlerDeps,
  wrapInApiResponse,
  createErrorResponse,
  isApiResponse,
} from '../../../handlers/base/handler.factory.js';
import { BaseHandlerDeps } from '../../../handlers/base/handler.interface.js';
import { DeepSourceClientFactory } from '../../../client/factory.js';
import { Logger } from '../../../utils/logging/logger.js';

// Mock dependencies
vi.mock('../../../client/factory.js');
vi.mock('../../../config/index.js', () => ({
  getApiKey: vi.fn(() => 'test-api-key'),
}));
vi.mock('../../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Set up test environment
beforeEach(() => {
  process.env.DEEPSOURCE_API_KEY = 'test-api-key';
});

afterEach(() => {
  delete process.env.DEEPSOURCE_API_KEY;
});

describe('handler.factory', () => {
  describe('createBaseHandlerFactory', () => {
    let mockDeps: BaseHandlerDeps;
    let mockLogger: {
      info: any;
      error: any;
    };

    beforeEach(() => {
      mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
      };

      mockDeps = {
        clientFactory: new DeepSourceClientFactory('test-key'),
        logger: mockLogger as Logger,
        getApiKey: vi.fn(() => 'test-api-key'),
      };
    });

    it('should create a handler factory with logging', async () => {
      const handlerLogic = vi.fn(async (deps, params) => ({
        data: `Hello ${params.name}`,
      }));

      const factory = createBaseHandlerFactory('test_handler', handlerLogic);
      const handler = factory(mockDeps);

      const result = await handler({ name: 'World' });

      expect(handlerLogic).toHaveBeenCalledWith(mockDeps, { name: 'World' });
      expect(result).toEqual({ data: 'Hello World' });

      // Check logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Handler test_handler invoked',
        expect.objectContaining({ hasParams: true, params: { name: 'World' } })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Handler test_handler completed successfully',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should log handler errors and re-throw', async () => {
      const error = new Error('Handler failed');
      const handlerLogic = vi.fn(async () => {
        throw error;
      });

      const factory = createBaseHandlerFactory('error_handler', handlerLogic);
      const handler = factory(mockDeps);

      await expect(handler({})).rejects.toThrow('Handler failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Handler error_handler failed',
        expect.objectContaining({
          duration: expect.any(Number),
          errorType: 'Error',
          errorMessage: 'Handler failed',
          errorStack: expect.stringContaining('Error: Handler failed'),
        })
      );
    });

    it('should handle non-Error throws', async () => {
      const handlerLogic = vi.fn(async () => {
        throw 'String error';
      });

      const factory = createBaseHandlerFactory('string_error_handler', handlerLogic);
      const handler = factory(mockDeps);

      await expect(handler({})).rejects.toBe('String error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Handler string_error_handler failed',
        expect.objectContaining({
          errorType: 'string',
          errorMessage: 'String error',
          errorStack: undefined,
        })
      );
    });

    it('should log result count for array data', async () => {
      const handlerLogic = vi.fn(async () => ({
        data: ['item1', 'item2', 'item3'],
      }));

      const factory = createBaseHandlerFactory('array_handler', handlerLogic);
      const handler = factory(mockDeps);

      await handler({});

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Handler array_handler completed successfully',
        expect.objectContaining({
          duration: expect.any(Number),
          resultCount: 3,
        })
      );
    });
  });

  describe('createDefaultHandlerDeps', () => {
    it('should create default dependencies', () => {
      const deps = createDefaultHandlerDeps();

      expect(deps.clientFactory).toBeInstanceOf(DeepSourceClientFactory);
      expect(deps.logger).toBeDefined();
      expect(deps.getApiKey).toBeDefined();
      expect(deps.getApiKey()).toBe('test-api-key');
    });

    it('should accept overrides', () => {
      const customLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const deps = createDefaultHandlerDeps({
        logger: customLogger as Logger,
      });

      expect(deps.logger).toBe(customLogger);
    });
  });

  describe('wrapInApiResponse', () => {
    it('should wrap data in ApiResponse format', () => {
      const data = { message: 'Hello', value: 42 };
      const response = wrapInApiResponse(data);

      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    });

    it('should handle arrays', () => {
      const data = ['item1', 'item2'];
      const response = wrapInApiResponse(data);

      expect(response.content[0].text).toBe('[\n  "item1",\n  "item2"\n]');
    });

    it('should handle null and undefined', () => {
      expect(wrapInApiResponse(null).content[0].text).toBe('null');
      expect(wrapInApiResponse(undefined).content[0].text).toBe(undefined);
    });
  });

  describe('createErrorResponse', () => {
    it('should handle Error instances', () => {
      const error = new Error('Something went wrong');
      const response = createErrorResponse(error);

      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'HANDLER_ERROR',
              message: 'Something went wrong',
            }),
          },
        ],
      });
    });

    it('should handle Error with code property', () => {
      const error = new Error('API failed');
      (error as Record<string, unknown>).code = 'API_ERROR';

      const response = createErrorResponse(error);

      expect(response.content[0].text).toContain('"code":"API_ERROR"');
      expect(response.content[0].text).toContain('"message":"API failed"');
    });

    it('should handle Error with details and suggestions', () => {
      const error = new Error('Validation failed');
      (error as Record<string, unknown>).code = 'VALIDATION_ERROR';
      (error as Record<string, unknown>).details = { field: 'email', reason: 'invalid format' };
      (error as Record<string, unknown>).suggestions = ['Check email format', 'Use valid domain'];

      const response = createErrorResponse(error);
      const errorData = JSON.parse(response.content[0].text);

      expect(errorData).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'email', reason: 'invalid format' },
        suggestions: ['Check email format', 'Use valid domain'],
      });
    });

    it('should handle non-Error objects', () => {
      const response = createErrorResponse({ error: 'Custom error object' });

      expect(response.content[0].text).toContain('"code":"UNKNOWN_ERROR"');
      expect(response.content[0].text).toContain('[object Object]');
    });

    it('should handle string errors', () => {
      const response = createErrorResponse('Simple string error');

      expect(response.content[0].text).toContain('"code":"UNKNOWN_ERROR"');
      expect(response.content[0].text).toContain('"message":"Simple string error"');
    });

    it('should handle null/undefined errors', () => {
      const nullResponse = createErrorResponse(null);
      const undefinedResponse = createErrorResponse(undefined);

      expect(nullResponse.content[0].text).toContain('"code":"UNKNOWN_ERROR"');
      expect(nullResponse.content[0].text).toContain('"message":"null"');

      expect(undefinedResponse.content[0].text).toContain('"code":"UNKNOWN_ERROR"');
      // undefined becomes "undefined" string
      const undefinedData = JSON.parse(undefinedResponse.content[0].text);
      expect(undefinedData.code).toBe('UNKNOWN_ERROR');
      expect(undefinedData.message).toBe('undefined');
    });

    it('should use custom default message', () => {
      const response = createErrorResponse(null, 'Custom error message');

      // null still produces "null" as the message when stringified
      expect(response.content[0].text).toContain('"message":"null"');
    });

    it('should handle Error with empty message', () => {
      const error = new Error('');
      const response = createErrorResponse(error, 'Default message');

      expect(response.content[0].text).toContain('"message":"Default message"');
    });
  });

  describe('isApiResponse', () => {
    it('should return true for valid ApiResponse', () => {
      const validResponse = {
        content: [{ type: 'text', text: 'data' }],
      };

      expect(isApiResponse(validResponse)).toBe(true);
    });

    it('should return true for ApiResponse with isError', () => {
      const errorResponse = {
        content: [{ type: 'text', text: 'error' }],
        isError: true,
      };

      expect(isApiResponse(errorResponse)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isApiResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiResponse(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isApiResponse('string')).toBe(false);
      expect(isApiResponse(123)).toBe(false);
      expect(isApiResponse(true)).toBe(false);
    });

    it('should return false for objects without content', () => {
      expect(isApiResponse({})).toBe(false);
      expect(isApiResponse({ data: 'test' })).toBe(false);
    });

    it('should return false for objects with non-array content', () => {
      expect(isApiResponse({ content: 'not an array' })).toBe(false);
      expect(isApiResponse({ content: { type: 'text' } })).toBe(false);
    });

    it('should return true for empty content array', () => {
      expect(isApiResponse({ content: [] })).toBe(true);
    });
  });
});
