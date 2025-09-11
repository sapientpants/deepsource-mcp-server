/**
 * @fileoverview Tests for the version module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('Version Module', () => {
  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('VERSION constant', () => {
    it('should read version from package.json when available', async () => {
      const mockPackageJson = { version: '1.5.0' };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      const { VERSION } = await import('../version.js');
      expect(VERSION).toBe('1.5.0');
    });

    it('should fallback to dev version when package.json is not found', async () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const { VERSION } = await import('../version.js');
      // Should fallback to 0.0.0-dev when package.json is not found
      expect(VERSION).toBe('0.0.0-dev');
    });

    it('should handle invalid JSON in package.json', async () => {
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      const { VERSION } = await import('../version.js');
      expect(VERSION).toBe('0.0.0-dev');
    });

    it('should handle package.json without version field', async () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: 'test' }));

      const { VERSION } = await import('../version.js');
      expect(VERSION).toBe('0.0.0-dev');
    });
  });

  describe('getVersion function', () => {
    it('should return the current version', async () => {
      const mockPackageJson = { version: '2.0.1' };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      const { getVersion } = await import('../version.js');
      expect(getVersion()).toBe('2.0.1');
    });
  });

  describe('parseVersion function', () => {
    it('should parse valid semver version', async () => {
      const { parseVersion } = await import('../version.js');

      const result = parseVersion('1.2.3');
      expect(result).toEqual({
        version: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('should parse version with prerelease', async () => {
      const { parseVersion } = await import('../version.js');

      const result = parseVersion('1.2.3-beta.1');
      expect(result).toEqual({
        version: '1.2.3-beta.1',
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
      });
    });

    it('should parse version with build metadata', async () => {
      const { parseVersion } = await import('../version.js');

      const result = parseVersion('1.2.3+build.123');
      expect(result).toEqual({
        version: '1.2.3+build.123',
        major: 1,
        minor: 2,
        patch: 3,
        build: 'build.123',
      });
    });

    it('should parse version with prerelease and build', async () => {
      const { parseVersion } = await import('../version.js');

      const result = parseVersion('1.2.3-rc.1+build.456');
      expect(result).toEqual({
        version: '1.2.3-rc.1+build.456',
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'rc.1',
        build: 'build.456',
      });
    });

    it('should return null for invalid version', async () => {
      const { parseVersion } = await import('../version.js');

      expect(parseVersion('invalid')).toBeNull();
      expect(parseVersion('1.2')).toBeNull();
      expect(parseVersion('1.2.a')).toBeNull();
      expect(parseVersion('')).toBeNull();
    });
  });

  describe('validateVersion function', () => {
    it('should validate correct semver versions', async () => {
      const { validateVersion } = await import('../version.js');

      expect(validateVersion('1.2.3')).toBe(true);
      expect(validateVersion('0.0.0')).toBe(true);
      expect(validateVersion('10.20.30')).toBe(true);
      expect(validateVersion('1.0.0-alpha')).toBe(true);
      expect(validateVersion('1.0.0+build')).toBe(true);
      expect(validateVersion('1.0.0-alpha+build')).toBe(true);
    });

    it('should reject invalid versions', async () => {
      const { validateVersion } = await import('../version.js');

      expect(validateVersion('invalid')).toBe(false);
      expect(validateVersion('1.2')).toBe(false);
      expect(validateVersion('1.2.a')).toBe(false);
      expect(validateVersion('')).toBe(false);
      expect(validateVersion('v1.2.3')).toBe(false);
    });
  });

  describe('compareVersions function', () => {
    it('should compare major versions correctly', async () => {
      const { compareVersions } = await import('../version.js');

      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should compare minor versions correctly', async () => {
      const { compareVersions } = await import('../version.js');

      expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    });

    it('should compare patch versions correctly', async () => {
      const { compareVersions } = await import('../version.js');

      expect(compareVersions('1.1.2', '1.1.1')).toBe(1);
      expect(compareVersions('1.1.1', '1.1.2')).toBe(-1);
      expect(compareVersions('1.1.1', '1.1.1')).toBe(0);
    });

    it('should handle prerelease versions correctly', async () => {
      const { compareVersions } = await import('../version.js');

      // Release version is higher than prerelease
      expect(compareVersions('1.0.0', '1.0.0-alpha')).toBe(1);
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);

      // Compare prerelease versions alphabetically
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1);
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
      expect(compareVersions('1.0.0-alpha', '1.0.0-alpha')).toBe(0);
    });

    it('should throw error for invalid versions', async () => {
      const { compareVersions } = await import('../version.js');

      expect(() => compareVersions('invalid', '1.0.0')).toThrow('Invalid version format');
      expect(() => compareVersions('1.0.0', 'invalid')).toThrow('Invalid version format');
    });
  });

  describe('getVersionInfo function', () => {
    it('should return detailed version information', async () => {
      const mockPackageJson = { version: '3.2.1-beta.2+build.789' };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      const { getVersionInfo } = await import('../version.js');
      const info = getVersionInfo();

      expect(info).toEqual({
        version: '3.2.1-beta.2+build.789',
        major: 3,
        minor: 2,
        patch: 1,
        prerelease: 'beta.2',
        build: 'build.789',
      });
    });

    it('should handle fallback version', async () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const { getVersionInfo } = await import('../version.js');
      const info = getVersionInfo();

      expect(info).toEqual({
        version: '0.0.0-dev',
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: 'dev',
      });
    });
  });

  describe('getFormattedVersion function', () => {
    beforeEach(() => {
      const mockPackageJson = { version: '1.2.3-rc.1+build.456' };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));
    });

    it('should format version with all components by default', async () => {
      const { getFormattedVersion } = await import('../version.js');

      expect(getFormattedVersion()).toBe('1.2.3-rc.1');
    });

    it('should exclude prerelease when requested', async () => {
      const { getFormattedVersion } = await import('../version.js');

      expect(getFormattedVersion(false)).toBe('1.2.3');
    });

    it('should include build metadata when requested', async () => {
      const { getFormattedVersion } = await import('../version.js');

      expect(getFormattedVersion(true, true)).toBe('1.2.3-rc.1+build.456');
    });

    it('should handle version without prerelease or build', async () => {
      const mockPackageJson = { version: '1.2.3' };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));
      vi.resetModules();

      const { getFormattedVersion } = await import('../version.js');

      expect(getFormattedVersion()).toBe('1.2.3');
      expect(getFormattedVersion(false, true)).toBe('1.2.3');
    });
  });
});
