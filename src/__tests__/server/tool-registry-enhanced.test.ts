/**
 * @fileoverview Tests for enhanced tool registry with automatic discovery
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  EnhancedToolRegistry,
  EnhancedToolDefinition,
  createEnhancedToolRegistry,
} from '../../server/tool-registry-enhanced.js';
// import { wrapInApiResponse } from '../../handlers/base/handler.factory.js';
import type { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';

// Mock modules
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
  },
}));

jest.mock('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../config/index.js', () => ({
  getApiKey: jest.fn(() => 'test-api-key'),
  getConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    baseUrl: 'https://test.deepsource.io',
  })),
}));

// Mock dynamic imports - commented out for now as not used in tests
// const mockToolModule = {
//   toolDefinition: {
//     name: 'test-tool',
//     description: 'A test tool',
//     handler: jest.fn(async () => wrapInApiResponse({ result: 'success' })),
//     metadata: {
//       category: 'testing',
//       version: '1.0.0',
//       tags: ['test', 'mock'],
//       enabled: true,
//     },
//   },
// };

jest.mock('path', () => {
  const actual = jest.requireActual('path') as typeof import('path');
  return {
    ...actual,
    join: jest.fn((...args) => actual.join(...args)),
  };
});

describe('EnhancedToolRegistry', () => {
  let mockServer: jest.Mocked<McpServer>;
  let registry: EnhancedToolRegistry;
  const mockDeps: BaseHandlerDeps = {
    getApiKey: jest.fn(() => 'test-api-key'),
    clientFactory: {} as BaseHandlerDeps['clientFactory'],
    projectRepository: {} as BaseHandlerDeps['projectRepository'],
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  };

  beforeEach(() => {
    mockServer = {
      registerTool: jest.fn(),
      connect: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;

    registry = new EnhancedToolRegistry(mockServer, mockDeps);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerEnhancedTool', () => {
    it('should register a tool with metadata', () => {
      const tool: EnhancedToolDefinition = {
        name: 'enhanced-tool',
        description: 'An enhanced tool',
        handler: jest.fn(),
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
        handler: jest.fn(),
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
          handler: jest.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: jest.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: jest.fn(),
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
          handler: jest.fn(),
          metadata: { tags: ['fast', 'reliable'] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: jest.fn(),
          metadata: { tags: ['fast', 'experimental'] },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: jest.fn(),
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
          handler: jest.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: jest.fn(),
          metadata: { category: 'data' },
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          handler: jest.fn(),
          metadata: { category: 'security' },
        },
        {
          name: 'tool4',
          description: 'Tool 4',
          handler: jest.fn(),
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
          handler: jest.fn(),
          metadata: { tags: ['fast', 'reliable'] },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: jest.fn(),
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
        handler: jest.fn(),
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
        handler: jest.fn(),
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
          handler: jest.fn(),
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
          handler: jest.fn(),
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

  describe('createEnhancedToolRegistry', () => {
    it('should create an enhanced tool registry instance', () => {
      const instance = createEnhancedToolRegistry(mockServer, mockDeps);
      expect(instance).toBeInstanceOf(EnhancedToolRegistry);
    });
  });
});
