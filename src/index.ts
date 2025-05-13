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
 * Interface for parameters for fetching dependency vulnerabilities from a DeepSource project
 * @public
 */
export interface DeepsourceDependencyVulnerabilitiesParams {
  /** DeepSource project key to fetch dependency vulnerabilities for */
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
 * @param params Parameters for fetching dependency vulnerabilities, including project key and pagination options
 * @returns A response containing the list of dependency vulnerabilities with detailed information about each vulnerability
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
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
        text: JSON.stringify({
          items: result.items.map((vuln) => ({
            id: vuln.id,
            // Package information
            package: {
              name: vuln.package.name,
              ecosystem: vuln.package.ecosystem,
              purl: vuln.package.purl,
            },
            // Package version information
            packageVersion: {
              version: vuln.packageVersion.version,
              versionType: vuln.packageVersion.versionType,
            },
            // Vulnerability details
            vulnerability: {
              identifier: vuln.vulnerability.identifier,
              summary: vuln.vulnerability.summary,
              details: vuln.vulnerability.details,
              severity: vuln.vulnerability.severity,
              // CVSS scores and vectors
              cvssV2: {
                baseScore: vuln.vulnerability.cvssV2BaseScore,
                vector: vuln.vulnerability.cvssV2Vector,
                severity: vuln.vulnerability.cvssV2Severity,
              },
              cvssV3: {
                baseScore: vuln.vulnerability.cvssV3BaseScore,
                vector: vuln.vulnerability.cvssV3Vector,
                severity: vuln.vulnerability.cvssV3Severity,
              },
              publishedAt: vuln.vulnerability.publishedAt,
              updatedAt: vuln.vulnerability.updatedAt,
              fixedVersions: vuln.vulnerability.fixedVersions,
              referenceUrls: vuln.vulnerability.referenceUrls,
            },
            // Reachability and fixability information
            reachability: vuln.reachability,
            fixability: vuln.fixability,
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
  },
  handleDeepsourceDependencyVulnerabilities
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
