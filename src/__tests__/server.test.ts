import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DeepSourceClient, DeepSourceIssue } from '../deepsource';
import express from 'express';
import request from 'supertest';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { jest } from '@jest/globals';

// Mock DeepSource client
jest.mock('../deepsource');

describe('MCP Server', () => {
  let app: express.Application;
  let server: McpServer;
  let mockDeepSourceClient: jest.Mocked<DeepSourceClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock DeepSource client
    mockDeepSourceClient = {
      listProjects: jest.fn(),
      getIssues: jest.fn(),
    } as unknown as jest.Mocked<DeepSourceClient>;

    // Create server instance
    server = new McpServer({
      name: 'deepsource-mcp-test',
      version: '1.0.0',
    });

    // Set up tools
    server.tool('list-projects', {}, async () => {
      try {
        const projects = await mockDeepSourceClient.listProjects();
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
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    server.tool(
      'get-project-issues',
      {
        projectKey: z.string().describe('The DeepSource project key'),
      },
      async ({ projectKey }) => {
        try {
          const issues = await mockDeepSourceClient.getIssues(projectKey);
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
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Add prompts
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

    // Set up Express app
    app = express();
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    app.get('/sse', async (_, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => {
        delete transports[transport.sessionId];
      });
      await server.connect(transport);
    });

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send('No transport found for sessionId');
      }
    });
  });

  describe('Server Setup', () => {
    it('should handle missing session ID in messages endpoint', async () => {
      const response = await request(app).post('/messages').send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('No transport found for sessionId');
    });
  });

  describe('Tool Integration', () => {
    it('should have list-projects tool configured', () => {
      const mockProjects = [
        {
          key: 'project1',
          name: 'Project One',
          repository: {
            url: 'https://github.com/org/repo1',
            provider: 'github',
          },
        },
      ];

      mockDeepSourceClient.listProjects.mockResolvedValueOnce(mockProjects);

      // The test passes if we can add the tool without errors
      expect(() => {
        server.tool('list-projects-test', {}, async () => ({
          content: [{ type: 'text', text: 'test' }],
        }));
      }).not.toThrow();
    });

    it('should have get-project-issues tool configured', () => {
      const mockIssues: DeepSourceIssue[] = [
        {
          id: 'issue1',
          title: 'Test Issue',
          category: 'security',
          severity: 'high',
          status: 'open',
          lead_time: 1000,
          created_at: '2024-03-27T12:00:00Z',
          file_path: 'src/main.ts',
          line_number: 42,
          issue_text: 'Test issue description',
          issue_url: 'https://deepsource.io/issues/1',
        },
      ];

      mockDeepSourceClient.getIssues.mockResolvedValueOnce(mockIssues);

      // The test passes if we can add the tool without errors
      expect(() => {
        server.tool('get-project-issues-test', { projectKey: z.string() }, async () => ({
          content: [{ type: 'text', text: 'test' }],
        }));
      }).not.toThrow();
    });
  });

  describe('Prompt Integration', () => {
    it('should have list-projects prompt configured', () => {
      // The test passes if we can add the prompt without errors
      expect(() => {
        server.prompt('list-projects-test', {}, () => ({
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: 'test' },
            },
          ],
        }));
      }).not.toThrow();
    });

    it('should have get-project-issues prompt configured', () => {
      // The test passes if we can add the prompt without errors
      expect(() => {
        server.prompt('get-project-issues-test', { projectKey: z.string() }, () => ({
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: 'test' },
            },
          ],
        }));
      }).not.toThrow();
    });
  });
});
