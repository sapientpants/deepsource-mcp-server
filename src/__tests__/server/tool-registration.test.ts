/**
 * @fileoverview Tests for tool registration module
 */

import { jest } from '@jest/globals';
import {
  registerDeepSourceTools,
  ToolCategory,
  getToolsByCategory,
  getToolsByTag,
  getPaginatedTools,
  TOOL_METADATA,
} from '../../server/tool-registration.js';
import { ToolRegistry } from '../../server/tool-registry.js';

// Mock dependencies
jest.mock('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../handlers/index.js', () => ({
  handleProjects: jest.fn().mockResolvedValue({ content: [{ text: '[]' }] }),
  handleDeepsourceQualityMetrics: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceUpdateMetricThreshold: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceUpdateMetricSetting: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceComplianceReport: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceProjectIssues: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceProjectRuns: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceRun: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceRecentRunIssues: jest.fn().mockResolvedValue({ content: [{ text: '{}' }] }),
  handleDeepsourceDependencyVulnerabilities: jest
    .fn()
    .mockResolvedValue({ content: [{ text: '{}' }] }),
}));

describe('Tool Registration', () => {
  describe('registerDeepSourceTools', () => {
    it('should register all DeepSource tools', () => {
      const mockRegistry = {
        registerTools: jest.fn(),
      } as unknown as ToolRegistry;

      registerDeepSourceTools(mockRegistry);

      expect(mockRegistry.registerTools).toHaveBeenCalledTimes(1);
      const registeredTools = (mockRegistry.registerTools as jest.Mock).mock.calls[0][0];
      expect(registeredTools).toHaveLength(10); // 10 DeepSource tools
      expect(registeredTools.map((t: { name: string }) => t.name)).toEqual([
        'projects',
        'quality_metrics',
        'update_metric_threshold',
        'update_metric_setting',
        'compliance_report',
        'project_issues',
        'runs',
        'run',
        'recent_run_issues',
        'dependency_vulnerabilities',
      ]);
    });

    it('should handle tools with parameter transformations', () => {
      const mockRegistry = {
        registerTools: jest.fn(),
      } as unknown as ToolRegistry;

      registerDeepSourceTools(mockRegistry);

      const registeredTools = (mockRegistry.registerTools as jest.Mock).mock.calls[0][0];

      // Find tools that need parameter transformations
      const updateMetricThresholdTool = registeredTools.find(
        (t: { name: string }) => t.name === 'update_metric_threshold'
      );
      const runsTool = registeredTools.find((t: { name: string }) => t.name === 'runs');

      expect(updateMetricThresholdTool).toBeDefined();
      expect(runsTool).toBeDefined();
    });
  });

  describe('Tool Metadata', () => {
    it('should have metadata for all tools', () => {
      const expectedTools = [
        'projects',
        'quality_metrics',
        'update_metric_threshold',
        'update_metric_setting',
        'compliance_report',
        'project_issues',
        'runs',
        'run',
        'recent_run_issues',
        'dependency_vulnerabilities',
      ];

      expectedTools.forEach((toolName) => {
        expect(TOOL_METADATA[toolName]).toBeDefined();
        expect(TOOL_METADATA[toolName].category).toBeDefined();
        expect(TOOL_METADATA[toolName].tags).toBeInstanceOf(Array);
        expect(TOOL_METADATA[toolName].requiresAuth).toBe(true);
        expect(typeof TOOL_METADATA[toolName].supportsFiltering).toBe('boolean');
        expect(typeof TOOL_METADATA[toolName].supportsPagination).toBe('boolean');
      });
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools for project management category', () => {
      const tools = getToolsByCategory(ToolCategory.PROJECT_MANAGEMENT);
      expect(tools).toEqual(['projects']);
    });

    it('should return tools for code quality category', () => {
      const tools = getToolsByCategory(ToolCategory.CODE_QUALITY);
      expect(tools).toContain('quality_metrics');
      expect(tools).toContain('update_metric_threshold');
      expect(tools).toContain('update_metric_setting');
      expect(tools).toContain('project_issues');
    });

    it('should return tools for security category', () => {
      const tools = getToolsByCategory(ToolCategory.SECURITY);
      expect(tools).toEqual(['compliance_report']);
    });

    it('should return tools for analysis category', () => {
      const tools = getToolsByCategory(ToolCategory.ANALYSIS);
      expect(tools).toContain('runs');
      expect(tools).toContain('run');
      expect(tools).toContain('recent_run_issues');
    });

    it('should return tools for dependencies category', () => {
      const tools = getToolsByCategory(ToolCategory.DEPENDENCIES);
      expect(tools).toEqual(['dependency_vulnerabilities']);
    });
  });

  describe('getToolsByTag', () => {
    it('should return tools with metrics tag', () => {
      const tools = getToolsByTag('metrics');
      expect(tools).toContain('quality_metrics');
      expect(tools).toContain('update_metric_threshold');
      expect(tools).toContain('update_metric_setting');
    });

    it('should return tools with security tag', () => {
      const tools = getToolsByTag('security');
      expect(tools).toContain('compliance_report');
      expect(tools).toContain('dependency_vulnerabilities');
    });

    it('should return tools with list tag', () => {
      const tools = getToolsByTag('list');
      expect(tools).toContain('projects');
      expect(tools).toContain('project_issues');
      expect(tools).toContain('runs');
      expect(tools).toContain('dependency_vulnerabilities');
    });

    it('should return tools with mutation tag', () => {
      const tools = getToolsByTag('mutation');
      expect(tools).toContain('update_metric_threshold');
      expect(tools).toContain('update_metric_setting');
    });
  });

  describe('getPaginatedTools', () => {
    it('should return tools that support pagination', () => {
      const tools = getPaginatedTools();
      expect(tools).toContain('project_issues');
      expect(tools).toContain('runs');
      expect(tools).toContain('recent_run_issues');
      expect(tools).toContain('dependency_vulnerabilities');
      expect(tools).not.toContain('projects');
      expect(tools).not.toContain('quality_metrics');
      expect(tools).not.toContain('compliance_report');
    });
  });
});
