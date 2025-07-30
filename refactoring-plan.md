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
- Domain layer foundation (base classes and interfaces)
- Value objects implementation (ThresholdValue, MetricValue, IssueCount, CoveragePercentage)
- Project aggregate with repository interface
- AnalysisRun aggregate with repository interface
- QualityMetrics aggregate with repository interface
- ComplianceReport aggregate with repository interface
- Complete domain layer implementation summary documentation
- Unit tests for base domain classes (ValueObject, Entity, AggregateRoot)
- Unit tests for all value objects (ThresholdValue, MetricValue, IssueCount, CoveragePercentage)
- Unit tests for Project aggregate
- ESLint configuration fixes for test environment
- CI pipeline fixes for domain layer tests

### 🚧 In Progress
- Unit tests for remaining domain aggregates (AnalysisRun, QualityMetrics, ComplianceReport)

### 📋 Pending
- MCP server extraction
- Repository pattern concrete implementations
- Client architecture redesign
- Error handling enhancement
- Testing infrastructure improvements
- Domain layer integration with handlers

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

#### 2.1 Domain Aggregate Design ✅ Complete
- Create proper aggregates for:
  - ✅ Project (root: includes repository info, configuration)
  - ✅ AnalysisRun (root: includes issues, summaries)
  - ✅ QualityMetrics (root: includes thresholds, history)
  - ✅ ComplianceReport (root: includes stats, trends)

**Implementation Details (Days 3-4):**
- Created complete domain layer structure under `src/domain/`
- Implemented base building blocks:
  - `ValueObject`: Base class for immutable value objects with deep equality
  - `Entity`: Base class with unique identity
  - `AggregateRoot`: Base class with domain event support
  - `IRepository`: Repository pattern interface with pagination
- Created value objects:
  - `ThresholdValue`: Metric thresholds with validation and evaluation
  - `MetricValue`: Metric measurements with units and change calculations
  - `IssueCount`: Non-negative integer counts with arithmetic operations
  - `CoveragePercentage`: Specialized coverage metrics with level categorization
- Implemented all aggregates:
  - `Project`: Complete with status management and domain events
  - `AnalysisRun`: With state transitions and issue tracking
  - `QualityMetrics`: With threshold evaluation and trend analysis
  - `ComplianceReport`: With severity distribution and compliance scoring
- Created comprehensive implementation summary documentation
- All code passes linting, type checking, and CI pipeline (1076 tests, 79.15% coverage)

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

### Phase 2 (Week 2): Domain & Repository Layer ✅ Partially Complete
- ~~Complete remaining handler refactoring~~ ✅ Done (Day 2)
- ~~Implement domain aggregates~~ ✅ Done (Days 3-4)
  - ✅ Project aggregate with repository interface
  - ✅ AnalysisRun aggregate with repository interface
  - ✅ QualityMetrics aggregate with repository interface
  - ✅ ComplianceReport aggregate with repository interface
- ~~Create repository interfaces~~ ✅ Done (Days 3-4)
- 🚧 Create unit tests for domain components (Day 5)
  - ✅ Base domain classes (ValueObject, Entity, AggregateRoot)
  - ✅ All value objects (ThresholdValue, MetricValue, IssueCount, CoveragePercentage) 
  - ✅ Project aggregate with comprehensive test coverage
  - ✅ ESLint configuration fixes for test environment
  - 🚧 AnalysisRun aggregate tests (pending)
  - 🚧 QualityMetrics aggregate tests (pending)
  - 🚧 ComplianceReport aggregate tests (pending)
- 📋 Implement concrete repository implementations (Days 5-6)
- 📋 Split monolithic client into domain-specific clients (Days 7-8)
- 📋 Add GraphQL query builder (Days 9-10)

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

### Next Steps (Phase 2 Continued)
1. ~~Complete remaining domain aggregates (QualityMetrics, ComplianceReport)~~ ✅ Done
2. 🚧 Create unit tests for all domain components (Day 5)
   - ✅ Base domain classes and value objects complete
   - ✅ Project aggregate tests complete with 93.67% coverage
   - ✅ ESLint configuration fixes for test environment
   - 🚧 Remaining aggregate tests (AnalysisRun, QualityMetrics, ComplianceReport)
3. Implement concrete repository classes using DeepSourceClient
4. Create mappers between domain models and API responses
5. Split monolithic client into domain-specific clients
6. Update handlers to use domain aggregates via repositories

## Phase 2 Domain Layer Implementation Summary

### Completed Tasks (Days 3-4)
1. **Domain Layer Foundation**
   - Created complete directory structure: `src/domain/{aggregates,value-objects,shared}`
   - Implemented base classes following DDD patterns
   - Added support for domain events and repository pattern

2. **Value Objects Implementation**
   - `ThresholdValue`: Encapsulates metric thresholds with min/max validation
   - `MetricValue`: Represents measurements with units and timestamps
   - `IssueCount`: Non-negative integer counts with arithmetic operations
   - `CoveragePercentage`: Specialized 0-100% coverage metrics with levels

3. **All Domain Aggregates Complete**
   - **Project Aggregate**:
     - Status management (ACTIVE/INACTIVE/ARCHIVED)
     - Configuration and repository information
     - Business methods: activate(), deactivate(), archive(), update()
     - Domain events for all state changes
   - **AnalysisRun Aggregate**:
     - State machine for run status transitions
     - Issue occurrence tracking
     - Automatic summary calculation
     - Domain events for lifecycle changes
   - **QualityMetrics Aggregate**:
     - Composite key (projectKey:metricKey:shortcode)
     - Threshold evaluation and compliance checking
     - Metric history tracking and trend analysis
     - Configuration management for reporting
   - **ComplianceReport Aggregate**:
     - Composite key (projectKey:reportType)
     - Status state machine (PENDING → GENERATING → READY/ERROR)
     - Severity distribution and compliance scoring
     - Category tracking and trend comparison

4. **Repository Interfaces**
   - `IProjectRepository`: Project-specific queries
   - `IAnalysisRunRepository`: Run queries with pagination
   - `IQualityMetricsRepository`: Metric queries with filtering
   - `IComplianceReportRepository`: Compliance report queries
   - Base repository pattern with strong typing

### Key Design Decisions
1. **Immutability**: All value objects are immutable with factory methods
2. **Type Safety**: Extensive use of branded types and TypeScript features
3. **Domain Events**: Every state change emits events for tracking
4. **Validation**: Business rules enforced at construction/method level
5. **Separation**: Clear boundaries between domain logic and infrastructure

### Test Results (Updated Day 5)
- All existing tests pass (1076 tests)
- Code coverage improved to 79.15% overall
- Comprehensive domain layer test coverage:
  - Base classes: 100% coverage with edge case testing
  - Value objects: 100% coverage with immutability verification
  - Project aggregate: 93.67% coverage with business logic validation
- All linting and type checking passes
- CI pipeline successful with ESLint configuration fixes
- Domain layer ready for integration

### Integration Points
- Uses existing branded types from `src/types/`
- Compatible with current models in `src/models/`
- Ready for handler integration via repositories
- Can leverage existing DeepSourceClient

## Phase 2 Continued: Domain Testing Progress (Day 5)

### Completed Testing Tasks
1. **Base Domain Classes Testing**
   - `ValueObject`: Deep equality testing, immutability verification, nested object handling
   - `Entity`: Identity-based equality, inheritance behavior validation
   - `AggregateRoot`: Domain event accumulation, clearing, and payload validation

2. **Value Objects Comprehensive Testing**  
   - `ThresholdValue`: Validation, equality, immutability, percentage shortcuts
   - `MetricValue`: Units, timestamps, change calculations, trend analysis
   - `IssueCount`: Non-negative validation, arithmetic operations, category handling
   - `CoveragePercentage`: Range validation, level categorization, specialized methods

3. **Project Aggregate Full Coverage**
   - Business logic: activate(), deactivate(), archive(), update() methods
   - State transitions with proper validation and business rules
   - Domain event emission for all state changes
   - Repository pattern integration (fromPersistence/toPersistence)
   - Edge cases: validation errors, already active/inactive states

4. **CI Pipeline Fixes**
   - ESLint configuration updated to support test globals (`setTimeout`, `global`)
   - Async test patterns with proper Promise handling
   - Test environment configuration for Node.js timer functions
   - All 1076 tests passing with 79.15% overall coverage

### Current Status
- **Completed**: Base classes, value objects, Project aggregate (93.67% coverage)
- **Pending**: AnalysisRun, QualityMetrics, ComplianceReport aggregate tests
- **Infrastructure**: Test environment fully configured and working
- **Quality**: All code passes linting, type checking, and formatting requirements

### Next Immediate Tasks
1. Create tests for AnalysisRun aggregate (status transitions, issue tracking)
2. Create tests for QualityMetrics aggregate (threshold evaluation, trend analysis)  
3. Create tests for ComplianceReport aggregate (severity distribution, scoring)
4. Achieve 90%+ coverage for all domain components