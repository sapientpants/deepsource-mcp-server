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

## Key Concepts

1. **Model Context Protocol (MCP)**: A protocol that enables AI assistants to interact with external services via standardized tool interfaces.

2. **DeepSource Integration**: This server provides AI assistants with access to DeepSource's code quality metrics through GraphQL API queries.

3. **Relay-style Pagination**: The API implements cursor-based pagination for efficient traversal of large result sets. This is used in both issue and run queries.

4. **Authentication**: The server requires a DeepSource API key, which is passed via the `DEEPSOURCE_API_KEY` environment variable.

## Development Notes

- The codebase uses TypeScript with ES modules.
- Tests are written using Jest. All handlers and client methods have comprehensive test coverage.
- The project follows a functional approach with clear separation of concerns.
- Error handling is robust throughout the codebase, with specific handling for various GraphQL and network errors.
- When making changes, ensure to maintain backward compatibility with MCP consumers.
- All DeepSource API interactions are encapsulated in the `DeepSourceClient` class.

## Code Quality Guidelines

DeepSource is used to maintain code quality. Here are the key patterns to follow:

### ESLint Guidelines

1. **Never disable ESLint rules unless absolutely necessary** - Fix the underlying issues instead of disabling rules.

2. **For exported enums** - If an enum is part of the public API and may not be directly referenced in the current file:
   - Add export usage examples in the documentation
   - Create a proper ESLint rule exception if needed with clear justification
   - Consider using TypeScript's `const enum` if the values are only needed at compile time

3. **For unused variables** - Use prefixed underscores to indicate intentionally unused variables:
   ```typescript
   try {
     // code
   } catch (_error) {
     // We don't use the error object
   }
   ```

### TypeScript Best Practices

1. **Avoid using `any` type** - Use specific types or `unknown` when the type is truly unknown. Consider using generics or type unions instead.
   ```typescript
   // Bad
   function process(data: any): any { ... }
   
   // Good
   function process<T>(data: T): Result<T> { ... }
   ```

2. **Prefer type guards over `instanceof` checks** - Use type predicates when possible.
   ```typescript
   // Instead of
   if (error instanceof CustomError) { ... }
   
   // Consider
   function isCustomError(error: unknown): error is CustomError {
     return error !== null && 
            typeof error === 'object' && 
            'customProp' in error;
   }
   ```

3. **Omit explicit type declarations when easily inferred** - TypeScript can infer types from initializers for variables, parameters, and properties. Explicit types add unnecessary verbosity in these cases.
   ```typescript
   // Bad
   const count: number = 5;
   const isActive: boolean = true;
   const name: string = 'John';
   
   // Good
   const count = 5;
   const isActive = true;
   const name = 'John';
   ```

4. **Use `@ts-expect-error` instead of `@ts-ignore`** - When suppressing TypeScript errors, use `@ts-expect-error` which will cause an error if the line it's applied to doesn't actually contain any type errors.
   ```typescript
   // Bad
   // @ts-ignore
   const value: string = 123;
   
   // Good
   // @ts-expect-error - Converting number to string intentionally
   const value: string = 123;
   ```

### Error Handling Patterns

1. **Avoid deeply nested try/catch blocks** - Refactor to use separate functions or middleware.
   ```typescript
   // Instead of nested try/catch
   try {
     try {
       // more code
     } catch (innerError) { ... }
   } catch (outerError) { ... }
   
   // Use separate functions
   function innerOperation() {
     try {
       // code
     } catch (error) {
       // handle specific errors
     }
   }
   
   function outerOperation() {
     try {
       innerOperation();
     } catch (error) {
       // handle other errors
     }
   }
   ```

2. **Centralize error logging** - Use a dedicated logger service instead of console calls.
   ```typescript
   // Instead of
   console.warn('Something went wrong');
   
   // Use
   logger.warn('Something went wrong');
   ```

### Code Structure

1. **Keep methods small and focused** - Methods should do one thing and do it well.

2. **Avoid static methods when instance methods make sense** - Static methods make testing harder.

3. **Use proper null/undefined handling** - Use optional chaining and nullish coalescing operators.
   ```typescript
   // Bad
   if (data && data.property) {
     return data.property.value;
   }
   
   // Good
   return data?.property?.value;
   
   // Bad
   const value = data && data.property ? data.property : defaultValue;
   
   // Good
   const value = data?.property ?? defaultValue;
   ```

4. **Prefer early returns to reduce nesting** - This improves readability.
   ```typescript
   // Instead of
   function process(data) {
     if (isValid(data)) {
       // lots of code
     }
   }
   
   // Use
   function process(data) {
     if (!isValid(data)) return;
     // lots of code
   }
   ```

5. **Avoid unused expressions** - Expressions that don't affect the program state are often logic errors and should be avoided.
   ```typescript
   // Bad
   data.property; // This does nothing
   
   // Good
   const property = data.property; // Assign it if you need it
   doSomething(data.property); // Use it in a function call
   ```

6. **Use regular strings when template literals aren't needed** - Only use template literals when you need string interpolation, multiline strings, or special characters.
   ```typescript
   // Bad
   const name = `John`;
   const greeting = `Hello World`;
   
   // Good
   const name = 'John';
   const greeting = "Hello World";
   
   // Good use of template literals
   const fullGreeting = `Hello, ${name}!`;
   const multiline = `This is a
   multiline string`;
   ```

### Git Commit Guidelines

1. **NEVER use --no-verify flag** - Do not bypass pre-commit hooks when committing code. Pre-commit hooks are essential for maintaining code quality and catching issues before they're committed.

### Memories
- Do not use the any type. Use the never or unknown type instead.
- Require template literals instead of string concatenation