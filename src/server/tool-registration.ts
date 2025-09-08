/**
 * @fileoverview Tool registration module for DeepSource MCP tools
 *
 * This module handles the registration of all DeepSource tools with the
 * MCP server. It centralizes tool registration logic and provides a
 * clean interface for registering tools.
 *
 * @packageDocumentation
 */

import { ToolRegistry, ToolDefinition } from './tool-registry.js';
import { toolSchemas } from './tool-definitions.js';
import {
  handleProjects,
  handleDeepsourceQualityMetrics,
  handleDeepsourceUpdateMetricThreshold,
  handleDeepsourceUpdateMetricSetting,
  handleDeepsourceComplianceReport,
  handleDeepsourceProjectIssues,
  handleDeepsourceProjectRuns,
  handleDeepsourceRun,
  handleDeepsourceRecentRunIssues,
  handleDeepsourceDependencyVulnerabilities,
} from '../handlers/index.js';
import { DeepsourceRunParams } from '../handlers/run.js';
import { DeepsourceRecentRunIssuesParams } from '../handlers/recent-run-issues.js';
import { DeepsourceDependencyVulnerabilitiesParams } from '../handlers/dependency-vulnerabilities.js';
import { MetricKey } from '../types/metrics.js';
import { AnalyzerShortcode } from '../types/branded.js';
import { MetricShortcode } from '../models/metrics.js';
import { ReportType } from '../types/report-types.js';
import { createLogger } from '../utils/logging/logger.js';

const logger = createLogger('ToolRegistration');

/**
 * Handler mapping for tool schemas
 */
const TOOL_HANDLERS: Record<string, (params: unknown) => Promise<unknown>> = {
  projects: async (params: unknown) => {
    logger.debug('Projects handler called with params:', { params, type: typeof params });
    // Params currently unused but may be used for future filtering
    void params;
    return handleProjects();
  },
  quality_metrics: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const metricsParams: { projectKey: string; shortcodeIn?: MetricShortcode[] } = {
      projectKey: typedParams.projectKey as string,
    };

    const shortcodeIn = typedParams.shortcodeIn as MetricShortcode[] | undefined;
    if (shortcodeIn) {
      metricsParams.shortcodeIn = shortcodeIn;
    }

    return handleDeepsourceQualityMetrics(metricsParams);
  },
  update_metric_threshold: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const thresholdParams: {
      projectKey: string;
      repositoryId: string;
      metricShortcode: MetricShortcode;
      metricKey: MetricKey;
      thresholdValue?: number | null;
    } = {
      projectKey: typedParams.projectKey as string,
      repositoryId: typedParams.repositoryId as string,
      metricShortcode: typedParams.metricShortcode as MetricShortcode,
      metricKey: typedParams.metricKey as MetricKey,
    };

    const thresholdValue = typedParams.thresholdValue as number | null | undefined;
    if (thresholdValue !== undefined) {
      thresholdParams.thresholdValue = thresholdValue;
    }

    return handleDeepsourceUpdateMetricThreshold(thresholdParams);
  },
  update_metric_setting: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    return handleDeepsourceUpdateMetricSetting({
      projectKey: typedParams.projectKey as string,
      repositoryId: typedParams.repositoryId as string,
      metricShortcode: typedParams.metricShortcode as MetricShortcode,
      isReported: typedParams.isReported as boolean,
      isThresholdEnforced: typedParams.isThresholdEnforced as boolean,
    });
  },
  compliance_report: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    return handleDeepsourceComplianceReport({
      projectKey: typedParams.projectKey as string,
      reportType: typedParams.reportType as ReportType,
    });
  },
  project_issues: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const issuesParams: {
      projectKey: string;
      path?: string;
      analyzerIn?: string[];
      tags?: string[];
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    } = {
      projectKey: typedParams.projectKey as string,
    };

    if (typeof typedParams.path === 'string') {
      issuesParams.path = typedParams.path;
    }
    if (Array.isArray(typedParams.analyzerIn)) {
      issuesParams.analyzerIn = typedParams.analyzerIn as string[];
    }
    if (Array.isArray(typedParams.tags)) {
      issuesParams.tags = typedParams.tags as string[];
    }
    if (typeof typedParams.first === 'number') {
      issuesParams.first = typedParams.first;
    }
    if (typeof typedParams.last === 'number') {
      issuesParams.last = typedParams.last;
    }
    if (typeof typedParams.after === 'string') {
      issuesParams.after = typedParams.after;
    }
    if (typeof typedParams.before === 'string') {
      issuesParams.before = typedParams.before;
    }

    return handleDeepsourceProjectIssues(issuesParams);
  },
  runs: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const runsParams: {
      projectKey: string;
      analyzerIn: AnalyzerShortcode[];
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    } = {
      projectKey: typedParams.projectKey as string,
      analyzerIn: typedParams.analyzerIn as AnalyzerShortcode[],
    };

    if (typeof typedParams.first === 'number') {
      runsParams.first = typedParams.first;
    }
    if (typeof typedParams.last === 'number') {
      runsParams.last = typedParams.last;
    }
    if (typeof typedParams.after === 'string') {
      runsParams.after = typedParams.after;
    }
    if (typeof typedParams.before === 'string') {
      runsParams.before = typedParams.before;
    }

    return handleDeepsourceProjectRuns(runsParams);
  },
  run: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const runParams: DeepsourceRunParams = {
      projectKey: typedParams.projectKey as string,
      runIdentifier: typedParams.runIdentifier as string,
    };

    if (typeof typedParams.isCommitOid === 'boolean') {
      runParams.isCommitOid = typedParams.isCommitOid;
    }

    return handleDeepsourceRun(runParams);
  },
  recent_run_issues: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const recentRunParams: DeepsourceRecentRunIssuesParams = {
      projectKey: typedParams.projectKey as string,
      branchName: typedParams.branchName as string,
    };

    if (typeof typedParams.first === 'number') {
      recentRunParams.first = typedParams.first;
    }
    if (typeof typedParams.last === 'number') {
      recentRunParams.last = typedParams.last;
    }
    if (typeof typedParams.after === 'string') {
      recentRunParams.after = typedParams.after;
    }
    if (typeof typedParams.before === 'string') {
      recentRunParams.before = typedParams.before;
    }

    return handleDeepsourceRecentRunIssues(recentRunParams);
  },
  dependency_vulnerabilities: async (params: unknown) => {
    const typedParams = params as Record<string, unknown>;
    const vulnParams: DeepsourceDependencyVulnerabilitiesParams = {
      projectKey: typedParams.projectKey as string,
    };

    if (typeof typedParams.first === 'number') {
      vulnParams.first = typedParams.first;
    }
    if (typeof typedParams.last === 'number') {
      vulnParams.last = typedParams.last;
    }
    if (typeof typedParams.after === 'string') {
      vulnParams.after = typedParams.after;
    }
    if (typeof typedParams.before === 'string') {
      vulnParams.before = typedParams.before;
    }

    return handleDeepsourceDependencyVulnerabilities(vulnParams);
  },
};

/**
 * Creates a tool definition from a schema and handler
 *
 * @param schema - The tool schema
 * @param handler - The tool handler function
 * @returns The tool definition
 */
function createToolDefinition(
  schema: {
    name: string;
    description: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
  },
  handler: (_params: unknown) => Promise<unknown>
): ToolDefinition {
  logger.debug(`Creating tool definition for ${schema.name}`, {
    hasInputSchema: !!schema.inputSchema,
    inputSchemaType: typeof schema.inputSchema,
    inputSchema: schema.inputSchema,
  });

  return {
    name: schema.name,
    description: schema.description,
    inputSchema: schema.inputSchema,
    outputSchema: schema.outputSchema,
    handler,
  } as ToolDefinition;
}

/**
 * Registers all DeepSource tools with the tool registry
 *
 * @param registry - The tool registry to register tools with
 */
export function registerDeepSourceTools(registry: ToolRegistry): void {
  logger.info('Registering DeepSource tools');

  const toolDefinitions: ToolDefinition[] = [];

  // Create tool definitions from schemas and handlers
  for (const schema of toolSchemas) {
    const handler = TOOL_HANDLERS[schema.name];
    if (!handler) {
      logger.warn(`No handler found for tool: ${schema.name}`);
      continue;
    }

    const toolDef = createToolDefinition(schema, handler);
    toolDefinitions.push(toolDef);
  }

  // Register all tools
  registry.registerTools(toolDefinitions);

  logger.info(`Registered ${toolDefinitions.length} DeepSource tools`, {
    tools: toolDefinitions.map((t) => t.name),
  });
}

/**
 * Tool categories for organization
 */

export enum ToolCategory {
  PROJECT_MANAGEMENT = 'project_management',
  CODE_QUALITY = 'code_quality',
  SECURITY = 'security',
  ANALYSIS = 'analysis',
  DEPENDENCIES = 'dependencies',
}

/**
 * Tool metadata for categorization and filtering
 */
export interface ToolMetadata {
  category: ToolCategory;
  tags: string[];
  requiresAuth: boolean;
  supportsFiltering: boolean;
  supportsPagination: boolean;
}

/**
 * Metadata for all DeepSource tools
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  projects: {
    category: ToolCategory.PROJECT_MANAGEMENT,
    tags: ['projects', 'list', 'discovery'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: false,
  },
  quality_metrics: {
    category: ToolCategory.CODE_QUALITY,
    tags: ['metrics', 'quality', 'code', 'statistics'],
    requiresAuth: true,
    supportsFiltering: true,
    supportsPagination: false,
  },
  update_metric_threshold: {
    category: ToolCategory.CODE_QUALITY,
    tags: ['metrics', 'quality', 'threshold', 'update', 'mutation'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: false,
  },
  update_metric_setting: {
    category: ToolCategory.CODE_QUALITY,
    tags: ['metrics', 'quality', 'settings', 'update', 'mutation'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: false,
  },
  compliance_report: {
    category: ToolCategory.SECURITY,
    tags: ['compliance', 'security', 'report', 'owasp', 'sans'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: false,
  },
  project_issues: {
    category: ToolCategory.CODE_QUALITY,
    tags: ['issues', 'problems', 'code', 'quality', 'list'],
    requiresAuth: true,
    supportsFiltering: true,
    supportsPagination: true,
  },
  runs: {
    category: ToolCategory.ANALYSIS,
    tags: ['runs', 'analysis', 'history', 'list'],
    requiresAuth: true,
    supportsFiltering: true,
    supportsPagination: true,
  },
  run: {
    category: ToolCategory.ANALYSIS,
    tags: ['run', 'analysis', 'details', 'single'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: false,
  },
  recent_run_issues: {
    category: ToolCategory.ANALYSIS,
    tags: ['issues', 'run', 'recent', 'branch', 'analysis'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: true,
  },
  dependency_vulnerabilities: {
    category: ToolCategory.DEPENDENCIES,
    tags: ['dependencies', 'vulnerabilities', 'security', 'cve', 'list'],
    requiresAuth: true,
    supportsFiltering: false,
    supportsPagination: true,
  },
};

/**
 * Gets tools by category
 *
 * @param category - The tool category
 * @returns Array of tool names in the category
 */
export function getToolsByCategory(category: ToolCategory): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([, metadata]) => metadata.category === category)
    .map(([name]) => name);
}

/**
 * Gets tools by tag
 *
 * @param tag - The tag to filter by
 * @returns Array of tool names with the tag
 */
export function getToolsByTag(tag: string): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([, metadata]) => metadata.tags.includes(tag))
    .map(([name]) => name);
}

/**
 * Gets paginated tools
 *
 * @returns Array of tool names that support pagination
 */
export function getPaginatedTools(): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([, metadata]) => metadata.supportsPagination)
    .map(([name]) => name);
}
