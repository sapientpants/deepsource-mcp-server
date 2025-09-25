/**
 * @fileoverview Tests for compatibility layer functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock loggers used by the modules
const mockCompatibilityLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

const mockFactoryLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock the logger module
vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn((name: string) => {
    if (name === 'Compatibility') {
      return mockCompatibilityLogger;
    }
    return mockFactoryLogger;
  }),
}));

// Mock the ToolRegistry
const mockToolRegistry = {
  registerTool: vi.fn(),
  getToolNames: vi.fn(() => ['tool1', 'tool2']),
};

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn(() => mockToolRegistry),
}));

// Mock registerDeepSourceTools
vi.mock('../server/tool-registration.js', () => ({
  registerDeepSourceTools: vi.fn(),
}));

// Mock createDefaultHandlerDeps
vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(() => ({
    getApiKey: vi.fn(() => 'test-api-key'),
    clientFactory: {},
    projectRepository: {},
    analysisRunRepository: {},
    metricsRepository: {},
    complianceReportRepository: {},
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  })),
}));

// Import after mocks are set up
import {
  validateEnvironment,
  createAndConfigureToolRegistry,
} from '../compatibility.js';
import { ToolRegistry } from '../server/tool-registry.js';
import { registerDeepSourceTools } from '../server/tool-registration.js';
import { createDefaultHandlerDeps } from '../handlers/base/handler.factory.js';

describe('Compatibility Layer', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should return true when DEEPSOURCE_API_KEY is set', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-api-key-123';

      const result = validateEnvironment();

      expect(result).toBe(true);
      expect(mockCompatibilityLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED: validateEnvironment() is deprecated')
      );
    });

    it('should return false when DEEPSOURCE_API_KEY is not set', () => {
      delete process.env.DEEPSOURCE_API_KEY;

      const result = validateEnvironment();

      expect(result).toBe(false);
      expect(mockCompatibilityLogger.error).toHaveBeenCalledWith(
        'DEEPSOURCE_API_KEY environment variable is not set or is empty'
      );
    });

    it('should return false when DEEPSOURCE_API_KEY is empty string', () => {
      process.env.DEEPSOURCE_API_KEY = '';

      const result = validateEnvironment();

      expect(result).toBe(false);
      expect(mockCompatibilityLogger.error).toHaveBeenCalledWith(
        'DEEPSOURCE_API_KEY environment variable is not set or is empty'
      );
    });

    it('should return false when DEEPSOURCE_API_KEY is whitespace only', () => {
      process.env.DEEPSOURCE_API_KEY = '   ';

      const result = validateEnvironment();

      expect(result).toBe(false);
      expect(mockCompatibilityLogger.error).toHaveBeenCalledWith(
        'DEEPSOURCE_API_KEY environment variable is not set or is empty'
      );
    });

    it('should log deprecation warning every time', () => {
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      validateEnvironment();
      validateEnvironment();

      expect(mockCompatibilityLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockCompatibilityLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED')
      );
    });
  });

  describe('createAndConfigureToolRegistry', () => {
    it('should create a registry with provided server', () => {
      const mockServer = { registerTool: vi.fn() };

      const result = createAndConfigureToolRegistry(mockServer as any);

      expect(result).toBeDefined();
      expect(mockCompatibilityLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED: createAndConfigureToolRegistry() is deprecated')
      );
    });

    it('should register DeepSource tools successfully', () => {
      const mockServer = { registerTool: vi.fn() };

      createAndConfigureToolRegistry(mockServer as any);

      expect(vi.mocked(registerDeepSourceTools)).toHaveBeenCalled();
      expect(mockCompatibilityLogger.info).toHaveBeenCalledWith(
        'Successfully registered DeepSource tools in compatibility mode'
      );
    });

    it('should handle errors during tool registration gracefully', () => {
      const mockServer = { registerTool: vi.fn() };
      vi.mocked(registerDeepSourceTools).mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      const result = createAndConfigureToolRegistry(mockServer as any);

      expect(result).toBeDefined(); // Should still return registry
      expect(mockCompatibilityLogger.error).toHaveBeenCalledWith(
        'Failed to register tools:',
        expect.any(Error)
      );
    });

    it('should pass custom dependencies to ToolRegistry', () => {
      const mockServer = { registerTool: vi.fn() };
      const mockDeps = {
        getApiKey: vi.fn(),
        clientFactory: {},
        logger: mockFactoryLogger,
      };

      createAndConfigureToolRegistry(mockServer as any, mockDeps as any);

      expect(ToolRegistry).toHaveBeenCalledWith(mockServer, mockDeps);
    });

    it('should use default dependencies when not provided', () => {
      const mockServer = { registerTool: vi.fn() };

      createAndConfigureToolRegistry(mockServer as any);

      expect(vi.mocked(createDefaultHandlerDeps)).toHaveBeenCalled();
      expect(ToolRegistry).toHaveBeenCalledWith(
        mockServer,
        expect.objectContaining({
          getApiKey: expect.any(Function),
        })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work with validateEnvironment and createAndConfigureToolRegistry together', () => {
      const mockServer = { registerTool: vi.fn() };
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const isValid = validateEnvironment();
      expect(isValid).toBe(true);

      if (isValid) {
        const registry = createAndConfigureToolRegistry(mockServer as any);
        expect(registry).toBeDefined();
        expect(mockToolRegistry.getToolNames()).toEqual(['tool1', 'tool2']);
      }
    });

    it('should handle migration from old to new pattern', () => {
      const mockServer = { registerTool: vi.fn() };

      // Old pattern
      process.env.DEEPSOURCE_API_KEY = 'test-key';
      const isValid = validateEnvironment();

      if (isValid) {
        const registry = createAndConfigureToolRegistry(mockServer as any);

        // Should log deprecation warnings
        expect(mockCompatibilityLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('DEPRECATED')
        );

        // But should still work
        expect(registry).toBeDefined();
      }
    });
  });
});