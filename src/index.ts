#!/usr/bin/env node

/**
 * @fileoverview DeepSource MCP Server entry point.
 *
 * This is the main entry point for the DeepSource MCP server when run
 * as a standalone application. It uses the modular MCP server implementation
 * for better separation of concerns.
 *
 * @packageDocumentation
 */

import { createLogger } from './utils/logging/logger.js';
import { DeepSourceMCPServer } from './server/mcp-server.js';

// Create logger instance for index.ts
const logger = createLogger('DeepSourceMCP:index');

// Internal mutable reference
let _mcpServer: DeepSourceMCPServer | undefined;

// Export an immutable getter for backward compatibility
export const mcpServer = {
  get current(): DeepSourceMCPServer {
    if (!_mcpServer) {
      throw new Error('MCP server not initialized. Call initializeServer() first.');
    }
    return _mcpServer;
  },
};

// Initialize the DeepSource MCP server
async function initializeServer(): Promise<void> {
  try {
    logger.info('Initializing DeepSource MCP Server');

    // Create server with default configuration
    _mcpServer = await DeepSourceMCPServer.create({
      autoRegisterTools: true,
      autoStart: false,
    });

    logger.info('DeepSource MCP Server initialized successfully', {
      tools: _mcpServer.getRegisteredTools(),
    });
  } catch (error) {
    logger.error('Failed to initialize DeepSource MCP Server', error);
    throw error;
  }
}

// Export functions for backward compatibility
export function getMcpServer() {
  return mcpServer.current.getMcpServer();
}

// Main entry point
async function main(): Promise<void> {
  try {
    // Initialize the server
    await initializeServer();

    // Start the server if not in test mode
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Starting MCP server...');
      await mcpServer.current.start();
      logger.info('MCP server started successfully');
    }
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

// Run the main function only when not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
  });
} else {
  // In test mode, just initialize the server without starting it
  initializeServer().catch((error) => {
    logger.error('Failed to initialize server in test mode', error);
  });
}
