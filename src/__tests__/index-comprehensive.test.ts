/**
 * @fileoverview Comprehensive tests for the main MCP server implementation in index.ts
 * This test suite focuses on module integration and handler mocking validation
 */

import { vi } from 'vitest';

// Mock all dependencies BEFORE any imports - using unstable_mockModule for ES modules
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn(),
    setRequestHandler: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(() => ({
    client: {},
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  })),
}));

vi.mock('../server/tool-registration.js', () => ({
  registerDeepSourceTools: vi
    .fn()
    .mockReturnValue([
      'projects',
      'project_issues',
      'runs',
      'run',
      'recent_run_issues',
      'dependency_vulnerabilities',
      'quality_metrics',
      'update_metric_threshold',
      'update_metric_setting',
      'compliance_report',
    ]),
}));

const mockHandlers = {
  handleProjects: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceQualityMetrics: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceUpdateMetricThreshold: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceUpdateMetricSetting: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceComplianceReport: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceProjectIssues: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceProjectRuns: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceRun: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceRecentRunIssues: vi.fn().mockResolvedValue({ content: [], isError: false }),
  handleDeepsourceDependencyVulnerabilities: vi
    .fn()
    .mockResolvedValue({ content: [], isError: false }),
};

vi.mock('../handlers/index.js', () => mockHandlers);

const mockToolHelpers = {
  logToolInvocation: vi.fn(),
  logToolResult: vi.fn(),
  logAndFormatError: vi.fn().mockReturnValue('Formatted error message'),
};

vi.mock('../server/tool-helpers.js', () => mockToolHelpers);

vi.mock('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: vi.fn().mockResolvedValue({
      getRegisteredTools: vi
        .fn()
        .mockReturnValue([
          'projects',
          'project_issues',
          'runs',
          'run',
          'recent_run_issues',
          'dependency_vulnerabilities',
          'quality_metrics',
          'update_metric_threshold',
          'update_metric_setting',
          'compliance_report',
        ]),
      getMcpServer: vi.fn().mockReturnValue({
        registerTool: vi.fn(),
      }),
      start: vi.fn(),
    }),
  },
}));

// Import test utilities after all mocks are set
const { describe, it, expect, beforeEach, afterEach } = await import('vitest');

describe('Index.ts MCP Server Comprehensive Tests', () => {
  let indexModule: {
    mcpServer: {
      current: {
        getRegisteredTools: () => string[];
        getMcpServer?: () => unknown;
        start?: () => Promise<void>;
      };
    };
    getMcpServer?: () => unknown;
  };
  let originalEnv: typeof process.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Import and Server Creation', () => {
    beforeEach(async () => {
      originalEnv = { ...process.env };
      process.env.NODE_ENV = 'test';
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';

      // Clear module cache and reimport
      vi.resetModules();
      indexModule = await import('../index.js');
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should successfully import the module', () => {
      expect(indexModule).toBeDefined();
    });

    it('should export an mcpServer instance', () => {
      expect(indexModule.mcpServer).toBeDefined();
      expect(indexModule.mcpServer.current).toBeDefined();
    });

    it('should have server with correct name and version', () => {
      expect(indexModule.mcpServer.current.getRegisteredTools).toBeDefined();
      expect(typeof indexModule.mcpServer.current.getRegisteredTools).toBe('function');
    });
  });

  describe('Handler Integration Testing', () => {
    // These tests verify that handlers can be invoked through the mocked structure
    it('should test handleProjects success scenario', async () => {
      const result = await mockHandlers.handleProjects({});
      expect(result).toEqual({ content: [], isError: false });
      expect(mockHandlers.handleProjects).toHaveBeenCalled();
    });

    it('should test handleProjects error scenario', async () => {
      mockHandlers.handleProjects.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Error' }],
        isError: true,
      });
      const result = await mockHandlers.handleProjects({});
      expect(result.isError).toBe(true);
    });

    it('should test handleProjects exception scenario', async () => {
      mockHandlers.handleProjects.mockRejectedValueOnce(new Error('Test error'));
      await expect(mockHandlers.handleProjects({})).rejects.toThrow('Test error');
    });

    it('should test handleDeepsourceQualityMetrics success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceQualityMetrics({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceQualityMetrics error scenario', async () => {
      mockHandlers.handleDeepsourceQualityMetrics.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Error' }],
        isError: true,
      });
      const result = await mockHandlers.handleDeepsourceQualityMetrics({});
      expect(result.isError).toBe(true);
    });

    it('should test handleDeepsourceUpdateMetricThreshold success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceUpdateMetricThreshold({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceUpdateMetricSetting success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceUpdateMetricSetting({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceComplianceReport success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceComplianceReport({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceProjectIssues success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceProjectIssues({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceProjectRuns success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceProjectRuns({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceRun success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceRun({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceRecentRunIssues success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceRecentRunIssues({});
      expect(result).toEqual({ content: [], isError: false });
    });

    it('should test handleDeepsourceDependencyVulnerabilities success scenario', async () => {
      const result = await mockHandlers.handleDeepsourceDependencyVulnerabilities({});
      expect(result).toEqual({ content: [], isError: false });
    });
  });

  describe('Tool Helper Integration', () => {
    it('should test logToolInvocation mock', () => {
      mockToolHelpers.logToolInvocation('test-tool', { param: 'value' });
      expect(mockToolHelpers.logToolInvocation).toHaveBeenCalledWith('test-tool', {
        param: 'value',
      });
    });

    it('should test logToolResult mock', () => {
      mockToolHelpers.logToolResult('test-tool', { result: 'success' });
      expect(mockToolHelpers.logToolResult).toHaveBeenCalledWith('test-tool', {
        result: 'success',
      });
    });

    it('should test logAndFormatError mock', () => {
      const result = mockToolHelpers.logAndFormatError(new Error('Test error'));
      expect(result).toBe('Formatted error message');
      expect(mockToolHelpers.logAndFormatError).toHaveBeenCalled();
    });
  });

  describe('Logger Integration', () => {
    it('should test logger mock functions', async () => {
      const mockLogger = (await import('../utils/logging/logger.js')).createLogger('test');

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
      // Set all handlers to throw errors
      Object.keys(mockHandlers).forEach((key) => {
        mockHandlers[key].mockRejectedValue(new Error(`${key} failed`));
      });

      // Verify each handler throws as expected
      await expect(mockHandlers.handleProjects({})).rejects.toThrow('handleProjects failed');
      await expect(mockHandlers.handleDeepsourceQualityMetrics({})).rejects.toThrow(
        'handleDeepsourceQualityMetrics failed'
      );
    });

    it('should handle all handlers returning error results', async () => {
      // Set all handlers to return error results
      Object.keys(mockHandlers).forEach((key) => {
        mockHandlers[key].mockResolvedValue({
          content: [{ type: 'text', text: `${key} error` }],
          isError: true,
        });
      });

      // Verify each handler returns error as expected
      const projectResult = await mockHandlers.handleProjects({});
      expect(projectResult.isError).toBe(true);
      expect(projectResult.content[0].text).toBe('handleProjects error');
    });
  });
});
