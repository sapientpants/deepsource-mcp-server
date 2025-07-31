#!/usr/bin/env node

/**
 * @fileoverview DeepSource MCP Server for integrating DeepSource with Model Context Protocol.
 * This module exports MCP server functions for DeepSource API integration.
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createLogger } from './utils/logging/logger.js';
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
} from './handlers/index.js';
import { MetricShortcode, ReportType } from './deepsource.js';
import { MetricKey } from './types/metrics.js';
import { AnalyzerShortcode } from './types/branded.js';
import { logToolInvocation, logToolResult, logAndFormatError } from './server/tool-helpers.js';

// Create logger instance for index.ts
const logger = createLogger('DeepSourceMCP:index');

// Initialize MCP server
/**
 * The main MCP server instance
 * @public
 */
export const mcpServer = new McpServer({
  name: 'deepsource-mcp-server',
  version: '1.2.0',
});

// Register the projects tool
mcpServer.registerTool(
  'projects',
  {
    description:
      'List all available DeepSource projects. Returns a list of project objects with "key" and "name" properties.',
    outputSchema: {
      projects: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
        })
      ),
    },
  },

  async (_extra) => {
    try {
      logToolInvocation('projects');

      // Call the projects handler
      const result = await handleProjects();
      logToolResult('projects', result);

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Projects handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the project array
      logger.debug('Parsing JSON result');
      const projects = JSON.parse(result.content[0].text);
      logger.info('Successfully processed projects', {
        count: projects?.length || 0,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: { projects: projects || [] },
        isError: false,
      };
    } catch (error) {
      const errorMessage = logAndFormatError(error, 'projects');
      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: { projects: [] },
        isError: true,
      };
    }
  }
);

// Register the quality_metrics tool
mcpServer.registerTool(
  'quality_metrics',
  {
    description: 'Get quality metrics from a DeepSource project with optional filtering',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to fetch quality metrics for'),
      shortcodeIn: z
        .array(z.nativeEnum(MetricShortcode))
        .optional()
        .describe('Optional filter for specific metric shortcodes'),
    },
    outputSchema: {
      metrics: z.array(
        z.object({
          name: z.string(),
          shortcode: z.string(),
          description: z.string(),
          positiveDirection: z.string(),
          unit: z.string(),
          minValueAllowed: z.number().nullable(),
          maxValueAllowed: z.number().nullable(),
          isReported: z.boolean(),
          isThresholdEnforced: z.boolean(),
          items: z.array(
            z.object({
              id: z.string(),
              key: z.string(),
              threshold: z.number().nullable(),
              latestValue: z.number().nullable(),
              latestValueDisplay: z.string().nullable(),
              thresholdStatus: z.string(),
              thresholdInfo: z
                .object({
                  difference: z.number(),
                  percentDifference: z.string(),
                  isPassing: z.boolean(),
                })
                .nullable(),
            })
          ),
        })
      ),
    },
  },
  async (params) => {
    try {
      logger.info('MCP quality_metrics tool handler invoked', { projectKey: params.projectKey });

      // Call the quality metrics handler
      const result = await handleDeepsourceQualityMetrics(params);
      logger.debug('handleDeepsourceQualityMetrics result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // Parse the JSON string to get the metrics data
      const metricsData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed quality metrics', {
        count: metricsData?.metrics?.length || 0,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: metricsData,
        isError: false,
      };
    } catch (error) {
      logger.error('Error in quality_metrics tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve quality metrics';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: { metrics: [] },
        isError: true,
      };
    }
  }
);

// Register the update_metric_threshold tool
mcpServer.registerTool(
  'update_metric_threshold',
  {
    description: 'Update the threshold for a specific quality metric',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to identify the project'),
      repositoryId: z.string().describe('Repository GraphQL ID'),
      metricShortcode: z.nativeEnum(MetricShortcode).describe('Code for the metric to update'),
      metricKey: z.string().describe('Context key for the metric'),
      thresholdValue: z
        .number()
        .nullable()
        .optional()
        .describe('New threshold value, or null to remove'),
    },
    outputSchema: {
      ok: z.boolean(),
      projectKey: z.string(),
      metricShortcode: z.string(),
      metricKey: z.string(),
      thresholdValue: z.number().nullable().optional(),
      message: z.string(),
      next_steps: z.array(z.string()),
    },
  },
  async (params) => {
    try {
      logger.info('MCP update_metric_threshold tool handler invoked', {
        projectKey: params.projectKey,
        metricShortcode: params.metricShortcode,
        metricKey: params.metricKey,
      });

      // Call the update metric threshold handler with metricKey type coercion
      const result = await handleDeepsourceUpdateMetricThreshold({
        ...params,
        metricKey: params.metricKey as MetricKey,
      });
      logger.debug('handleDeepsourceUpdateMetricThreshold result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // Parse the JSON string to get the result
      const updateResult = JSON.parse(result.content[0].text);
      logger.info('Metric threshold update result', {
        success: updateResult.ok,
        metric: `${updateResult.metricShortcode}:${updateResult.metricKey}`,
      });

      return {
        content: result.content,
        structuredContent: updateResult,
        isError: !updateResult.ok,
      };
    } catch (error) {
      logger.error('Error in update_metric_threshold tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to update metric threshold';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          ok: false,
          projectKey: params.projectKey,
          metricShortcode: params.metricShortcode,
          metricKey: params.metricKey,
          message: errorMessage,
          next_steps: ['Check your API key permissions', 'Verify input parameters'],
        },
        isError: true,
      };
    }
  }
);

// Register the update_metric_setting tool
mcpServer.registerTool(
  'update_metric_setting',
  {
    description: 'Update the settings for a quality metric',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to identify the project'),
      repositoryId: z.string().describe('Repository GraphQL ID'),
      metricShortcode: z.nativeEnum(MetricShortcode).describe('Code for the metric to update'),
      isReported: z.boolean().describe('Whether the metric should be reported'),
      isThresholdEnforced: z.boolean().describe('Whether the threshold should be enforced'),
    },
    outputSchema: {
      ok: z.boolean(),
      projectKey: z.string(),
      metricShortcode: z.string(),
      settings: z.object({
        isReported: z.boolean(),
        isThresholdEnforced: z.boolean(),
      }),
      message: z.string(),
      next_steps: z.array(z.string()),
    },
  },
  async (params) => {
    try {
      logger.info('MCP update_metric_setting tool handler invoked', {
        projectKey: params.projectKey,
        metricShortcode: params.metricShortcode,
      });

      // Call the update metric setting handler
      const result = await handleDeepsourceUpdateMetricSetting(params);
      logger.debug('handleDeepsourceUpdateMetricSetting result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // Parse the JSON string to get the result
      const updateResult = JSON.parse(result.content[0].text);
      logger.info('Metric setting update result', {
        success: updateResult.ok,
        metric: updateResult.metricShortcode,
      });

      return {
        content: result.content,
        structuredContent: updateResult,
        isError: !updateResult.ok,
      };
    } catch (error) {
      logger.error('Error in update_metric_setting tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to update metric setting';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          ok: false,
          projectKey: params.projectKey,
          metricShortcode: params.metricShortcode,
          settings: {
            isReported: params.isReported,
            isThresholdEnforced: params.isThresholdEnforced,
          },
          message: errorMessage,
          next_steps: ['Check your API key permissions', 'Verify input parameters'],
        },
        isError: true,
      };
    }
  }
);

// Register the compliance_report tool
mcpServer.registerTool(
  'compliance_report',
  {
    description: 'Get security compliance reports from a DeepSource project',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to identify the project'),
      reportType: z.nativeEnum(ReportType).describe('Type of compliance report to fetch'),
    },
    outputSchema: {
      key: z.string(),
      title: z.string(),
      currentValue: z.number().nullable(),
      status: z.string(),
      securityIssueStats: z.array(
        z.object({
          key: z.string(),
          title: z.string(),
          occurrence: z.object({
            critical: z.number(),
            major: z.number(),
            minor: z.number(),
            total: z.number(),
          }),
        })
      ),
      trends: z.record(z.string(), z.any()).optional(),
      analysis: z.object({
        summary: z.string(),
        status_explanation: z.string(),
        critical_issues: z.number(),
        major_issues: z.number(),
        minor_issues: z.number(),
        total_issues: z.number(),
      }),
      recommendations: z.object({
        actions: z.array(z.string()),
        resources: z.array(z.string()),
      }),
    },
  },
  async (params) => {
    try {
      logger.info('MCP compliance_report tool handler invoked', {
        projectKey: params.projectKey,
        reportType: params.reportType,
      });

      // Call the compliance report handler
      const result = await handleDeepsourceComplianceReport(params);
      logger.debug('handleDeepsourceComplianceReport result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // Parse the JSON string to get the report data
      const reportData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed compliance report', {
        reportType: params.reportType,
        reportTitle: reportData.title,
        status: reportData.status,
      });

      return {
        content: result.content,
        structuredContent: reportData,
        isError: false,
      };
    } catch (error) {
      logger.error('Error in compliance_report tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve compliance report';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          key: '',
          title: '',
          currentValue: null,
          status: 'ERROR',
          securityIssueStats: [],
          analysis: {
            summary: 'Error retrieving report',
            status_explanation: errorMessage,
            critical_issues: 0,
            major_issues: 0,
            minor_issues: 0,
            total_issues: 0,
          },
          recommendations: {
            actions: ['Check your API key permissions', 'Verify input parameters'],
            resources: [],
          },
        },
        isError: true,
      };
    }
  }
);

// Register the project_issues tool
mcpServer.registerTool(
  'project_issues',
  {
    description: 'Get issues from a DeepSource project with filtering capabilities',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to fetch issues for'),
      path: z.string().optional().describe('Filter issues by file path'),
      analyzerIn: z.array(z.string()).optional().describe('Filter issues by analyzer shortcodes'),
      tags: z.array(z.string()).optional().describe('Filter issues by tags'),
      first: z.number().optional().describe('Number of items to retrieve (forward pagination)'),
      after: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items after (forward pagination)'),
      last: z.number().optional().describe('Number of items to retrieve (backward pagination)'),
      before: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items before (backward pagination)'),
    },
    outputSchema: {
      issues: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          shortcode: z.string(),
          category: z.string(),
          severity: z.string(),
          status: z.string(),
          issue_text: z.string(),
          file_path: z.string(),
          line_number: z.number(),
          tags: z.array(z.string()),
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string().nullable(),
        endCursor: z.string().nullable(),
      }),
      totalCount: z.number(),
    },
  },
  async (params) => {
    try {
      logger.info('MCP project_issues tool handler invoked', {
        projectKey: params.projectKey,
        hasPathFilter: Boolean(params.path),
        hasAnalyzerInFilter: Boolean(params.analyzerIn),
        hasTagsFilter: Boolean(params.tags),
      });

      // Call the project issues handler
      const result = await handleDeepsourceProjectIssues(params);
      logger.debug('handleDeepsourceProjectIssues result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Project issues handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the issues data
      const issuesData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed project issues', {
        count: issuesData?.issues?.length || 0,
        totalCount: issuesData?.totalCount || 0,
        hasNextPage: issuesData?.pageInfo?.hasNextPage || false,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: {
          issues: issuesData.issues,
          pageInfo: issuesData.pageInfo,
          totalCount: issuesData.totalCount,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in project_issues tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve project issues';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          issues: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        },
        isError: true,
      };
    }
  }
);

// Register the runs tool
mcpServer.registerTool(
  'runs',
  {
    description: 'List analysis runs for a DeepSource project with filtering',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to fetch runs for'),
      analyzerIn: z.array(z.string()).optional().describe('Filter runs by analyzer shortcodes'),
      first: z.number().optional().describe('Number of items to retrieve (forward pagination)'),
      after: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items after (forward pagination)'),
      last: z.number().optional().describe('Number of items to retrieve (backward pagination)'),
      before: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items before (backward pagination)'),
    },
    outputSchema: {
      runs: z.array(
        z.object({
          id: z.string(),
          runUid: z.string(),
          commitOid: z.string(),
          branchName: z.string(),
          baseOid: z.string(),
          status: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          finishedAt: z.string().optional(),
          summary: z.object({
            occurrencesIntroduced: z.number(),
            occurrencesResolved: z.number(),
            occurrencesSuppressed: z.number(),
            occurrenceDistributionByAnalyzer: z
              .array(
                z.object({
                  analyzerShortcode: z.string(),
                  introduced: z.number(),
                })
              )
              .optional(),
            occurrenceDistributionByCategory: z
              .array(
                z.object({
                  category: z.string(),
                  introduced: z.number(),
                })
              )
              .optional(),
          }),
          repository: z.object({
            name: z.string(),
            id: z.string(),
          }),
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string().nullable(),
        endCursor: z.string().nullable(),
      }),
      totalCount: z.number(),
    },
  },
  async (params) => {
    try {
      logger.info('MCP runs tool handler invoked', {
        projectKey: params.projectKey,
        hasAnalyzerInFilter: Boolean(params.analyzerIn),
      });

      // Call the project runs handler with proper type assertion for analyzerIn
      const result = await handleDeepsourceProjectRuns({
        ...params,
        analyzerIn: params.analyzerIn as AnalyzerShortcode[],
      });
      logger.debug('handleDeepsourceProjectRuns result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Project runs handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the runs data
      const runsData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed project runs', {
        count: runsData?.runs?.length || 0,
        totalCount: runsData?.totalCount || 0,
        hasNextPage: runsData?.pageInfo?.hasNextPage || false,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: {
          runs: runsData.runs,
          pageInfo: runsData.pageInfo,
          totalCount: runsData.totalCount,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in runs tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve project runs';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          runs: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        },
        isError: true,
      };
    }
  }
);

// Register the run tool
mcpServer.registerTool(
  'run',
  {
    description: 'Get a specific analysis run by its runUid or commitOid',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to identify the project'),
      runIdentifier: z.string().describe('The run identifier (runUid or commitOid)'),
      isCommitOid: z
        .boolean()
        .optional()
        .describe('Flag to indicate whether the runIdentifier is a commitOid (default: false)'),
    },
    outputSchema: {
      run: z.object({
        id: z.string(),
        runUid: z.string(),
        commitOid: z.string(),
        branchName: z.string(),
        baseOid: z.string(),
        status: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        finishedAt: z.string().optional(),
        summary: z.object({
          occurrencesIntroduced: z.number(),
          occurrencesResolved: z.number(),
          occurrencesSuppressed: z.number(),
          occurrenceDistributionByAnalyzer: z
            .array(
              z.object({
                analyzerShortcode: z.string(),
                introduced: z.number(),
              })
            )
            .optional(),
          occurrenceDistributionByCategory: z
            .array(
              z.object({
                category: z.string(),
                introduced: z.number(),
              })
            )
            .optional(),
        }),
        repository: z.object({
          name: z.string(),
          id: z.string(),
        }),
      }),
      analysis: z.object({
        status_info: z.string(),
        issue_summary: z.string(),
        analyzers_used: z.array(z.string()),
        issue_categories: z.array(z.string()),
      }),
    },
  },
  async (params) => {
    try {
      logger.info('MCP run tool handler invoked', {
        projectKey: params.projectKey,
        runIdentifier: params.runIdentifier,
        isCommitOid: params.isCommitOid,
      });

      // Call the run handler
      const result = await handleDeepsourceRun(params);
      logger.debug('handleDeepsourceRun result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Run handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the run data
      const runData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed run', {
        runUid: runData?.run?.runUid,
        commitOid: runData?.run?.commitOid,
        branchName: runData?.run?.branchName,
        status: runData?.run?.status,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: {
          run: runData.run,
          analysis: runData.analysis,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in run tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve run';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          run: {
            id: '',
            runUid: '',
            commitOid: '',
            branchName: '',
            baseOid: '',
            status: 'ERROR',
            createdAt: '',
            updatedAt: '',
            summary: {
              occurrencesIntroduced: 0,
              occurrencesResolved: 0,
              occurrencesSuppressed: 0,
            },
            repository: {
              name: '',
              id: '',
            },
          },
          analysis: {
            status_info: errorMessage,
            issue_summary: 'No data available',
            analyzers_used: [],
            issue_categories: [],
          },
        },
        isError: true,
      };
    }
  }
);

// Register the recent_run_issues tool
mcpServer.registerTool(
  'recent_run_issues',
  {
    description: 'Get issues from the most recent analysis run on a specific branch',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to fetch issues for'),
      branchName: z.string().describe('Branch name to fetch the most recent run from'),
      first: z.number().optional().describe('Number of items to retrieve (forward pagination)'),
      after: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items after (forward pagination)'),
      last: z.number().optional().describe('Number of items to retrieve (backward pagination)'),
      before: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items before (backward pagination)'),
    },
    outputSchema: {
      run: z.object({
        id: z.string(),
        runUid: z.string(),
        commitOid: z.string(),
        branchName: z.string(),
        baseOid: z.string(),
        status: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        finishedAt: z.string().optional(),
        summary: z.object({
          occurrencesIntroduced: z.number(),
          occurrencesResolved: z.number(),
          occurrencesSuppressed: z.number(),
          occurrenceDistributionByAnalyzer: z
            .array(
              z.object({
                analyzerShortcode: z.string(),
                introduced: z.number(),
              })
            )
            .optional(),
          occurrenceDistributionByCategory: z
            .array(
              z.object({
                category: z.string(),
                introduced: z.number(),
              })
            )
            .optional(),
        }),
        repository: z.object({
          name: z.string(),
          id: z.string(),
        }),
      }),
      issues: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          shortcode: z.string(),
          category: z.string(),
          severity: z.string(),
          status: z.string(),
          issue_text: z.string(),
          file_path: z.string(),
          line_number: z.number(),
          tags: z.array(z.string()),
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string().nullable(),
        endCursor: z.string().nullable(),
      }),
      totalCount: z.number(),
    },
  },
  async (params) => {
    try {
      logger.info('MCP recent_run_issues tool handler invoked', {
        projectKey: params.projectKey,
        branchName: params.branchName,
      });

      // Call the recent run issues handler
      const result = await handleDeepsourceRecentRunIssues(params);
      logger.debug('handleDeepsourceRecentRunIssues result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Recent run issues handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the issues and run data
      const data = JSON.parse(result.content[0].text);
      logger.info('Successfully processed recent run issues', {
        runUid: data?.run?.runUid,
        branchName: data?.run?.branchName,
        issueCount: data?.issues?.length || 0,
        totalCount: data?.totalCount || 0,
        hasNextPage: data?.pageInfo?.hasNextPage || false,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: {
          run: data.run,
          issues: data.issues,
          pageInfo: data.pageInfo,
          totalCount: data.totalCount,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in recent_run_issues tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve recent run issues';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          run: {
            id: '',
            runUid: '',
            commitOid: '',
            branchName: params.branchName || '',
            baseOid: '',
            status: 'ERROR',
            createdAt: '',
            updatedAt: '',
            summary: {
              occurrencesIntroduced: 0,
              occurrencesResolved: 0,
              occurrencesSuppressed: 0,
            },
            repository: {
              name: '',
              id: '',
            },
          },
          issues: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        },
        isError: true,
      };
    }
  }
);

// Register the dependency_vulnerabilities tool
mcpServer.registerTool(
  'dependency_vulnerabilities',
  {
    description: 'Get dependency vulnerabilities from a DeepSource project',
    inputSchema: {
      projectKey: z.string().describe('DeepSource project key to fetch vulnerabilities for'),
      first: z.number().optional().describe('Number of items to retrieve (forward pagination)'),
      after: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items after (forward pagination)'),
      last: z.number().optional().describe('Number of items to retrieve (backward pagination)'),
      before: z
        .string()
        .optional()
        .describe('Cursor to start retrieving items before (backward pagination)'),
    },
    outputSchema: {
      vulnerabilities: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          severity: z.string(),
          cvssScore: z.number().nullable(),
          packageName: z.string(),
          packageVersion: z.string(),
          fixedIn: z.string().nullable(),
          description: z.string(),
          identifiers: z.record(z.string(), z.array(z.string())),
          references: z.array(z.string()),
          risk_assessment: z.object({
            severity_level: z.string(),
            cvss_description: z.string(),
            fixed_version_available: z.boolean(),
            remediation_advice: z.string(),
          }),
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        hasPreviousPage: z.boolean(),
        startCursor: z.string().nullable(),
        endCursor: z.string().nullable(),
      }),
      totalCount: z.number(),
    },
  },
  async (params) => {
    try {
      logger.info('MCP dependency_vulnerabilities tool handler invoked', {
        projectKey: params.projectKey,
      });

      // Call the dependency vulnerabilities handler
      const result = await handleDeepsourceDependencyVulnerabilities(params);
      logger.debug('handleDeepsourceDependencyVulnerabilities result received', {
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: `${result.content?.[0]?.text?.substring(0, 50)}...`,
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Dependency vulnerabilities handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the vulnerabilities data
      const vulnerabilitiesData = JSON.parse(result.content[0].text);
      logger.info('Successfully processed dependency vulnerabilities', {
        count: vulnerabilitiesData?.vulnerabilities?.length || 0,
        totalCount: vulnerabilitiesData?.totalCount || 0,
        hasNextPage: vulnerabilitiesData?.pageInfo?.hasNextPage || false,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: {
          vulnerabilities: vulnerabilitiesData.vulnerabilities,
          pageInfo: vulnerabilitiesData.pageInfo,
          totalCount: vulnerabilitiesData.totalCount,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in dependency_vulnerabilities tool handler', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      let errorMessage = 'Failed to retrieve dependency vulnerabilities';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        structuredContent: {
          vulnerabilities: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        },
        isError: true,
      };
    }
  }
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  logger.info('Starting MCP server...');
  await mcpServer.connect(transport);
  logger.info('MCP server started successfully');
}
