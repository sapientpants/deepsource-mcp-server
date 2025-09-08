/**
 * @fileoverview MCP Server module for DeepSource integration
 *
 * This module provides a configurable MCP server that can be used
 * to integrate DeepSource functionality with Model Context Protocol.
 * It separates the server setup logic from the main entry point,
 * allowing for better testability and reusability.
 *
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogger } from '../utils/logging/logger.js';
import { ToolRegistry } from './tool-registry.js';
import { BaseHandlerDeps } from '../handlers/base/handler.interface.js';
import { createDefaultHandlerDeps } from '../handlers/base/handler.factory.js';
import { registerDeepSourceTools } from './tool-registration.js';

const logger = createLogger('MCPServer');

/**
 * Configuration options for the MCP server
 */
export interface MCPServerConfig {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Custom handler dependencies */
  handlerDeps?: BaseHandlerDeps;
  /** Whether to auto-register DeepSource tools */
  autoRegisterTools?: boolean;
  /** Custom transport (defaults to StdioServerTransport) */
  transport?: StdioServerTransport;
  /** Whether to start the server immediately */
  autoStart?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<MCPServerConfig, 'handlerDeps' | 'transport'>> = {
  name: 'deepsource-mcp-server',
  version: '1.2.0',
  autoRegisterTools: true,
  autoStart: false,
};

/**
 * DeepSource MCP Server class
 *
 * This class encapsulates the MCP server setup and configuration,
 * providing a clean API for creating and managing the server.
 */
export class DeepSourceMCPServer {
  private mcpServer: McpServer;
  private toolRegistry: ToolRegistry;
  private transport?: StdioServerTransport;
  private config: Required<Omit<MCPServerConfig, 'handlerDeps' | 'transport'>> &
    Pick<MCPServerConfig, 'handlerDeps' | 'transport'>;
  private isConnected = false;

  constructor(config: MCPServerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    logger.info('Initializing DeepSource MCP Server', {
      name: this.config.name,
      version: this.config.version,
    });

    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: this.config.name,
      version: this.config.version,
    });

    // Set transport FIRST (default to stdio if not provided)
    // This must be set before registering tools
    this.transport = this.config.transport || new StdioServerTransport();

    // Initialize tool registry
    const handlerDeps = this.config.handlerDeps || createDefaultHandlerDeps();
    this.toolRegistry = new ToolRegistry(this.mcpServer, handlerDeps);

    // Auto-register tools if configured (AFTER transport is set)
    if (this.config.autoRegisterTools) {
      this.registerDefaultTools();
    }
  }

  /**
   * Registers the default DeepSource tools
   */
  private registerDefaultTools(): void {
    try {
      logger.info('Starting registration of default DeepSource tools', {
        mcpServerType: typeof this.mcpServer,
        mcpServerExists: !!this.mcpServer,
        toolRegistryExists: !!this.toolRegistry,
      });

      registerDeepSourceTools(this.toolRegistry);

      const registeredTools = this.toolRegistry.getToolNames();
      logger.info('Successfully registered DeepSource tools', {
        registeredTools,
        toolCount: registeredTools.length,
      });

      // Verify tools are actually registered with the MCP server
      // The MCP server doesn't expose a direct way to query tools,
      // but we can log what we've registered
      logger.info('Tool registration verification', {
        toolRegistryCount: registeredTools.length,
        mcpServerConnected: this.isConnected,
        transportSet: !!this.transport,
      });
    } catch (error) {
      logger.error('Failed to register DeepSource tools', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Gets the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Gets the tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Connects the server to the transport
   *
   * @param transport - Optional transport to use (overrides constructor transport)
   */
  async connect(transport?: StdioServerTransport): Promise<void> {
    if (this.isConnected) {
      logger.warn('Server is already connected');
      return;
    }

    const transportToUse = transport || this.transport || new StdioServerTransport();

    logger.info('Connecting MCP server to transport');
    await this.mcpServer.connect(transportToUse);

    this.isConnected = true;
    logger.info('MCP server connected successfully');
  }

  /**
   * Starts the server (convenience method that creates transport and connects)
   */
  async start(): Promise<void> {
    if (!this.transport) {
      this.transport = new StdioServerTransport();
    }
    await this.connect();
  }

  /**
   * Checks if the server is connected
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Updates handler dependencies
   *
   * @param deps - New handler dependencies
   */
  updateHandlerDeps(deps: BaseHandlerDeps): void {
    this.toolRegistry.updateDefaultDeps(deps);
    logger.info('Handler dependencies updated');
  }

  /**
   * Gets registered tool names
   */
  getRegisteredTools(): string[] {
    return this.toolRegistry.getToolNames();
  }

  /**
   * Creates and optionally starts a DeepSource MCP server
   *
   * @param config - Server configuration
   * @returns The created server instance
   */
  static async create(config: MCPServerConfig = {}): Promise<DeepSourceMCPServer> {
    const server = new DeepSourceMCPServer(config);

    if (config.autoStart) {
      await server.start();
    }

    return server;
  }
}

/**
 * Convenience function to create a server with default configuration
 *
 * @param autoStart - Whether to start the server immediately
 * @returns The created server instance
 */
export async function createDeepSourceMCPServer(autoStart = false): Promise<DeepSourceMCPServer> {
  return DeepSourceMCPServer.create({ autoStart });
}
