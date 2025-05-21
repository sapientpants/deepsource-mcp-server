#!/usr/bin/env node

/**
 * @fileoverview DeepSource MCP Server for integrating DeepSource with Model Context Protocol.
 * This module exports MCP server functions for DeepSource API integration.
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createLogger } from './utils/logging/logger.js';
import { handleProjects } from './handlers/projects.js';

// Create logger instance for index.ts
const logger = createLogger('DeepSourceMCP:index');

// Initialize MCP server
/**
 * The main MCP server instance
 * @public
 */
export const mcpServer = new McpServer({
  name: 'deepsource-mcp-server',
  version: '1.0.3',
});

// Register the projects tool
mcpServer.registerTool(
  'projects',
  {
    description:
      'List all available DeepSource projects. Returns a list of project objects with "key" and "name" properties.',
    outputSchema: {
      projects: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
        })
      ),
    },
  },
  // eslint-disable-next-line no-unused-vars
  async (_extra) => {
    try {
      const result = await handleProjects();

      if (result.isError) {
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the project array
      const projects = JSON.parse(result.content[0].text);

      return {
        content: result.content,
        structuredContent: { projects: projects || [] },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in projects tool handler', error);
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
        structuredContent: { projects: [] },
        isError: true,
      };
    }
  }
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  logger.info('Starting MCP server...');
  await mcpServer.connect(transport);
  logger.info('MCP server started successfully');
}
