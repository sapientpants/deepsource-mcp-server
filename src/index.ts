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

// Add a new resource template for individual issues
mcpServer.resource(
  'deepsource-project-issue',
  new ResourceTemplate('deepsource://projects/{projectKey}/issues/{issueId}', {
    list: async () => {
      // This handler is just a placeholder as individual issues are handled in the read handler
      return { resources: [] };
    },
  }),
  async (uri) => {
    try {
      // The URI format is deepsource://projects/base64project/issues/issueId
      // But the base64project might contain slashes, so we need to be careful
      const uriString = uri.toString();

      // Extract project key and issue ID more reliably
      const projectsPrefix = 'deepsource://projects/';
      const issuesInfix = '/issues/';

      if (!uriString.includes(projectsPrefix) || !uriString.includes(issuesInfix)) {
        logError({ type: 'issue_invalid_uri', uri: uriString });
        return { contents: [] };
      }

      const afterProjectsPrefix = uriString.substring(projectsPrefix.length);
      const issuesIndex = afterProjectsPrefix.indexOf(issuesInfix);

      if (issuesIndex === -1) {
        logError({ type: 'issue_invalid_uri_format', uri: uriString });
        return { contents: [] };
      }

      const encodedProjectKey = afterProjectsPrefix.substring(0, issuesIndex);
      const afterIssues = afterProjectsPrefix.substring(issuesIndex + issuesInfix.length);

      // The issueId might contain additional path components, so take everything up to the next slash or the end
      const issueId = afterIssues.includes('/')
        ? afterIssues.substring(0, afterIssues.indexOf('/'))
        : afterIssues;

      logError({
        type: 'issue_debug_parsing',
        uri: uriString,
        encodedProjectKey,
        issueId,
      });

      // Now decode the project key
      const projectKey = decodeProjectKey(encodedProjectKey);

      logError({
        type: 'issue_debug_decoded',
        projectKey,
        issueId,
      });

      if (!projectKey || !issueId) {
        logError({ type: 'issue_missing_params', projectKey, issueId });
        return { contents: [] };
      }

      // Try to decode the issue ID if it looks like base64
      let decodedIssueId = issueId;
      if (issueId.includes('=')) {
        try {
          // The issue ID might be base64 encoded
          decodedIssueId = Buffer.from(issueId, 'base64').toString('utf-8');
          logError({ type: 'issue_decoded_id', original: issueId, decoded: decodedIssueId });
        } catch (e) {
          logError({ type: 'issue_decode_error', issueId, error: e });
        }
      }

      // First try to get all issues to see what we're working with
      const allIssues = await deepsource.getIssues(projectKey);
      logError({
        type: 'issue_debug_all',
        count: allIssues.length,
        issueIds: allIssues.map((i) => i.id),
      });

      // Try different approaches to find the issue
      let issue = null;

      // 1. Try direct match with original ID
      issue = allIssues.find((i) => i.id === issueId);

      // 2. If not found and decoded is different, try with decoded ID
      if (!issue && decodedIssueId !== issueId) {
        // If decoded ID contains a colon (like "Occurrence:actualId"), try the part after the colon
        if (decodedIssueId.includes(':')) {
          const actualId = decodedIssueId.split(':')[1];
          logError({ type: 'issue_trying_actual_id', actualId });
          issue = allIssues.find((i) => i.id === actualId || i.id.endsWith(actualId));
        } else {
          issue = allIssues.find((i) => i.id === decodedIssueId);
        }
      }

      // 3. Last resort: try partial matching
      if (!issue) {
        for (const i of allIssues) {
          if (i.id.includes(issueId) || issueId.includes(i.id)) {
            logError({ type: 'issue_found_by_partial', issueId, matchedWith: i.id });
            issue = i;
            break;
          }
        }
      }

      if (!issue) {
        logError({ type: 'issue_not_found', projectKey, issueId, decodedIssueId });
        return { contents: [] };
      }

      logError({ type: 'issue_found', issue });

      return {
        contents: [
          {
            uri: `deepsource://projects/${encodeProjectKey(projectKey)}/issues/${issue.id}`,
            text: `# ${issue.title} [${issue.shortcode}]\n\n**Severity:** ${issue.severity}\n**Status:** ${issue.status}\n**File:** ${issue.file_path}:${issue.line_number}\n\n## Description\n${issue.issue_text}`,
          },
        ],
      };
    } catch (error) {
      logError({ type: 'read_issue_error', uri: uri.pathname, error });
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
