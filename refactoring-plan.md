# DeepSource MCP Server Architectural Improvement Plan

## Executive Summary

This plan outlines focused architectural improvements for the DeepSource MCP server, emphasizing handler architecture, domain modeling, client redesign, error handling, and testing infrastructure while maintaining DDD, SOLID, and DRY principles.

## 1. Handler Architecture Refactoring

### Current Issues:
- Inconsistent handler patterns (some use dependency injection, others don't)
- Direct environment variable access in handlers
- Mixed responsibilities between MCP tool registration and business logic
- Repetitive error handling and response formatting

### Proposed Improvements:

#### 1.1 Standardize Handler Pattern
- Create a unified handler factory pattern for all handlers
- Move all business logic out of the main index.ts file
- Implement consistent dependency injection across all handlers

#### 1.2 Handler Middleware System
- Implement a middleware pipeline for cross-cutting concerns:
  - Request validation
  - Error handling and classification
  - Response formatting
  - Logging and metrics

#### 1.3 Tool Registration Abstraction
- Create a ToolRegistry class to manage tool definitions
- Separate tool schema definitions from handler logic
- Implement automatic tool discovery and registration

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

## Implementation Priority

### Phase 1 (Week 1): Foundation
- Standardize handler patterns
- Implement basic middleware system
- Create core domain models

### Phase 2 (Week 2): Client & Repository Layer
- Split monolithic client into domain-specific clients
- Implement repository interfaces
- Add GraphQL query builder

### Phase 3 (Week 3): Error Handling & Testing
- Enhance error handling with MCP standards
- Implement comprehensive test harness
- Add integration tests

### Phase 4 (Week 4): Refinement
- Complete tool registration abstraction
- Add remaining domain aggregates
- Enhance type safety throughout

## Success Metrics

- Clear separation of concerns with defined domain boundaries
- 90%+ test coverage across all modules
- Consistent error handling with proper MCP error codes
- Modular, maintainable codebase following SOLID principles
- Improved developer experience with clear abstractions