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
import { VERSION, getVersion } from './version.js';
import { getFeatureFlags, logFeatureFlags } from './config/features.js';
import { getEnvironmentConfig } from './config/default.js';

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

    // Get feature flags and configuration
    const features = getFeatureFlags();
    const config = getEnvironmentConfig();

    // Log feature flags in development
    if (process.env.NODE_ENV === 'development' || features.enhancedLogging) {
      logFeatureFlags(logger.debug.bind(logger));
    }

    // Create server with configuration
    _mcpServer = await DeepSourceMCPServer.create({
      autoRegisterTools: true,
      autoStart: false,
      // Pass discovery config if tool discovery is enabled
      ...(features.toolDiscovery && {
        discoveryConfig: config.discovery,
      }),
    });

    // If tool discovery is enabled, perform discovery
    if (features.toolDiscovery && _mcpServer) {
      logger.info('Tool discovery enabled, scanning for additional tools...');
      const discoveredTools = await _mcpServer.discoverTools(
        config.discovery as unknown as Record<string, unknown>
      );
      if (discoveredTools.length > 0) {
        logger.info(`Discovered ${discoveredTools.length} additional tools`, {
          tools: discoveredTools,
        });
      }
    }

    logger.info('DeepSource MCP Server initialized successfully', {
      tools: _mcpServer.getRegisteredTools(),
      features: Object.entries(features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name),
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

// CLI argument handler for testing
export function handleCliArgs(args: string[]): boolean {
  // Check for version flag before anything else
  if (args.includes('--version') || args.includes('-v')) {
    const features = getFeatureFlags();
    const enabledFeatures = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    // eslint-disable-next-line no-console
    console.log(`deepsource-mcp-server version ${VERSION}`);
    if (enabledFeatures.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Enabled features: ${enabledFeatures.join(', ')}`);
    }
    return true;
  }

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    /* eslint-disable no-console */
    console.log(`DeepSource MCP Server v${VERSION}`);
    console.log('\nUsage: deepsource-mcp-server [options]');
    console.log('\nOptions:');
    console.log('  -v, --version  Display version information');
    console.log('  -h, --help     Display this help message');
    console.log('\nEnvironment Variables:');
    console.log('  DEEPSOURCE_API_KEY             DeepSource API key (required)');
    console.log('  LOG_FILE                       Path to log file (optional)');
    console.log(
      '  LOG_LEVEL                      Minimum log level: DEBUG, INFO, WARN, ERROR (optional)'
    );
    console.log('\nFeature Flags:');
    console.log('  FEATURE_TOOL_DISCOVERY         Enable automatic tool discovery (optional)');
    console.log('  FEATURE_ENHANCED_LOGGING       Enable enhanced logging (optional)');
    console.log('  FEATURE_METRICS                Enable metrics collection (optional)');
    console.log('  FEATURE_CACHE                  Enable caching layer (optional)');
    /* eslint-enable no-console */
    return true;
  }

  return false;
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle CLI args and exit if needed
  if (handleCliArgs(args)) {
    process.exit(0);
  }

  try {
    // Log startup with version and features
    const features = getFeatureFlags();
    const enabledFeatures = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    logger.info(`Starting DeepSource MCP Server v${VERSION}`, {
      version: VERSION,
      node: process.version,
      platform: process.platform,
      features: enabledFeatures,
    });

    // Initialize the server
    await initializeServer();

    // Start the server if not in test mode
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Starting MCP server connection...');
      await mcpServer.current.start();
      logger.info('MCP server started successfully', { version: getVersion() });
    }
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

// Run the main function only when not in test mode and when executed directly
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
  });
} else if (process.env.NODE_ENV === 'test') {
  // In test mode, just initialize the server without starting it
  initializeServer().catch((error) => {
    logger.error('Failed to initialize server in test mode', error);
  });
}

// Export for backward compatibility with modules that import from index-registry
export { validateEnvironment, createAndConfigureToolRegistry } from './compatibility.js';
