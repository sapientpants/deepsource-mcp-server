import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeepSourceClient } from './deepsource.js';
import { z } from 'zod';

// Initialize MCP server
const mcpServer = new McpServer({
  name: 'deepsource-mcp-server',
  version: '0.0.0',
});

mcpServer.tool('deepsource-projects', 'List all available DeepSource projects', async () => {
  mcpServer.server.sendLoggingMessage({ level: 'info', message: 'Fetching projects...' });
  const client = new DeepSourceClient(process.env.DEEPSOURCE_API_KEY!);
  const projects = await client.listProjects();
  mcpServer.server.sendLoggingMessage({
    level: 'info',
    message: `Found ${projects.length} projects`,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          projects.map((project) => ({
            key: project.key,
            name: project.name,
          }))
        ),
      },
    ],
  };
});

mcpServer.tool(
  'deepsource-project-issues',
  'Get issues from a DeepSource project. Returns up to 10 issues by default. Use pagination parameters to navigate through results.',
  {
    projectKey: z.string(),
    offset: z.number().optional(),
    first: z.number().optional(),
    after: z.string().optional(),
    before: z.string().optional(),
  },
  async ({ projectKey, offset, first, after, before }) => {
    mcpServer.server.sendLoggingMessage({
      level: 'info',
      message: `Fetching issues for project ${projectKey}...`,
    });
    const client = new DeepSourceClient(process.env.DEEPSOURCE_API_KEY!);
    const pagination = { offset, first, after, before };
    const result = await client.getIssues(projectKey, pagination);
    mcpServer.server.sendLoggingMessage({
      level: 'info',
      message: `Found ${result.items.length} issues (total: ${result.totalCount})`,
    });

    return {
      content: [
        {
          type: 'text',
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
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
