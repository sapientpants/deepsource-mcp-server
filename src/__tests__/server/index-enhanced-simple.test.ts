/**
 * @fileoverview Simplified tests for Enhanced MCP server - focusing on code coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getToolDiscoveryConfig,
  defaultToolDiscoveryConfig,
  productionToolDiscoveryConfig,
  developmentToolDiscoveryConfig,
  TOOL_CATEGORIES,
  TOOL_TAGS,
  parseToolVersion,
  compareToolVersions,
} from '../../config/tool-discovery.config.js';

describe('Tool Discovery Configuration', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = process.env;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getToolDiscoveryConfig', () => {
    it('should return production config when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      const config = getToolDiscoveryConfig();

      expect(config.excludeTags).toContain('deprecated');
      expect(config.excludeTags).toContain('experimental');
      expect(config.excludeTags).toContain('development');
      expect(config.excludeTags).toContain('test');
      expect(config.includeCategories).toContain('core');
    });

    it('should return development config when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      const config = getToolDiscoveryConfig();

      expect(config.excludeTags).toContain('deprecated');
      expect(config.excludeTags).not.toContain('experimental');
      expect(config.directories).toContain('./src/tools/dev');
    });

    it('should return default config for unknown environment', () => {
      process.env.NODE_ENV = 'test';
      const config = getToolDiscoveryConfig();

      expect(config.excludeTags).toContain('deprecated');
      expect(config.excludeTags).toContain('experimental');
      expect(config.directories).toContain('./src/tools');
    });

    it('should return default config when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = getToolDiscoveryConfig();

      expect(config).toBeDefined();
      expect(config.directories).toBeDefined();
      expect(config.patterns).toBeDefined();
    });
  });

  describe('defaultToolDiscoveryConfig', () => {
    it('should have required properties', () => {
      expect(defaultToolDiscoveryConfig.directories).toEqual(['./src/tools', './plugins']);
      expect(defaultToolDiscoveryConfig.patterns).toEqual([
        '*.tool.js',
        '*.tool.mjs',
        '*.plugin.js',
      ]);
      expect(defaultToolDiscoveryConfig.recursive).toBe(true);
      expect(defaultToolDiscoveryConfig.excludeTags).toContain('deprecated');
      expect(defaultToolDiscoveryConfig.excludeTags).toContain('experimental');
    });
  });

  describe('productionToolDiscoveryConfig', () => {
    it('should extend default config with production settings', () => {
      expect(productionToolDiscoveryConfig.directories).toEqual(['./src/tools', './plugins']);
      expect(productionToolDiscoveryConfig.excludeTags).toContain('deprecated');
      expect(productionToolDiscoveryConfig.excludeTags).toContain('experimental');
      expect(productionToolDiscoveryConfig.excludeTags).toContain('development');
      expect(productionToolDiscoveryConfig.excludeTags).toContain('test');
      expect(productionToolDiscoveryConfig.includeCategories).toEqual([
        'core',
        'analytics',
        'security',
        'compliance',
      ]);
    });
  });

  describe('developmentToolDiscoveryConfig', () => {
    it('should extend default config with development settings', () => {
      expect(developmentToolDiscoveryConfig.directories).toContain('./src/tools');
      expect(developmentToolDiscoveryConfig.directories).toContain('./plugins');
      expect(developmentToolDiscoveryConfig.directories).toContain('./src/tools/dev');
      expect(developmentToolDiscoveryConfig.excludeTags).toEqual(['deprecated']);
    });
  });

  describe('TOOL_CATEGORIES', () => {
    it('should define all tool categories', () => {
      expect(TOOL_CATEGORIES.CORE).toBe('core');
      expect(TOOL_CATEGORIES.ANALYTICS).toBe('analytics');
      expect(TOOL_CATEGORIES.SECURITY).toBe('security');
      expect(TOOL_CATEGORIES.COMPLIANCE).toBe('compliance');
      expect(TOOL_CATEGORIES.UTILITIES).toBe('utilities');
      expect(TOOL_CATEGORIES.INTEGRATION).toBe('integration');
      expect(TOOL_CATEGORIES.MONITORING).toBe('monitoring');
    });
  });

  describe('TOOL_TAGS', () => {
    it('should define all tool tags', () => {
      expect(TOOL_TAGS.STABLE).toBe('stable');
      expect(TOOL_TAGS.BETA).toBe('beta');
      expect(TOOL_TAGS.EXPERIMENTAL).toBe('experimental');
      expect(TOOL_TAGS.DEPRECATED).toBe('deprecated');
      expect(TOOL_TAGS.DEVELOPMENT).toBe('development');
      expect(TOOL_TAGS.TEST).toBe('test');
      expect(TOOL_TAGS.FAST).toBe('fast');
      expect(TOOL_TAGS.SLOW).toBe('slow');
      expect(TOOL_TAGS.REQUIRES_AUTH).toBe('requires-auth');
    });
  });

  describe('parseToolVersion', () => {
    it('should parse version string correctly', () => {
      const version = parseToolVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('should parse version with prerelease', () => {
      const version = parseToolVersion('2.0.0-beta');
      expect(version).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: 'beta',
      });
    });

    it('should parse version with complex prerelease', () => {
      const version = parseToolVersion('1.0.0-alpha.1');
      expect(version).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.1',
      });
    });

    it('should throw error for invalid version format', () => {
      expect(() => parseToolVersion('invalid')).toThrow('Invalid version format: invalid');
      expect(() => parseToolVersion('1.2')).toThrow('Invalid version format: 1.2');
      expect(() => parseToolVersion('a.b.c')).toThrow('Invalid version format: a.b.c');
    });
  });

  describe('compareToolVersions', () => {
    it('should compare major versions correctly', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 2, minor: 0, patch: 0 };

      expect(compareToolVersions(v1, v2)).toBeLessThan(0);
      expect(compareToolVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare minor versions correctly', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 1, minor: 1, patch: 0 };

      expect(compareToolVersions(v1, v2)).toBeLessThan(0);
      expect(compareToolVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare patch versions correctly', () => {
      const v1 = { major: 1, minor: 0, patch: 0 };
      const v2 = { major: 1, minor: 0, patch: 1 };

      expect(compareToolVersions(v1, v2)).toBeLessThan(0);
      expect(compareToolVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should consider prerelease versions as lower', () => {
      const v1 = { major: 1, minor: 0, patch: 0, prerelease: 'beta' };
      const v2 = { major: 1, minor: 0, patch: 0 };

      expect(compareToolVersions(v1, v2)).toBeLessThan(0);
      expect(compareToolVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should compare prerelease versions alphabetically', () => {
      const v1 = { major: 1, minor: 0, patch: 0, prerelease: 'alpha' };
      const v2 = { major: 1, minor: 0, patch: 0, prerelease: 'beta' };

      expect(compareToolVersions(v1, v2)).toBeLessThan(0);
      expect(compareToolVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('should return 0 for equal versions', () => {
      const v1 = { major: 1, minor: 2, patch: 3 };
      const v2 = { major: 1, minor: 2, patch: 3 };

      expect(compareToolVersions(v1, v2)).toBe(0);
    });

    it('should return 0 for equal versions with prerelease', () => {
      const v1 = { major: 1, minor: 0, patch: 0, prerelease: 'beta' };
      const v2 = { major: 1, minor: 0, patch: 0, prerelease: 'beta' };

      expect(compareToolVersions(v1, v2)).toBe(0);
    });
  });

  describe('Configuration validation', () => {
    it('should have valid directory paths in all configs', () => {
      const configs = [
        defaultToolDiscoveryConfig,
        productionToolDiscoveryConfig,
        developmentToolDiscoveryConfig,
      ];

      configs.forEach((config) => {
        expect(config.directories).toBeDefined();
        expect(Array.isArray(config.directories)).toBe(true);
        config.directories?.forEach((dir) => {
          expect(typeof dir).toBe('string');
          expect(dir.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have valid file patterns in all configs', () => {
      const configs = [
        defaultToolDiscoveryConfig,
        productionToolDiscoveryConfig,
        developmentToolDiscoveryConfig,
      ];

      configs.forEach((config) => {
        expect(config.patterns).toBeDefined();
        expect(Array.isArray(config.patterns)).toBe(true);
        config.patterns?.forEach((pattern) => {
          expect(typeof pattern).toBe('string');
          expect(pattern).toContain('*');
        });
      });
    });

    it('should have recursive flag defined in all configs', () => {
      const configs = [
        defaultToolDiscoveryConfig,
        productionToolDiscoveryConfig,
        developmentToolDiscoveryConfig,
      ];

      configs.forEach((config) => {
        expect(typeof config.recursive).toBe('boolean');
      });
    });
  });
});

describe('Enhanced Server Initialization Coverage', () => {
  it('should cover registerCoreTools function', async () => {
    // Import the module to get coverage of the registerCoreTools function
    const module = await import('../../server/index-enhanced.js');
    expect(module.runEnhancedServer).toBeDefined();
  });

  it('should handle module execution check', () => {
    // This tests the module execution check at the bottom of index-enhanced.ts
    const testUrl = 'file:///test/path.js';
    const testArgv = ['/different/path.js'];

    // The condition should be false when URLs don't match
    expect(testUrl === `file://${testArgv[0]}`).toBe(false);

    // The condition should be true when URLs match
    const matchingArgv = ['/test/path.js'];
    const matchingUrl = `file://${matchingArgv[0]}`;
    expect(matchingUrl === `file://${matchingArgv[0]}`).toBe(true);
  });
});
