/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';

// Mock the fs module before importing Logger
jest.unstable_mockModule('fs', () => ({
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

// Now import the mocked fs and Logger module
const { appendFileSync, writeFileSync, existsSync, mkdirSync } = await import('fs');
const loggerModule = await import('../utils/logger.js');
const { Logger, createLogger, defaultLogger } = loggerModule;

// Type the mocks
const mockAppendFileSync = appendFileSync as jest.MockedFunction<typeof appendFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;

describe('Logger', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };

    // Set up common test environment
    process.env.LOG_FILE = '/tmp/test.log';
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the module-level logFileInitialized variable by reimporting the module
    jest.resetModules();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create a logger with a context', () => {
      const logger = new Logger('TestContext');
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create a logger without a context', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('debug method', () => {
    beforeEach(() => {
      // Set LOG_LEVEL for each test in this describe block
      process.env.LOG_LEVEL = 'DEBUG';
    });

    it('should log debug messages when LOG_LEVEL is DEBUG', () => {
      const logger = new Logger('TestContext');
      logger.debug('Test debug message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('DEBUG');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test debug message');
    });

    it('should include additional data when provided', () => {
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.debug('Test debug message', testData);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain(JSON.stringify(testData, null, 2));
    });

    it('should use empty string when no data is provided', () => {
      const logger = new Logger('TestContext');

      logger.debug('Test debug message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).not.toContain('undefined');
    });

    it('should not log when LOG_FILE is not set', () => {
      delete process.env.LOG_FILE;
      const logger = new Logger('TestContext');

      logger.debug('Test debug message');

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('info method', () => {
    it('should log info messages when LOG_LEVEL is DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('INFO');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test info message');
    });

    it('should log info messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it('should not log info messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should include additional data when provided', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.info('Test info message', testData);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain(JSON.stringify(testData, null, 2));
    });
  });

  describe('warn method', () => {
    it('should log warn messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');

      logger.warn('Test warn message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('WARN');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test warn message');
    });

    it('should not log warn messages when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      logger.warn('Test warn message');

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should include additional data when provided', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.warn('Test warn message', testData);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain(JSON.stringify(testData, null, 2));
    });
  });

  describe('error method', () => {
    it('should log error messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');

      logger.error('Test error message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('ERROR');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test error message');
    });

    it('should format Error objects correctly', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');
      const testError = new Error('Test error');

      logger.error('Error occurred', testError);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('Error: Test error');
    });

    it('should stringify objects correctly', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');
      const testData = { foo: 'bar' };

      logger.error('Error with data', testData);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain(JSON.stringify(testData, null, 2));
    });

    it('should use empty string when no error is provided', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      logger.error('Test error message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).not.toContain('undefined');
    });
  });

  describe('default exports', () => {
    it('should export a default logger with DeepSourceMCP context', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      
      defaultLogger.debug('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('[DeepSourceMCP]');
    });

    it('should provide a createLogger helper function', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const customLogger = createLogger('CustomContext');
      
      customLogger.debug('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('[CustomContext]');
    });
  });
});