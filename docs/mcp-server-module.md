# MCP Server Module Documentation

## Overview

The MCP Server module has been extracted from the main `index.ts` file to improve separation of concerns, testability, and reusability. This refactoring creates a modular architecture that allows for easier configuration and extension of the DeepSource MCP server.

## Architecture

### Core Components

1. **DeepSourceMCPServer** (`src/server/mcp-server.ts`)
   - Main server class that encapsulates all MCP server functionality
   - Manages the MCP server instance, tool registry, and transport
   - Provides methods for configuration and lifecycle management

2. **Tool Registration** (`src/server/tool-registration.ts`)
   - Centralized tool registration logic
   - Tool metadata and categorization
   - Helper functions for tool discovery and filtering

3. **Enhanced Tool Registry** (`src/server/tool-registry-enhanced.ts`)
   - Extends base tool registry with automatic discovery capabilities
   - Supports plugin architecture for tools
   - Metadata management for tools

## Usage

### Basic Server Creation

```typescript
import { DeepSourceMCPServer } from './server/mcp-server.js';

// Create server with default configuration
const server = await DeepSourceMCPServer.create({
  autoRegisterTools: true,
  autoStart: false,
});

// Start the server
await server.start();
```

### Custom Configuration

```typescript
const server = new DeepSourceMCPServer({
  name: 'custom-deepsource-server',
  version: '2.0.0',
  autoRegisterTools: false,
  handlerDeps: customDependencies,
});

// Manually register tools
const registry = server.getToolRegistry();
registry.registerTool(customTool);

// Connect with custom transport
await server.connect(customTransport);
```

### Tool Discovery and Management

```typescript
import { getToolsByCategory, ToolCategory } from './server/tool-registration.js';

// Get tools by category
const qualityTools = getToolsByCategory(ToolCategory.CODE_QUALITY);
const securityTools = getToolsByCategory(ToolCategory.SECURITY);

// Get tools by tag
const paginatedTools = getPaginatedTools();

// Check tool metadata
const metadata = TOOL_METADATA['quality_metrics'];
console.log(metadata.category, metadata.tags, metadata.supportsPagination);
```

## Benefits

1. **Improved Testability**
   - Server components can be tested in isolation
   - Mock dependencies can be easily injected
   - Tool registration can be tested separately

2. **Better Separation of Concerns**
   - Server lifecycle management is separate from tool registration
   - Tool definitions are centralized
   - Configuration is explicit and type-safe

3. **Enhanced Extensibility**
   - Easy to add custom tools
   - Plugin architecture support
   - Tool discovery capabilities

4. **Backward Compatibility**
   - Main entry point (`index.ts`) maintains the same interface
   - Existing integrations continue to work
   - Gradual migration path available

## Example: Custom Server Implementation

See `examples/custom-server.ts` for a complete example of creating a custom server with additional tools.

## Testing

The modular architecture includes comprehensive tests:

- `src/__tests__/server/mcp-server.test.ts` - Server lifecycle tests
- `src/__tests__/server/tool-registration.test.ts` - Tool registration tests
- `src/__tests__/server/tool-registry-enhanced.test.ts` - Enhanced registry tests

## Migration Guide

For existing code using the direct `mcpServer` export:

```typescript
// Old approach
import { mcpServer } from 'deepsource-mcp-server';

// New approach (backward compatible)
import { getMcpServer } from 'deepsource-mcp-server';
const mcpServer = getMcpServer();

// Or use the new modular approach
import { DeepSourceMCPServer } from 'deepsource-mcp-server/server/mcp-server';
const server = await DeepSourceMCPServer.create();
```

## Future Enhancements

1. **Dynamic Tool Loading**
   - Load tools from external packages
   - Hot-reload capability for development

2. **Tool Versioning**
   - Support multiple versions of the same tool
   - Version compatibility checks

3. **Advanced Configuration**
   - Configuration file support
   - Environment-based configuration
   - Tool-specific configuration

4. **Metrics and Monitoring**
   - Tool usage metrics
   - Performance monitoring
   - Error tracking
