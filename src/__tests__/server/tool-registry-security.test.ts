/**
 * @fileoverview Tests for tool registry security validation and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistry, ToolDefinition } from '../../server/tool-registry.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}));

// Mock dynamic import
const mockDynamicImport = vi.fn();
global.import = mockDynamicImport as any;

describe('ToolRegistry Security and Edge Cases', () => {
  // Note: This file now only tests public API methods and static helpers
  // Private method tests have been removed as they are implementation details
  let mockServer: McpServer;
  let mockDeps: BaseHandlerDeps;
  let registry: ToolRegistry;

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

    registry = new ToolRegistry(mockServer, mockDeps);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('discoverTools - Security and Filtering', () => {
    it('should handle file system errors gracefully', async () => {
      const fs = vi.mocked(await import('fs'));
      fs.promises.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await registry.discoverTools({
        directories: ['./protected-dir'],
        patterns: ['*.tool.js'],
      });

      expect(result).toEqual([]);
      // The error is caught internally but should return empty array
    });

    it('should return empty array for non-existent directories', async () => {
      const fs = vi.mocked(await import('fs'));
      fs.promises.readdir.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await registry.discoverTools({
        directories: ['./nonexistent'],
        patterns: ['*.tool.js'],
      });

      expect(result).toEqual([]);
    });
  });

  describe('passesFilters - Edge Cases', () => {
    it('should handle tools without metadata', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test tool',
        handler: vi.fn(),
      };

      const passesFilters = (ToolRegistry as any).passesFilters;

      // Should pass when no filters
      expect(passesFilters(tool, {})).toBe(true);

      // Should fail when category filter exists but tool has no metadata
      expect(passesFilters(tool, { includeCategories: ['api'] })).toBe(false);

      // Should pass when exclude filter exists but tool has no metadata
      expect(passesFilters(tool, { excludeCategories: ['api'] })).toBe(true);
    });

    it('should handle empty filter arrays', () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test tool',
        handler: vi.fn(),
        metadata: {
          category: 'data',
          tags: ['stable'],
        },
      };

      const passesFilters = (ToolRegistry as any).passesFilters;

      // Empty arrays should not filter anything
      expect(passesFilters(tool, { includeCategories: [] })).toBe(true);
      expect(passesFilters(tool, { excludeCategories: [] })).toBe(true);
      expect(passesFilters(tool, { includeTags: [] })).toBe(true);
      expect(passesFilters(tool, { excludeTags: [] })).toBe(true);
    });
  });

  describe('matchesPattern - Pattern Matching', () => {
    it('should match exact filenames', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      expect(matchesPattern('test.tool.js', ['test.tool.js'])).toBe(true);
      expect(matchesPattern('test.tool.js', ['other.tool.js'])).toBe(false);
    });

    it('should match wildcard patterns', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      expect(matchesPattern('test.tool.js', ['*.tool.js'])).toBe(true);
      expect(matchesPattern('test.tool.ts', ['*.tool.js'])).toBe(false);
      expect(matchesPattern('my-test.tool.js', ['*-test.tool.js'])).toBe(true);
      expect(matchesPattern('test.js', ['*.tool.js'])).toBe(false);
    });

    it('should match multiple patterns', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      expect(matchesPattern('test.tool.js', ['*.tool.js', '*.tool.ts'])).toBe(true);
      expect(matchesPattern('test.tool.ts', ['*.tool.js', '*.tool.ts'])).toBe(true);
      expect(matchesPattern('test.js', ['*.tool.js', '*.tool.ts'])).toBe(false);
    });

    it('should handle special regex characters in patterns', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      // Dots should be treated literally except after *
      expect(matchesPattern('test.tool.js', ['test.tool.js'])).toBe(true);
      expect(matchesPattern('testXtoolXjs', ['test.tool.js'])).toBe(false);

      // Brackets should be escaped
      expect(matchesPattern('[test].tool.js', ['[test].tool.js'])).toBe(true);
      expect(matchesPattern('t.tool.js', ['[test].tool.js'])).toBe(false);
    });
  });

  describe('Tool Registration', () => {
    it('should register a tool with proper validation', () => {
      const tool: ToolDefinition = {
        name: 'secure-tool',
        description: 'A secure tool',
        handler: vi.fn(),
        metadata: {
          category: 'security',
          tags: ['validated'],
        },
      };

      registry.registerTool(tool);

      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'secure-tool',
        expect.objectContaining({
          description: 'A secure tool',
        }),
        expect.any(Function)
      );
    });

    it('should get tools by category with security filtering', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          handler: vi.fn(),
          metadata: { category: 'secure' },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          handler: vi.fn(),
          metadata: { category: 'unsafe' },
        },
      ];

      tools.forEach((tool) => registry.registerTool(tool));

      const secureTooks = registry.getToolsByCategory('secure');
      expect(secureTooks).toEqual(['tool1']);
    });
  });
});