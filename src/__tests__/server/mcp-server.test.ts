/**
 * @fileoverview Tests for MCP Server module
 */

import { jest } from '@jest/globals';
import { DeepSourceMCPServer, createDeepSourceMCPServer } from '../../server/mcp-server.js';

// Mock dependencies
jest.mock('../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../server/tool-registration.js', () => ({
  registerDeepSourceTools: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    registerTool: jest.fn(),
    tool: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('DeepSourceMCPServer', () => {
  let server: DeepSourceMCPServer;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up mock API key for tests
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    server = null as unknown as DeepSourceMCPServer;
    // Clean up environment
    delete process.env.DEEPSOURCE_API_KEY;
  });

  describe('constructor', () => {
    it('should create server with default configuration', () => {
      server = new DeepSourceMCPServer();
      expect(server).toBeDefined();
      expect(server.getRegisteredTools()).toBeDefined();
    });

    it('should create server with custom configuration', () => {
      server = new DeepSourceMCPServer({
        name: 'custom-server',
        version: '2.0.0',
        autoRegisterTools: false,
      });
      expect(server).toBeDefined();
    });

    it('should auto-register tools when configured', () => {
      const { registerDeepSourceTools } = require('../../server/tool-registration.js');
      server = new DeepSourceMCPServer({ autoRegisterTools: true });
      expect(registerDeepSourceTools).toHaveBeenCalled();
    });

    it('should not auto-register tools when disabled', () => {
      const { registerDeepSourceTools } = require('../../server/tool-registration.js');
      jest.clearAllMocks();
      server = new DeepSourceMCPServer({ autoRegisterTools: false });
      expect(registerDeepSourceTools).not.toHaveBeenCalled();
    });
  });

  describe('getMcpServer', () => {
    it('should return the MCP server instance', () => {
      server = new DeepSourceMCPServer();
      const mcpServer = server.getMcpServer();
      expect(mcpServer).toBeDefined();
    });
  });

  describe('getToolRegistry', () => {
    it('should return the tool registry', () => {
      server = new DeepSourceMCPServer();
      const registry = server.getToolRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect to transport', async () => {
      server = new DeepSourceMCPServer();
      const mcpServer = server.getMcpServer();
      await server.connect();
      expect(mcpServer.connect).toHaveBeenCalled();
    });

    it('should warn if already connected', async () => {
      server = new DeepSourceMCPServer();
      await server.connect();
      const { createLogger } = require('../../utils/logging/logger.js');
      const mockLogger = createLogger();

      // Try to connect again
      await server.connect();
      expect(mockLogger.warn).toHaveBeenCalledWith('Server is already connected');
    });

    it('should use provided transport', async () => {
      const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
      const customTransport = new StdioServerTransport();
      server = new DeepSourceMCPServer();
      const mcpServer = server.getMcpServer();
      await server.connect(customTransport);
      expect(mcpServer.connect).toHaveBeenCalledWith(customTransport);
    });
  });

  describe('start', () => {
    it('should create transport and connect', async () => {
      server = new DeepSourceMCPServer();
      const mcpServer = server.getMcpServer();
      await server.start();
      expect(mcpServer.connect).toHaveBeenCalled();
    });
  });

  describe('isServerConnected', () => {
    it('should return false before connection', () => {
      server = new DeepSourceMCPServer();
      expect(server.isServerConnected()).toBe(false);
    });

    it('should return true after connection', async () => {
      server = new DeepSourceMCPServer();
      await server.connect();
      expect(server.isServerConnected()).toBe(true);
    });
  });

  describe('updateHandlerDeps', () => {
    it('should update handler dependencies', () => {
      server = new DeepSourceMCPServer();
      const newDeps = {};
      const registry = server.getToolRegistry();
      registry.updateDefaultDeps = jest.fn();

      server.updateHandlerDeps(newDeps);
      expect(registry.updateDefaultDeps).toHaveBeenCalledWith(newDeps);
    });
  });

  describe('getRegisteredTools', () => {
    it('should return registered tool names', () => {
      server = new DeepSourceMCPServer({ autoRegisterTools: false });
      const registry = server.getToolRegistry();
      registry.getToolNames = jest.fn().mockReturnValue(['tool1', 'tool2']);

      const tools = server.getRegisteredTools();
      expect(tools).toEqual(['tool1', 'tool2']);
    });
  });

  describe('static create', () => {
    it('should create server without auto-start', async () => {
      const server = await DeepSourceMCPServer.create();
      expect(server).toBeDefined();
      expect(server.isServerConnected()).toBe(false);
    });

    it('should create and start server when configured', async () => {
      const server = await DeepSourceMCPServer.create({ autoStart: true });
      expect(server).toBeDefined();
      expect(server.isServerConnected()).toBe(true);
    });
  });

  describe('createDeepSourceMCPServer', () => {
    it('should create server without auto-start by default', async () => {
      const server = await createDeepSourceMCPServer();
      expect(server).toBeDefined();
      expect(server.isServerConnected()).toBe(false);
    });

    it('should create and start server when requested', async () => {
      const server = await createDeepSourceMCPServer(true);
      expect(server).toBeDefined();
      expect(server.isServerConnected()).toBe(true);
    });
  });
});
