/**
 * @fileoverview Additional tests for index.ts to improve coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock modules before imports
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    setRequestHandler: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
  })),
}));

vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: vi.fn().mockResolvedValue({
      getRegisteredTools: vi.fn().mockReturnValue(['test-tool']),
      getMcpServer: vi.fn().mockReturnValue({
        registerTool: vi.fn(),
      }),
      start: vi.fn().mockResolvedValue(undefined),
      discoverTools: vi.fn().mockResolvedValue(['discovered-tool']),
    }),
  },
}));

vi.mock('../config/features.js', () => ({
  getFeatureFlags: vi.fn(() => ({
    toolDiscovery: false,
    enhancedLogging: false,
    metrics: false,
    cache: false,
  })),
  logFeatureFlags: vi.fn(),
  isFeatureEnabled: vi.fn((feature: string) => feature === 'toolDiscovery'),
}));

vi.mock('../config/default.js', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    server: {
      name: 'test-server',
      version: '1.0.0',
      autoRegisterTools: true,
      autoStart: false,
      logLevel: 'INFO',
    },
    api: {
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    discovery: {
      directories: ['./tools'],
      patterns: ['*.tool.js'],
      recursive: true,
      includeCategories: [],
      excludeCategories: [],
      includeTags: [],
      excludeTags: [],
    },
  })),
}));

describe('Index Module Coverage Tests', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];
  const originalExit = process.exit;
  const originalOn = process.on;
  let processOnHandlers: Record<string, Function> = {};

  beforeAll(() => {
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';

    // Mock process.exit
    process.exit = vi.fn() as any;

    // Mock process.on to capture handlers
    process.on = vi.fn((event: string, handler: Function) => {
      processOnHandlers[event] = handler;
      return process;
    }) as any;
  });

  afterAll(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    process.exit = originalExit;
    process.on = originalOn;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    processOnHandlers = {};
  });

  describe('Server Initialization', () => {
    it('should initialize server with tool discovery enabled', async () => {
      vi.resetModules();

      const mockServer = {
        getRegisteredTools: vi.fn().mockReturnValue(['test-tool']),
        getMcpServer: vi.fn().mockReturnValue({
          registerTool: vi.fn(),
        }),
        start: vi.fn().mockResolvedValue(undefined),
        discoverTools: vi.fn().mockResolvedValue(['discovered-tool']),
      };

      vi.doMock('../config/features.js', () => ({
        getFeatureFlags: vi.fn(() => ({
          toolDiscovery: true,
          enhancedLogging: false,
          metrics: false,
          cache: false,
        })),
        logFeatureFlags: vi.fn(),
        isFeatureEnabled: vi.fn((feature: string) => feature === 'toolDiscovery'),
      }));

      vi.doMock('../server/mcp-server.js', () => ({
        DeepSourceMCPServer: {
          create: vi.fn().mockResolvedValue(mockServer),
        },
      }));

      await import('../index.js');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      const { DeepSourceMCPServer } = await import('../server/mcp-server.js');
      expect(DeepSourceMCPServer.create).toHaveBeenCalled();
      expect(mockServer.discoverTools).toHaveBeenCalled();
    });

    it('should initialize server with enhanced logging in development', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { getFeatureFlags, logFeatureFlags } = vi.mocked(await import('../config/features.js'));

      getFeatureFlags.mockReturnValueOnce({
        toolDiscovery: false,
        enhancedLogging: true,
        metrics: false,
        cache: false,
      });

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logFeatureFlags).toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle server initialization errors', async () => {
      const { DeepSourceMCPServer } = vi.mocked(await import('../server/mcp-server.js'));
      const { createLogger } = vi.mocked(await import('../utils/logging/logger.js'));

      const mockLogger = createLogger('test');

      DeepSourceMCPServer.create.mockRejectedValueOnce(new Error('Server creation failed'));

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize MCP server',
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('getMcpServer function', () => {
    it('should return the server when initialized', async () => {
      vi.resetModules();
      const indexModule = await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      const server = indexModule.getMcpServer();
      expect(server).toBeDefined();
    });

    it('should throw error when server not initialized', async () => {
      vi.resetModules();
      const indexModule = await import('../index.js');

      // Try to get server immediately before initialization
      expect(() => indexModule.getMcpServer()).toThrow(
        'MCP server not initialized'
      );
    });
  });

  describe('mcpServer getter', () => {
    it('should access current server through mcpServer.current', async () => {
      vi.resetModules();
      const indexModule = await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(indexModule.mcpServer.current).toBeDefined();
      expect(indexModule.mcpServer.current.getRegisteredTools).toBeDefined();
    });

    it('should throw when accessing mcpServer.current before initialization', async () => {
      vi.resetModules();
      const indexModule = await import('../index.js');

      // Try to access immediately
      expect(() => indexModule.mcpServer.current).toThrow(
        'MCP server not initialized. Call initializeServer() first.'
      );
    });
  });

  describe('Process Signal Handlers', () => {
    it('should handle SIGINT gracefully', async () => {
      const { createLogger } = vi.mocked(await import('../utils/logging/logger.js'));
      const mockLogger = createLogger('test');

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger SIGINT handler
      if (processOnHandlers['SIGINT']) {
        await processOnHandlers['SIGINT']();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down MCP server...');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGTERM gracefully', async () => {
      const { createLogger } = vi.mocked(await import('../utils/logging/logger.js'));
      const mockLogger = createLogger('test');

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger SIGTERM handler
      if (processOnHandlers['SIGTERM']) {
        await processOnHandlers['SIGTERM']();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down MCP server...');
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('Main Module Execution', () => {
    it('should run as main module when file matches argv[1]', async () => {
      const originalArgv1 = process.argv[1];

      // Set argv[1] to match the module path
      process.argv[1] = '/Users/marc/Projects/deepsource-mcp-server/src/index.js';

      const { DeepSourceMCPServer } = vi.mocked(await import('../server/mcp-server.js'));

      vi.resetModules();

      // Mock import.meta.url to match argv[1]
      const originalImportMeta = (global as any).import;
      (global as any).import = {
        meta: {
          url: 'file:///Users/marc/Projects/deepsource-mcp-server/src/index.js'
        }
      };

      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(DeepSourceMCPServer.create).toHaveBeenCalled();

      process.argv[1] = originalArgv1;
      (global as any).import = originalImportMeta;
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key', async () => {
      const originalApiKey = process.env.DEEPSOURCE_API_KEY;
      delete process.env.DEEPSOURCE_API_KEY;

      const { createLogger } = vi.mocked(await import('../utils/logging/logger.js'));
      const mockLogger = createLogger('test');

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      // The server should still attempt to start even without API key
      // (API key is only required for actual API calls)
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing DeepSource MCP Server');

      process.env.DEEPSOURCE_API_KEY = originalApiKey;
    });

    it('should handle tool discovery errors gracefully', async () => {
      const { getFeatureFlags } = vi.mocked(await import('../config/features.js'));
      const { DeepSourceMCPServer } = vi.mocked(await import('../server/mcp-server.js'));
      const { createLogger } = vi.mocked(await import('../utils/logging/logger.js'));

      const mockLogger = createLogger('test');

      getFeatureFlags.mockReturnValueOnce({
        toolDiscovery: true,
        enhancedLogging: false,
        metrics: false,
        cache: false,
      });

      const mockServer = {
        getRegisteredTools: vi.fn().mockReturnValue(['test-tool']),
        getMcpServer: vi.fn().mockReturnValue({
          registerTool: vi.fn(),
        }),
        start: vi.fn().mockResolvedValue(undefined),
        discoverTools: vi.fn().mockRejectedValue(new Error('Discovery failed')),
      };

      DeepSourceMCPServer.create.mockResolvedValueOnce(mockServer);

      vi.resetModules();
      await import('../index.js');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to discover additional tools',
        expect.any(Error)
      );
      // Server should still start despite discovery failure
      expect(mockServer.start).toHaveBeenCalled();
    });
  });
});