/**
 * @fileoverview Tests for CLI version flag functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VERSION, getVersion, getVersionInfo, parseVersion } from '../version.js';
import { handleCliArgs } from '../index.js';

describe('CLI Version Module', () => {
  describe('Version exports', () => {
    it('should export VERSION constant matching expected format', () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+(-.*)?$/);
    });

    it('should return version from getVersion function', () => {
      expect(getVersion()).toBe(VERSION);
    });

    it('should return version info from getVersionInfo', () => {
      const info = getVersionInfo();
      expect(info.version).toBe(VERSION);

      const parsed = parseVersion(VERSION);
      if (parsed) {
        expect(info.major).toBe(parsed.major);
        expect(info.minor).toBe(parsed.minor);
        expect(info.patch).toBe(parsed.patch);
      }
    });
  });

  describe('CLI argument handling', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let logOutput: string[];

    beforeEach(() => {
      logOutput = [];
      // Mock console.log to capture output
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
        logOutput.push(args.join(' '));
      });
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should display version with --version flag', () => {
      const result = handleCliArgs(['--version']);

      expect(result).toBe(true);
      expect(logOutput).toContain(`deepsource-mcp-server version ${VERSION}`);
    });

    it('should display version with -v flag', () => {
      const result = handleCliArgs(['-v']);

      expect(result).toBe(true);
      expect(logOutput).toContain(`deepsource-mcp-server version ${VERSION}`);
    });

    it('should display help with --help flag', () => {
      const result = handleCliArgs(['--help']);

      expect(result).toBe(true);
      expect(logOutput.join('\n')).toContain(`DeepSource MCP Server v${VERSION}`);
      expect(logOutput.join('\n')).toContain('Usage: deepsource-mcp-server [options]');
      expect(logOutput.join('\n')).toContain('Options:');
      expect(logOutput.join('\n')).toContain('-v, --version  Display version information');
      expect(logOutput.join('\n')).toContain('-h, --help     Display this help message');
    });

    it('should display help with -h flag', () => {
      const result = handleCliArgs(['-h']);

      expect(result).toBe(true);
      expect(logOutput.join('\n')).toContain(`DeepSource MCP Server v${VERSION}`);
      expect(logOutput.join('\n')).toContain('Usage: deepsource-mcp-server [options]');
    });

    it('should handle --version flag at any position', () => {
      const result = handleCliArgs(['some', 'args', '--version']);

      expect(result).toBe(true);
      expect(logOutput).toContain(`deepsource-mcp-server version ${VERSION}`);
    });

    it('should return false for non-CLI arguments', () => {
      const result = handleCliArgs(['some', 'other', 'args']);

      expect(result).toBe(false);
      expect(logOutput).toEqual([]);
    });

    it('should handle empty arguments', () => {
      const result = handleCliArgs([]);

      expect(result).toBe(false);
      expect(logOutput).toEqual([]);
    });

    it('should work without DEEPSOURCE_API_KEY for version flag', () => {
      // Remove DEEPSOURCE_API_KEY if present
      const originalApiKey = process.env.DEEPSOURCE_API_KEY;
      delete process.env.DEEPSOURCE_API_KEY;

      const result = handleCliArgs(['--version']);

      expect(result).toBe(true);
      expect(logOutput).toContain(`deepsource-mcp-server version ${VERSION}`);

      // Restore API key if it was set
      if (originalApiKey) {
        process.env.DEEPSOURCE_API_KEY = originalApiKey;
      }
    });
  });
});
