# DeepSource MCP Server Architectural Improvement Plan

## Executive Summary

This plan outlines focused architectural improvements for the DeepSource MCP server, emphasizing handler architecture, domain modeling, client redesign, error handling, and testing infrastructure while maintaining DDD, SOLID, and DRY principles.

## Progress Tracker

### ✅ Completed
- Base handler infrastructure (handler.interface.ts, handler.factory.ts)
- Tool registry system (tool-registry.ts)
- Centralized tool definitions (tool-definitions.ts)
- Quality metrics handler refactoring
- Compliance reports handler refactoring
- Project issues handler refactoring
- Project runs handler refactoring
- Run handler refactoring
- Recent run issues handler refactoring
- Dependency vulnerabilities handler refactoring
- Updated integration tests for new error handling pattern

### 🚧 In Progress
- None

### 📋 Pending
- MCP server extraction
- Domain modeling improvements
- Client architecture redesign
- Error handling enhancement
- Testing infrastructure improvements

## 1. Handler Architecture Refactoring

### Current Issues:
- ~~Inconsistent handler patterns (some use dependency injection, others don't)~~ ✅ Partially resolved
- ~~Direct environment variable access in handlers~~ ✅ Partially resolved
- Mixed responsibilities between MCP tool registration and business logic
- ~~Repetitive error handling and response formatting~~ ✅ Partially resolved

### Proposed Improvements:

#### 1.1 Standardize Handler Pattern ✅ In Progress
- ~~Create a unified handler factory pattern for all handlers~~ ✅ Done
- Move all business logic out of the main index.ts file
- ~~Implement consistent dependency injection across all handlers~~ ✅ Partially done

**Implementation Details:**
- Created `BaseHandlerDeps` interface for common dependencies
- Implemented `createBaseHandlerFactory` for consistent handler creation
- Added `HandlerFunction` and `HandlerFactory` types for type safety
- Handlers now receive dependencies via factory pattern instead of direct env access

**All Handlers Successfully Refactored:**
- [x] quality-metrics.ts
- [x] compliance-reports.ts
- [x] project-issues.ts
- [x] project-runs.ts
- [x] run.ts
- [x] recent-run-issues.ts
- [x] dependency-vulnerabilities.ts

#### 1.2 Handler Middleware System ✅ Partially Implemented
- ~~Implement a middleware pipeline for cross-cutting concerns:~~ ✅ Basic implementation done
  - ~~Request validation~~ ✅ Via Zod in ToolRegistry
  - ~~Error handling and classification~~ ✅ In createBaseHandlerFactory
  - ~~Response formatting~~ ✅ Via wrapInApiResponse
  - ~~Logging and metrics~~ ✅ In createBaseHandlerFactory

**Implementation Details:**
- Error handling centralized in `createBaseHandlerFactory`
- Logging automatically captures handler invocation, success, and errors
- Response formatting handled by `wrapInApiResponse` helper

#### 1.3 Tool Registration Abstraction ✅ Done
- ~~Create a ToolRegistry class to manage tool definitions~~ ✅ Done
- ~~Separate tool schema definitions from handler logic~~ ✅ Done
- ~~Implement automatic tool discovery and registration~~ ✅ Done

**Implementation Details:**
- Created `ToolRegistry` class with type-safe tool registration
- Tool definitions centralized in `tool-definitions.ts`
- Registry handles MCP server registration, validation, and response formatting
- Supports both Zod input/output validation and automatic error handling

## 2. Domain Modeling Improvements

### Current Issues:
- Loose domain boundaries between different concerns
- Missing aggregate roots for complex entities
- Insufficient use of branded types throughout the codebase

### Proposed Improvements:

#### 2.1 Domain Aggregate Design
- Create proper aggregates for:
  - Project (root: includes issues, runs, metrics)
  - AnalysisRun (root: includes issues, summaries)
  - QualityMetrics (root: includes thresholds, history)
  - ComplianceReport (root: includes stats, trends)

#### 2.2 Repository Pattern Implementation
- Create repository interfaces for each aggregate
- Implement caching strategies at the repository level
- Separate read and write operations (CQRS-lite)

#### 2.3 Enhanced Type Safety
- Extend branded types usage to all identifiers
- Create value objects for complex values (e.g., ThresholdValue, MetricValue)
- Implement discriminated unions for all status/state fields

## 3. Client Architecture Redesign

### Current Issues:
- Monolithic DeepSourceClient with too many responsibilities
- Missing abstraction layers between GraphQL and domain logic
- Inconsistent error handling across client methods

### Proposed Improvements:

#### 3.1 Client Modularization
- Split DeepSourceClient into domain-specific clients:
  - ProjectsClient (already exists)
  - IssuesClient
  - RunsClient
  - MetricsClient
  - ComplianceClient
  - VulnerabilityClient

#### 3.2 GraphQL Query Builder
- Create a fluent query builder for GraphQL operations
- Implement query composition and fragment reuse
- Add query result caching with proper invalidation

#### 3.3 Connection Management
- Implement proper HTTP client configuration
- Add retry logic with exponential backoff
- Implement circuit breaker pattern for API failures

## 4. Error Handling Enhancement

### Current Issues:
- Inconsistent error classification and handling
- Missing MCP-specific error codes
- Poor error context propagation

### Proposed Improvements:

#### 4.1 MCP Error Standardization
- Map all errors to proper MCP error codes
- Implement error context preservation
- Create error recovery strategies for transient failures

#### 4.2 Error Middleware
- Centralize error handling in middleware
- Add user-friendly error messages with actionable steps
- Implement proper error logging and categorization

## 5. Testing Infrastructure

### Current Issues:
- Test coverage gaps in error scenarios
- Missing integration tests for MCP protocol
- Insufficient mock infrastructure

### Proposed Improvements:

#### 5.1 Test Harness Enhancement
- Create MCP protocol test harness
- Add contract testing for GraphQL queries
- Implement scenario-based testing for error cases

#### 5.2 Mock Infrastructure
- Create comprehensive mock servers
- Implement fixture-based testing
- Add test utilities for common scenarios

## Implementation Priority (Updated)

### Phase 1 (Week 1): Foundation ✅ Complete
- ~~Standardize handler patterns~~ ✅ Done for all 7 handlers
- ~~Implement basic middleware system~~ ✅ Done via factory pattern
- ~~Create core domain models~~ 📋 Pending (moved to Phase 2)

**Actual Progress:** 
- Day 1: Created base infrastructure (handler interfaces, factory, tool registry)
- Day 2: Refactored all 7 handlers to use dependency injection pattern
- Discovered that factory pattern provides sufficient middleware functionality
- Tool registry implementation was more complex than anticipated due to MCP type requirements
- All handlers now have consistent error handling, logging, and response formatting

### Phase 2 (Week 2): Client & Repository Layer
- Complete remaining handler refactoring (Days 3-4)
- Split monolithic client into domain-specific clients (Days 5-6)
- Implement repository interfaces (Day 7)
- Add GraphQL query builder (Days 8-9)

### Phase 3 (Week 3): Error Handling & Testing
- Enhance error handling with MCP standards
- Implement comprehensive test harness
- Add integration tests
- Increase test coverage for new components

### Phase 4 (Week 4): Refinement
- Complete tool registration abstraction
- Add remaining domain aggregates
- Enhance type safety throughout
- Documentation and final cleanup

## Success Metrics

- Clear separation of concerns with defined domain boundaries
- 90%+ test coverage across all modules
- Consistent error handling with proper MCP error codes
- Modular, maintainable codebase following SOLID principles
- Improved developer experience with clear abstractions

## Lessons Learned (So Far)

### What Worked Well
1. **Factory Pattern**: The `createBaseHandlerFactory` provided an elegant solution for:
   - Consistent error handling
   - Automatic logging
   - Dependency injection
   - Response formatting

2. **Type Safety**: Strong typing with `HandlerFunction` and `HandlerFactory` types caught issues early

3. **Centralized Tool Definitions**: Having all Zod schemas in one place improves maintainability

### Challenges Encountered
1. **MCP Type Compatibility**: The MCP server has specific type requirements that needed careful handling:
   - Required `Record<string, unknown>` for handler parameters
   - Response format must include `content` array
   - Had to create custom `McpResponse` type for proper typing

2. **ESLint Configuration**: Some patterns (like factory functions) triggered unused variable warnings that needed suppression

3. **Test Coverage**: New infrastructure components (tool-registry, tool-definitions) need comprehensive tests

### Recommendations for Next Phase
1. **Handler Refactoring**: Use the established pattern consistently:
   ```typescript
   export const createXHandler = createBaseHandlerFactory('handler_name', async (deps, params) => {
     // Implementation
   });
   ```

2. **Test First**: Write tests for new components before implementation

3. **Incremental Commits**: Commit after each handler refactoring to maintain a clean history

4. **Type Assertions**: Be careful with type assertions - prefer proper typing over `as unknown as Type`

## Quick Reference for Continuing the Refactoring

### Handler Refactoring Template
```typescript
// 1. Import dependencies
import { BaseHandlerDeps } from './base/handler.interface.js';
import { createBaseHandlerFactory, wrapInApiResponse, createDefaultHandlerDeps } from './base/handler.factory.js';
import { createLogger } from '../utils/logging/logger.js';

// 2. Create logger
const logger = createLogger('HandlerName');

// 3. Create handler with factory
export const createHandlerName = createBaseHandlerFactory(
  'tool_name',
  async (deps, params: ParamsType) => {
    const apiKey = deps.getApiKey();
    const client = new DeepSourceClient(apiKey);
    
    // Handler logic here
    const result = await client.someMethod(params);
    
    // Format response
    return wrapInApiResponse(result);
  }
);

// 4. Export public function
export async function handleHandlerName(params: ParamsType) {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createHandlerName(deps);
  return handler(params);
}
```

### Checklist for Each Handler
- [ ] Remove direct `process.env` access
- [ ] Add dependency injection via factory pattern
- [ ] Use `wrapInApiResponse` for consistent formatting
- [ ] Add proper logging with handler-specific logger
- [ ] Update imports to use base handler utilities
- [ ] Ensure all tests still pass
- [ ] Check TypeScript compilation
- [ ] Run linter and fix any issues

## Phase 1 Completion Summary

### Completed Tasks
1. **Base Infrastructure** (Day 1)
   - Created handler interfaces and factory pattern
   - Implemented tool registry for MCP integration
   - Centralized tool definitions with Zod schemas

2. **Handler Refactoring** (Day 2)
   - Refactored all 7 handlers to use dependency injection
   - Removed direct environment variable access from handlers
   - Standardized error handling across all handlers
   - Added consistent logging to all handlers
   - Updated integration tests for new error handling pattern

### Key Benefits Achieved
1. **Consistency**: All handlers now follow the same pattern
2. **Testability**: Dependency injection makes handlers easier to test
3. **Maintainability**: Centralized error handling and logging
4. **Type Safety**: Strong typing throughout with proper interfaces
5. **Separation of Concerns**: Business logic separated from infrastructure

### Test Coverage
- All tests passing (752 tests)
- Overall coverage: 86% statements, 78% branches
- Handler coverage: 100% statements

### Next Steps (Phase 2)
1. Split monolithic client into domain-specific clients
2. Implement repository pattern for aggregates
3. Create MCP server extraction
4. Add comprehensive tests for new infrastructure components