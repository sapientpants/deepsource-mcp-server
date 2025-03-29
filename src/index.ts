import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { DeepSourceClient } from './deepsource.js';
import { z } from 'zod';

// Initialize Express app
const app = express();
app.use(cors());

// Initialize MCP server
const server = new McpServer({
  name: 'deepsource-mcp-server',
  version: '0.0.0',
});

// Config endpoint
app.get('/config', (req: Request, res: Response) => {
  res.json({
    name: 'deepsource-mcp-server',
    version: '0.0.0',
    transport: {
      sse: {
        endpoint: '/sse',
      },
    },
  });
});

server.tool('deepsource-projects', 'List all available DeepSource projects', async () => {
  const client = new DeepSourceClient(process.env.DEEPSOURCE_API_KEY!);
  const projects = await client.listProjects();

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

server.tool('deepsource-project-issues', { projectKey: z.string() }, async ({ projectKey }) => {
  const client = new DeepSourceClient(process.env.DEEPSOURCE_API_KEY!);
  const issues = await client.getIssues(projectKey);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          issues.map((issue) => ({
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
          }))
        ),
      },
    ],
  };
});

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

app.listen(3000);
