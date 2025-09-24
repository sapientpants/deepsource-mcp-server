/**
 * @fileoverview Tests for backward compatibility layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment, createAndConfigureToolRegistry } from '../compatibility.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock console methods
const originalWarn = console.warn;
const originalError = console.error;

vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    getToolNames: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../server/tool-registration.js', () => ({
  registerDeepSourceTools: vi.fn(),
}));

vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(() => ({
    getApiKey: vi.fn(() => 'test-key'),
    clientFactory: {} as any,
    projectRepository: {} as any,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  })),
  createBaseHandlerFactory: vi.fn(),
}));

describe('Compatibility Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
    vi.restoreAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should validate when DEEPSOURCE_API_KEY is set', () => {
      const originalEnv = process.env.DEEPSOURCE_API_KEY;
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const result = validateEnvironment();
      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED: validateEnvironment is deprecated')
      );

      process.env.DEEPSOURCE_API_KEY = originalEnv;
    });

    it('should not validate when DEEPSOURCE_API_KEY is not set', () => {
      const originalEnv = process.env.DEEPSOURCE_API_KEY;
      delete process.env.DEEPSOURCE_API_KEY;

      const result = validateEnvironment();
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('DEEPSOURCE_API_KEY environment variable is not set')
      );

      process.env.DEEPSOURCE_API_KEY = originalEnv;
    });

    it('should not validate when DEEPSOURCE_API_KEY is empty', () => {
      const originalEnv = process.env.DEEPSOURCE_API_KEY;
      process.env.DEEPSOURCE_API_KEY = '';

      const result = validateEnvironment();
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('DEEPSOURCE_API_KEY environment variable is not set')
      );

      process.env.DEEPSOURCE_API_KEY = originalEnv;
    });
  });

  describe('createAndConfigureToolRegistry', () => {
    it('should create and configure a tool registry', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const registry = createAndConfigureToolRegistry(mockServer);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATED: createAndConfigureToolRegistry is deprecated')
      );
      expect(registry).toBeDefined();
      expect(registry.registerTool).toBeDefined();
      expect(registry.getToolNames).toBeDefined();
    });

    it('should register DeepSource tools', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      createAndConfigureToolRegistry(mockServer);

      const { registerDeepSourceTools } = require('../server/tool-registration.js');
      expect(registerDeepSourceTools).toHaveBeenCalled();
    });

    it('should handle errors during registration', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const { registerDeepSourceTools } = require('../server/tool-registration.js');
      registerDeepSourceTools.mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      const registry = createAndConfigureToolRegistry(mockServer);

      expect(registry).toBeDefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to register tools'),
        expect.any(Error)
      );
    });

    it('should pass custom handler dependencies if provided', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      const customDeps = {
        getApiKey: vi.fn(),
        clientFactory: {} as any,
        projectRepository: {} as any,
        logger: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        },
      };

      const { ToolRegistry } = require('../server/tool-registry.js');

      createAndConfigureToolRegistry(mockServer, customDeps);

      expect(ToolRegistry).toHaveBeenCalledWith(mockServer, customDeps);
    });
  });

  describe('Deprecation Warnings', () => {
    it('should show deprecation warnings for all exported functions', () => {
      const mockServer = {
        registerTool: vi.fn(),
      } as unknown as McpServer;

      // Test validateEnvironment deprecation
      const originalEnv = process.env.DEEPSOURCE_API_KEY;
      process.env.DEEPSOURCE_API_KEY = 'test-key';
      validateEnvironment();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('validateEnvironment is deprecated')
      );

      // Test createAndConfigureToolRegistry deprecation
      createAndConfigureToolRegistry(mockServer);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('createAndConfigureToolRegistry is deprecated')
      );

      process.env.DEEPSOURCE_API_KEY = originalEnv;
    });
  });
});