import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { DeepSourceClient, DeepSourceProject, DeepSourceIssue } from './deepsource.js';
import fs from 'fs';
import { Buffer } from 'buffer';

// Set up error logging
const logFile = 'error.log';
const logError = (error: Error | unknown) => {
  try {
    const timestamp = new Date().toISOString();
    const errorLog = `${timestamp}: ${JSON.stringify(error, null, 2)}\n`;
    fs.appendFileSync(logFile, errorLog);
  } catch (writeError) {
    console.error('Failed to write to error log:', writeError);
  }
};

// Get API key from environment variable
const DEEPSOURCE_API_KEY = process.env.DEEPSOURCE_API_KEY;
if (!DEEPSOURCE_API_KEY) {
  throw new Error('DEEPSOURCE_API_KEY environment variable is required');
}

// Initialize DeepSource client
const deepsource = new DeepSourceClient(DEEPSOURCE_API_KEY);

// Helper functions for URI handling
function encodeProjectKey(dsn: string): string {
  return Buffer.from(dsn).toString('base64url');
}

function decodeProjectKey(key: string): string {
  return Buffer.from(key, 'base64url').toString();
}

// Create MCP server
const mcpServer = new McpServer({
  name: 'deepsource-mcp',
  version: '0.0.0',
});

// Register resources with their templates
mcpServer.resource(
  'deepsource-projects',
  new ResourceTemplate('deepsource://projects', {
    list: async () => {
      try {
        const projects = await deepsource.listProjects();
        return {
          resources: projects.map((project: DeepSourceProject) => ({
            name: project.name,
            uri: `deepsource://projects/${encodeProjectKey(project.key)}`,
            description: `Repository: ${project.repository.url} (${project.repository.provider})`,
          })),
        };
      } catch (error) {
        logError({ type: 'list_projects_error', error });
        return { resources: [] };
      }
    },
  }),
  async () => {
    try {
      const projects = await deepsource.listProjects();
      return {
        contents: projects.map((project: DeepSourceProject) => ({
          uri: `deepsource://projects/${encodeProjectKey(project.key)}`,
          text: `${project.name}\nRepository: ${project.repository.url} (${project.repository.provider})`,
        })),
      };
    } catch (error) {
      logError({ type: 'read_projects_error', error });
      return { contents: [] };
    }
  }
);

mcpServer.resource(
  'deepsource-project-issues',
  new ResourceTemplate('deepsource://projects/{projectKey}/issues', {
    list: async () => {
      try {
        const projects = await deepsource.listProjects();
        if (projects.length === 0) {
          return { resources: [] };
        }

        const allIssues = await Promise.all(
          projects.map(async (project: DeepSourceProject) => {
            try {
              const issues = await deepsource.getIssues(project.key);
              return issues.map((issue: DeepSourceIssue) => ({
                name: issue.title,
                uri: `deepsource://projects/${encodeProjectKey(project.key)}/issues/${issue.id}`,
                description: `${issue.severity} severity issue in ${issue.file_path}:${issue.line_number}\n${issue.issue_text}`,
              }));
            } catch (error) {
              logError({ type: 'project_issues_error', projectKey: project.key, error });
              return [];
            }
          })
        );
        return {
          resources: allIssues.flat(),
        };
      } catch (error) {
        logError({ type: 'list_issues_error', error });
        return { resources: [] };
      }
    },
  }),
  async (uri) => {
    try {
      const projectKey = decodeProjectKey(uri.pathname.split('/')[2]);
      if (!projectKey) {
        return { contents: [] };
      }
      const issues = await deepsource.getIssues(projectKey);
      return {
        contents: issues.map((issue: DeepSourceIssue) => ({
          uri: `deepsource://projects/${encodeProjectKey(projectKey)}/issues/${issue.id}`,
          text: `${issue.title} (${issue.severity})\n${issue.issue_text}\nFile: ${issue.file_path}:${issue.line_number}\nStatus: ${issue.status}`,
        })),
      };
    } catch (error) {
      logError({ type: 'read_issues_error', error });
      return { contents: [] };
    }
  }
);

// Check if we're running in a TTY (terminal) - this indicates stdio mode
if (process.stdin.isTTY) {
  // Running in SSE mode (from terminal)
  const app = express();

  // Enable CORS for the inspector UI
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Add request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logError({ type: 'request', method: req.method, url: req.url });
    next();
  });

  const transports: { [sessionId: string]: SSEServerTransport } = {};

  // Handle SSE connection
  app.get('/sse', async (req: Request, res: Response) => {
    try {
      logError({ type: 'sse_connection_attempt' });
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => {
        logError({ type: 'sse_connection_closed', sessionId: transport.sessionId });
        delete transports[transport.sessionId];
      });

      await mcpServer.connect(transport);
    } catch (error) {
      logError({ type: 'sse_connection_error', error });
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE connection');
      }
    }
  });

  // Handle message posting
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;

    try {
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        logError({ type: 'transport_not_found', sessionId });
        if (!res.headersSent) {
          res.status(400).send('No transport found for sessionId');
        }
      }
    } catch (error) {
      logError({ type: 'message_handling_error', sessionId, error });
      if (!res.headersSent) {
        res.status(500).send('Error handling message');
      }
    }
  });

  // Start the Express server
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    logError({ type: 'server_start', message: `Server started on ${HOST}:${PORT}` });
  });
} else {
  // Running in stdio mode (from MCP Inspector)
  logError({ type: 'starting_stdio_mode' });
  const stdioTransport = new StdioServerTransport();
  mcpServer.connect(stdioTransport).catch((error) => {
    logError({ type: 'stdio_connection_error', error });
    process.exit(1);
  });
}
