/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
// import * as fs from 'fs'; - not used directly, only through jest mocks

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

  describe('log file initialization', () => {
    beforeEach(() => {
      // In each test, we need to reset the module-level initialization state
      // Since we can't directly access it, we'll work around by ensuring
      // the first write triggers initialization
      jest.clearAllMocks();
      jest.resetModules();
    });

    it('should initialize log file on first write when directory does not exist', async () => {
      // Set up environment
      process.env.LOG_LEVEL = 'DEBUG';
      process.env.LOG_FILE = '/tmp/test.log';

      // Mock file system calls - directory doesn't exist
      mockExistsSync.mockImplementation((path) => {
        return path !== '/tmp'; // Directory doesn't exist
      });
      mockMkdirSync.mockImplementation(() => undefined);
      mockWriteFileSync.mockImplementation(() => undefined);
      mockAppendFileSync.mockImplementation(() => undefined);

      // Create a fresh logger instance to trigger initialization
      const { Logger: FreshLogger } = await import('../utils/logger.js');
      const logger = new FreshLogger('TestContext');

      // First write should trigger initialization
      logger.debug('Test message');

      // Check initialization was performed
      expect(mockExistsSync).toHaveBeenCalledWith('/tmp');
      expect(mockMkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith('/tmp/test.log', '');
      expect(mockAppendFileSync).toHaveBeenCalledWith('/tmp/test.log', expect.any(String));
    });

    it('should handle initialization errors gracefully', async () => {
      // Set up environment
      process.env.LOG_LEVEL = 'DEBUG';
      process.env.LOG_FILE = '/tmp/test.log';

      // Mock file system calls - directory doesn't exist and mkdir throws
      mockExistsSync.mockReturnValue(false);
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockAppendFileSync.mockImplementation(() => undefined);

      // Create a fresh logger instance
      const { Logger: FreshLogger } = await import('../utils/logger.js');
      const logger = new FreshLogger('TestContext');

      // Should not throw even when initialization fails
      expect(() => logger.debug('Test message')).not.toThrow();

      // Verify error was caught and logging continued
      expect(mockMkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
      expect(mockAppendFileSync).toHaveBeenCalledWith('/tmp/test.log', expect.any(String));
    });
  });

  describe('error string fallback', () => {
    it('should use String() fallback when JSON.stringify throws', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      // Create a circular reference object that will fail JSON.stringify
      const circular: any = {};
      circular.ref = circular;

      // Mock JSON.stringify to throw
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Circular reference');
      });

      logger.error('Error with circular ref', circular);

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('[object Object]'); // This is what String() would produce

      // Restore JSON.stringify
      JSON.stringify = originalStringify;
    });
  });
});
