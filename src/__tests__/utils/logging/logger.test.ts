/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// Mock the fs module before importing logger
jest.unstable_mockModule('fs', () => ({
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

// Import the mocked fs
const { appendFileSync } = await import('fs');
const mockAppendFileSync = appendFileSync as jest.MockedFunction<typeof appendFileSync>;

// Import logger module after mocking fs
const loggerModule = await import('../../../utils/logging/logger');
const { LogLevel, Logger, createLogger, defaultLogger } = loggerModule;

describe('Logger Module', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };

    // Set up common test environment
    process.env.LOG_FILE = '/tmp/test.log';
    process.env.LOG_LEVEL = 'DEBUG';

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset the module-level logFileInitialized variable
    jest.resetModules();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('LogLevel enum', () => {
    it('should define the correct log levels', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
    });
  });

  describe('Logger Initialization', () => {
    it('should initialize the log file when it does not exist', async () => {
      // Reset modules to reset the logFileInitialized variable
      jest.resetModules();

      // Re-mock fs for this test
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false), // Directory doesn't exist
        mkdirSync: jest.fn(), // Will be called to create the directory
      }));

      // Re-import modules
      const { appendFileSync, writeFileSync, mkdirSync } = await import('fs');
      const mockDir = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
      const mockWrite = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
      const mockAppend = appendFileSync as jest.MockedFunction<typeof appendFileSync>;
      const loggerModule = await import('../../../utils/logging/logger');
      const { Logger } = loggerModule;

      const logger = new Logger('TestContext');
      logger.debug('Test message');

      // Should create directory and file
      expect(mockDir).toHaveBeenCalledWith('/tmp', { recursive: true });
      expect(mockWrite).toHaveBeenCalledWith('/tmp/test.log', '');
      expect(mockAppend).toHaveBeenCalledWith('/tmp/test.log', expect.any(String));
    });

    it('should handle cases where log file creation fails', async () => {
      // Reset modules to reset the logFileInitialized variable
      jest.resetModules();

      // Re-mock fs with mkdirSync that throws
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false),
        mkdirSync: jest.fn(() => {
          throw new Error('Permission denied');
        }),
      }));

      // Re-import modules
      const { mkdirSync } = await import('fs');
      const _mkdirSync = mkdirSync; // Use _ prefix for intentionally unused variable
      const loggerModule = await import('../../../utils/logging/logger');
      const { Logger } = loggerModule;

      const logger = new Logger('TestContext');

      // Should not throw when initialization fails
      expect(() => logger.debug('Test message')).not.toThrow();
      expect(_mkdirSync).toHaveBeenCalled();
    });

    it('should initialize the log file only once per process', async () => {
      // Reset modules to reset the logFileInitialized variable
      jest.resetModules();

      // Re-mock fs
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false),
        mkdirSync: jest.fn(),
      }));

      // Re-import modules
      const { writeFileSync, mkdirSync } = await import('fs');
      const mockWrite = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
      const mockMkdir = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
      const loggerModule = await import('../../../utils/logging/logger');
      const { Logger } = loggerModule;

      const logger = new Logger('TestContext');
      logger.debug('First message');
      logger.debug('Second message');

      // Should only create directory and init file once
      expect(mockMkdir).toHaveBeenCalledTimes(1);
      expect(mockWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logger methods', () => {
    describe('debug method', () => {
      it('should not log when LOG_LEVEL is higher than DEBUG', () => {
        process.env.LOG_LEVEL = 'INFO';
        const logger = new Logger('TestContext');

        logger.debug('This should not be logged');

        expect(mockAppendFileSync).not.toHaveBeenCalled();
      });

      it('should format debug messages correctly', () => {
        const logger = new Logger('TestContext');
        logger.debug('Test debug message');

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toMatch(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z DEBUG \[TestContext\] Test debug message/
        );
      });

      it('should format data objects in debug messages', () => {
        const logger = new Logger('TestContext');
        const testData = { key: 'value', nested: { prop: 123 } };

        logger.debug('Debug with data', testData);

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        // Check that the data was properly formatted with JSON.stringify
        expect(logMessage).toContain('"key": "value"');
        expect(logMessage).toContain('"nested": {');
        expect(logMessage).toContain('"prop": 123');
      });
    });

    describe('info method', () => {
      it('should not log when LOG_LEVEL is higher than INFO', () => {
        process.env.LOG_LEVEL = 'WARN';
        const logger = new Logger('TestContext');

        logger.info('This should not be logged');

        expect(mockAppendFileSync).not.toHaveBeenCalled();
      });

      it('should format info messages correctly', () => {
        const logger = new Logger('TestContext');
        logger.info('Test info message');

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toMatch(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO \[TestContext\] Test info message/
        );
      });

      it('should format data objects in info messages', () => {
        const logger = new Logger('TestContext');
        const testData = { status: 'success', count: 42 };

        logger.info('Info with data', testData);

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toContain('"status": "success"');
        expect(logMessage).toContain('"count": 42');
      });
    });

    describe('warn method', () => {
      it('should not log when LOG_LEVEL is higher than WARN', () => {
        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');

        logger.warn('This should not be logged');

        expect(mockAppendFileSync).not.toHaveBeenCalled();
      });

      it('should format warn messages correctly', () => {
        process.env.LOG_LEVEL = 'WARN';
        const logger = new Logger('TestContext');
        logger.warn('Test warning message');

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toMatch(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z WARN \[TestContext\] Test warning message/
        );
      });

      it('should handle cases where appending to log file fails', async () => {
        // Reset modules
        jest.resetModules();

        // Re-mock fs with appendFileSync that throws
        jest.unstable_mockModule('fs', () => ({
          appendFileSync: jest.fn(() => {
            throw new Error('Disk full');
          }),
          writeFileSync: jest.fn(),
          existsSync: jest.fn(() => true),
          mkdirSync: jest.fn(),
        }));

        // Re-import modules
        const { appendFileSync } = await import('fs');
        const loggerModule = await import('../../../utils/logging/logger');
        const { Logger } = loggerModule;

        process.env.LOG_LEVEL = 'WARN';
        const logger = new Logger('TestContext');

        // Should not throw when file write fails
        expect(() => logger.warn('Test warning message')).not.toThrow();
        expect(appendFileSync).toHaveBeenCalled();
      });
    });

    describe('error method', () => {
      it('should format error messages correctly', () => {
        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');
        logger.error('Test error message');

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toMatch(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z ERROR \[TestContext\] Test error message/
        );
      });

      it('should format Error objects with stack traces', () => {
        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');
        const testError = new Error('Something went wrong');

        logger.error('An error occurred', testError);

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toContain('Error: Something went wrong');
        expect(logMessage).toContain('at '); // Should include stack trace
      });

      it('should handle Error objects without stack traces', () => {
        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');
        const testError = new Error('No stack trace');
        delete testError.stack;

        logger.error('An error occurred', testError);

        expect(mockAppendFileSync).toHaveBeenCalled();
        const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

        expect(logMessage).toContain('Error: No stack trace');
        expect(logMessage).not.toContain('undefined');
      });

      it('should handle circular reference objects', async () => {
        // Reset modules
        jest.resetModules();

        // Re-import modules
        const { appendFileSync } = await import('fs');
        const mockAppendFile = appendFileSync as jest.MockedFunction<typeof appendFileSync>;
        const loggerModule = await import('../../../utils/logging/logger');
        const { Logger } = loggerModule;

        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');

        // Create circular reference that will fail in JSON.stringify
        const circular: Record<string, unknown> = { name: 'Circular Object' };
        circular.self = circular;

        // Mock JSON.stringify to throw an error for circular references
        const originalStringify = JSON.stringify;
        JSON.stringify = jest.fn().mockImplementation(() => {
          throw new Error('Converting circular structure to JSON');
        });

        logger.error('Error with circular object', circular);

        expect(mockAppendFile).toHaveBeenCalled();
        const logMessage = mockAppendFile.mock.calls[0][1] as string;

        // Should fall back to String()
        expect(logMessage).toContain('[object Object]');

        // Restore original
        JSON.stringify = originalStringify;
      });

      it('should handle primitive values as error data', () => {
        process.env.LOG_LEVEL = 'ERROR';
        const logger = new Logger('TestContext');

        // Test with various primitive types
        logger.error('Error with number', 42);
        logger.error('Error with string', 'error details');
        logger.error('Error with boolean', true);
        logger.error('Error with null', null);

        expect(mockAppendFileSync).toHaveBeenCalledTimes(4);

        const messages = mockAppendFileSync.mock.calls.map((call) => call[1] as string);

        expect(messages[0]).toContain('42');
        expect(messages[1]).toContain('error details');
        expect(messages[2]).toContain('true');
        expect(messages[3]).toContain('null');
      });
    });
  });

  describe('Log Level priority', () => {
    it('should respect log level hierarchy', () => {
      // Create a logger and test all methods with different LOG_LEVELs

      // When LOG_LEVEL is DEBUG, all logs should work
      process.env.LOG_LEVEL = 'DEBUG';
      const logger = new Logger('TestContext');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockAppendFileSync).toHaveBeenCalledTimes(4);
      jest.clearAllMocks();

      // When LOG_LEVEL is INFO, debug should be skipped
      process.env.LOG_LEVEL = 'INFO';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockAppendFileSync).toHaveBeenCalledTimes(3);
      jest.clearAllMocks();

      // When LOG_LEVEL is WARN, debug and info should be skipped
      process.env.LOG_LEVEL = 'WARN';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockAppendFileSync).toHaveBeenCalledTimes(2);
      jest.clearAllMocks();

      // When LOG_LEVEL is ERROR, only error should work
      process.env.LOG_LEVEL = 'ERROR';

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid LOG_LEVEL gracefully', () => {
      // The expected behavior is actually to NOT log when
      // an invalid LOG_LEVEL is set, since the lookup in LOG_LEVELS_PRIORITY
      // will fail and shouldLog() will return false

      // Set an invalid log level
      process.env.LOG_LEVEL = 'INVALID_LEVEL';
      const logger = new Logger('TestContext');

      // Send logs at all levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // No logs should be written due to invalid level
      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Helper functions', () => {
    it('should create a logger with the specified context', () => {
      const logger = createLogger('CustomContext');
      logger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

      expect(logMessage).toContain('[CustomContext]');
    });

    it('should use the defaultLogger with DeepSourceMCP context', () => {
      defaultLogger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

      expect(logMessage).toContain('[DeepSourceMCP]');
    });
  });

  describe('Log file path handling', () => {
    it('should not log when LOG_FILE is not set', () => {
      delete process.env.LOG_FILE;
      const logger = new Logger('TestContext');

      logger.debug('This message should not be logged');
      logger.info('This message should not be logged');
      logger.warn('This message should not be logged');
      logger.error('This message should not be logged');

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it('should use the LOG_FILE environment variable', () => {
      process.env.LOG_FILE = '/var/log/custom.log';
      const logger = new Logger('TestContext');

      logger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalledWith('/var/log/custom.log', expect.any(String));
    });

    it('should create parent directories correctly', async () => {
      // Reset modules
      jest.resetModules();

      // Re-mock fs
      jest.unstable_mockModule('fs', () => ({
        appendFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => false),
        mkdirSync: jest.fn(),
      }));

      // Re-import modules
      const { mkdirSync } = await import('fs');
      const _mkdirSync = mkdirSync; // Use _ prefix for intentionally unused variable
      const loggerModule = await import('../../../utils/logging/logger');
      const { Logger } = loggerModule;

      process.env.LOG_FILE = '/nested/path/to/log.txt';
      const logger = new Logger('TestContext');
      logger.info('Test message');

      expect(_mkdirSync).toHaveBeenCalledWith('/nested/path/to', { recursive: true });
    });
  });

  describe('Message formatting', () => {
    it('should format messages with context correctly', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

      // Format should be: timestamp LEVEL [Context] Message
      expect(logMessage).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO \[TestContext\] Test message/
      );
    });

    it('should format messages without context correctly', () => {
      const logger = new Logger(); // No context
      logger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

      // Format should be: timestamp LEVEL Message (no context brackets)
      expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO Test message/);
      expect(logMessage).not.toContain('[]'); // Should not have empty brackets
    });

    it('should add trailing newline to log messages', () => {
      const logger = new Logger('TestContext');
      logger.info('Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logMessage = mockAppendFileSync.mock.calls[0][1] as string;

      expect(logMessage.endsWith('\n')).toBe(true);
    });
  });
});
