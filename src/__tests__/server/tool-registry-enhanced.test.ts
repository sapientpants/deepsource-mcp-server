/**
 * @fileoverview Tests for enhanced tool registry with automatic discovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  EnhancedToolRegistry,
  EnhancedToolDefinition,
  createEnhancedToolRegistry,
} from '../../server/tool-registry-enhanced.js';
// import { wrapInApiResponse } from '../../handlers/base/handler.factory.js';
import type { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';

// Mock modules
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
  },
}));

vi.mock('../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../config/index.js', () => ({
  getApiKey: vi.fn(() => 'test-api-key'),
  getConfig: vi.fn(() => ({
    apiKey: 'test-api-key',
    baseUrl: 'https://test.deepsource.io',
  })),
}));

// Mock dynamic imports - commented out for now as not used in tests
// const mockToolModule = {
//   toolDefinition: {
//     name: 'test-tool',
//     description: 'A test tool',
//     handler: vi.fn(async () => wrapInApiResponse({ result: 'success' })),
//     metadata: {
//       category: 'testing',
//       version: '1.0.0',
//       tags: ['test', 'mock'],
//       enabled: true,
//     },
//   },
// };

vi.mock('path', () => {
  const actual = vi.importActual('path') as typeof import('path');
  return {
    ...actual,
    join: vi.fn((...args) => actual.join(...args)),
  };
});

describe('EnhancedToolRegistry', () => {
  let mockServer: any; // skipcq: JS-0323
  let registry: EnhancedToolRegistry;
  const mockDeps: BaseHandlerDeps = {
    getApiKey: vi.fn(() => 'test-api-key'),
    clientFactory: {} as BaseHandlerDeps['clientFactory'],
    projectRepository: {} as BaseHandlerDeps['projectRepository'],
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };

  beforeEach(() => {
    mockServer = {
      registerTool: vi.fn(),
      connect: vi.fn(),
    } as unknown as any; // skipcq: JS-0323

    registry = new EnhancedToolRegistry(mockServer, mockDeps);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerEnhancedTool', () => {
    it('should register a tool with metadata', () => {
      const tool: EnhancedToolDefinition = {
        name: 'enhanced-tool',
        description: 'An enhanced tool',
        handler: vi.fn(),
        metadata: {
          category: 'analytics',
          version: '2.0.0',
          tags: ['data', 'analysis'],
        },
      };

      registry.registerEnhancedTool(tool);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'enhanced-tool',
        expect.objectContaining({
          description: 'An enhanced tool',
        }),
        expect.any(Function)
      );

      const metadata = registry.getToolMetadata('enhanced-tool');
      expect(metadata).toEqual({
        category: 'analytics',
        version: '2.0.0',
        tags: ['data', 'analysis'],
      });
    });

    it('should register a tool without metadata', () => {
      const tool: EnhancedToolDefinition = {
        name: 'basic-tool',
        description: 'A basic tool',
        handler: vi.fn(),
      };

      registry.registerEnhancedTool(tool);

      expect(mockServer.registerTool).toHaveBeenCalled();
      expect(registry.getToolMetadata('basic-tool')).toBeUndefined();
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools filtered by category', () => {
      const tools: EnhancedToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          handler: vi.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: vi.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: vi.fn(),
          metadata: { category: 'security' },
        },
      ];

      tools.forEach((tool) => registry.registerEnhancedTool(tool));

      expect(registry.getToolsByCategory('data')).toEqual(['tool1', 'tool2']);
      expect(registry.getToolsByCategory('security')).toEqual(['tool3']);
      expect(registry.getToolsByCategory('nonexistent')).toEqual([]);
    });
  });

  describe('getToolsByTag', () => {
    it('should return tools filtered by tag', () => {
      const tools: EnhancedToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          handler: vi.fn(),
          metadata: { tags: ['fast', 'reliable'] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: vi.fn(),
          metadata: { tags: ['fast', 'experimental'] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: vi.fn(),
          metadata: { tags: ['stable'] },
        },
      ];

      tools.forEach((tool) => registry.registerEnhancedTool(tool));

      expect(registry.getToolsByTag('fast')).toEqual(['tool1', 'tool2']);
      expect(registry.getToolsByTag('reliable')).toEqual(['tool1']);
      expect(registry.getToolsByTag('nonexistent')).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should return all unique categories', () => {
      const tools: EnhancedToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          handler: vi.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: vi.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: vi.fn(),
          metadata: { category: 'security' },
        },
        {
          name: 'tool4',
          description: 'Tool 4',
          handler: vi.fn(),
        },
      ];

      tools.forEach((tool) => registry.registerEnhancedTool(tool));

      const categories = registry.getCategories();
      expect(categories).toContain('data');
      expect(categories).toContain('security');
      expect(categories).toHaveLength(2);
    });
  });

  describe('getTags', () => {
    it('should return all unique tags', () => {
      const tools: EnhancedToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          handler: vi.fn(),
          metadata: { tags: ['fast', 'reliable'] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: vi.fn(),
          metadata: { tags: ['fast', 'experimental'] },
        },
      ];

      tools.forEach((tool) => registry.registerEnhancedTool(tool));

      const tags = registry.getTags();
      expect(tags).toContain('fast');
      expect(tags).toContain('reliable');
      expect(tags).toContain('experimental');
      expect(tags).toHaveLength(3);
    });
  });

  describe('enableTool/disableTool', () => {
    it('should enable and disable tools', () => {
      const tool: EnhancedToolDefinition = {
        name: 'toggle-tool',
        description: 'A tool that can be toggled',
        handler: vi.fn(),
        metadata: { enabled: true },
      };

      registry.registerEnhancedTool(tool);

      // Disable the tool
      expect(registry.disableTool('toggle-tool')).toBe(true);
      expect(registry.getToolMetadata('toggle-tool')?.enabled).toBe(false);

      // Enable the tool
      expect(registry.enableTool('toggle-tool')).toBe(true);
      expect(registry.getToolMetadata('toggle-tool')?.enabled).toBe(true);
    });

    it('should handle enabling non-existent tool', () => {
      expect(registry.enableTool('nonexistent')).toBe(false);
    });

    it('should create metadata when disabling tool without metadata', () => {
      const tool: EnhancedToolDefinition = {
        name: 'no-metadata-tool',
        description: 'A tool without metadata',
        handler: vi.fn(),
      };

      registry.registerEnhancedTool(tool);

      expect(registry.disableTool('no-metadata-tool')).toBe(true);
      expect(registry.getToolMetadata('no-metadata-tool')?.enabled).toBe(false);
    });
  });

  describe('getToolsInfo', () => {
    it('should return comprehensive tool information', () => {
      const tools: EnhancedToolDefinition[] = [
        {
          name: 'info-tool-1',
          description: 'Information tool 1',
          handler: vi.fn(),
          metadata: {
            category: 'info',
            version: '1.0.0',
            tags: ['info', 'data'],
            enabled: true,
          },
        },
        {
          name: 'info-tool-2',
          description: 'Information tool 2',
          handler: vi.fn(),
        },
      ];

      tools.forEach((tool) => registry.registerEnhancedTool(tool));

      const toolsInfo = registry.getToolsInfo();
      expect(toolsInfo).toHaveLength(2);

      const tool1Info = toolsInfo.find((t) => t.name === 'info-tool-1');
      expect(tool1Info).toEqual({
        name: 'info-tool-1',
        description: 'Information tool 1',
        category: 'info',
        version: '1.0.0',
        tags: ['info', 'data'],
        enabled: true,
        discovered: false,
      });

      const tool2Info = toolsInfo.find((t) => t.name === 'info-tool-2');
      expect(tool2Info).toEqual({
        name: 'info-tool-2',
        description: 'Information tool 2',
        category: undefined,
        version: undefined,
        tags: undefined,
        enabled: true,
        discovered: false,
      });
    });
  });

  describe('reloadTool', () => {
    it('should return false for non-discovered tool', async () => {
      const tool: EnhancedToolDefinition = {
        name: 'regular-tool',
        description: 'A regular tool',
        handler: vi.fn(),
      };

      registry.registerEnhancedTool(tool);

      const result = await registry.reloadTool('regular-tool');
      expect(result).toBe(false);
    });

    it('should handle reload errors gracefully', async () => {
      // Access the private members through type assertion
      const mockRegistry = registry as any; // skipcq: JS-0323

      mockRegistry.discoveredTools.set('discovered-tool', '/path/to/tool.js');
      mockRegistry.loadToolFromFile = vi.fn().mockRejectedValue(new Error('Load failed'));

      // Mock require.resolve directly
      const originalResolve = require.resolve;
      require.resolve = vi.fn(() => '/resolved/path') as any; // skipcq: JS-0323
      // Set up require.cache
      require.cache['/resolved/path'] = {} as any; // skipcq: JS-0323

      const result = await registry.reloadTool('discovered-tool');
      expect(result).toBe(false);

      // Restore require.resolve and clean up cache
      require.resolve = originalResolve;
      delete require.cache['/resolved/path'];
    });

    it.skip('should successfully reload a discovered tool', async () => {
      // Access the private members through type assertion
      const mockRegistry = registry as any; // skipcq: JS-0323

      // The registry already has discoveredTools initialized, just add to it
      mockRegistry.discoveredTools.set('reloadable-tool', '/path/to/tool.js');
      mockRegistry.loadToolFromFile = vi.fn().mockResolvedValue('reloadable-tool');

      // Mock require.resolve directly
      const originalResolve = require.resolve;
      require.resolve = vi.fn(() => '/resolved/path') as any; // skipcq: JS-0323
      // Set up require.cache
      require.cache['/resolved/path'] = {} as any; // skipcq: JS-0323

      const result = await registry.reloadTool('reloadable-tool');
      expect(result).toBe(true);
      expect(mockRegistry.loadToolFromFile).toHaveBeenCalledWith('/path/to/tool.js', {});

      // Restore require.resolve and clean up cache
      require.resolve = originalResolve;
      delete require.cache['/resolved/path'];
    });

    it('should return false when reloaded tool has different name', async () => {
      // Access the private members through type assertion
      const mockRegistry = registry as any; // skipcq: JS-0323

      mockRegistry.discoveredTools.set('original-tool', '/path/to/tool.js');
      mockRegistry.loadToolFromFile = vi.fn().mockResolvedValue('different-tool');

      // Mock require.resolve directly
      const originalResolve = require.resolve;
      require.resolve = vi.fn(() => '/resolved/path') as any; // skipcq: JS-0323
      // Set up require.cache
      require.cache['/resolved/path'] = {} as any; // skipcq: JS-0323

      const result = await registry.reloadTool('original-tool');
      expect(result).toBe(false);

      // Restore require.resolve and clean up cache
      require.resolve = originalResolve;
      delete require.cache['/resolved/path'];
    });
  });

  describe('discoverTools', () => {
    it('should handle empty directories gracefully', async () => {
      const fs = vi.mocked(await import('fs'));
      fs.promises.readdir.mockResolvedValue([]);

      const result = await registry.discoverTools({
        directories: ['./empty-dir'],
        patterns: ['*.tool.js'],
      });

      expect(result).toEqual([]);
    });

    it('should handle scan directory errors', async () => {
      const fs = vi.mocked(await import('fs'));
      fs.promises.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await registry.discoverTools({
        directories: ['./error-dir'],
        patterns: ['*.tool.js'],
      });

      expect(result).toEqual([]);
    });
  });

  describe('createEnhancedToolRegistry', () => {
    it('should create an enhanced tool registry instance', () => {
      const instance = createEnhancedToolRegistry(mockServer, mockDeps);
      expect(instance).toBeInstanceOf(EnhancedToolRegistry);
    });
  });
});
