# Changelog

## 1.5.0

### Minor Changes

- [#162](https://github.com/sapientpants/deepsource-mcp-server/pull/162) [`56d4985`](https://github.com/sapientpants/deepsource-mcp-server/commit/56d4985bb76ef7753b59f34d215337d25ed46c9d) Thanks [@sapientpants](https://github.com/sapientpants)! - feat: implement true pagination for all list queries

  Adds comprehensive cursor-based pagination support across all list endpoints to handle large datasets efficiently and provide deterministic, complete results.

  ## New Features
  - **Multi-page fetching**: Automatically fetch multiple pages with `max_pages` parameter
  - **Page size control**: Use convenient `page_size` parameter (alias for `first`)
  - **Enhanced metadata**: User-friendly pagination metadata in responses
  - **Backward compatibility**: Existing queries work without changes

  ## Supported Endpoints

  All list endpoints now support full pagination:
  - `projects`
  - `project_issues`
  - `runs`
  - `recent_run_issues`
  - `dependency_vulnerabilities`
  - `quality_metrics`

  ## Usage

  ```javascript
  // Fetch up to 5 pages of 50 items each
  {
    projectKey: "my-project",
    page_size: 50,
    max_pages: 5
  }

  // Traditional cursor-based pagination still works
  {
    projectKey: "my-project",
    first: 20,
    after: "cursor123"
  }
  ```

  ## Response Format

  Responses now include both standard `pageInfo` and enhanced `pagination` metadata:

  ```javascript
  {
    items: [...],
    pageInfo: { /* Relay-style pagination */ },
    pagination: {
      has_more_pages: true,
      next_cursor: "...",
      page_size: 50,
      pages_fetched: 3,
      total_count: 250
    }
  }
  ```

  ## Technical Implementation
  - **PaginationManager**: New orchestrator class for handling complex pagination scenarios
  - **AsyncIterator support**: Modern async iteration patterns for paginated results
  - **Bounded loops**: Replaced while loops with bounded for-loops to prevent infinite iterations
  - **Error resilience**: Graceful handling of null/undefined data in API responses

  ## Test Coverage Improvements
  - Added 200+ new tests for pagination functionality
  - Achieved 100% line coverage for critical components (`issues-client.ts`)
  - Comprehensive edge case testing (null data, missing fields, network errors)
  - Integration tests for multi-page fetching scenarios

  ## Performance Considerations
  - Single-page fetches remain unchanged for backward compatibility
  - Multi-page fetching is opt-in via `max_pages` parameter
  - Efficient cursor management reduces API calls
  - Response merging optimized for large datasets

  ## Migration Notes

  No breaking changes - existing code will continue to work without modifications. To leverage new pagination features:
  1. Add `page_size` parameter for clearer intent (replaces `first`)
  2. Add `max_pages` parameter to fetch multiple pages automatically
  3. Use the enhanced `pagination` metadata in responses for better UX

  This implementation ensures complete data retrieval for large DeepSource accounts without silent truncation or memory issues.

  Closes #152

## 1.4.2

### Patch Changes

- [#151](https://github.com/sapientpants/deepsource-mcp-server/pull/151) [`c7c4569`](https://github.com/sapientpants/deepsource-mcp-server/commit/c7c45697c4f3c9d07620614a47ff503c7e76015d) Thanks [@sapientpants](https://github.com/sapientpants)! - Update dependencies to latest versions
  - Updated pino from 9.9.0 to 9.9.4 (production dependency)
  - Updated @changesets/cli from 2.29.6 to 2.29.7
  - Updated @cyclonedx/cdxgen from 11.6.0 to 11.7.0
  - Updated @eslint/js from 9.34.0 to 9.35.0
  - Updated @types/node from 24.3.0 to 24.3.1
  - Updated @typescript-eslint/eslint-plugin from 8.42.0 to 8.43.0
  - Updated @typescript-eslint/parser from 8.40.0 to 8.43.0
  - Updated eslint from 9.34.0 to 9.35.0
  - Updated lint-staged from 16.1.5 to 16.1.6
  - Kept zod at 3.25.76 as requested (latest is 4.1.5)

  All tests passing, no breaking changes identified.

## 1.4.1

### Patch Changes

- [#142](https://github.com/sapientpants/deepsource-mcp-server/pull/142) [`04f7440`](https://github.com/sapientpants/deepsource-mcp-server/commit/04f744073131e99d4613ba661ccb93b090001ffc) Thanks [@sapientpants](https://github.com/sapientpants)! - Fixed TypeScript strict mode compatibility and integrated agentic-node-ts-starter template
  - Resolved hundreds of `exactOptionalPropertyTypes` errors across the codebase
  - Migrated test suite from Jest to Vitest
  - Enhanced CI/CD workflows with security scanning and validation
  - Added comprehensive linting tools (actionlint, markdownlint, yamllint)
  - Improved development tooling and scripts
  - Fixed all precommit check failures

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.4.0] - 2025-08-23

### Breaking Changes

- Removed misleading `start`, `dev`, and related test:server commands that don't work with MCP servers
- Renamed `format` and `format:check` commands for consistency with lint commands:
  - `format` now checks formatting (was `format:check`)
  - `format:fix` now fixes formatting (was `format`)

### Changed

- Updated dependencies to latest versions:
  - zod: 3.25.76 → 4.1.0 (major version upgrade)
  - @modelcontextprotocol/sdk: 1.17.3 → 1.17.4
  - @eslint/js: 9.33.0 → 9.34.0
  - eslint: 9.33.0 → 9.34.0
- Removed redundant `validate` script (use `ci` instead)

### Fixed

- Fixed Zod v4 breaking change by updating error property access from `.errors` to `.issues`
- Fixed MCP server documentation to clarify stdio communication requirements

### Documentation

- Significantly improved CLAUDE.md with better architecture overview and focused guidelines
- Reorganized and enhanced development commands documentation
- Added comprehensive error handling patterns with complete examples
- Added missing `clean` command to README
- Clarified that MCP servers cannot be run standalone

## [v1.3.2] - 2025-08-23

- Added commitlint support for conventional commits
- Upgraded to Node 22 LTS (minimum version requirement)
- Fixed TypeScript type safety issues by replacing `any` types with proper types
- Fixed linting errors in index-registry test
- Fixed index-registry test failures causing CI issues
- Fixed Jest ES module mocking issues for local test execution
- Updated dependencies to latest versions:
  - @commitlint/cli: ^19.8.1
  - @commitlint/config-conventional: ^19.8.1
  - @modelcontextprotocol/sdk: 1.17.2 → 1.17.3
  - @typescript-eslint/eslint-plugin: 8.39.0 → 8.40.0
  - @typescript-eslint/parser: 8.39.0 → 8.40.0
  - husky: 9.1.6 → 9.1.7
  - ts-jest: 29.4.0 → 29.4.1
- Improved build process reliability

## [v1.3.1] - 2025-08-11

- Updated dependencies to latest versions
  - @modelcontextprotocol/sdk: 1.17.1 → 1.17.2
  - @eslint/js: 9.32.0 → 9.33.0
  - @types/node: 24.1.0 → 24.2.1
  - @typescript-eslint/eslint-plugin: 8.38.0 → 8.39.0
  - @typescript-eslint/parser: 8.38.0 → 8.39.0
  - eslint: 9.32.0 → 9.33.0
  - eslint-plugin-prettier: 5.5.3 → 5.5.4
  - lint-staged: 16.1.4 → 16.1.5
  - nock: 14.0.7 → 14.0.9
  - typescript: 5.8.3 → 5.9.2
- Fixed ESLint warnings by removing unused eslint-disable directives

## [v1.3.0] - 2025-08-05

- Major architectural improvements with Domain-Driven Design (DDD) implementation
- Improved test coverage from 88.84% to 90.27%
- Added comprehensive error handling system with MCP-specific error types
- Implemented new tool registry system with dependency injection
- Added enhanced tool registry with automatic tool discovery and metadata support
- Created domain aggregates for Project, AnalysisRun, QualityMetrics, and ComplianceReport
- Added value objects for type-safe domain modeling (ThresholdValue, MetricValue, CoveragePercentage, IssueCount)
- Implemented repository pattern with mappers for clean separation of concerns
- Added GraphQL query builder for improved API interaction
- Created comprehensive test suites for all new components
- Fixed all DeepSource analyzer issues (JS-0323, JS-0331, JS-R1004, JS-0105, JS-W1044)
- Improved TypeScript type safety by eliminating all `any` types
- Added handler factory pattern for consistent handler implementation
- Created adapters for backward compatibility with existing code
- Added extensive documentation for new architectural patterns
- Implemented proper error handling with categorized MCP errors
- Added support for tool categorization and tagging
- Created example tool demonstrating enhanced plugin format
- Improved code organization following SOLID and DRY principles

## [v1.2.2] - 2025-07-28

- Updated all dependencies to their latest versions
  - @modelcontextprotocol/sdk: 1.12.3 → 1.17.0
  - axios: 1.10.0 → 1.11.0
  - @eslint/js: 9.29.0 → 9.32.0
  - @types/jest: 29.5.14 → 30.0.0
  - @types/node: 24.0.1 → 24.1.0
  - @typescript-eslint/eslint-plugin: 8.34.0 → 8.38.0
  - @typescript-eslint/parser: 8.34.0 → 8.38.0
  - eslint: 9.29.0 → 9.32.0
  - eslint-config-prettier: 10.1.5 → 10.1.8
  - eslint-plugin-prettier: 5.4.1 → 5.5.3
  - jest: 30.0.0 → 30.0.5
  - nock: 14.0.5 → 14.0.7
  - prettier: 3.5.3 → 3.6.2
  - supertest: 7.1.1 → 7.1.4
- Updated DeepSource test coverage action from v1.1.2 to v1.1.3 to fix CI issues
- Added pnpm override to force form-data >= 4.0.4 for security
- Security fix: Bumped brace-expansion to address vulnerability

## [v1.2.1] - 2025-06-16

- Updated all dependencies to their latest versions
  - @modelcontextprotocol/sdk: 1.11.4 → 1.12.3
  - axios: 1.9.0 → 1.10.0
  - zod: 3.25.3 → 3.25.64
  - @eslint/js: 9.27.0 → 9.29.0
  - @types/cors: 2.8.18 → 2.8.19
  - @types/express: 5.0.2 → 5.0.3
  - @types/node: 22.15.19 → 24.0.1
  - @typescript-eslint/eslint-plugin: 8.32.1 → 8.34.0
  - @typescript-eslint/parser: 8.32.1 → 8.34.0
  - eslint: 9.27.0 → 9.29.0
  - eslint-plugin-prettier: 5.4.0 → 5.4.1
  - jest: 29.7.0 → 30.0.0
  - lint-staged: 16.0.0 → 16.1.2
  - nock: 14.0.4 → 14.0.5
  - ts-jest: 29.3.4 → 29.4.0

## [v1.2.0] - 2025-05-21

- Refactored codebase for improved maintainability
- Removed examples directory containing non-production code
- Improved documentation

## [v1.1.0] - 2025-05-20

- Added dependency vulnerability reporting
- Added quality metrics history support
- Added metric threshold management
- Enhanced filtering capabilities for issues and runs
- Fixed pagination issues
- Improved error handling

## [v1.0.2] - 2025-05-17

- Fixed npx launching issues
- Fixed package description

## [v1.0.1] - 2025-05-17

- Fixed documentation issues
- Added comprehensive test coverage

## [v1.0.0] - 2025-05-16

- Initial stable release
- Complete MCP server implementation for DeepSource
- Support for projects, issues, runs, and compliance reports
- Full GraphQL API integration
- Comprehensive error handling
- Relay-style pagination support
