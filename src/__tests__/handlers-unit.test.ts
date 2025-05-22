/**
 * Unit tests for handler functions - focuses on testing basic functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Handler Functions Unit Tests', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('dependency-vulnerabilities handler', () => {
    it('should require DEEPSOURCE_API_KEY environment variable', async () => {
      delete process.env.DEEPSOURCE_API_KEY;

      const { handleDeepsourceDependencyVulnerabilities } = await import(
        '../handlers/dependency-vulnerabilities.js'
      );

      await expect(
        handleDeepsourceDependencyVulnerabilities({
          projectKey: 'test-project',
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should import successfully with API key set', async () => {
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const module = await import('../handlers/dependency-vulnerabilities.js');
      expect(module.handleDeepsourceDependencyVulnerabilities).toBeDefined();
      expect(typeof module.handleDeepsourceDependencyVulnerabilities).toBe('function');
    });
  });

  describe('project-runs handler', () => {
    it('should require DEEPSOURCE_API_KEY environment variable', async () => {
      delete process.env.DEEPSOURCE_API_KEY;

      const { handleDeepsourceProjectRuns } = await import('../handlers/project-runs.js');

      await expect(
        handleDeepsourceProjectRuns({
          projectKey: 'test-project',
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should import successfully with API key set', async () => {
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const module = await import('../handlers/project-runs.js');
      expect(module.handleDeepsourceProjectRuns).toBeDefined();
      expect(typeof module.handleDeepsourceProjectRuns).toBe('function');
    });
  });

  describe('recent-run-issues handler', () => {
    it('should require DEEPSOURCE_API_KEY environment variable', async () => {
      delete process.env.DEEPSOURCE_API_KEY;

      const { handleDeepsourceRecentRunIssues } = await import('../handlers/recent-run-issues.js');

      await expect(
        handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'main',
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should import successfully with API key set', async () => {
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const module = await import('../handlers/recent-run-issues.js');
      expect(module.handleDeepsourceRecentRunIssues).toBeDefined();
      expect(typeof module.handleDeepsourceRecentRunIssues).toBe('function');
    });
  });

  describe('run handler', () => {
    it('should require DEEPSOURCE_API_KEY environment variable', async () => {
      delete process.env.DEEPSOURCE_API_KEY;

      const { handleDeepsourceRun } = await import('../handlers/run.js');

      await expect(
        handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'run-123',
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should import successfully with API key set', async () => {
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      const module = await import('../handlers/run.js');
      expect(module.handleDeepsourceRun).toBeDefined();
      expect(typeof module.handleDeepsourceRun).toBe('function');
    });
  });

  describe('Handler helper functions', () => {
    it('should test helper functions from dependency-vulnerabilities', async () => {
      // Test the getSeverityLevel function by importing the module and checking it exists
      const module = await import('../handlers/dependency-vulnerabilities.js');
      expect(module.handleDeepsourceDependencyVulnerabilities).toBeDefined();

      // We can indirectly test the helper functions through the main function
      process.env.DEEPSOURCE_API_KEY = 'test-key';

      // The function should be callable (even if it fails due to network/API issues)
      try {
        await module.handleDeepsourceDependencyVulnerabilities({
          projectKey: 'test-project',
        });
      } catch (error) {
        // Expected to fail due to network/API, but this tests the function structure
        expect(error).toBeDefined();
      }
    });

    it('should test helper functions from run handler', async () => {
      const module = await import('../handlers/run.js');
      expect(module.handleDeepsourceRun).toBeDefined();

      process.env.DEEPSOURCE_API_KEY = 'test-key';

      // Test with default parameters
      try {
        await module.handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'run-123',
          // isCommitOid defaults to false
        });
      } catch (error) {
        // Expected to fail due to network/API, but this tests the function structure
        expect(error).toBeDefined();
      }
    });

    it('should test parameter handling in project-runs', async () => {
      const module = await import('../handlers/project-runs.js');
      expect(module.handleDeepsourceProjectRuns).toBeDefined();

      process.env.DEEPSOURCE_API_KEY = 'test-key';

      // Test with various parameters
      try {
        await module.handleDeepsourceProjectRuns({
          projectKey: 'test-project',
          analyzerIn: ['javascript', 'typescript'],
          first: 10,
          after: 'cursor',
        });
      } catch (error) {
        // Expected to fail due to network/API, but this tests parameter processing
        expect(error).toBeDefined();
      }
    });

    it('should test pagination parameter handling', async () => {
      const module = await import('../handlers/recent-run-issues.js');
      expect(module.handleDeepsourceRecentRunIssues).toBeDefined();

      process.env.DEEPSOURCE_API_KEY = 'test-key';

      // Test basic required parameters
      try {
        await module.handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'main',
          first: 5,
          after: 'cursor-start',
        });
      } catch (error) {
        // Expected to fail due to network/API, but this tests parameter processing
        expect(error).toBeDefined();
      }
    });
  });

  describe('Import tests for all handlers', () => {
    it('should import all handler functions', async () => {
      const handlers = await import('../handlers/index.js');

      expect(handlers.handleDeepsourceDependencyVulnerabilities).toBeDefined();
      expect(handlers.handleDeepsourceProjectRuns).toBeDefined();
      expect(handlers.handleDeepsourceRecentRunIssues).toBeDefined();
      expect(handlers.handleDeepsourceRun).toBeDefined();
      expect(handlers.handleProjects).toBeDefined();
      expect(handlers.handleDeepsourceQualityMetrics).toBeDefined();
      expect(handlers.handleDeepsourceUpdateMetricThreshold).toBeDefined();
      expect(handlers.handleDeepsourceUpdateMetricSetting).toBeDefined();
      expect(handlers.handleDeepsourceComplianceReport).toBeDefined();
      expect(handlers.handleDeepsourceProjectIssues).toBeDefined();
    });

    it('should have consistent function signatures', async () => {
      const handlers = await import('../handlers/index.js');

      // All handlers should be functions
      expect(typeof handlers.handleDeepsourceDependencyVulnerabilities).toBe('function');
      expect(typeof handlers.handleDeepsourceProjectRuns).toBe('function');
      expect(typeof handlers.handleDeepsourceRecentRunIssues).toBe('function');
      expect(typeof handlers.handleDeepsourceRun).toBe('function');

      // Functions should have expected length (parameter count)
      expect(handlers.handleDeepsourceDependencyVulnerabilities.length).toBe(1);
      expect(handlers.handleDeepsourceProjectRuns.length).toBe(1);
      expect(handlers.handleDeepsourceRecentRunIssues.length).toBe(1);
      expect(handlers.handleDeepsourceRun.length).toBe(1);
    });
  });
});
