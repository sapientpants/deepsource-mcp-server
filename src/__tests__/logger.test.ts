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
const { appendFileSync, existsSync } = await import('fs');
const loggerModule = await import('../utils/logger.js');
const { Logger, createLogger, defaultLogger } = loggerModule;

// Type the mocks
const mockAppendFileSync = appendFileSync as jest.MockedFunction<typeof appendFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

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
    it('should write to log file when configured with LOG_FILE', () => {
      process.env.LOG_FILE = '/tmp/test.log';
      process.env.LOG_LEVEL = 'DEBUG';

      // Mock file system operations
      mockExistsSync.mockReturnValue(true); // File and directory already exist
      mockAppendFileSync.mockImplementation(() => undefined);

      const logger = new Logger('TestContext');
      logger.debug('Test message');

      // Should write to the log file
      expect(mockAppendFileSync).toHaveBeenCalledWith('/tmp/test.log', expect.any(String));
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;
      expect(logMessage).toContain('DEBUG');
      expect(logMessage).toContain('Test message');
    });

    it('should handle write errors gracefully', () => {
      process.env.LOG_FILE = '/tmp/test.log';
      process.env.LOG_LEVEL = 'DEBUG';

      // Mock file system operations to throw error
      mockExistsSync.mockReturnValue(true);
      mockAppendFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const logger = new Logger('TestContext');

      // Should not throw even when file operations fail
      expect(() => logger.debug('Test message')).not.toThrow();
    });

    it('should handle file initialization errors gracefully', async () => {
      process.env.LOG_FILE = '/tmp/test.log';
      process.env.LOG_LEVEL = 'DEBUG';

      // Clear the require cache for logger to reset module state
      jest.resetModules();

      // Mock the fs module with a mkdirSync that throws an error
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false),
        mkdirSync: jest.fn(() => {
          throw new Error('Permission denied');
        }),
      }));

      // Re-import the modules after mocking
      const loggerModule = await import('../utils/logger.js');
      const { Logger } = loggerModule;
      const { mkdirSync: mockMkdirSync } = await import('fs');

      const logger = new Logger('TestContext');

      // Should not throw when log file initialization fails
      expect(() => logger.debug('Test message')).not.toThrow();

      // mkdirSync should have been called during initialization
      expect(mockMkdirSync).toHaveBeenCalled();
    });

    it('should create directory when it does not exist', async () => {
      process.env.LOG_FILE = '/tmp/test.log';
      process.env.LOG_LEVEL = 'DEBUG';

      // Clear the require cache for logger to reset module state
      jest.resetModules();

      // Mock the fs module to simulate a directory that doesn't exist
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false), // Directory doesn't exist
        mkdirSync: jest.fn(), // Will be called to create the directory
      }));

      // Re-import the modules after mocking
      const loggerModule = await import('../utils/logger.js');
      const { Logger } = loggerModule;
      const { mkdirSync: mockMkdirSync, writeFileSync: mockWriteFileSync } = await import('fs');

      const logger = new Logger('TestContext');

      // Trigger initialization
      logger.debug('Test message');

      // mkdirSync should have been called to create the directory
      expect(mockMkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
      // writeFileSync should have been called to create the log file
      expect(mockWriteFileSync).toHaveBeenCalledWith('/tmp/test.log', '');
    });
  });

  describe('error string fallback', () => {
    it('should use String() fallback when JSON.stringify throws', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger('TestContext');

      // Create a circular reference object that will fail JSON.stringify
      const circular: Record<string, unknown> = {};
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
