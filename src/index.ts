import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { DeepSourceClient } from './deepsource.js';

// Get API key from environment variable
const DEEPSOURCE_API_KEY = process.env.DEEPSOURCE_API_KEY;
if (!DEEPSOURCE_API_KEY) {
  throw new Error('DEEPSOURCE_API_KEY environment variable is required');
}

// Initialize DeepSource client
const deepsource = new DeepSourceClient(DEEPSOURCE_API_KEY);

// Create MCP server
const server = new McpServer({
  name: 'deepsource-mcp',
  version: '1.0.0',
});

// Tool to list all projects
server.tool('list-projects', {}, async () => {
  try {
    const projects = await deepsource.listProjects();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error fetching projects: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool to get issues for a project
server.tool(
  'get-project-issues',
  {
    projectKey: z.string().describe('The DeepSource project key'),
  },
  async ({ projectKey }) => {
    try {
      const issues = await deepsource.getIssues(projectKey);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(issues, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching issues: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Add some helpful prompts
server.prompt('list-projects', {}, () => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Please list all DeepSource projects.',
      },
    },
  ],
}));

server.prompt('get-project-issues', { projectKey: z.string() }, ({ projectKey }) => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Please show me all issues for the DeepSource project with key: ${projectKey}`,
      },
    },
  ],
}));

// Set up Express server with SSE support
const app = express();
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get('/sse', async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DeepSource MCP server listening on port ${PORT}`);
});
