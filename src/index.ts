#!/usr/bin/env node

/**
 * @fileoverview DeepSource MCP Server for integrating DeepSource with Model Context Protocol.
 * This module exports MCP server functions for DeepSource API integration.
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeepSourceClient } from './deepsource.js';
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
 * Fetches and returns dependency vulnerabilities from a specified DeepSource project
 *
 * This handler provides access to DeepSource's dependency vulnerability data,
 * allowing AI assistants to retrieve information about security vulnerabilities
 * in a project's dependencies.
 *
 * The response includes comprehensive data for each vulnerability:
 * - Package identification (name, ecosystem, purl)
 * - Affected version details
 * - Vulnerability specifics (CVE ID, severity, CVSS scores)
 * - Reachability status (whether vulnerable code paths are executable)
 * - Fixability information (whether and how the vulnerability can be remediated)
 *
 * The handler supports Relay-style pagination with cursor-based navigation:
 * - Forward pagination: Use 'first' with optional 'after' cursor
 * - Backward pagination: Use 'last' with optional 'before' cursor
 * - Page information includes cursors and has{Next|Previous}Page flags
 *
 * @param params Parameters for fetching dependency vulnerabilities, including project key and pagination options
 * @returns A response containing the list of dependency vulnerabilities with detailed information about each vulnerability
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the API request fails
 * @public
 */
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

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
