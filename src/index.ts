#!/usr/bin/env node

/**
 * @fileoverview DeepSource MCP Server for integrating DeepSource with Model Context Protocol.
 * This module exports MCP server functions for DeepSource API integration.
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeepSourceClient, ReportType, ReportStatus } from './deepsource.js';
import { MetricShortcode, MetricKey, MetricThresholdStatus } from './types/metrics.js';
import { z } from 'zod';

// Initialize MCP server
/**
 * The main MCP server instance
 * @public
 */
export const mcpServer = new McpServer({
  name: 'deepsource-mcp-server',
  version: '1.0.3',
});

// Export handler functions for testing
/**
 * Fetches and returns a list of all available DeepSource projects
 * @returns A response containing the list of projects with their keys and names
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjects() {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const projects = await client.listProjects();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          projects.map((project) => ({
            key: project.key,
            name: project.name,
          }))
        ),
      },
    ],
  };
}

/**
 * Interface for pagination parameters for DeepSource project issues
 * @public
 */
export interface DeepsourceProjectIssuesParams {
  /** DeepSource project key to fetch issues for */
  projectKey: string;
  /** Legacy pagination: Number of items to skip */
  offset?: number;
  /** Relay-style pagination: Number of items to return after the 'after' cursor */
  first?: number;
  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;
  /** Relay-style pagination: Number of items to return before the 'before' cursor */
  last?: number;
  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
  /** Filter issues by file path */
  path?: string;
  /** Filter issues by analyzer shortcodes */
  analyzerIn?: string[];
  /** Filter issues by tags */
  tags?: string[];
}

/**
 * Fetches and returns issues from a specified DeepSource project
 * @param params Parameters for fetching issues, including project key and pagination options
 * @returns A response containing the list of issues with their details and pagination info
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectIssues({
  projectKey,
  offset,
  first,
  after,
  before,
  last,
  path,
  analyzerIn,
  tags,
}: DeepsourceProjectIssuesParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const params = {
    offset,
    first,
    after,
    before,
    last,
    path,
    analyzerIn,
    tags,
  };
  const result = await client.getIssues(projectKey, params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          items: result.items.map((issue) => ({
            id: issue.id,
            title: issue.title,
            shortcode: issue.shortcode,
            category: issue.category,
            severity: issue.severity,
            status: issue.status,
            issue_text: issue.issue_text,
            file_path: issue.file_path,
            line_number: issue.line_number,
            tags: issue.tags,
          })),
          pageInfo: result.pageInfo,
          totalCount: result.totalCount,
          // Add pagination help information
          pagination_help: {
            description: 'This API uses Relay-style cursor-based pagination',
            forward_pagination: `To get the next page, use 'first: 10, after: "${result.pageInfo.endCursor || 'cursor_value'}"'`,
            backward_pagination: `To get the previous page, use 'last: 10, before: "${result.pageInfo.startCursor || 'cursor_value'}"'`,
            page_status: {
              has_next_page: result.pageInfo.hasNextPage,
              has_previous_page: result.pageInfo.hasPreviousPage,
            },
          },
        }),
      },
    ],
  };
}

/**
 * Interface for pagination parameters for DeepSource project runs
 * @public
 */
export interface DeepsourceProjectRunsParams {
  /** DeepSource project key to fetch runs for */
  projectKey: string;
  /** Legacy pagination: Number of items to skip */
  offset?: number;
  /** Relay-style pagination: Number of items to return after the 'after' cursor */
  first?: number;
  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;
  /** Relay-style pagination: Number of items to return before the 'before' cursor */
  last?: number;
  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
  /** Filter runs by analyzer shortcodes */
  analyzerIn?: string[];
}

/**
 * Fetches and returns analysis runs for a specified DeepSource project
 * @param params Parameters for fetching runs, including project key and pagination options
 * @returns A response containing the list of runs with their details and pagination info
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceProjectRuns({
  projectKey,
  offset,
  first,
  after,
  before,
  last,
  analyzerIn,
}: DeepsourceProjectRunsParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const params = {
    offset,
    first,
    after,
    before,
    last,
    analyzerIn,
  };
  const result = await client.listRuns(projectKey, params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          items: result.items.map((run) => ({
            id: run.id,
            runUid: run.runUid,
            commitOid: run.commitOid,
            branchName: run.branchName,
            baseOid: run.baseOid,
            status: run.status,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            finishedAt: run.finishedAt,
            summary: run.summary,
            repository: run.repository,
          })),
          pageInfo: result.pageInfo,
          totalCount: result.totalCount,
          // Add pagination help information
          pagination_help: {
            description: 'This API uses Relay-style cursor-based pagination',
            forward_pagination: `To get the next page, use 'first: 10, after: "${result.pageInfo.endCursor || 'cursor_value'}"'`,
            backward_pagination: `To get the previous page, use 'last: 10, before: "${result.pageInfo.startCursor || 'cursor_value'}"'`,
            page_status: {
              has_next_page: result.pageInfo.hasNextPage,
              has_previous_page: result.pageInfo.hasPreviousPage,
            },
          },
        }),
      },
    ],
  };
}

/**
 * Interface for parameters for fetching a specific DeepSource run
 * @public
 */
export interface DeepsourceRunParams {
  /** The runUid or commitOid to identify the run */
  runIdentifier: string;
}

/**
 * Interface for parameters used to fetch dependency vulnerabilities from a DeepSource project
 *
 * This interface supports both pagination approaches:
 * 1. Legacy offset-based pagination: Use `offset` parameter
 * 2. Relay-style cursor-based pagination:
 *    - For forward pagination: Use `first` with optional `after` cursor
 *    - For backward pagination: Use `last` with optional `before` cursor
 *
 * Best practices:
 * - Prefer Relay-style pagination when possible
 * - Don't mix offset-based and cursor-based pagination in the same call
 * - When using cursor-based pagination, include both the count and cursor parameters
 *
 * @public
 */
export interface DeepsourceDependencyVulnerabilitiesParams {
  /** DeepSource project key to fetch dependency vulnerabilities for (required) */
  projectKey: string;

  /** Legacy pagination: Number of items to skip */
  offset?: number;

  /** Relay-style pagination: Number of items to return after the 'after' cursor (default: 10) */
  first?: number;

  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;

  /** Relay-style pagination: Number of items to return before the 'before' cursor (default: 10) */
  last?: number;

  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
}

/**
 * Fetches and returns a specific analysis run from DeepSource by ID or commit hash
 * @param params Parameters for fetching a run, including the runIdentifier
 * @returns A response containing the run details if found
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the run is not found
 * @public
 */
export async function handleDeepsourceRun({ runIdentifier }: DeepsourceRunParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const run = await client.getRun(runIdentifier);

  if (!run) {
    throw new Error(`Run with identifier '${runIdentifier}' not found`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          id: run.id,
          runUid: run.runUid,
          commitOid: run.commitOid,
          branchName: run.branchName,
          baseOid: run.baseOid,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          finishedAt: run.finishedAt,
          summary: run.summary,
          repository: run.repository,
        }),
      },
    ],
  };
}

/**
 * Formats CVSS information into a consistent structure
 * Helper function to standardize CVSS data formatting across different versions
 *
 * @param baseScore The CVSS base score
 * @param vector The CVSS vector string
 * @param severity The CVSS severity rating
 * @returns Formatted CVSS information object or undefined if no base score is provided
 * @private
 */
function formatCvssInfo(
  baseScore: number | null | undefined,
  vector: string | null | undefined,
  severity: string | null | undefined
) {
  if (baseScore === null || baseScore === undefined) {
    return undefined;
  }

  return {
    baseScore,
    vector: vector ?? undefined,
    severity: severity ?? undefined,
  };
}

/**
 * Fetches and returns dependency vulnerabilities from a specified DeepSource project
 *
 * This handler provides access to DeepSource's dependency vulnerability data,
 * allowing AI assistants to retrieve information about security vulnerabilities
 * in a project's dependencies.
 *
 * @param params Parameters containing the project key and pagination options
 * @returns A response containing the list of dependency vulnerabilities with detailed information
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the API request fails
 */
export async function handleDeepsourceDependencyVulnerabilities({
  projectKey,
  offset,
  first,
  after,
  before,
  last,
}: DeepsourceDependencyVulnerabilitiesParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  // Create pagination parameters object
  const params = {
    offset,
    first,
    after,
    before,
    last,
  };
  const result = await client.getDependencyVulnerabilities(projectKey, params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            items: result.items.map((vuln) => ({
              id: vuln.id,

              // Package information - more concise and consistent
              package: {
                name: vuln.package.name,
                ecosystem: vuln.package.ecosystem,
                ...(vuln.package.purl && { purl: vuln.package.purl }),
              },

              // Package version information - more concise and consistent
              packageVersion: {
                version: vuln.packageVersion.version,
                ...(vuln.packageVersion.versionType && {
                  versionType: vuln.packageVersion.versionType,
                }),
              },

              // Vulnerability details - better organized and more consistent
              vulnerability: {
                identifier: vuln.vulnerability.identifier,
                ...(vuln.vulnerability.aliases?.length > 0 && {
                  aliases: vuln.vulnerability.aliases,
                }),
                ...(vuln.vulnerability.summary && { summary: vuln.vulnerability.summary }),
                ...(vuln.vulnerability.details && { details: vuln.vulnerability.details }),
                severity: vuln.vulnerability.severity,

                // CVSS information - use helper function for consistency
                ...(formatCvssInfo(
                  vuln.vulnerability.cvssV2BaseScore,
                  vuln.vulnerability.cvssV2Vector,
                  vuln.vulnerability.cvssV2Severity
                ) && {
                  cvssV2: formatCvssInfo(
                    vuln.vulnerability.cvssV2BaseScore,
                    vuln.vulnerability.cvssV2Vector,
                    vuln.vulnerability.cvssV2Severity
                  ),
                }),

                ...(formatCvssInfo(
                  vuln.vulnerability.cvssV3BaseScore,
                  vuln.vulnerability.cvssV3Vector,
                  vuln.vulnerability.cvssV3Severity
                ) && {
                  cvssV3: formatCvssInfo(
                    vuln.vulnerability.cvssV3BaseScore,
                    vuln.vulnerability.cvssV3Vector,
                    vuln.vulnerability.cvssV3Severity
                  ),
                }),

                ...(formatCvssInfo(
                  vuln.vulnerability.cvssV4BaseScore,
                  vuln.vulnerability.cvssV4Vector,
                  vuln.vulnerability.cvssV4Severity
                ) && {
                  cvssV4: formatCvssInfo(
                    vuln.vulnerability.cvssV4BaseScore,
                    vuln.vulnerability.cvssV4Vector,
                    vuln.vulnerability.cvssV4Severity
                  ),
                }),

                // Include EPSS scores if available
                ...(vuln.vulnerability.epssScore != null && {
                  epssScore: vuln.vulnerability.epssScore,
                }),
                ...(vuln.vulnerability.epssPercentile != null && {
                  epssPercentile: vuln.vulnerability.epssPercentile,
                }),

                // Dates
                publishedAt: vuln.vulnerability.publishedAt,
                updatedAt: vuln.vulnerability.updatedAt,
                ...(vuln.vulnerability.withdrawnAt && {
                  withdrawnAt: vuln.vulnerability.withdrawnAt,
                }),

                // Version information
                introducedVersions: vuln.vulnerability.introducedVersions,
                fixedVersions: vuln.vulnerability.fixedVersions,

                // References
                referenceUrls: vuln.vulnerability.referenceUrls,
              },

              // Reachability and fixability information - clear and consistent
              reachability: vuln.reachability,
              fixability: vuln.fixability,
            })),

            // Pagination information
            pageInfo: result.pageInfo,
            totalCount: result.totalCount,

            // Enhanced pagination help with more details and examples
            pagination_help: {
              description:
                'This API uses Relay-style cursor-based pagination for efficient data retrieval',
              current_page: {
                size: result.items.length,
                has_next_page: result.pageInfo.hasNextPage,
                has_previous_page: result.pageInfo.hasPreviousPage,
              },
              next_page: result.pageInfo.hasNextPage
                ? {
                    example: `{"first": 10, "after": "${result.pageInfo.endCursor}"}`,
                    description: 'Use these parameters to fetch the next page of results',
                  }
                : null,
              previous_page: result.pageInfo.hasPreviousPage
                ? {
                    example: `{"last": 10, "before": "${result.pageInfo.startCursor}"}`,
                    description: 'Use these parameters to fetch the previous page of results',
                  }
                : null,
              pagination_types: {
                forward: 'For forward pagination, use "first" with optional "after" cursor',
                backward: 'For backward pagination, use "last" with optional "before" cursor',
                legacy:
                  'Legacy offset-based pagination is also supported via the "offset" parameter',
              },
            },
          },
          null,
          2
        ), // Pretty print JSON for better readability in tools
      },
    ],
  };
}

/**
 * Interface for parameters for fetching quality metrics
 * @public
 */
export interface DeepsourceQualityMetricsParams {
  /** DeepSource project key to fetch quality metrics for */
  projectKey: string;
  /** Optional filter for specific metric shortcodes */
  shortcodeIn?: MetricShortcode[];
}

/**
 * Interface for parameters for updating a metric threshold
 * @public
 */
export interface DeepsourceUpdateMetricThresholdParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
  /** Repository GraphQL ID */
  repositoryId: string;
  /** Code for the metric to update */
  metricShortcode: MetricShortcode;
  /** Context key for the metric */
  metricKey: MetricKey;
  /** New threshold value, or null to remove */
  thresholdValue?: number | null;
}

/**
 * Interface for parameters for updating metric settings
 * @public
 */
export interface DeepsourceUpdateMetricSettingParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
  /** Repository GraphQL ID */
  repositoryId: string;
  /** Code for the metric to update */
  metricShortcode: MetricShortcode;
  /** Whether the metric should be reported */
  isReported: boolean;
  /** Whether the threshold should be enforced */
  isThresholdEnforced: boolean;
}

/**
 * Interface for parameters for getting a compliance report
 * @public
 */
export interface DeepsourceComplianceReportParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
  /** Type of compliance report to fetch */
  reportType: ReportType;
}

/**
 * Fetches and returns quality metrics from a specified DeepSource project
 * @param params - Parameters for fetching metrics, including project key and optional filters
 * @returns A response containing the metrics data with their values and thresholds
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceQualityMetrics({
  projectKey,
  shortcodeIn,
}: DeepsourceQualityMetricsParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const metrics = await client.getQualityMetrics(projectKey, { shortcodeIn });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            metrics: metrics.map((metric) => ({
              name: metric.name,
              shortcode: metric.shortcode,
              description: metric.description,
              positiveDirection: metric.positiveDirection,
              unit: metric.unit,
              minValueAllowed: metric.minValueAllowed,
              maxValueAllowed: metric.maxValueAllowed,
              isReported: metric.isReported,
              isThresholdEnforced: metric.isThresholdEnforced,
              items: metric.items.map((item) => ({
                id: item.id,
                key: item.key,
                threshold: item.threshold,
                latestValue: item.latestValue,
                latestValueDisplay: item.latestValueDisplay,
                thresholdStatus: item.thresholdStatus,
                // Add helpful metadata for threshold values
                thresholdInfo:
                  item.threshold !== null &&
                  item.threshold !== undefined &&
                  item.latestValue !== null &&
                  item.latestValue !== undefined
                    ? {
                        difference: item.latestValue - item.threshold,
                        percentDifference:
                          item.threshold !== 0
                            ? `${(
                                ((item.latestValue - item.threshold) / item.threshold) *
                                100
                              ).toFixed(2)}%`
                            : 'N/A',
                        isPassing: item.thresholdStatus === MetricThresholdStatus.PASSING,
                      }
                    : null,
              })),
            })),
            // Add helpful examples for threshold management
            usage_examples: {
              filtering:
                'To filter metrics by type, use the shortcodeIn parameter with specific metric codes (e.g., ["LCV", "BCV"])',
              updating_threshold:
                'To update a threshold, use the deepsource_update_metric_threshold tool',
              updating_settings:
                'To update metric settings (e.g., enable reporting or threshold enforcement), use the deepsource_update_metric_setting tool',
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Updates the threshold for a specific metric in a project
 * @param params - Parameters for updating the threshold
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricThreshold({
  projectKey,
  repositoryId,
  metricShortcode,
  metricKey,
  thresholdValue,
}: DeepsourceUpdateMetricThresholdParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const result = await client.setMetricThreshold({
    repositoryId,
    metricShortcode,
    metricKey,
    thresholdValue: thresholdValue ?? null,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: result.ok,
            projectKey, // Echo back the project key for context
            metricShortcode,
            metricKey,
            thresholdValue,
            message: result.ok
              ? `Successfully ${thresholdValue !== null && thresholdValue !== undefined ? 'updated' : 'removed'} threshold for ${metricShortcode} (${metricKey})`
              : `Failed to update threshold for ${metricShortcode} (${metricKey})`,
            next_steps: result.ok
              ? ['Use deepsource_quality_metrics to view the updated metrics']
              : ['Check if you have sufficient permissions', 'Verify the repository ID is correct'],
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Updates the settings for a specific metric in a project
 * @param params - Parameters for updating the metric settings
 * @returns A response indicating whether the update was successful
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceUpdateMetricSetting({
  projectKey,
  repositoryId,
  metricShortcode,
  isReported,
  isThresholdEnforced,
}: DeepsourceUpdateMetricSettingParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const result = await client.updateMetricSetting({
    repositoryId,
    metricShortcode,
    isReported,
    isThresholdEnforced,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: result.ok,
            projectKey, // Echo back the project key for context
            metricShortcode,
            settings: {
              isReported,
              isThresholdEnforced,
            },
            message: result.ok
              ? `Successfully updated settings for ${metricShortcode}`
              : `Failed to update settings for ${metricShortcode}`,
            next_steps: result.ok
              ? ['Use deepsource_quality_metrics to view the updated metrics']
              : ['Check if you have sufficient permissions', 'Verify the repository ID is correct'],
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Fetches and returns compliance reports from a DeepSource project
 * @param params - Parameters for fetching the compliance report, including project key and report type
 * @returns Response containing the compliance report with security issues statistics
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the report type is unsupported
 * @public
 */
export async function handleDeepsourceComplianceReport({
  projectKey,
  reportType,
}: DeepsourceComplianceReportParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const report = await client.getComplianceReport(projectKey, reportType);

  if (!report) {
    throw new Error(`Report of type '${reportType}' not found for project '${projectKey}'`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            key: report.key,
            title: report.title,
            currentValue: report.currentValue,
            status: report.status,
            securityIssueStats: report.securityIssueStats.map((stat) => ({
              key: stat.key,
              title: stat.title,
              occurrence: {
                critical: stat.occurrence.critical,
                major: stat.occurrence.major,
                minor: stat.occurrence.minor,
                total: stat.occurrence.total,
              },
            })),
            trends: report.trends,
            // Include helpful analysis of the report
            analysis: {
              summary: `This report shows compliance with ${report.title} security standards.`,
              status_explanation:
                report.status === ReportStatus.PASSING
                  ? 'Your project is currently meeting all required security standards.'
                  : report.status === ReportStatus.FAILING
                    ? 'Your project has security issues that need to be addressed to meet compliance standards.'
                    : 'This report is not applicable to your project.',
              critical_issues: report.securityIssueStats.reduce(
                (total, stat) => total + (stat.occurrence.critical || 0),
                0
              ),
              major_issues: report.securityIssueStats.reduce(
                (total, stat) => total + (stat.occurrence.major || 0),
                0
              ),
              minor_issues: report.securityIssueStats.reduce(
                (total, stat) => total + (stat.occurrence.minor || 0),
                0
              ),
              total_issues: report.securityIssueStats.reduce(
                (total, stat) => total + (stat.occurrence.total || 0),
                0
              ),
            },
            // Include recommendations based on the report
            recommendations: {
              actions:
                report.status === ReportStatus.FAILING
                  ? [
                      'Fix critical security issues first',
                      'Use deepsource_project_issues to view specific issues',
                      'Implement security best practices for your codebase',
                    ]
                  : ['Continue monitoring security compliance', 'Run regular security scans'],
              resources: [
                reportType === ReportType.OWASP_TOP_10
                  ? 'OWASP Top 10: https://owasp.org/www-project-top-ten/'
                  : reportType === ReportType.SANS_TOP_25
                    ? 'SANS Top 25: https://www.sans.org/top25-software-errors/'
                    : reportType === ReportType.MISRA_C
                      ? 'MISRA-C: https://www.misra.org.uk/'
                      : 'Security best practices for your project',
              ],
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

// Register the tools with the handlers
mcpServer.tool(
  'deepsource_projects',
  'List all available DeepSource projects. Returns a list of project objects with "key" and "name" properties.',
  handleDeepsourceProjects
);

mcpServer.tool(
  'deepsource_project_issues',
  `Get issues from a DeepSource project with support for Relay-style cursor-based pagination and filtering.
For forward pagination, use \`first\` (defaults to 10) with optional \`after\` cursor.
For backward pagination, use \`last\` (defaults to 10) with optional \`before\` cursor.
The response includes \`pageInfo\` with \`hasNextPage\`, \`hasPreviousPage\`, \`startCursor\`, and \`endCursor\`
to help navigate through pages.

Filtering options:
- \`path\`: Filter issues by specific file path
- \`analyzerIn\`: Filter issues by specific analyzers
- \`tags\`: Filter issues by tags`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    offset: z.number().optional().describe('Legacy pagination: Number of items to skip'),
    first: z
      .number()
      .optional()
      .describe('Number of items to return after the "after" cursor (default: 10)'),
    after: z.string().optional().describe('Cursor to fetch records after this position'),
    before: z.string().optional().describe('Cursor to fetch records before this position'),
    last: z
      .number()
      .optional()
      .describe('Number of items to return before the "before" cursor (default: 10)'),
    path: z.string().optional().describe('Filter issues by specific file path'),
    analyzerIn: z
      .array(z.string())
      .optional()
      .describe('Filter issues by specific analyzers (e.g. ["python", "javascript"])'),
    tags: z.array(z.string()).optional().describe('Filter issues by tags'),
  },
  handleDeepsourceProjectIssues
);

mcpServer.tool(
  'deepsource_project_runs',
  `List analysis runs for a DeepSource project with support for Relay-style cursor-based pagination and filtering.
For forward pagination, use \`first\` (defaults to 10) with optional \`after\` cursor.
For backward pagination, use \`last\` (defaults to 10) with optional \`before\` cursor.
The response includes \`pageInfo\` with \`hasNextPage\`, \`hasPreviousPage\`, \`startCursor\`, and \`endCursor\`
to help navigate through pages.

Filtering options:
- \`analyzerIn\`: Filter runs by specific analyzers`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    offset: z.number().optional().describe('Legacy pagination: Number of items to skip'),
    first: z
      .number()
      .optional()
      .describe('Number of items to return after the "after" cursor (default: 10)'),
    after: z.string().optional().describe('Cursor to fetch records after this position'),
    before: z.string().optional().describe('Cursor to fetch records before this position'),
    last: z
      .number()
      .optional()
      .describe('Number of items to return before the "before" cursor (default: 10)'),
    analyzerIn: z
      .array(z.string())
      .optional()
      .describe('Filter runs by specific analyzers (e.g. ["python", "javascript"])'),
  },
  handleDeepsourceProjectRuns
);

mcpServer.tool(
  'deepsource_run',
  'Get a specific analysis run by its runUid (UUID) or commitOid (commit hash).',
  {
    runIdentifier: z
      .string()
      .describe('The runUid (UUID) or commitOid (commit hash) to identify the run'),
  },
  handleDeepsourceRun
);

mcpServer.tool(
  'deepsource_dependency_vulnerabilities',
  `Get dependency vulnerabilities from a DeepSource project with support for Relay-style cursor-based pagination.
For forward pagination, use \`first\` (defaults to 10) with optional \`after\` cursor.
For backward pagination, use \`last\` (defaults to 10) with optional \`before\` cursor.
The response includes \`pageInfo\` with \`hasNextPage\`, \`hasPreviousPage\`, \`startCursor\`, and \`endCursor\`
to help navigate through pages.

The response provides detailed information about each vulnerability, including:
- Package information (name, ecosystem, purl)
- Package version details
- Vulnerability details (identifiers, severity, CVSS scores)
- Reachability status (whether the vulnerability is reachable in the code)
- Fixability information (whether and how the vulnerability can be fixed)`,
  {
    projectKey: z
      .string()
      .min(1, { message: 'Project key cannot be empty' })
      .describe('The unique identifier for the DeepSource project'),
    offset: z
      .number()
      .int({ message: 'Offset must be an integer' })
      .nonnegative({ message: 'Offset must be non-negative' })
      .optional()
      .describe('Legacy pagination: Number of items to skip'),
    first: z
      .number()
      .int({ message: 'First must be an integer' })
      .positive({ message: 'First must be positive' })
      .optional()
      .describe('Number of items to return after the "after" cursor (default: 10)'),
    after: z.string().optional().describe('Cursor to fetch records after this position'),
    before: z.string().optional().describe('Cursor to fetch records before this position'),
    last: z
      .number()
      .int({ message: 'Last must be an integer' })
      .positive({ message: 'Last must be positive' })
      .optional()
      .describe('Number of items to return before the "before" cursor (default: 10)'),
  },
  handleDeepsourceDependencyVulnerabilities
);

// Register quality metrics tools
mcpServer.tool(
  'deepsource_quality_metrics',
  `Get quality metrics from a DeepSource project with optional filtering by metric type.
  
  Metrics include code coverage, duplicate code percentage, and more, along with their:
  - Current values
  - Threshold settings
  - Pass/fail status
  - Configuration status (reporting and enforcement)

  For each metric, detailed information is provided for different programming languages
  and the aggregated metrics for the entire repository.`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    shortcodeIn: z
      .array(z.nativeEnum(MetricShortcode))
      .optional()
      .describe('Filter metrics by specific shortcodes (e.g., ["LCV", "BCV"])'),
  },
  handleDeepsourceQualityMetrics
);

mcpServer.tool(
  'deepsource_update_metric_threshold',
  `Update the threshold for a specific quality metric in a DeepSource project.
  
  This allows setting or removing threshold values that determine if a metric passes or fails.
  Thresholds can be set per language or for the entire repository (AGGREGATE).

  Examples:
  - Set a 80% line coverage threshold: metricShortcode="LCV", metricKey="AGGREGATE", thresholdValue=80
  - Remove a threshold: metricShortcode="LCV", metricKey="AGGREGATE", thresholdValue=null`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    repositoryId: z
      .string()
      .describe('The GraphQL repository ID (get this from deepsource_quality_metrics response)'),
    metricShortcode: z
      .nativeEnum(MetricShortcode)
      .describe('The shortcode of the metric to update'),
    metricKey: z.nativeEnum(MetricKey).describe('The language or context key for the metric'),
    thresholdValue: z
      .number()
      .nullable()
      .optional()
      .describe('The new threshold value (null to remove the threshold)'),
  },
  handleDeepsourceUpdateMetricThreshold
);

mcpServer.tool(
  'deepsource_update_metric_setting',
  `Update the settings for a quality metric in a DeepSource project.
  
  This allows configuring how metrics are used in the project:
  - Enable/disable reporting the metric in the UI and API
  - Enable/disable enforcing thresholds (failing checks when thresholds aren't met)
  
  Example:
  - Enable reporting and enforce thresholds: isReported=true, isThresholdEnforced=true
  - Only report but don't enforce: isReported=true, isThresholdEnforced=false
  - Disable completely: isReported=false, isThresholdEnforced=false`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    repositoryId: z
      .string()
      .describe('The GraphQL repository ID (get this from deepsource_quality_metrics response)'),
    metricShortcode: z
      .nativeEnum(MetricShortcode)
      .describe('The shortcode of the metric to update'),
    isReported: z.boolean().describe('Whether the metric should be reported'),
    isThresholdEnforced: z
      .boolean()
      .describe('Whether the threshold should be enforced (can fail checks)'),
  },
  handleDeepsourceUpdateMetricSetting
);

// Register compliance report tool
mcpServer.tool(
  'deepsource_compliance_report',
  `Get security compliance reports from a DeepSource project.

  This tool provides access to industry-standard security compliance reports including:
  - OWASP Top 10: Common web application security vulnerabilities
  - SANS Top 25: Most dangerous software errors
  - MISRA-C: Guidelines for safety-critical software in C

  The response includes:
  - Comprehensive statistics about security issues by category and severity
  - Compliance status (passing/failing)
  - Recommendations for improving security posture
  - Trend data showing changes over time`,
  {
    projectKey: z.string().describe('The unique identifier for the DeepSource project'),
    reportType: z
      .nativeEnum(ReportType)
      .describe('The type of compliance report to fetch (OWASP_TOP_10, SANS_TOP_25, or MISRA_C)'),
  },
  handleDeepsourceComplianceReport
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
