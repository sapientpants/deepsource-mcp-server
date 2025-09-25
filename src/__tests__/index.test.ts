/**
 * This test module tests that index.ts can be imported and works correctly
 */

import { vi } from 'vitest';

// Mock logger first
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

// Mock feature flags
const mockFeatures = {
  toolDiscovery: false,
  enhancedLogging: false,
  metrics: false,
  cache: false,
};

vi.mock('../config/features.js', () => ({
  getFeatureFlags: vi.fn(() => mockFeatures),
  logFeatureFlags: vi.fn(),
}));

// Mock environment config
vi.mock('../config/environment.js', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    discovery: {
      directories: ['./src/tools/test'],
      patterns: ['*.tool.js', '*.tool.mjs'],
      recursive: true,
      includeCategories: [],
      excludeCategories: [],
      includeTags: [],
      excludeTags: [],
    },
  })),
}));

// Set up all mocks BEFORE any imports - using unstable_mockModule for ES modules
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    connect: vi.fn(),
    setRequestHandler: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('../server/tool-registry.js', () => ({
  ToolRegistry: vi.fn().mockImplementation(() => ({
    registerTool: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../handlers/base/handler.factory.js', () => ({
  createDefaultHandlerDeps: vi.fn(() => ({
    client: {},
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  })),
  createBaseHandlerFactory: vi.fn(),
}));

vi.mock('../server/tool-registration.js', () => ({
  registerDeepSourceTools: vi.fn(),
}));

const mockMcpServer = {
  getRegisteredTools: vi.fn().mockReturnValue(['projects', 'issues']),
  getMcpServer: vi.fn().mockReturnValue({
    registerTool: vi.fn(),
  }),
  start: vi.fn(),
  discoverTools: vi.fn().mockResolvedValue([]),
  getToolsInfo: vi.fn().mockReturnValue([]),
};

vi.mock('../server/mcp-server.js', () => ({
  DeepSourceMCPServer: {
    create: vi.fn().mockResolvedValue(mockMcpServer),
  },
}));

// Now import test utilities after mocks are set
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = await import('vitest');

describe('index.ts module', () => {
  // Import the module
  let indexModule: {
    mcpServer: {
      current: {
        getRegisteredTools: () => string[];
        getMcpServer: () => unknown;
        start?: () => Promise<void>;
      };
    };
    getMcpServer: () => unknown;
    handleCliArgs: (args: string[]) => boolean;
    initializeServer: () => Promise<void>;
  };
  let originalEnv: typeof process.env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    // Save original env
    originalEnv = { ...process.env };

    // Set required environment variables for testing
    process.env.DEEPSOURCE_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';

    // Import the module - this should trigger the code execution
    // and provide us with the exported mcpServer object
    indexModule = await import('../index.js');
  });

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should export an mcpServer instance', () => {
    expect(indexModule.mcpServer).toBeDefined();
    expect(indexModule.mcpServer.current).toBeDefined();
  });

  it('should have a server with appropriate methods', () => {
    expect(typeof indexModule.mcpServer.current.getRegisteredTools).toBe('function');
    expect(typeof indexModule.getMcpServer).toBe('function');
  });

  describe('handleCliArgs', () => {
    it('should handle --version flag', () => {
      const result = indexModule.handleCliArgs(['--version']);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('deepsource-mcp-server version')
      );
    });

    it('should handle -v flag', () => {
      const result = indexModule.handleCliArgs(['-v']);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('deepsource-mcp-server version')
      );
    });

    it('should show enabled features with version flag when features are enabled', () => {
      mockFeatures.toolDiscovery = true;
      mockFeatures.enhancedLogging = true;

      const result = indexModule.handleCliArgs(['--version']);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Enabled features: toolDiscovery, enhancedLogging')
      );

      // Reset
      mockFeatures.toolDiscovery = false;
      mockFeatures.enhancedLogging = false;
    });

    it('should handle --help flag', () => {
      const result = indexModule.handleCliArgs(['--help']);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DeepSource MCP Server'));
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: deepsource-mcp-server')
      );
    });

    it('should return false for unknown args', () => {
      const result = indexModule.handleCliArgs(['--unknown']);

      expect(result).toBe(false);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Tool discovery and feature flags', () => {
    it('should log feature flags when enhancedLogging is enabled', async () => {
      const { logFeatureFlags } = await import('../config/features.js');
      mockFeatures.enhancedLogging = true;

      await indexModule.initializeServer();

      expect(logFeatureFlags).toHaveBeenCalled();

      // Reset
      mockFeatures.enhancedLogging = false;
    });

    it('should log feature flags in development mode', async () => {
      const { logFeatureFlags } = await import('../config/features.js');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await indexModule.initializeServer();

      expect(logFeatureFlags).toHaveBeenCalled();

      // Reset
      process.env.NODE_ENV = originalEnv;
    });

    it('should perform tool discovery when feature is enabled', async () => {
      mockFeatures.toolDiscovery = true;

      await indexModule.initializeServer();

      expect(mockMcpServer.discoverTools).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool discovery enabled, scanning for additional tools...'
      );

      // Reset
      mockFeatures.toolDiscovery = false;
    });

    it('should log discovered tools when found', async () => {
      mockFeatures.toolDiscovery = true;
      mockMcpServer.discoverTools.mockResolvedValueOnce(['tool1', 'tool2']);

      await indexModule.initializeServer();

      expect(mockMcpServer.discoverTools).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Discovered 2 additional tools',
        expect.objectContaining({ tools: ['tool1', 'tool2'] })
      );

      // Reset
      mockFeatures.toolDiscovery = false;
      mockMcpServer.discoverTools.mockResolvedValue([]);
    });

    it('should not log when no tools discovered', async () => {
      mockFeatures.toolDiscovery = true;
      mockMcpServer.discoverTools.mockResolvedValueOnce([]);

      await indexModule.initializeServer();

      expect(mockMcpServer.discoverTools).toHaveBeenCalled();
      // Should not log about discovered tools when array is empty
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Discovered'),
        expect.any(Object)
      );

      // Reset
      mockFeatures.toolDiscovery = false;
    });

    it('should pass discovery config when tool discovery is enabled', async () => {
      const { DeepSourceMCPServer } = await import('../server/mcp-server.js');
      mockFeatures.toolDiscovery = true;

      await indexModule.initializeServer();

      expect(DeepSourceMCPServer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRegisterTools: true,
          autoStart: false,
          discoveryConfig: {
            directories: ['./src/tools/test'],
            patterns: ['*.tool.js', '*.tool.mjs'],
            recursive: true,
            includeCategories: [],
            excludeCategories: [],
            includeTags: [],
            excludeTags: [],
          },
        })
      );

      // Reset
      mockFeatures.toolDiscovery = false;
    });

    it('should log enabled features on startup', async () => {
      mockFeatures.toolDiscovery = true;
      mockFeatures.metrics = true;

      await indexModule.initializeServer();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'DeepSource MCP Server initialized successfully',
        expect.objectContaining({
          features: ['toolDiscovery', 'metrics'],
        })
      );

      // Reset
      mockFeatures.toolDiscovery = false;
      mockFeatures.metrics = false;
    });
  });
});
