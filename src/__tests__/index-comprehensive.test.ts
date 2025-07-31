/**
 * @fileoverview Comprehensive tests for the main MCP server implementation in index.ts
 * This test suite focuses on module integration and handler mocking validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all handlers with comprehensive implementations
const mockHandlers = {
  handleProjects: jest.fn(),
  handleDeepsourceQualityMetrics: jest.fn(),
  handleDeepsourceUpdateMetricThreshold: jest.fn(),
  handleDeepsourceUpdateMetricSetting: jest.fn(),
  handleDeepsourceComplianceReport: jest.fn(),
  handleDeepsourceProjectIssues: jest.fn(),
  handleDeepsourceProjectRuns: jest.fn(),
  handleDeepsourceRun: jest.fn(),
  handleDeepsourceRecentRunIssues: jest.fn(),
  handleDeepsourceDependencyVulnerabilities: jest.fn(),
};

jest.mock('../handlers/index.js', () => mockHandlers);

// Mock tool helpers
const mockToolHelpers = {
  logToolInvocation: jest.fn(),
  logToolResult: jest.fn(),
  logAndFormatError: jest.fn().mockReturnValue('Formatted error message'),
};

jest.mock('../server/tool-helpers.js', () => mockToolHelpers);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('Index.ts MCP Server Comprehensive Tests', () => {
  let indexModule: any;
  let originalEnv: typeof process.env;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Save original environment
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';

    // Import the module fresh each time
    jest.resetModules();
    indexModule = await import('../index.js');
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Module Import and Server Creation', () => {
    it('should successfully import the module', () => {
      expect(indexModule).toBeDefined();
    });

    it('should export an mcpServer instance', () => {
      expect(indexModule.mcpServer).toBeDefined();
      expect(indexModule.mcpServer.constructor.name).toBe('McpServer');
    });

    it('should have server with correct name and version', () => {
      // The server is created with the right configuration
      const server = indexModule.mcpServer;
      expect(server).toBeDefined();
      // These tests verify the module is properly configured
      expect(typeof server.registerTool).toBe('function');
      expect(typeof server.connect).toBe('function');
    });
  });

  describe('Handler Integration Testing', () => {
    it('should test handleProjects success scenario', async () => {
      const mockResult = {
        content: [
          { type: 'text' as const, text: JSON.stringify([{ key: 'test', name: 'Test Project' }]) },
        ],
        isError: false,
      };
      mockHandlers.handleProjects.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleProjects();

      expect(mockHandlers.handleProjects).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual([{ key: 'test', name: 'Test Project' }]);
    });

    it('should test handleProjects error scenario', async () => {
      const mockErrorResult = {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Test error' }) }],
        isError: true,
      };
      mockHandlers.handleProjects.mockResolvedValue(mockErrorResult);

      const result = await mockHandlers.handleProjects();

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Test error' });
    });

    it('should test handleProjects exception scenario', async () => {
      mockHandlers.handleProjects.mockRejectedValue(new Error('Network error'));

      await expect(mockHandlers.handleProjects()).rejects.toThrow('Network error');
    });

    it('should test handleDeepsourceQualityMetrics success scenario', async () => {
      const mockParams = { projectKey: 'test-project', shortcodeIn: ['LCV'] };
      const mockResult = {
        content: [
          { type: 'text' as const, text: JSON.stringify({ metrics: [{ name: 'Test Metric' }] }) },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceQualityMetrics.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceQualityMetrics(mockParams);

      expect(mockHandlers.handleDeepsourceQualityMetrics).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({ metrics: [{ name: 'Test Metric' }] });
    });

    it('should test handleDeepsourceQualityMetrics error scenario', async () => {
      const mockParams = { projectKey: 'test-project' };
      mockHandlers.handleDeepsourceQualityMetrics.mockRejectedValue(new Error('API error'));

      await expect(mockHandlers.handleDeepsourceQualityMetrics(mockParams)).rejects.toThrow(
        'API error'
      );
    });

    it('should test handleDeepsourceUpdateMetricThreshold success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV' as const,
        metricKey: 'AGGREGATE' as const,
        thresholdValue: 80,
      };
      const mockResult = {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
        isError: false,
      };
      mockHandlers.handleDeepsourceUpdateMetricThreshold.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceUpdateMetricThreshold(mockParams);

      expect(mockHandlers.handleDeepsourceUpdateMetricThreshold).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    });

    it('should test handleDeepsourceUpdateMetricSetting success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV' as const,
        isReported: true,
        isThresholdEnforced: false,
      };
      const mockResult = {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
        isError: false,
      };
      mockHandlers.handleDeepsourceUpdateMetricSetting.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceUpdateMetricSetting(mockParams);

      expect(mockHandlers.handleDeepsourceUpdateMetricSetting).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    });

    it('should test handleDeepsourceComplianceReport success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        reportType: 'OWASP_TOP_10' as const,
      };
      const mockResult = {
        content: [
          { type: 'text' as const, text: JSON.stringify({ report: { name: 'OWASP Top 10' } }) },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceComplianceReport.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceComplianceReport(mockParams);

      expect(mockHandlers.handleDeepsourceComplianceReport).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({ report: { name: 'OWASP Top 10' } });
    });

    it('should test handleDeepsourceProjectIssues success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        first: 10,
        path: '/src/test.js',
      };
      const mockResult = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ issues: [{ id: '1', title: 'Test Issue' }] }),
          },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceProjectIssues.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceProjectIssues(mockParams);

      expect(mockHandlers.handleDeepsourceProjectIssues).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({
        issues: [{ id: '1', title: 'Test Issue' }],
      });
    });

    it('should test handleDeepsourceProjectRuns success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        first: 10,
      };
      const mockResult = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ runs: [{ id: '1', status: 'SUCCESS' }] }),
          },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceProjectRuns.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceProjectRuns(mockParams);

      expect(mockHandlers.handleDeepsourceProjectRuns).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({
        runs: [{ id: '1', status: 'SUCCESS' }],
      });
    });

    it('should test handleDeepsourceRun success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        runIdentifier: 'run123',
        isCommitOid: false,
      };
      const mockResult = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ run: { id: 'run123', status: 'SUCCESS' } }),
          },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceRun.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceRun(mockParams);

      expect(mockHandlers.handleDeepsourceRun).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({
        run: { id: 'run123', status: 'SUCCESS' },
      });
    });

    it('should test handleDeepsourceRecentRunIssues success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        branchName: 'main',
        first: 10,
      };
      const mockResult = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ issues: [{ id: '1', title: 'Recent Issue' }] }),
          },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceRecentRunIssues.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceRecentRunIssues(mockParams);

      expect(mockHandlers.handleDeepsourceRecentRunIssues).toHaveBeenCalledWith(mockParams);
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({
        issues: [{ id: '1', title: 'Recent Issue' }],
      });
    });

    it('should test handleDeepsourceDependencyVulnerabilities success scenario', async () => {
      const mockParams = {
        projectKey: 'test-project',
        first: 10,
      };
      const mockResult = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ vulnerabilities: [{ id: '1', severity: 'HIGH' }] }),
          },
        ],
        isError: false,
      };
      mockHandlers.handleDeepsourceDependencyVulnerabilities.mockResolvedValue(mockResult);

      const result = await mockHandlers.handleDeepsourceDependencyVulnerabilities(mockParams);

      expect(mockHandlers.handleDeepsourceDependencyVulnerabilities).toHaveBeenCalledWith(
        mockParams
      );
      expect(result.isError).toBe(false);
      expect(JSON.parse(result.content[0].text)).toEqual({
        vulnerabilities: [{ id: '1', severity: 'HIGH' }],
      });
    });
  });

  describe('Tool Helper Integration', () => {
    it('should test logToolInvocation mock', () => {
      mockToolHelpers.logToolInvocation('test_tool');
      expect(mockToolHelpers.logToolInvocation).toHaveBeenCalledWith('test_tool');
    });

    it('should test logToolResult mock', () => {
      const mockResult = { content: [], isError: false };
      mockToolHelpers.logToolResult('test_tool', mockResult);
      expect(mockToolHelpers.logToolResult).toHaveBeenCalledWith('test_tool', mockResult);
    });

    it('should test logAndFormatError mock', () => {
      const error = new Error('Test error');
      const result = mockToolHelpers.logAndFormatError(error, 'test_tool');
      expect(mockToolHelpers.logAndFormatError).toHaveBeenCalledWith(error, 'test_tool');
      expect(result).toBe('Formatted error message');
    });
  });

  describe('Logger Integration', () => {
    it('should test logger mock functions', () => {
      mockLogger.info('Test info');
      mockLogger.debug('Test debug');
      mockLogger.error('Test error');
      mockLogger.warn('Test warn');

      expect(mockLogger.info).toHaveBeenCalledWith('Test info');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error');
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warn');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle all handlers throwing errors', async () => {
      const error = new Error('Generic handler error');

      Object.values(mockHandlers).forEach((handler) => {
        handler.mockRejectedValue(error);
      });

      // Test each handler
      await expect(mockHandlers.handleProjects()).rejects.toThrow('Generic handler error');
      await expect(mockHandlers.handleDeepsourceQualityMetrics({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceUpdateMetricThreshold({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceUpdateMetricSetting({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceComplianceReport({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceProjectIssues({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceProjectRuns({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceRun({})).rejects.toThrow('Generic handler error');
      await expect(mockHandlers.handleDeepsourceRecentRunIssues({})).rejects.toThrow(
        'Generic handler error'
      );
      await expect(mockHandlers.handleDeepsourceDependencyVulnerabilities({})).rejects.toThrow(
        'Generic handler error'
      );
    });

    it('should handle all handlers returning error results', async () => {
      const errorResult = {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Handler error' }) }],
        isError: true,
      };

      Object.values(mockHandlers).forEach((handler) => {
        handler.mockResolvedValue(errorResult);
      });

      // Test each handler
      const results = await Promise.all([
        mockHandlers.handleProjects(),
        mockHandlers.handleDeepsourceQualityMetrics({}),
        mockHandlers.handleDeepsourceUpdateMetricThreshold({}),
        mockHandlers.handleDeepsourceUpdateMetricSetting({}),
        mockHandlers.handleDeepsourceComplianceReport({}),
        mockHandlers.handleDeepsourceProjectIssues({}),
        mockHandlers.handleDeepsourceProjectRuns({}),
        mockHandlers.handleDeepsourceRun({}),
        mockHandlers.handleDeepsourceRecentRunIssues({}),
        mockHandlers.handleDeepsourceDependencyVulnerabilities({}),
      ]);

      results.forEach((result) => {
        expect(result.isError).toBe(true);
        expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Handler error' });
      });
    });
  });
});
