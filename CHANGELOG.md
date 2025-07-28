# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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