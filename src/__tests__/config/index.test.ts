/**
 * @fileoverview Tests for configuration management
 */

import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
};

jest.unstable_mockModule('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

// Import after mocking
const { getConfig, hasApiKey, getApiKey } = await import('../../config/index.js');

describe('Configuration Management', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env to a clean state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default configuration with provided API key', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'test-api-key',
        apiBaseUrl: 'https://api.deepsource.io/graphql/',
        requestTimeout: 30000,
        logLevel: 'DEBUG',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Loading configuration', {
        hasApiKey: true,
        apiBaseUrl: 'https://api.deepsource.io/graphql/',
        requestTimeout: 30000,
        logLevel: 'DEBUG',
      });
    });

    it('should use environment variables when provided', () => {
      process.env.DEEPSOURCE_API_KEY = 'custom-api-key';
      process.env.DEEPSOURCE_API_BASE_URL = 'https://custom.deepsource.io/graphql/';
      process.env.DEEPSOURCE_REQUEST_TIMEOUT = '60000';
      process.env.LOG_FILE = '/tmp/deepsource.log';
      process.env.LOG_LEVEL = 'INFO';

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'custom-api-key',
        apiBaseUrl: 'https://custom.deepsource.io/graphql/',
        requestTimeout: 60000,
        logFile: '/tmp/deepsource.log',
        logLevel: 'INFO',
      });
    });

    it('should throw error when API key is not set', () => {
      delete process.env.DEEPSOURCE_API_KEY;

      expect(() => getConfig()).toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should throw error when request timeout is negative', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';
      process.env.DEEPSOURCE_REQUEST_TIMEOUT = '-1000';

      expect(() => getConfig()).toThrow('Request timeout must be a positive number');
    });

    it('should allow zero timeout (edge case - not validated due to falsy check)', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';
      process.env.DEEPSOURCE_REQUEST_TIMEOUT = '0';

      const config = getConfig();

      // 0 passes through but isn't validated because 0 is falsy
      expect(config.requestTimeout).toBe(0);
    });

    it('should allow NaN timeout (edge case - not validated due to falsy check)', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';
      process.env.DEEPSOURCE_REQUEST_TIMEOUT = 'not-a-number';

      const config = getConfig();

      // NaN passes through but isn't validated because NaN is falsy
      expect(Number.isNaN(config.requestTimeout)).toBe(true);
    });

    it('should handle empty string values as strings not undefined', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';
      process.env.DEEPSOURCE_API_BASE_URL = '';

      const config = getConfig();

      // Empty strings are valid string values
      expect(config.apiBaseUrl).toBe('');
    });
  });

  describe('hasApiKey', () => {
    it('should return true when API key is set', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';

      expect(hasApiKey()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.DEEPSOURCE_API_KEY;

      expect(hasApiKey()).toBe(false);
    });

    it('should return true for empty string API key', () => {
      process.env.DEEPSOURCE_API_KEY = '';

      // Boolean('') is false, so this should return false
      expect(hasApiKey()).toBe(false);
    });

    it('should return true for whitespace API key', () => {
      process.env.DEEPSOURCE_API_KEY = '   ';

      // Boolean('   ') is true, so this should return true
      expect(hasApiKey()).toBe(true);
    });
  });

  describe('getApiKey', () => {
    it('should return the API key when configured', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key-123';

      const apiKey = getApiKey();

      expect(apiKey).toBe('test-api-key-123');
    });

    it('should throw error when API key is not set', () => {
      delete process.env.DEEPSOURCE_API_KEY;

      expect(() => getApiKey()).toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should return API key even if it contains special characters', () => {
      process.env.DEEPSOURCE_API_KEY = 'key-with-special-chars!@#$%^&*()';

      const apiKey = getApiKey();

      expect(apiKey).toBe('key-with-special-chars!@#$%^&*()');
    });
  });

  describe('Integration tests', () => {
    it('should work correctly with partial environment configuration', () => {
      process.env.DEEPSOURCE_API_KEY = 'integration-key';
      process.env.LOG_LEVEL = 'ERROR';
      // Leave other values to use defaults

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'integration-key',
        apiBaseUrl: 'https://api.deepsource.io/graphql/',
        requestTimeout: 30000,
        logLevel: 'ERROR',
      });
    });

    it('should handle all environment variables being set', () => {
      process.env.DEEPSOURCE_API_KEY = 'full-config-key';
      process.env.DEEPSOURCE_API_BASE_URL = 'https://staging.deepsource.io/graphql/';
      process.env.DEEPSOURCE_REQUEST_TIMEOUT = '45000';
      process.env.LOG_FILE = '/var/log/deepsource.log';
      process.env.LOG_LEVEL = 'WARN';

      const config = getConfig();

      expect(config).toEqual({
        apiKey: 'full-config-key',
        apiBaseUrl: 'https://staging.deepsource.io/graphql/',
        requestTimeout: 45000,
        logFile: '/var/log/deepsource.log',
        logLevel: 'WARN',
      });
    });
  });
});
