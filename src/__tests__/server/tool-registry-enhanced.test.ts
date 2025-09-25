/**
 * @fileoverview Tests for tool-registry-enhanced.ts deprecated function
 */

/* skipcq: JS-W1029 */
// This test file intentionally uses the deprecated createEnhancedToolRegistry function
// to verify that deprecation warnings are working correctly

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnhancedToolRegistry } from '../../server/tool-registry-enhanced.js'; // skipcq: JS-W1029
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';

// Mock the ToolRegistry
vi.mock('../../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation((server, deps) => ({
    registerTool: vi.fn(),
    getToolNames: vi.fn(() => ['tool1', 'tool2']),
    discoverTools: vi.fn(() => Promise.resolve(['discovered1', 'discovered2'])),
    server,
    deps,
  })),
}));

describe('tool-registry-enhanced', () => {
  let mockServer: McpServer;
  let mockDeps: BaseHandlerDeps;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockServer = {
      registerTool: vi.fn(),
      connect: vi.fn(),
    } as unknown as McpServer;

    mockDeps = {
      getApiKey: vi.fn(() => 'test-api-key'),
      clientFactory: {} as BaseHandlerDeps['clientFactory'],
      projectRepository: {} as BaseHandlerDeps['projectRepository'],
      analysisRunRepository: {} as BaseHandlerDeps['analysisRunRepository'],
      metricsRepository: {} as BaseHandlerDeps['metricsRepository'],
      complianceReportRepository: {} as BaseHandlerDeps['complianceReportRepository'],
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    // Spy on console.warn
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty - suppressing console output during tests
      return undefined;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  describe('createEnhancedToolRegistry', () => {
    it('should create a ToolRegistry instance', () => {
      const registry = createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029

      expect(registry).toBeDefined();
      expect(registry.registerTool).toBeDefined();
      expect(registry.getToolNames).toBeDefined();
      expect(registry.discoverTools).toBeDefined();
    });

    it('should log deprecation warning', () => {
      createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: createEnhancedToolRegistry is deprecated')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use new ToolRegistry() with FEATURE_TOOL_DISCOVERY=true instead')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('This function will be removed in the next major version')
      );
    });

    it('should pass server and dependencies to ToolRegistry', async () => {
      const { ToolRegistry } = vi.mocked(await import('../../server/tool-registry.js'));

      createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029

      expect(ToolRegistry).toHaveBeenCalledWith(mockServer, mockDeps);
    });

    it('should work without dependencies', async () => {
      const { ToolRegistry } = vi.mocked(await import('../../server/tool-registry.js'));

      const registry = createEnhancedToolRegistry(mockServer); // skipcq: JS-W1029

      expect(registry).toBeDefined();
      expect(ToolRegistry).toHaveBeenCalledWith(mockServer, undefined);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return a functional registry', async () => {
      const registry = createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029

      // Verify the registry has expected methods and they work
      expect(registry.getToolNames()).toEqual(['tool1', 'tool2']);
      expect(await registry.discoverTools()).toEqual(['discovered1', 'discovered2']);
    });

    it('should warn every time it is called', () => {
      createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029
      createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029
      createEnhancedToolRegistry(mockServer, mockDeps); // skipcq: JS-W1029

      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    });
  });
});
