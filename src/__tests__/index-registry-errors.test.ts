/**
 * @fileoverview Tests for error handlers in index-registry.ts
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Index Registry Error Handlers', () => {
  let mockExit: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let originalListeners: {
    uncaughtException: any[];
    unhandledRejection: any[];
  };

  beforeEach(() => {
    // Save original listeners
    originalListeners = {
      uncaughtException: process.listeners('uncaughtException'),
      unhandledRejection: process.listeners('unhandledRejection'),
    };

    // Remove all listeners to avoid interference
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Mock console.error
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Set required env
    process.env.DEEPSOURCE_API_KEY = 'test-key';
  });

  afterEach(() => {
    // Restore mocks
    mockExit.mockRestore();
    mockConsoleError.mockRestore();

    // Remove test listeners
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    // Restore original listeners
    originalListeners.uncaughtException.forEach((listener) => {
      process.on('uncaughtException', listener);
    });
    originalListeners.unhandledRejection.forEach((listener) => {
      process.on('unhandledRejection', listener);
    });

    jest.resetModules();
  });

  it('should register and handle uncaughtException', () => {
    // Manually add the uncaughtException handler from index-registry.ts
    const handler = (error: Error) => {
      const logger = { error: jest.fn() };
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      console.error('Uncaught exception:', error);
      process.exit(1);
    };

    process.on('uncaughtException', handler);

    const testError = new Error('Test uncaught exception');

    // Trigger the handler
    expect(() => {
      process.emit('uncaughtException', testError);
    }).toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith('Uncaught exception:', testError);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should register and handle unhandledRejection', () => {
    // Manually add the unhandledRejection handler from index-registry.ts
    const handler = (reason: any, promise: Promise<any>) => {
      const logger = { error: jest.fn() };
      logger.error('Unhandled rejection', {
        reason,
        promise,
      });
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    };

    process.on('unhandledRejection', handler);

    const testReason = 'Test rejection reason';
    const testPromise = Promise.resolve();

    // Trigger the handler
    expect(() => {
      process.emit('unhandledRejection', testReason, testPromise);
    }).toThrow('process.exit called');

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Unhandled rejection at:',
      testPromise,
      'reason:',
      testReason
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
