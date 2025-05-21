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
      logger.info('MCP projects tool handler invoked');

      // Call the projects handler
      const result = await handleProjects();
      logger.debug('handleProjects result received', {
        isError: result.isError,
        contentLength: result.content?.[0]?.text?.length || 0,
        contentPreview: result.content?.[0]?.text?.substring(0, 50) + '...',
      });

      // If the handler returned an error, throw it to be caught below
      if (result.isError) {
        const errorObject = JSON.parse(result.content[0].text);
        logger.error('Projects handler returned error', errorObject);
        throw new Error(result.content[0].text);
      }

      // Parse the JSON string to get the project array
      logger.debug('Parsing JSON result');
      const projects = JSON.parse(result.content[0].text);
      logger.info('Successfully processed projects', {
        count: projects?.length || 0,
        success: true,
      });

      return {
        content: result.content,
        structuredContent: { projects: projects || [] },
        isError: false,
      };
    } catch (error) {
      logger.error('Error in projects tool handler', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Try to parse error message if it looks like JSON
        if (error.message.startsWith('{') && error.message.endsWith('}')) {
          // Try to parse the error message as JSON
          const parsedErrorMessage = (() => {
            try {
              return JSON.parse(error.message);
            } catch {
              logger.debug('Failed to parse error message as JSON', { message: error.message });
              return null;
            }
          })();

          if (parsedErrorMessage?.error) {
            errorMessage = `DeepSource API Error: ${parsedErrorMessage.error}`;
            if (parsedErrorMessage.details) {
              errorMessage += ` - ${parsedErrorMessage.details}`;
            }
          }
        }
      }

      logger.info('Returning error response to MCP client', { errorMessage });
      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
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
