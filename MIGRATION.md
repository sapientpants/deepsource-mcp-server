# Migration Guide: Single Canonical Entrypoint

## Overview

This guide helps you migrate from the old multi-entry point architecture to the new consolidated single entry point with feature flags.

## What Changed

### Before (Multiple Entry Points)

- `src/index.ts` - Basic server implementation
- `src/index-registry.ts` - Registry-based implementation
- `src/server/index-enhanced.ts` - Enhanced server with tool discovery
- `src/server/tool-registry.ts` - Base registry
- `src/server/tool-registry-enhanced.ts` - Enhanced registry with discovery

### After (Single Entry Point)

- `src/index.ts` - Single canonical entry point
- `src/server/tool-registry.ts` - Unified registry with all features
- Feature flags control optional functionality

## Migration Steps

### 1. Update Your Imports

#### If you were using index-registry.ts:

**Before:**

```typescript
import { main, validateEnvironment } from './index-registry.js';
import { createAndConfigureToolRegistry } from './index-registry.js';
```

**After:**

```typescript
import { DeepSourceMCPServer } from './index.js';

// Create and configure server
const server = await DeepSourceMCPServer.create({
  autoRegisterTools: true,
  autoStart: false,
});
```

#### If you were using EnhancedToolRegistry:

**Before:**

```typescript
import { EnhancedToolRegistry } from './server/tool-registry-enhanced.js';
import { createEnhancedToolRegistry } from './server/tool-registry-enhanced.js';

const registry = new EnhancedToolRegistry(server);
await registry.discoverTools(options);
```

**After:**

```typescript
import { ToolRegistry } from './server/tool-registry.js';

// Enable tool discovery via feature flag
process.env.FEATURE_TOOL_DISCOVERY = 'true';

const registry = new ToolRegistry(server);
await registry.discoverTools(options); // Works when feature flag is enabled
```

### 2. Enable Feature Flags

Set environment variables to enable optional features:

```bash
# Enable tool discovery
export FEATURE_TOOL_DISCOVERY=true

# Enable enhanced logging
export FEATURE_ENHANCED_LOGGING=true

# Enable metrics collection
export FEATURE_METRICS=true

# Enable caching (future feature)
export FEATURE_CACHE=true
```

### 3. Update Configuration

#### Tool Discovery Configuration

**Before:**

```typescript
import { getToolDiscoveryConfig } from './config/tool-discovery.config.js';
const config = getToolDiscoveryConfig();
```

**After:**

```typescript
import { getEnvironmentConfig } from './config/default.js';
const config = getEnvironmentConfig();
// Discovery config is at config.discovery
```

### 4. Update Package.json Scripts

No changes needed - the binary field still points to the correct entry:

```json
{
  "bin": {
    "deepsource-mcp-server": "./dist/index.js"
  }
}
```

### 5. Testing Your Migration

1. **Check feature flags are working:**

```bash
FEATURE_TOOL_DISCOVERY=true deepsource-mcp-server --version
# Should show: Enabled features: toolDiscovery
```

2. **Verify tool registration:**

```bash
# Run server and check logs for registered tools
DEEPSOURCE_API_KEY=your-key deepsource-mcp-server
```

3. **Test tool discovery (if used):**

```bash
# Place .tool.js files in ./src/tools directory
FEATURE_TOOL_DISCOVERY=true DEEPSOURCE_API_KEY=your-key deepsource-mcp-server
```

## Deprecated Features

The following will be removed in the next major version:

### Files (Deprecated)

- `src/index-registry.ts` - Use `src/index.ts` instead
- `src/server/index-enhanced.ts` - Features merged into main server
- `src/server/tool-registry-enhanced.ts` - Features merged into ToolRegistry

### Functions (Deprecated)

- `validateEnvironment()` - Use `getConfig()` from `config/index.js`
- `createAndConfigureToolRegistry()` - Use `DeepSourceMCPServer.create()`
- `createEnhancedToolRegistry()` - Use `new ToolRegistry()` with feature flags

## Breaking Changes

None! The migration maintains full backward compatibility:

- Old import paths still work (with deprecation warnings)
- All APIs remain the same
- CLI usage unchanged
- Configuration format unchanged

## Feature Flag Reference

| Flag             | Environment Variable       | Description                         | Default |
| ---------------- | -------------------------- | ----------------------------------- | ------- |
| Tool Discovery   | `FEATURE_TOOL_DISCOVERY`   | Auto-discover tools from filesystem | `false` |
| Enhanced Logging | `FEATURE_ENHANCED_LOGGING` | Additional debug information        | `false` |
| Metrics          | `FEATURE_METRICS`          | Collect and report metrics          | `false` |
| Cache            | `FEATURE_CACHE`            | Cache API responses (future)        | `false` |

## Common Issues

### Issue: Tool discovery not working

**Solution:** Ensure `FEATURE_TOOL_DISCOVERY=true` is set:

```bash
export FEATURE_TOOL_DISCOVERY=true
```

### Issue: Import errors after update

**Solution:** Update imports to use the new paths as shown above. The old paths show deprecation warnings but still work.

### Issue: Tests failing after migration

**Solution:** Update test imports and mock the feature flags:

```typescript
// In your tests
vi.mock('./config/features', () => ({
  getFeatureFlags: () => ({
    toolDiscovery: true,
    enhancedLogging: false,
    metrics: false,
    cache: false,
  }),
  isFeatureEnabled: (feature: string) => feature === 'toolDiscovery',
}));
```

## Getting Help

- Check the [README](README.md) for general usage
- See [CLAUDE.md](CLAUDE.md) for development guidelines
- Open an issue for migration problems

## Timeline

- **Current Release**: Deprecation warnings added, full backward compatibility
- **Next Minor Release**: Documentation updates, migration tools
- **Next Major Release**: Deprecated files and functions removed
