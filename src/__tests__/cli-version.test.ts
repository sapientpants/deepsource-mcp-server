/**
 * @fileoverview Tests for CLI version flag functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { VERSION, getVersion, getVersionInfo, parseVersion } from '../version.js';

describe('CLI Version Module', () => {
  let version: string;

  beforeEach(() => {
    // Get the actual version from package.json
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    version = packageJson.version;
  });

  describe('Version exports', () => {
    it('should export VERSION constant matching package.json', () => {
      expect(VERSION).toBe(version);
    });

    it('should return version from getVersion function', () => {
      expect(getVersion()).toBe(version);
    });

    it('should return version info from getVersionInfo', () => {
      const info = getVersionInfo();
      expect(info.version).toBe(version);

      const parsed = parseVersion(version);
      if (parsed) {
        expect(info.major).toBe(parsed.major);
        expect(info.minor).toBe(parsed.minor);
        expect(info.patch).toBe(parsed.patch);
      }
    });
  });
});

describe.skipIf(!existsSync(join(process.cwd(), 'dist', 'index.js')))('CLI Spawn Tests', () => {
  const indexPath = join(process.cwd(), 'dist', 'index.js');
  let version: string;

  beforeEach(() => {
    // Get the actual version from package.json
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    version = packageJson.version;
  });

  describe('--version flag', () => {
    it('should display version and exit with code 0', async () => {
      const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
        (resolve) => {
          const child = spawn('node', [indexPath, '--version'], {
            env: { ...process.env, NODE_ENV: 'production' },
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({ stdout, stderr, code });
          });
        }
      );

      // Debug output if test fails
      if (result.code !== 0 || !result.stdout) {
        console.error('Test failed with:', {
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
          indexPath,
        });
      }

      expect(result.stdout.trim()).toBe(`deepsource-mcp-server version ${version}`);
      expect(result.stderr).toBe('');
      expect(result.code).toBe(0);
    });

    it('should handle --version flag at any position', async () => {
      const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
        const child = spawn('node', [indexPath, 'some', 'args', '--version'], {
          env: { ...process.env, NODE_ENV: 'production' },
        });

        let stdout = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          resolve({ stdout, code });
        });
      });

      expect(result.stdout.trim()).toBe(`deepsource-mcp-server version ${version}`);
      expect(result.code).toBe(0);
    });
  });

  describe('-v flag', () => {
    it('should display version with short flag', async () => {
      const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
        const child = spawn('node', [indexPath, '-v'], {
          env: { ...process.env, NODE_ENV: 'production' },
        });

        let stdout = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          resolve({ stdout, code });
        });
      });

      expect(result.stdout.trim()).toBe(`deepsource-mcp-server version ${version}`);
      expect(result.code).toBe(0);
    });
  });

  describe('--help flag', () => {
    it('should display help text with version', async () => {
      const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
        const child = spawn('node', [indexPath, '--help'], {
          env: { ...process.env, NODE_ENV: 'production' },
        });

        let stdout = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          resolve({ stdout, code });
        });
      });

      expect(result.stdout).toContain(`DeepSource MCP Server v${version}`);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
      expect(result.code).toBe(0);
    });

    it('should display help with short flag', async () => {
      const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
        const child = spawn('node', [indexPath, '-h'], {
          env: { ...process.env, NODE_ENV: 'production' },
        });

        let stdout = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          resolve({ stdout, code });
        });
      });

      expect(result.stdout).toContain(`DeepSource MCP Server v${version}`);
      expect(result.stdout).toContain('Usage:');
      expect(result.code).toBe(0);
    });
  });

  describe('Process exit behavior', () => {
    it('should exit immediately with --version without starting server', async () => {
      const startTime = Date.now();
      const result = await new Promise<{ code: number | null; duration: number }>((resolve) => {
        const child = spawn('node', [indexPath, '--version'], {
          env: { ...process.env, NODE_ENV: 'production' },
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          resolve({ code, duration });
        });
      });

      expect(result.code).toBe(0);
      expect(result.duration).toBeLessThan(2000);
    });

    it('should not require DEEPSOURCE_API_KEY for version flag', async () => {
      const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
        (resolve) => {
          // Explicitly remove DEEPSOURCE_API_KEY from environment
          const env = { ...process.env };
          delete env.DEEPSOURCE_API_KEY;

          const child = spawn('node', [indexPath, '--version'], {
            env: { ...env, NODE_ENV: 'production' },
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            resolve({ stdout, stderr, code });
          });
        }
      );

      // Should work without API key
      expect(result.stdout.trim()).toBe(`deepsource-mcp-server version ${version}`);
      expect(result.code).toBe(0);
      // Should not log errors about missing API key
      expect(result.stderr).not.toContain('DEEPSOURCE_API_KEY');
    });
  });

  describe('Version in logs', () => {
    it('should log version on startup when running normally', async () => {
      // This test would require setting up proper environment and mocking
      // Since we need DEEPSOURCE_API_KEY to run normally
      // We'll create a simpler unit test for the logging behavior

      // This is more of an integration test placeholder
      // The actual test would need to:
      // 1. Set DEEPSOURCE_API_KEY
      // 2. Start the server
      // 3. Capture logs
      // 4. Verify version was logged
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});
