# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository is a Model Context Protocol (MCP) server that integrates with DeepSource's code quality analysis platform. It serves as a bridge between DeepSource's GraphQL API and MCP-compatible AI assistants like Claude, providing access to code quality metrics and analysis results.

## Common Commands

```bash
# Install dependencies
pnpm install

# Build the TypeScript code
pnpm run build

# Start the server
pnpm run start

# Start the server in development mode (with auto-reload)
pnpm run dev

# Run all tests
pnpm run test

# Run tests with watching
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run ESLint
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Format code with Prettier
pnpm run format

# Check code formatting
pnpm run format:check

# Type check without emitting files
pnpm run check-types

# Run the full CI check (format, lint, type check, build, test)
pnpm run ci

# Validate codebase (type check, lint, test)
pnpm run validate

# Inspect MCP server with inspector
pnpm run inspect

# Clean build artifacts
pnpm run clean
```

## Architecture Overview

The codebase is structured around two main components:

1. **MCP Server Integration (src/index.ts)**: 
   - Sets up the Model Context Protocol server
   - Registers and implements tool handlers for DeepSource API integration
   - Provides four main tools for AI assistants: 
     - `deepsource_projects` - List all available projects
     - `deepsource_project_issues` - Get issues with filtering and pagination
     - `deepsource_project_runs` - List analysis runs with filtering and pagination
     - `deepsource_run` - Get details for a specific run

2. **DeepSource Client (src/deepsource.ts)**:
   - Implements communication with DeepSource's GraphQL API
   - Handles authentication, error handling, and response parsing
   - Provides methods for retrieving projects, issues, and analysis runs
   - Supports both legacy and cursor-based Relay-style pagination

[... rest of the existing content remains the same ...]

## Memories

- Do not use the any type. Use never, unknown, or Record<string, unknown> instead.
- Prefer Record<string, unknown> over any when working with objects of unknown structure.
- Use template literals only when needed for interpolation or multiline strings.
- Convert instance methods that don't use 'this' to static methods.
- Implement proper functionality in all methods, never leave empty method bodies.
- Create reusable type validation helpers for commonly validated types.
- Use branded types to prevent mixing similar primitive values (like different string IDs).
- Use discriminated unions for complex state management.
- Add comprehensive tests for edge cases, not just the happy paths.
- Use const assertions to preserve literal types in object literals.
- Use optional chaining (?.) instead of logical operators (&&) for nested property access.
- Avoid wildcard imports; use named imports for better clarity.
- Break down complex functions to reduce cyclomatic complexity.
- Use lookup tables instead of long if-else chains for mapping values.
- Separate concerns into different functions with single responsibilities.
- Always maintain high test coverage to prevent TCV-001 (Lines not covered in tests) issues.
- When testing, avoid `as any` type assertions - use proper interfaces or `unknown` with type guards.
- For mocking private methods, create typed access helpers instead of using `as any`.
- Define specific interfaces for test data instead of using `any` type.
- Use `Record<string, unknown>` instead of `as any` when accessing object properties of unknown type.
- For generic type parameters in tests, use specific types or let TypeScript infer instead of using `<any>`.
- Replace `any[]` with specific array types or `unknown[]` if the type is truly unknown.
- Do not make any changes to eslint.config.js
- Do not make any changes to tsconfig.json