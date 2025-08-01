# Enhanced Tool Registry

The Enhanced Tool Registry provides advanced capabilities for managing MCP tools, including automatic discovery, categorization, versioning, and dynamic loading.

## Features

### 1. Automatic Tool Discovery

The registry can automatically discover and load tools from specified directories:

```typescript
const registry = new EnhancedToolRegistry(server);
const discoveredTools = await registry.discoverTools({
  directories: ['./src/tools', './plugins'],
  patterns: ['*.tool.js', '*.tool.mjs'],
  recursive: true
});
```

### 2. Tool Metadata

Tools can include metadata for better organization:

```typescript
export const toolDefinition: EnhancedToolDefinition = {
  name: 'my_tool',
  description: 'My awesome tool',
  handler: myHandler,
  metadata: {
    category: 'analytics',
    version: '1.2.0',
    tags: ['stable', 'fast'],
    enabled: true
  }
};
```

### 3. Category and Tag Filtering

Tools can be filtered by categories and tags:

```typescript
// Get all analytics tools
const analyticsTools = registry.getToolsByCategory('analytics');

// Get all stable tools
const stableTools = registry.getToolsByTag('stable');

// Discover only specific categories
await registry.discoverTools({
  includeCategories: ['core', 'analytics'],
  excludeTags: ['experimental', 'deprecated']
});
```

### 4. Dynamic Tool Management

Tools can be enabled, disabled, and reloaded at runtime:

```typescript
// Disable a tool
registry.disableTool('experimental_tool');

// Enable a tool
registry.enableTool('experimental_tool');

// Reload a tool from its file
await registry.reloadTool('my_tool');
```

## Tool Plugin Format

Tools can be structured as plugins for automatic discovery:

```typescript
// my-tool.tool.ts
import { z } from 'zod';
import { EnhancedToolDefinition } from '../server/tool-registry-enhanced.js';

export const toolSchema = {
  name: 'my_tool',
  description: 'Tool description',
  inputSchema: z.object({
    // Input schema
  }),
  outputSchema: z.object({
    // Output schema
  })
};

export const handler = async (params) => {
  // Tool implementation
};

export const toolDefinition: EnhancedToolDefinition = {
  ...toolSchema,
  handler,
  metadata: {
    category: 'utilities',
    version: '1.0.0',
    tags: ['stable'],
    enabled: true
  }
};

export default toolDefinition;
```

## Configuration

Tool discovery can be configured based on environment:

```typescript
// tool-discovery.config.ts
export const productionToolDiscoveryConfig = {
  directories: ['./src/tools'],
  excludeTags: ['experimental', 'development'],
  includeCategories: ['core', 'analytics', 'security']
};

export const developmentToolDiscoveryConfig = {
  directories: ['./src/tools', './src/tools/dev'],
  excludeTags: ['deprecated']
};
```

## Categories and Tags

### Standard Categories

- `core` - Essential tools for basic functionality
- `analytics` - Data analysis and metrics tools
- `security` - Security scanning and vulnerability tools
- `compliance` - Compliance and regulatory tools
- `utilities` - Helper and utility tools
- `integration` - Third-party integration tools
- `monitoring` - Monitoring and observability tools

### Standard Tags

- `stable` - Production-ready tools
- `beta` - Tools in beta testing
- `experimental` - Experimental features
- `deprecated` - Tools scheduled for removal
- `fast` - Tools with quick response times
- `slow` - Tools that may take longer to execute
- `requires-auth` - Tools requiring authentication
- `development` - Development-only tools
- `test` - Test tools

## Usage Example

```typescript
import { EnhancedToolRegistry } from './tool-registry-enhanced.js';
import { getToolDiscoveryConfig } from './config/tool-discovery.config.js';

// Create registry
const registry = new EnhancedToolRegistry(server);

// Register core tools with metadata
registry.registerEnhancedTool({
  name: 'core_tool',
  description: 'A core tool',
  handler: coreHandler,
  metadata: {
    category: 'core',
    version: '1.0.0',
    tags: ['stable', 'fast']
  }
});

// Discover additional tools
const config = getToolDiscoveryConfig();
const discovered = await registry.discoverTools(config);

// Get tool information
const toolsInfo = registry.getToolsInfo();
console.log(`Total tools: ${toolsInfo.length}`);
console.log(`Categories: ${registry.getCategories()}`);
console.log(`Tags: ${registry.getTags()}`);

// Filter tools
const securityTools = registry.getToolsByCategory('security');
const betaTools = registry.getToolsByTag('beta');
```

## Best Practices

1. **Use Standard Categories**: Stick to the predefined categories for consistency
2. **Version Your Tools**: Include version information in metadata
3. **Tag Appropriately**: Use tags to indicate tool status and requirements
4. **Environment-Specific Loading**: Configure different tools for different environments
5. **Document Tool Requirements**: Clearly document any special requirements in the tool description

## Migration Guide

To migrate existing tools to the enhanced format:

1. Add metadata to existing tool definitions
2. Move tools to a dedicated directory (e.g., `src/tools`)
3. Rename files to match discovery patterns (e.g., `*.tool.js`)
4. Export tool definitions using the standard format
5. Update server initialization to use enhanced registry

## Benefits

- **Better Organization**: Tools are categorized and tagged
- **Dynamic Loading**: Tools can be loaded without code changes
- **Environment Control**: Different tools for different environments
- **Runtime Management**: Enable/disable tools without restart
- **Plugin Architecture**: Easy to add new tools as plugins
- **Discovery**: Automatic tool discovery from directories