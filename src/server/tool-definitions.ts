/**
 * @fileoverview Centralized tool definitions and schemas for MCP tools
 * @packageDocumentation
 */

import { z } from 'zod';
import { MetricShortcode, ReportType } from '../deepsource.js';

/**
 * Projects tool schemas
 */
export const projectsToolSchema = {
  name: 'projects',
  description:
    'List all available DeepSource projects. Returns a list of project objects with "key" and "name" properties.',
  inputSchema: {},
  outputSchema: {
    projects: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
      })
    ),
  },
};

/**
 * Quality metrics tool schemas
 */
export const qualityMetricsToolSchema = {
  name: 'quality_metrics',
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
};

/**
 * Update metric threshold tool schemas
 */
export const updateMetricThresholdToolSchema = {
  name: 'update_metric_threshold',
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
};

/**
 * Update metric setting tool schemas
 */
export const updateMetricSettingToolSchema = {
  name: 'update_metric_setting',
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
};

/**
 * Compliance report tool schemas
 */
export const complianceReportToolSchema = {
  name: 'compliance_report',
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
    trends: z.record(z.string(), z.unknown()).optional(),
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
};

/**
 * Project issues tool schemas
 */
export const projectIssuesToolSchema = {
  name: 'project_issues',
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
    page_size: z
      .number()
      .optional()
      .describe('Number of items per page (alias for first, for convenience)'),
    max_pages: z
      .number()
      .optional()
      .describe('Maximum number of pages to fetch (enables automatic multi-page fetching)'),
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
    pagination: z
      .object({
        has_more_pages: z.boolean(),
        next_cursor: z.string().optional(),
        previous_cursor: z.string().optional(),
        total_count: z.number().optional(),
        page_size: z.number(),
        pages_fetched: z.number().optional(),
        limit_reached: z.boolean().optional(),
      })
      .optional()
      .describe('User-friendly pagination metadata'),
    totalCount: z.number(),
  },
};

/**
 * Runs tool schemas
 */
export const runsToolSchema = {
  name: 'runs',
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
    page_size: z
      .number()
      .optional()
      .describe('Number of items per page (alias for first, for convenience)'),
    max_pages: z
      .number()
      .optional()
      .describe('Maximum number of pages to fetch (enables automatic multi-page fetching)'),
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
};

/**
 * Run tool schemas
 */
export const runToolSchema = {
  name: 'run',
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
};

/**
 * Recent run issues tool schemas
 */
export const recentRunIssuesToolSchema = {
  name: 'recent_run_issues',
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
    page_size: z
      .number()
      .optional()
      .describe('Number of items per page (alias for first, for convenience)'),
    max_pages: z
      .number()
      .optional()
      .describe('Maximum number of pages to fetch (enables automatic multi-page fetching)'),
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
};

/**
 * Dependency vulnerabilities tool schemas
 */
export const dependencyVulnerabilitiesToolSchema = {
  name: 'dependency_vulnerabilities',
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
    page_size: z
      .number()
      .optional()
      .describe('Number of items per page (alias for first, for convenience)'),
    max_pages: z
      .number()
      .optional()
      .describe('Maximum number of pages to fetch (enables automatic multi-page fetching)'),
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
};

/**
 * All tool schemas exported as an array for easy registration
 */
export const toolSchemas = [
  projectsToolSchema,
  qualityMetricsToolSchema,
  updateMetricThresholdToolSchema,
  updateMetricSettingToolSchema,
  complianceReportToolSchema,
  projectIssuesToolSchema,
  runsToolSchema,
  runToolSchema,
  recentRunIssuesToolSchema,
  dependencyVulnerabilitiesToolSchema,
];
