import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DeepSourceClient } from './deepsource.js';
import { Server } from 'http';

// Get API key from environment variable
const DEEPSOURCE_API_KEY = process.env.DEEPSOURCE_API_KEY;
if (!DEEPSOURCE_API_KEY) {
  throw new Error('DEEPSOURCE_API_KEY environment variable is required');
}

// Initialize DeepSource client
const deepsource = new DeepSourceClient(DEEPSOURCE_API_KEY);

// Create MCP server
const mcpServer = new McpServer({
  name: 'deepsource-mcp',
  version: '1.0.0',
});

// Tool to list all projects
mcpServer.tool('list-projects', {}, async () => {
  try {
    const projects = await deepsource.listProjects();
    return {
      content: [
        {
          type: 'text',
          text:
            'Here are the DeepSource projects:\n\n' +
            projects
              .map(
                (project) =>
                  `- ${project.name} (${project.key})\n  Repository: ${project.repository.url} (${project.repository.provider})`
              )
              .join('\n'),
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
mcpServer.tool(
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
            text:
              'Here are the issues:\n\n' +
              issues
                .map(
                  (issue) =>
                    `- ${issue.title} (${issue.severity})\n  ${issue.issue_text}\n  File: ${issue.file_path}:${issue.line_number}\n  Status: ${issue.status}\n  Created: ${issue.created_at}${issue.resolved_at ? `\n  Resolved: ${issue.resolved_at}` : ''}`
                )
                .join('\n\n'),
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
mcpServer.prompt('list-projects', {}, () => ({
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

mcpServer.prompt('get-project-issues', { projectKey: z.string() }, ({ projectKey }) => ({
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

// Add error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Express error:', err);
  res.status(500).send('Internal Server Error');
});

// Handle SSE connection
app.get('/sse', async (req: Request, res: Response) => {
  console.log('New SSE connection request');
  try {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    
    console.log(`SSE transport created with sessionId: ${transport.sessionId}`);
    
    res.on('close', () => {
      console.log(`SSE connection closed for sessionId: ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    res.on('error', (error: Error) => {
      console.error(`SSE connection error for sessionId: ${transport.sessionId}`, error);
      delete transports[transport.sessionId];
    });

    await mcpServer.connect(transport);
  } catch (error) {
    console.error('Error establishing SSE connection:', error);
    res.status(500).send('Error establishing SSE connection');
  }
});

// Handle message posting
app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  console.log(`Received message for sessionId: ${sessionId}`);
  
  try {
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      console.warn(`No transport found for sessionId: ${sessionId}`);
      res.status(400).send('No transport found for sessionId');
    }
  } catch (error) {
    console.error(`Error handling message for sessionId: ${sessionId}:`, error);
    res.status(500).send('Error handling message');
  }
});

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`DeepSource MCP server listening on ${HOST}:${PORT}`);
});

// Handle server errors
server.on('error', (error: Error) => {
  console.error('Server error:', error);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
