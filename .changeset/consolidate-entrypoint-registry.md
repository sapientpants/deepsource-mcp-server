---
'deepsource-mcp-server': minor
---

Consolidate to single canonical entrypoint and registry

This refactoring consolidates multiple entry points and tool registry implementations into a single, feature-flag-controlled architecture, addressing technical debt and simplifying the codebase.

### New Features

- **Feature Flags System**: Control experimental features via environment variables
  - `FEATURE_TOOL_DISCOVERY`: Enable automatic tool discovery from filesystem
  - `FEATURE_ENHANCED_LOGGING`: Enable additional debug information
  - `FEATURE_METRICS`: Enable metrics collection (future)
  - `FEATURE_CACHE`: Enable caching layer (future)

- **Unified Tool Registry**: All registry functionality now in single `ToolRegistry` class
  - Tool discovery (when feature flag enabled)
  - Metadata support for categorization and filtering
  - Enhanced tool information methods

- **Consolidated Configuration**: Centralized configuration management
  - `config/features.ts`: Feature flag management
  - `config/default.ts`: Default configurations
  - Environment-specific settings

### Improvements

- Single entry point (`src/index.ts`) for all server startup scenarios
- Consistent module structure with clear boundaries
- Reduced code duplication and maintenance burden
- Better separation between core and experimental features
- Improved testability with feature flag control

### Deprecations (Backward Compatible)

The following are deprecated but still functional with warnings:

- `src/index-registry.ts` → Use `src/index.ts`
- `src/server/index-enhanced.ts` → Features integrated into main server
- `src/server/tool-registry-enhanced.ts` → Features merged into `ToolRegistry`
- `validateEnvironment()` → Use `getConfig()` from `config/index.js`
- `createAndConfigureToolRegistry()` → Use `DeepSourceMCPServer.create()`

### Migration

- No breaking changes - existing code continues to work
- See MIGRATION.md for detailed migration instructions
- Deprecation warnings guide users to new patterns
- Feature flags default to `false` for backward compatibility

### Technical Details

- Eliminates circular dependencies
- Follows SOLID principles and DRY
- Maintains 100% backward compatibility
- Sets foundation for future extensibility
