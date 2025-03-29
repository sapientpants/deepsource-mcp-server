import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { DeepSourceClient } from './deepsource.js';
import fs from 'fs';
import { Buffer } from 'buffer';
import { z } from 'zod';

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

// Enhanced request logging to debug method calls
const logRequest = (type: string, data: Record<string, unknown>) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: REQUEST: ${type}: ${JSON.stringify(data, null, 2)}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (writeError) {
    console.error('Failed to write request to log:', writeError);
  }
};

// Add custom JSON-RPC message handler to capture method not found errors
const handleJsonRpcRequest = (message: Record<string, unknown>) => {
  try {
    // Log all JSON-RPC messages
    if (message && message.jsonrpc === '2.0') {
      // Log the full message to help debug the "method not found" errors
      fs.appendFileSync(logFile, `${new Date().toISOString()} ${JSON.stringify(message)}\n`);

      // Additional structured logging
      logError({
        type: 'jsonrpc_message',
        id: message.id,
        method: message.method,
        hasParams: !!message.params,
        isRequest: !!message.method,
        isResponse:
          Object.prototype.hasOwnProperty.call(message, 'result') ||
          Object.prototype.hasOwnProperty.call(message, 'error'),
      });
    }
  } catch (error) {
    logError({ type: 'jsonrpc_parse_error', error, message });
  }
};

// Log startup information
logError({ type: 'startup', message: 'Starting MCP server with tools capability' });

// Get API key from environment variable
const DEEPSOURCE_API_KEY = process.env.DEEPSOURCE_API_KEY;
if (!DEEPSOURCE_API_KEY) {
  throw new Error('DEEPSOURCE_API_KEY environment variable is required');
}

// Initialize DeepSource client
const deepsource = new DeepSourceClient(DEEPSOURCE_API_KEY);

// Helper functions for URI handling
function encodeProjectKey(dsn: string): string {
  try {
    // Use standard base64 encoding, then make it URL-safe
    const base64 = Buffer.from(dsn).toString('base64');
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return urlSafe;
  } catch (error) {
    logError({ type: 'encode_project_key_error', dsn, error });
    return '';
  }
}

function decodeProjectKey(key: string): string {
  try {
    // First, ensure it's a valid base64url by replacing any URL-unsafe characters
    const safeKey = key.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(safeKey, 'base64').toString();

    // Log the result for debugging
    logError({ type: 'decode_project_key', original: key, decoded });

    return decoded;
  } catch (error) {
    logError({ type: 'decode_project_key_error', key, error });
    return '';
  }
}

// Create MCP server with tools capability
const mcpServer = new McpServer({
  name: 'deepsource-mcp',
  version: '0.0.0',
  capabilities: {
    tools: {},
  },
});

// Define tools for DeepSource API

// 1. List all projects tool
mcpServer.tool('deepsource_list_projects', {}, async () => {
  logRequest('tool_call', { name: 'deepsource_list_projects' });
  try {
    const projects = await deepsource.listProjects();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            projects.map((project) => ({
              name: project.name,
              key: encodeProjectKey(project.key),
              repository: {
                url: project.repository.url,
                provider: project.repository.provider,
              },
            })),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logError({ type: 'list_projects_error', error });
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// 2. Get issues for a specific project
mcpServer.tool(
  'deepsource_get_project_issues',
  {
    project_key: z.string().describe('The encoded project key'),
  },
  async ({ project_key }) => {
    logRequest('tool_call', { name: 'deepsource_get_project_issues', args: { project_key } });
    try {
      if (!project_key) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Missing required parameter: project_key',
            },
          ],
        };
      }

      const decodedKey = decodeProjectKey(project_key);

      if (!decodedKey) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Invalid project key format',
            },
          ],
        };
      }

      const issues = await deepsource.getIssues(decodedKey);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              issues.map((issue) => ({
                id: issue.id,
                title: issue.title,
                severity: issue.severity,
                status: issue.status,
                file_path: issue.file_path,
                line_number: issue.line_number,
                summary:
                  issue.issue_text.substring(0, 100) + (issue.issue_text.length > 100 ? '...' : ''),
              })),
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logError({ type: 'get_project_issues_error', project_key, error });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error fetching issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// 3. Get detailed information about a specific issue
mcpServer.tool(
  'deepsource_get_issue_details',
  {
    project_key: z.string().describe('The encoded project key'),
    issue_id: z.string().describe('The issue ID'),
  },
  async ({ project_key, issue_id }) => {
    logRequest('tool_call', {
      name: 'deepsource_get_issue_details',
      args: { project_key, issue_id },
    });
    try {
      if (!project_key || !issue_id) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Missing required parameters: project_key and issue_id are required',
            },
          ],
        };
      }

      const decodedKey = decodeProjectKey(project_key);

      if (!decodedKey) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Invalid project key format',
            },
          ],
        };
      }

      // First get all issues
      const allIssues = await deepsource.getIssues(decodedKey);

      // Find the specific issue
      const issue = allIssues.find((i) => i.id === issue_id);

      if (!issue) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Issue with ID ${issue_id} not found in project ${project_key}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
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
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logError({ type: 'get_issue_details_error', project_key, issue_id, error });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error fetching issue details: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
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

  // Add body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add request logging middleware - log all requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Log all requests
    logError({
      type: 'http_request',
      method: req.method,
      url: req.url,
      query: req.query,
    });
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
      // Log the raw request body
      logError({
        type: 'message_request',
        sessionId,
        contentType: req.headers['content-type'],
        bodyType: typeof req.body,
      });

      // Parse and analyze the request body for JSON-RPC calls
      let parsedBody = req.body;
      if (typeof req.body === 'string') {
        try {
          parsedBody = JSON.parse(req.body);
        } catch (parseError) {
          logError({ type: 'message_parse_error', sessionId, error: parseError });
        }
      }

      // Capture JSON-RPC method information before handling
      handleJsonRpcRequest(parsedBody);

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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
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

export default mcpServer;
