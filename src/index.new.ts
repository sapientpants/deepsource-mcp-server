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
import { ReportType, ReportStatus } from './models/security.js';
import { MetricShortcode, MetricKey, MetricThresholdStatus } from './models/metrics.js';

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

// Register the projects tool - we need to fix the handler to match CallToolResult format
mcpServer.tool(
  'projects',
  'List all available DeepSource projects. Returns a list of project objects with "key" and "name" properties.',
  // eslint-disable-next-line no-unused-vars
  async (_extra) => {
    const result = await handleProjects();
    return {
      content: result.content,
      structuredContent: {},
      isError: result.isError,
    };
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
