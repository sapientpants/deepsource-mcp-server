/**
 * @fileoverview Simple coverage tests for index.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up mocks
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
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
      getRegisteredTools: vi.fn().mockReturnValue(['tool1']),
      getMcpServer: vi.fn(),
      start: vi.fn(),
      discoverTools: vi.fn().mockResolvedValue([]),
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
  isFeatureEnabled: vi.fn(() => false),
}));

vi.mock('../config/default.js', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    server: { name: 'test', version: '1.0.0' },
    api: {},
    discovery: {},
  })),
}));

describe('Index Simple Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export mcpServer', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.mcpServer).toBeDefined();
  });

  it('should export getMcpServer function', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.getMcpServer).toBeDefined();
    expect(typeof indexModule.getMcpServer).toBe('function');
  });

  it('should export VERSION', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.VERSION).toBeDefined();
    expect(typeof indexModule.VERSION).toBe('string');
  });

  it('should export getVersion function', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.getVersion).toBeDefined();
    expect(typeof indexModule.getVersion).toBe('function');
  });
});