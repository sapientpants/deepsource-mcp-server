/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// We need to mock the console methods before importing the Logger module
const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

// Save original console methods
const originalConsoleDebug = console.debug;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Apply mocks
console.debug = mockDebug;
console.info = mockInfo;
console.warn = mockWarn;
console.error = mockError;

// Now import the Logger module
import { Logger, createLogger, defaultLogger } from '../utils/logger.js';

describe('Logger', () => {
  // Environment backup
  let originalEnv;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  afterAll(() => {
    // Restore console methods after all tests
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
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

      expect(mockDebug).toHaveBeenCalled();
      const logMessage = mockDebug.mock.calls[0][0];
      expect(logMessage).toContain('DEBUG');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test debug message');
    });

    it('should include additional data when provided', () => {
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.debug('Test debug message', testData);

      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('DEBUG'), testData);
    });

    it('should use empty string when no data is provided', () => {
      const logger = new Logger('TestContext');

      logger.debug('Test debug message');

      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('DEBUG'), '');
    });
  });

  describe('info method', () => {
    it('should log info messages when LOG_LEVEL is DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockInfo).toHaveBeenCalled();
      const logMessage = mockInfo.mock.calls[0][0];
      expect(logMessage).toContain('INFO');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test info message');
    });

    it('should log info messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockInfo).toHaveBeenCalled();
    });

    it('should not log info messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');

      logger.info('Test info message');

      expect(mockInfo).not.toHaveBeenCalled();
    });

    it('should include additional data when provided', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.info('Test info message', testData);

      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('INFO'), testData);
    });
  });

  describe('warn method', () => {
    it('should log warn messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger('TestContext');

      logger.warn('Test warn message');

      expect(mockWarn).toHaveBeenCalled();
      const logMessage = mockWarn.mock.calls[0][0];
      expect(logMessage).toContain('WARN');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test warn message');
    });

    it('should not log warn messages when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      logger.warn('Test warn message');

      expect(mockWarn).not.toHaveBeenCalled();
    });

    it('should include additional data when provided', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');
      const testData = { key: 'value' };

      logger.warn('Test warn message', testData);

      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('WARN'), testData);
    });
  });

  describe('error method', () => {
    it('should log error messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger('TestContext');

      logger.error('Test error message');

      expect(mockError).toHaveBeenCalled();
      const logMessage = mockError.mock.calls[0][0];
      expect(logMessage).toContain('ERROR');
      expect(logMessage).toContain('[TestContext]');
      expect(logMessage).toContain('Test error message');
    });

    it('should format Error objects correctly', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');
      const testError = new Error('Test error');

      logger.error('Error occurred', testError);

      expect(mockError).toHaveBeenCalled();
      const errorOutput = mockError.mock.calls[0][1];
      expect(errorOutput).toContain('Error: Test error');
    });

    it('should stringify objects correctly', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');
      const testData = { key: 'value', nested: { prop: true } };

      logger.error('Error with data', testData);

      expect(mockError).toHaveBeenCalled();
      const errorOutput = mockError.mock.calls[0][1];
      expect(typeof errorOutput).toBe('string');
    });

    it('should use empty string when no error is provided', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      logger.error('Test error message');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('ERROR'), '');
    });
  });

  describe('default exports', () => {
    it('should export a default logger with DeepSourceMCP context', () => {
      process.env.LOG_LEVEL = 'DEBUG';

      // We need to directly use the imported module since we can't fully isolate it
      expect(defaultLogger).toBeInstanceOf(Logger);
      defaultLogger.debug('Test message');

      expect(mockDebug).toHaveBeenCalled();
    });

    it('should provide a createLogger helper function', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const customLogger = createLogger('CustomContext');

      customLogger.debug('Test message');

      expect(mockDebug).toHaveBeenCalled();
    });
  });
});
