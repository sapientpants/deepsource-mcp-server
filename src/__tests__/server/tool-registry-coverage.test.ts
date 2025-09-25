/**
 * @fileoverview Tests for tool registry to improve code coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../../server/tool-registry.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BaseHandlerDeps } from '../../handlers/base/handler.interface.js';

describe('ToolRegistry - Coverage Tests', () => {
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
  });

  describe('Static helper methods', () => {
    it('matchesPattern should correctly match file patterns', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      // Test exact match
      expect(matchesPattern('test.js', ['test.js'])).toBe(true);
      expect(matchesPattern('test.js', ['other.js'])).toBe(false);

      // Test wildcard patterns
      expect(matchesPattern('test.tool.js', ['*.tool.js'])).toBe(true);
      expect(matchesPattern('test.js', ['*.tool.js'])).toBe(false);

      // Test multiple patterns
      expect(matchesPattern('test.js', ['*.js', '*.ts'])).toBe(true);
      expect(matchesPattern('test.py', ['*.js', '*.ts'])).toBe(false);

      // Test edge cases
      expect(matchesPattern('', [''])).toBe(true);
      expect(matchesPattern('file', ['*'])).toBe(true);
    });

    it('passesFilters should handle various filter combinations', () => {
      const passesFilters = (ToolRegistry as any).passesFilters;

      // Tool with full metadata
      const tool = {
        name: 'test-tool',
        description: 'Test tool',
        handler: vi.fn(),
        metadata: {
          category: 'data',
          tags: ['stable', 'production'],
        },
      };

      // No filters - should pass
      expect(passesFilters(tool, {})).toBe(true);

      // Include category match
      expect(passesFilters(tool, { includeCategories: ['data'] })).toBe(true);
      expect(passesFilters(tool, { includeCategories: ['api'] })).toBe(false);

      // Exclude category
      expect(passesFilters(tool, { excludeCategories: ['data'] })).toBe(false);
      expect(passesFilters(tool, { excludeCategories: ['api'] })).toBe(true);

      // Include tags
      expect(passesFilters(tool, { includeTags: ['stable'] })).toBe(true);
      expect(passesFilters(tool, { includeTags: ['beta'] })).toBe(false);

      // Exclude tags
      expect(passesFilters(tool, { excludeTags: ['stable'] })).toBe(false);
      expect(passesFilters(tool, { excludeTags: ['beta'] })).toBe(true);

      // Combined filters
      expect(
        passesFilters(tool, {
          includeCategories: ['data'],
          includeTags: ['stable'],
        })
      ).toBe(true);

      // Tool without metadata
      const minimalTool = {
        name: 'minimal',
        description: 'Minimal tool',
        handler: vi.fn(),
      };

      expect(passesFilters(minimalTool, {})).toBe(true);
      expect(passesFilters(minimalTool, { includeCategories: ['any'] })).toBe(false);
      expect(passesFilters(minimalTool, { excludeCategories: ['any'] })).toBe(true);
    });
  });

  describe('Tool discovery helpers', () => {
    it('should handle empty patterns array', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;
      expect(matchesPattern('file.js', [])).toBe(false);
    });

    it('should handle patterns with special characters', () => {
      const matchesPattern = (ToolRegistry as any).matchesPattern;

      // Pattern with dots
      expect(matchesPattern('test.min.js', ['*.min.js'])).toBe(true);

      // Pattern with dashes
      expect(matchesPattern('test-tool.js', ['*-tool.js'])).toBe(true);

      // Pattern with brackets (should be escaped)
      expect(matchesPattern('[test].js', ['[test].js'])).toBe(true);
      expect(matchesPattern('t.js', ['[test].js'])).toBe(false);
    });
  });

  describe('Filter edge cases', () => {
    it('should handle tools with partial metadata', () => {
      const passesFilters = (ToolRegistry as any).passesFilters;

      const toolWithCategory = {
        name: 'tool',
        description: 'Tool',
        handler: vi.fn(),
        metadata: {
          category: 'data',
          // No tags
        },
      };

      expect(passesFilters(toolWithCategory, { includeTags: ['any'] })).toBe(false);
      expect(passesFilters(toolWithCategory, { excludeTags: ['any'] })).toBe(true);

      const toolWithTags = {
        name: 'tool',
        description: 'Tool',
        handler: vi.fn(),
        metadata: {
          // No category
          tags: ['beta'],
        },
      };

      expect(passesFilters(toolWithTags, { includeCategories: ['any'] })).toBe(false);
      expect(passesFilters(toolWithTags, { excludeCategories: ['any'] })).toBe(true);
    });

    it('should handle empty metadata object', () => {
      const passesFilters = (ToolRegistry as any).passesFilters;

      const tool = {
        name: 'tool',
        description: 'Tool',
        handler: vi.fn(),
        metadata: {},
      };

      expect(passesFilters(tool, { includeCategories: ['any'] })).toBe(false);
      expect(passesFilters(tool, { includeTags: ['any'] })).toBe(false);
      expect(passesFilters(tool, { excludeCategories: ['any'] })).toBe(true);
      expect(passesFilters(tool, { excludeTags: ['any'] })).toBe(true);
    });

    it('should handle filters with empty arrays', () => {
      const passesFilters = (ToolRegistry as any).passesFilters;

      const tool = {
        name: 'tool',
        description: 'Tool',
        handler: vi.fn(),
        metadata: {
          category: 'data',
          tags: ['stable'],
        },
      };

      // Empty filter arrays should not filter anything
      expect(passesFilters(tool, { includeCategories: [] })).toBe(true);
      expect(passesFilters(tool, { excludeCategories: [] })).toBe(true);
      expect(passesFilters(tool, { includeTags: [] })).toBe(true);
      expect(passesFilters(tool, { excludeTags: [] })).toBe(true);
    });

    it('should handle multiple tag matching', () => {
      const passesFilters = (ToolRegistry as any).passesFilters;

      const tool = {
        name: 'tool',
        description: 'Tool',
        handler: vi.fn(),
        metadata: {
          tags: ['alpha', 'beta', 'experimental'],
        },
      };

      // Should pass if ANY include tag matches
      expect(passesFilters(tool, { includeTags: ['beta', 'stable'] })).toBe(true);
      expect(passesFilters(tool, { includeTags: ['stable', 'production'] })).toBe(false);

      // Should fail if ANY exclude tag matches
      expect(passesFilters(tool, { excludeTags: ['beta', 'stable'] })).toBe(false);
      expect(passesFilters(tool, { excludeTags: ['stable', 'production'] })).toBe(true);
    });
  });
});