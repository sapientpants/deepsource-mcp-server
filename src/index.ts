import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeepSourceClient } from './deepsource.js';
import { z } from 'zod';

// Initialize MCP server
export const mcpServer = new McpServer({
  name: 'deepsource-mcp-server',
  version: '0.0.0',
});

// Export handler functions for testing
/**
 * Fetches and returns a list of all available DeepSource projects
 * @returns A response containing the list of projects with their keys and names
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
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
 */
export interface DeepsourceProjectIssuesParams {
  /** DeepSource project key to fetch issues for */
  projectKey: string;
  /** Number of items to skip */
  offset?: number;
  /** Maximum number of items to return */
  first?: number;
  /** Cursor to start fetching from */
  after?: string;
  /** Cursor to fetch until */
  before?: string;
}

/**
 * Fetches and returns issues from a specified DeepSource project
 * @param params Parameters for fetching issues, including project key and pagination options
 * @returns A response containing the list of issues with their details and pagination info
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 */
export async function handleDeepsourceProjectIssues({
  projectKey,
  offset,
  first,
  after,
  before,
}: DeepsourceProjectIssuesParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const pagination = { offset, first, after, before };
  const result = await client.getIssues(projectKey, pagination);

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
        }),
      },
    ],
  };
}

// Register the tools with the handlers
mcpServer.tool(
  'deepsource_projects',
  'List all available DeepSource projects',
  handleDeepsourceProjects
);

mcpServer.tool(
  'deepsource_project_issues',
  'Get issues from a DeepSource project. Returns up to 10 issues by default. Use pagination parameters to navigate through results.',
  {
    projectKey: z.string(),
    offset: z.number().optional(),
    first: z.number().optional(),
    after: z.string().optional(),
    before: z.string().optional(),
  },
  handleDeepsourceProjectIssues
);

// Only start the server if this is the main module (not during tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
