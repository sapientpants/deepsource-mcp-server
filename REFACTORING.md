# Refactoring Recommendations for DeepSource MCP Server

This document outlines recommended refactoring strategies to improve the maintainability, readability, and long-term sustainability of the DeepSource MCP Server codebase.

## Executive Summary

The codebase demonstrates good architectural separation with client, handlers, models, and utilities layers. However, several areas would benefit from refactoring to reduce complexity, improve testability, and enhance maintainability. Key priorities include breaking up large files, reducing code duplication in tool registration, and improving type safety.

## High Priority Refactoring Recommendations

### 1. Break Up the Monolithic index.ts File ✅

**Current Issue**: The `src/index.ts` file is 1,230 lines long and contains repetitive tool registration code that makes it difficult to maintain and prone to copy-paste errors.

**Status**: PARTIALLY COMPLETE - Extracted common error handling and logging functions to `src/server/tool-helpers.ts`. This reduced duplication in error handling logic across all tool handlers.

**Recommendation**: 
- Extract tool registration logic into a dedicated module (`src/server/tool-registry.ts`)
- Create a configuration-driven approach for tool registration
- Implement a `ToolRegistrar` class that encapsulates registration patterns

**Implementation Strategy**:
```typescript
// src/server/tool-registry.ts
interface ToolDefinition {
  name: string;
  description: string;
  handler: Function;
  inputSchema?: ZodSchema;
  outputSchema?: ZodSchema;
}

class ToolRegistrar {
  constructor(private server: McpServer) {}
  
  registerTool(definition: ToolDefinition): void {
    // Centralized registration logic with error handling
  }
  
  registerBatch(definitions: ToolDefinition[]): void {
    definitions.forEach(def => this.registerTool(def));
  }
}

// src/server/tool-definitions.ts
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'projects',
    description: 'List all available DeepSource projects',
    handler: handleProjects,
    outputSchema: projectsOutputSchema,
  },
  // ... other tools
];
```

**Benefits**:
- Reduces index.ts from 1,230 lines to ~100 lines
- Eliminates repetitive code patterns
- Makes adding new tools easier and less error-prone
- Improves testability of tool registration logic

### 2. Split deepsource.ts Into Focused Modules ⚠️

**Current Issue**: The `src/deepsource.ts` file mixes type definitions, interfaces, enums, and the DeepSourceClient implementation, violating the Single Responsibility Principle.

**Status**: ATTEMPTED - Tried to extract types and utilities but encountered compatibility issues due to:
- Different interface definitions between deepsource.ts and existing models
- Complex interdependencies that make extraction difficult
- Risk of breaking backward compatibility

**Recommendation**: 
- Move all type definitions to appropriate files in `src/types/`
- Move interface definitions to `src/models/`
- Keep only the DeepSourceClient class in `src/deepsource.ts`
- Consider breaking DeepSourceClient into smaller, domain-specific clients

**Implementation Strategy**:
```
src/
├── types/
│   ├── report-types.ts    # ReportType, ReportStatus enums
│   ├── vulnerability.ts   # Vulnerability severity, fixability types
│   └── analysis.ts        # AnalysisRunStatus type
├── models/
│   ├── compliance.ts      # ComplianceReport, SecurityIssueStat interfaces
│   ├── vulnerabilities.ts # Vulnerability, VulnerabilityOccurrence interfaces
│   └── pagination.ts      # PaginationParams, PaginatedResponse interfaces
└── client/
    └── deepsource-client.ts # Focused client implementation
```

**Benefits**:
- Improved code organization and discoverability
- Easier to maintain and extend individual domains
- Reduced file size and complexity
- Better alignment with the existing architecture

### 3. Implement a Tool Response Builder Pattern ⚠️

**Current Issue**: Each tool handler has repetitive response building logic with similar error handling patterns.

**Status**: ATTEMPTED - Created a response builder but encountered type compatibility issues with MCP SDK's CallToolResult type expectations. The SDK has specific requirements for the response structure that make a generic builder pattern difficult.

**Recommendation**: 
Create a ResponseBuilder utility that standardizes response construction and error handling.

**Implementation Strategy**:
```typescript
// src/utils/response-builder.ts
class ToolResponseBuilder<T> {
  private content: any[] = [];
  private isError = false;
  
  static success<T>(data: T): ToolResponse {
    return new ToolResponseBuilder<T>()
      .withData(data)
      .build();
  }
  
  static error(error: Error | string): ToolResponse {
    return new ToolResponseBuilder()
      .withError(error)
      .build();
  }
  
  withData(data: T): this {
    this.content.push({
      type: 'text',
      text: JSON.stringify(data)
    });
    return this;
  }
  
  withError(error: Error | string): this {
    this.isError = true;
    const errorMessage = error instanceof Error ? error.message : error;
    this.content.push({
      type: 'text',
      text: errorMessage
    });
    return this;
  }
  
  build(): ToolResponse {
    return {
      content: this.content,
      isError: this.isError,
      structuredContent: this.parseStructuredContent()
    };
  }
}
```

**Benefits**:
- Consistent response format across all tools
- Centralized error handling logic
- Reduced boilerplate code in handlers
- Easier to add new response features

### 4. Reduce GraphQL Query Processing Complexity

**Current Issue**: The `processRunChecksResponse` method in `deepsource.ts` has deeply nested object access with complex optional chaining.

**Recommendation**: 
- Implement a GraphQL response processor using a schema validation approach
- Create dedicated processors for each query type
- Use a Result type pattern for safer data extraction

**Implementation Strategy**:
```typescript
// src/utils/graphql/processors/run-checks-processor.ts
import { z } from 'zod';

const RunChecksResponseSchema = z.object({
  data: z.object({
    run: z.object({
      checks: z.object({
        edges: z.array(z.object({
          node: RunCheckNodeSchema
        }))
      })
    }).optional()
  }).optional()
});

export class RunChecksProcessor {
  static process(response: unknown): Result<ProcessedRunChecks> {
    const validated = RunChecksResponseSchema.safeParse(response);
    
    if (!validated.success) {
      return Result.error('Invalid response format');
    }
    
    // Process with confidence in the structure
    return Result.ok(this.extractIssues(validated.data));
  }
}
```

**Benefits**:
- Type-safe response processing
- Clear error messages for malformed responses
- Easier to test and maintain
- Reduced cognitive complexity

### 5. Simplify Test Mocking Strategy

**Current Issue**: Tests require complex mock setups due to tight coupling between modules.

**Recommendation**: 
- Implement dependency injection for better testability
- Create factory functions for common test scenarios
- Use interface-based programming for easier mocking

**Implementation Strategy**:
```typescript
// src/handlers/projects.ts
export interface ProjectsHandlerDeps {
  clientFactory: ClientFactory;
  logger: Logger;
}

export function createProjectsHandler(deps: ProjectsHandlerDeps) {
  return async function handleProjects(): Promise<ApiResponse> {
    // Implementation using injected dependencies
  };
}

// In tests:
const mockDeps = {
  clientFactory: createMockClientFactory(),
  logger: createMockLogger()
};
const handler = createProjectsHandler(mockDeps);
```

**Benefits**:
- Simplified test setup
- Better isolation of units under test
- Easier to test edge cases
- Reduced test maintenance burden

## Medium Priority Refactoring Recommendations

### 6. Implement Consistent Error Categories

**Current Issue**: While error categories exist, they're not consistently used throughout the codebase.

**Recommendation**: 
- Create domain-specific error classes that extend ClassifiedError
- Implement error mapping at API boundaries
- Add error recovery strategies for each category

### 7. Extract Common Patterns into Higher-Order Functions

**Current Issue**: Similar patterns appear in multiple handlers (API key validation, client creation, response formatting).

**Recommendation**: 
- Create higher-order functions for common handler patterns
- Implement middleware-style processing for cross-cutting concerns

### 8. Improve Configuration Management ✅

**Current Issue**: Configuration is scattered between environment variables and hardcoded values.

**Status**: COMPLETE - Created a centralized configuration module with validation and default values. Updated the projects handler to use the new config module.

**Recommendation**: 
- Centralize configuration in a dedicated module
- Implement configuration validation on startup
- Support configuration profiles for different environments

## Low Priority Refactoring Recommendations

### 9. Optimize Import Structure

**Current Issue**: Some files have many imports that could be consolidated.

**Recommendation**: 
- Create barrel exports for related modules
- Implement clear import ordering rules
- Use path aliases for cleaner imports

### 10. Add Performance Monitoring Hooks

**Current Issue**: No built-in performance monitoring for API calls.

**Recommendation**: 
- Add timing measurements to GraphQL queries
- Implement performance logging for slow operations
- Create performance dashboards for monitoring

## Implementation Roadmap

### Phase 1 (Weeks 1-2): Foundation
1. Break up index.ts file
2. Implement ToolResponseBuilder pattern
3. Add comprehensive tests for refactored components

### Phase 2 (Weeks 3-4): Core Improvements
1. Split deepsource.ts into focused modules
2. Implement GraphQL response processors
3. Refactor error handling to use consistent patterns

### Phase 3 (Weeks 5-6): Testing & Quality
1. Implement dependency injection pattern
2. Simplify test mocking strategy
3. Add integration tests for refactored components

### Phase 4 (Weeks 7-8): Polish
1. Optimize import structure
2. Add performance monitoring
3. Update documentation for new patterns

## Success Metrics

- **Code Complexity**: Reduce cyclomatic complexity by 40%
- **File Size**: No single file larger than 300 lines
- **Test Coverage**: Maintain or improve current coverage levels
- **Build Time**: No increase in build times
- **Development Velocity**: 25% reduction in time to add new tools

## Risks and Mitigation

### Risk: Breaking Changes
**Mitigation**: Implement changes behind feature flags, maintain backward compatibility during transition period.

### Risk: Test Suite Disruption
**Mitigation**: Refactor tests incrementally, maintain parallel test suites during transition.

### Risk: Performance Regression
**Mitigation**: Add performance benchmarks before refactoring, monitor key metrics during implementation.

## Conclusion

These refactoring recommendations focus on improving maintainability while preserving the existing functionality. The phased approach allows for incremental improvements with minimal disruption to ongoing development. Priority should be given to the high-impact changes that will provide immediate benefits to developer productivity and code quality.