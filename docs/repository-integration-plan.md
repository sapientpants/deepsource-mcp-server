# Repository Factory Integration Plan

## Overview

This document outlines the plan for integrating the repository factory pattern with the main MCP server. The architecture has been prepared but not yet integrated to maintain backward compatibility and avoid breaking changes.

## Current State

### Completed Work

1. **Domain Layer** (✅ Complete)
   - All domain aggregates implemented (Project, AnalysisRun, QualityMetrics, ComplianceReport)
   - Value objects with business logic
   - Repository interfaces defined
   - Comprehensive test coverage

2. **Infrastructure Layer** (✅ Complete)
   - Repository implementations using DeepSourceClient
   - Mappers for API/Domain transformation
   - Repository factory for dependency injection
   - Fresh data retrieval on every request

3. **Handler Updates** (✅ Complete)
   - All handlers updated to support repository pattern
   - Domain-based handler functions created
   - Backward compatibility maintained with existing handlers

4. **Tool Registry System** (✅ Complete)
   - ToolRegistry class for managing MCP tools
   - Centralized tool definitions
   - Type-safe tool registration

## Integration Challenges

### Type Compatibility

The main challenge is type compatibility between:
- **Tool Schemas**: Use primitive types (string, number)
- **Handler Interfaces**: Expect branded types (ProjectKey, MetricKey, etc.)
- **MCP Requirements**: Strict typing for tool registration

### Example Issue

```typescript
// Tool schema expects
metricKey: z.string()

// Handler expects
metricKey: MetricKey // Branded type

// Current workaround
metricKey: params.metricKey as MetricKey
```

## Proposed Solution

### Option 1: Type Adapter Layer (Recommended)

Create adapter functions that handle type conversion:

```typescript
// adapters/handler-adapters.ts
export function adaptUpdateMetricThresholdParams(params: any): DeepsourceUpdateMetricThresholdParams {
  return {
    ...params,
    metricKey: params.metricKey as MetricKey,
    metricShortcode: params.metricShortcode as MetricShortcode,
  };
}

// In index.ts
toolRegistry.registerTool({
  ...updateMetricThresholdToolSchema,
  handler: async (params) => {
    const adaptedParams = adaptUpdateMetricThresholdParams(params);
    return createUpdateMetricThresholdHandler(deps)(adaptedParams);
  },
});
```

### Option 2: Schema Updates

Update tool schemas to use branded types:

```typescript
// tool-definitions.ts
export const updateMetricThresholdToolSchema = {
  inputSchema: z.object({
    metricKey: z.string().transform((val) => val as MetricKey),
    // ...
  }),
};
```

### Option 3: Handler Wrappers

Create wrapper functions that handle the conversion:

```typescript
export function wrapHandler<TInput, TOutput>(
  handler: HandlerFunction<TInput>,
  adapter: (params: any) => TInput
): HandlerFunction<any> {
  return async (params) => {
    const adapted = adapter(params);
    return handler(adapted);
  };
}
```

## Implementation Steps

### Phase 1: Preparation

1. Create type adapter functions for all handlers
2. Test adapters with unit tests
3. Document type conversions

### Phase 2: Integration

1. Create new `index-registry.ts` using ToolRegistry
2. Integrate repository factory
3. Use adapted handlers
4. Test all tools end-to-end

### Phase 3: Migration

1. Run both versions in parallel for testing
2. Validate all tools work correctly
3. Switch to new implementation
4. Remove old implementation

## Benefits of Integration

1. **Clean Architecture**: Clear separation of concerns
2. **Type Safety**: Strong typing throughout
3. **Testability**: Easier to mock and test
4. **Maintainability**: Centralized tool management
5. **Fresh Data**: Repository pattern ensures no stale data

## Testing Strategy

1. **Unit Tests**: Test each adapter function
2. **Integration Tests**: Test tool registration
3. **E2E Tests**: Test complete tool execution
4. **Regression Tests**: Ensure backward compatibility

## Rollback Plan

If issues arise:
1. Keep old index.ts as backup
2. Can quickly revert to original implementation
3. All handlers maintain backward compatibility

## Future Enhancements

1. **Domain Events**: Implement event sourcing
2. **Caching Strategy**: Add optional caching layer
3. **GraphQL Optimization**: Batch queries
4. **Error Recovery**: Implement retry strategies

## Conclusion

The architecture is ready for integration. The main challenge is type compatibility, which can be solved with adapter functions. This approach maintains backward compatibility while providing all the benefits of the domain-driven design.