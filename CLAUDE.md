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

## DeepSource Issue Prevention Guidelines

The following guidelines are based on frequent DeepSource issues detected in this codebase. Following these practices will help prevent common code quality issues.

### Avoiding Type Safety Issues

1. **Never use the `any` type (JS-0323)** - This is the most common issue found in the codebase. Replace all `any` types with more specific types:
   ```typescript
   // Bad
   function process(data: any): any { ... }
   typeof (error as any).message === 'string'
   
   // Good
   function process<T>(data: unknown): Result<T> { ... }
   typeof (error as Record<string, unknown>).message === 'string'
   ```
   
   - When accessing properties on an object of unknown type, use `Record<string, unknown>` instead of `any`:
   ```typescript
   // Bad
   const value = (someObject as any).property;
   
   // Good
   const value = (someObject as Record<string, unknown>).property;
   ```

2. **Avoid unnecessary type declarations (JS-0331)** - Omit explicit type declarations when they can be easily inferred by TypeScript:
   ```typescript
   // Bad - unnecessary type declaration
   const count: number = 5;
   const items: string[] = ['a', 'b', 'c'];
   
   // Good - let TypeScript infer the types
   const count = 5;
   const items = ['a', 'b', 'c'];
   ```

### Avoiding String Handling Issues

1. **Avoid useless template literals (JS-R1004)** - Use regular strings instead of template literals when no interpolation is needed:
   ```typescript
   // Bad
   const greeting = `Hello World`;
   const name = `John`;
   
   // Good
   const greeting = 'Hello World';
   const name = 'John';
   
   // Only use template literals when needed for interpolation
   const message = `Hello, ${name}!`;
   ```

2. **Use template literals for string concatenation (JS-0246)** - Prefer template literals over string concatenation:
   ```typescript
   // Bad
   const message = 'Hello, ' + name + '!';
   
   // Good
   const message = `Hello, ${name}!`;
   ```

### Improving Method Organization

1. **Make instance methods static when they don't use `this` (JS-0105)** - Methods that don't reference instance properties or methods should be static:
   ```typescript
   // Bad
   class Utilities {
     formatDate(date: Date): string {
       // Doesn't use 'this'
       return date.toISOString();
     }
   }
   
   // Good
   class Utilities {
     static formatDate(date: Date): string {
       return date.toISOString();
     }
   }
   ```

2. **Implement all empty methods** - Add proper implementation to all methods, even if they are placeholders:
   ```typescript
   // Bad
   private static logPaginationWarning(): void {
     // Empty method without implementation
   }
   
   // Good
   private static logPaginationWarning(message?: string): void {
     // Proper implementation with meaningful behavior
     const warningMessage = message || 'Non-standard pagination used';
     this.logger.warn(warningMessage);
   }
   ```

### Type Validation and Conversion

1. **Use consistent type validation patterns** - Create reusable validation functions for common type checks:
   ```typescript
   // Helper function for validating object types
   private static isValidObject(value: unknown): value is Record<string, unknown> {
     return value !== null && typeof value === 'object';
   }
   
   // Helper for extracting string values safely
   private static validateString(value: unknown, defaultValue = ''): string {
     return typeof value === 'string' ? value : defaultValue;
   }
   ```

2. **Create type predicates for complex type validation** - For complex objects, create type predicates that verify the required structure:
   ```typescript
   // Type predicate for validating a specific structure
   private static isValidConfiguration(config: unknown): config is Configuration {
     return (
       typeof config === 'object' &&
       config !== null &&
       'apiKey' in config &&
       typeof (config as Record<string, unknown>).apiKey === 'string'
     );
   }
   ```

### Test Coverage Best Practices

1. **Maintain high test coverage** - Ensure all code paths, especially edge cases, are well-tested:
   ```typescript
   // For edge cases in error handling
   test('should handle null input gracefully', () => {
     expect(processData(null)).toEqual({ error: 'Invalid input' });
   });
   
   // For conditional branches
   test('should use default value when config is missing', () => {
     expect(getConfig(undefined).retryCount).toBe(3);
   });
   ```

2. **Mock external dependencies** - When testing functions that depend on external services:
   ```typescript
   test('handles API errors correctly', () => {
     // Setup a mock
     jest.spyOn(apiService, 'fetchData').mockRejectedValue(new Error('Network error'));
     
     // Test error handling
     return expect(client.getData()).rejects.toThrow('Failed to fetch data');
   });
   ```

3. **Test both success and failure paths** - Especially for async operations:
   ```typescript
   describe('API client', () => {
     it('handles successful response', async () => {
       // Test happy path
     });
     
     it('handles timeouts', async () => {
       // Test timeout path
     });
     
     it('handles service unavailable errors', async () => {
       // Test server error path
     });
   });
   ```

### Advanced TypeScript Best Practices

1. **Use branded types for type safety** - Create distinct types for values of the same primitive type:
   ```typescript
   // Branded type for user IDs
   type UserID = string & { readonly __brand: unique symbol };
   
   // Branded type for project keys
   type ProjectKey = string & { readonly __brand: unique symbol };
   
   // Functions can now be specific about which type they accept
   function getUserDetails(id: UserID) { /* ... */ }
   function getProjectDetails(key: ProjectKey) { /* ... */ }
   
   // Prevents passing a project key where a user ID is expected
   getUserDetails(projectKey); // Type error
   ```

2. **Prefer interfaces for public APIs** - Use interfaces for external contracts and types for internal structures:
   ```typescript
   // Public API interface
   export interface ClientOptions {
     apiKey: string;
     timeout?: number;
     retries?: number;
   }
   
   // Internal type
   type RateLimitConfig = {
     maxRequests: number;
     timeWindow: number;
     strategy: 'queue' | 'error' | 'exponential';
   };
   ```

3. **Use discriminated unions for complex state management** - Makes type narrowing more precise:
   ```typescript
   type RequestState = 
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success', data: Response }
     | { status: 'error', error: Error };
   
   function handleRequest(state: RequestState) {
     switch (state.status) {
       case 'loading':
         // TypeScript knows no data or error exists here
         showLoadingIndicator();
         break;
       case 'success':
         // TypeScript knows data exists here
         displayData(state.data);
         break;
     }
   }
   ```

4. **Use const assertions for literal types** - Preserve literal types in object literals:
   ```typescript
   // Without const assertion
   const config = {
     environment: 'production',
     features: ['metrics', 'logging']
   };
   // config.environment has type 'string'
   
   // With const assertion
   const config = {
     environment: 'production',
     features: ['metrics', 'logging']
   } as const;
   // config.environment has type 'production'
   // config.features has type readonly ['metrics', 'logging']
   ```

### Memories
- Do not use the any type. Use the never, unknown, or Record<string, unknown> instead.
- Prefer Record<string, unknown> over any when working with objects of unknown structure.
- Use template literals only when needed for interpolation or multiline strings.
- Convert instance methods that don't use 'this' to static methods.
- Implement proper functionality in all methods, never leave empty method bodies.
- Create reusable type validation helpers for commonly validated types.
- Use branded types to prevent mixing similar primitive values (like different string IDs).
- Use discriminated unions for complex state management.
- Add comprehensive tests for edge cases, not just the happy paths.
- Use const assertions to preserve literal types in object literals.