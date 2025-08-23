# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository is a Model Context Protocol (MCP) server that integrates with DeepSource's code quality analysis platform. It serves as a bridge between DeepSource's GraphQL API and MCP-compatible AI assistants like Claude, providing access to code quality metrics and analysis results.

## Development Commands

### Understanding MCP Servers
MCP servers are not standalone services - they communicate via stdio with MCP clients (like Claude Desktop). The server cannot be run directly with `node` or `npm start` in a meaningful way. Instead, use:
- **Production**: Configure in Claude Desktop or use `npx deepsource-mcp-server`
- **Development**: Use `pnpm run inspect` with the MCP Inspector tool
- **Testing**: Run the test suite with `pnpm test`

### Quick Start
```bash
# Install dependencies
pnpm install

# Build the server
pnpm run build

# Debug with MCP Inspector (recommended for development)
pnpm run inspect
```

### Building & Debugging
```bash
pnpm run build          # Compile TypeScript to JavaScript
pnpm run watch          # Watch mode - rebuild on changes
pnpm run clean          # Remove build artifacts (dist/)

# Debugging with MCP Inspector
pnpm run inspect        # Launch MCP Inspector to test the server interactively
```

### Testing
```bash
# Basic testing
pnpm run test           # Run all tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:coverage  # Run tests with coverage report

# Run specific tests
pnpm test -- src/__tests__/specific-test.test.ts
pnpm test -- --testNamePattern="should handle errors"
pnpm test -- --verbose src/__tests__/specific-test.test.ts

# Run tests for a specific file pattern
pnpm test -- client      # Test all client files
pnpm test -- handler     # Test all handler files
```

### Code Quality
```bash
# Type checking
pnpm run check-types    # Type check without building

# Linting
pnpm run lint           # Run ESLint
pnpm run lint:fix       # Auto-fix ESLint issues

# Formatting
pnpm run format         # Check if code is formatted
pnpm run format:fix     # Format all code with Prettier

# Full CI pipeline
pnpm run ci            # Run format, lint, type check, build, and test coverage
```

### Troubleshooting Commands
```bash
# Clean install (removes node_modules and lockfile)
rm -rf node_modules pnpm-lock.yaml && pnpm install

# Clear Jest cache
pnpm test -- --clearCache

# Debug test failures
pnpm test -- --detectOpenHandles  # Find async leaks
pnpm test -- --runInBand          # Run tests serially
pnpm test -- --maxWorkers=1       # Use single worker

# Check for outdated dependencies
pnpm outdated

# Update dependencies (interactive)
pnpm update -i
```

## Architecture Overview

The codebase follows a modular architecture with clear separation of concerns:

### Core Components

1. **MCP Server Module** (`src/server/`)
   - `mcp-server.ts`: Configurable MCP server class
   - `tool-registry.ts`: Manages tool registration and execution
   - `tool-registration.ts`: Registers DeepSource-specific tools
   - `tool-helpers.ts`: Utility functions for tool handling

2. **Client Layer** (`src/client/`)
   - `base-client.ts`: Abstract base class with common GraphQL operations
   - `projects-client.ts`: Project management operations
   - `issues-client.ts`: Issue retrieval and filtering
   - `runs-client.ts`: Analysis run operations
   - `metrics-client.ts`: Quality metrics and thresholds
   - `security-client.ts`: Security compliance and vulnerabilities

3. **Handler Layer** (`src/handlers/`)
   - Each tool has a dedicated handler implementing business logic
   - `base/handler.interface.ts`: Common handler interface
   - `base/handler.factory.ts`: Creates handler dependencies
   - Handlers validate inputs, call clients, and format responses

4. **Type System** (`src/types/`)
   - `branded.ts`: Branded types for type-safe IDs (ProjectKey, RunId, etc.)
   - `discriminated-unions.ts`: Union types for state management
   - `graphql-responses.ts`: GraphQL API response types
   - Domain-specific types: metrics, vulnerability, analysis, report-types

5. **Utilities** (`src/utils/`)
   - `errors/`: Categorized error handling with factory pattern
   - `graphql/`: Query builders and response processors
   - `pagination/`: Relay-style cursor pagination helpers
   - `logging/`: Structured logging with levels and file output
   - `response-builder.ts`: Consistent API response formatting

### Data Flow

```
User Request → MCP Protocol → Tool Registry → Handler → Client → GraphQL API
                                    ↓            ↓          ↓
                              Validation    Processing  DeepSource
                                    ↓            ↓          ↓
                              Response ← Response ← API Response
```

## Key Architectural Patterns

### Modular Client Architecture
The client layer uses inheritance and composition:
- Base client handles common operations (auth, errors, retries)
- Specialized clients extend base for domain-specific operations
- Each client is responsible for a single domain (projects, issues, etc.)

### Handler Pattern
Handlers decouple MCP tools from business logic:
- Each handler focuses on one tool's functionality
- Dependencies injected via factory pattern
- Testable in isolation with mock dependencies

### Type Safety
Extensive use of TypeScript features for safety:
- Branded types prevent mixing similar primitives
- Discriminated unions for exhaustive state handling
- Zod schemas for runtime validation
- Type predicates for safe type narrowing

### Error Handling
Structured error categorization:
- `ErrorCategory` enum for classification
- Error factory creates consistent error objects
- GraphQL errors mapped to appropriate categories
- Retry logic for transient failures

## Environment Variables

- `DEEPSOURCE_API_KEY` (required): DeepSource API key for authentication
- `LOG_FILE` (optional): File path for log output
- `LOG_LEVEL` (optional): Minimum log level (DEBUG, INFO, WARN, ERROR)

## Development Guidelines

### Code Quality Rules

1. **Type Safety**
   - Never use `any` - use `unknown` or `Record<string, unknown>`
   - Omit type declarations when easily inferred
   - Use branded types for domain-specific strings
   - Create type predicates for complex validation

2. **Method Organization**
   - Make methods static when not using `this`
   - Keep methods small with single responsibility
   - Use early returns to reduce nesting
   - Extract complex logic into helper functions

3. **String Handling**
   - Use regular strings for literals without interpolation
   - Use template literals only for interpolation
   - Prefer single quotes for regular strings
   - Use optional chaining for nested property access

4. **Testing Requirements**
   - Maintain test coverage above 80%
   - Test all error paths and edge cases
   - Mock external dependencies
   - Use descriptive test names

### Common Patterns

#### Creating a New Handler
```typescript
// 1. Define in handlers/new-tool.ts
export async function handleNewTool(
  args: NewToolArgs,
  deps: BaseHandlerDeps
): Promise<NewToolResponse> {
  // Validate inputs
  // Call appropriate client methods
  // Format and return response
}

// 2. Register in server/tool-registration.ts
registry.registerTool({
  name: 'new_tool',
  description: 'Tool description',
  inputSchema: zodSchema,
  handler: async (args) => handleNewTool(args, handlerDeps)
});
```

#### Adding a Client Method
```typescript
// Extend appropriate base client
export class NewClient extends BaseClient {
  async getNewData(params: Params): Promise<Response> {
    const query = this.buildQuery(params);
    const response = await this.executeQuery(query);
    return this.processResponse(response);
  }
}
```

#### Error Handling Pattern
```typescript
import { classifyGraphQLError, createClassifiedError, ErrorCategory } from './utils/errors';
import { logger } from './utils/logger';

// Complete error handling with classification
async function handleOperation(params: OperationParams): Promise<Result> {
  try {
    const result = await performOperation(params);
    return result;
  } catch (error) {
    // Classify the error based on its type
    const errorCategory = classifyGraphQLError(error);
    
    // Log with appropriate level based on severity
    if (errorCategory === ErrorCategory.NETWORK_ERROR) {
      logger.warn('Transient network error, will retry', { error, params });
    } else {
      logger.error('Operation failed', { error, category: errorCategory });
    }
    
    // Create properly formatted error for the user
    throw createClassifiedError(
      errorCategory,
      getUserFriendlyMessage(errorCategory),
      error
    );
  }
}

// Helper for user-friendly messages
function getUserFriendlyMessage(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please check your API key.';
    case ErrorCategory.RATE_LIMIT_ERROR:
      return 'Rate limit exceeded. Please try again later.';
    case ErrorCategory.NETWORK_ERROR:
      return 'Network error occurred. Please check your connection.';
    case ErrorCategory.VALIDATION_ERROR:
      return 'Invalid input provided. Please check your parameters.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
```

## Git Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with commitlint validation.

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Test additions or corrections
- `build`: Build system or dependencies
- `ci`: CI configuration changes
- `chore`: Maintenance tasks
- `revert`: Revert previous commit

### Examples
```bash
git commit -m "feat: add support for filtering issues by severity"
git commit -m "fix(api): handle null response from DeepSource API"
git commit -m "test: add coverage for pagination edge cases"
```

## DeepSource Integration

### Available Tools

1. **projects** - List all available projects
2. **project_issues** - Get issues with filtering and pagination
3. **runs** - List analysis runs with filtering
4. **run** - Get specific run details
5. **recent_run_issues** - Issues from most recent branch run
6. **dependency_vulnerabilities** - Security vulnerabilities in dependencies
7. **quality_metrics** - Code quality metrics with filtering
8. **update_metric_threshold** - Update quality thresholds
9. **update_metric_setting** - Configure metric reporting
10. **compliance_report** - Security compliance reports (OWASP, SANS, MISRA-C)

### Pagination

The API uses Relay-style cursor pagination:
- `first`/`after` for forward pagination
- `last`/`before` for backward pagination
- Cursors are opaque strings
- Page info includes `hasNextPage`/`hasPreviousPage`

## Troubleshooting

### Common Issues

1. **Type Errors**
   - Check for `any` usage - replace with `unknown` or specific types
   - Verify branded type usage is consistent
   - Ensure type predicates are properly implemented

2. **Test Failures**
   - Run single test with verbose output for debugging
   - Check mock implementations match actual interfaces
   - Verify async operations are properly awaited

3. **Linting Issues**
   - Use `pnpm run lint:fix` for automatic fixes
   - Check template literal usage
   - Verify static methods don't use `this`

### DeepSource Issue Prevention

Most common issues to avoid:
- **JS-0323**: Never use `any` type
- **JS-0331**: Omit unnecessary type declarations
- **JS-R1004**: Avoid template literals without interpolation
- **JS-0105**: Make non-instance methods static
- **JS-W1044**: Use optional chaining for property access
- **JS-C1003**: Avoid wildcard imports
- **TCV-001**: Maintain test coverage for all code paths

## Project Structure

```
src/
├── server/           # MCP server setup and tool registration
├── client/           # DeepSource API client implementations
├── handlers/         # Tool-specific business logic
├── types/            # TypeScript type definitions
├── models/           # Data models and schemas
├── utils/            # Shared utilities
│   ├── errors/       # Error handling
│   ├── graphql/      # GraphQL utilities
│   ├── logging/      # Logging infrastructure
│   └── pagination/   # Pagination helpers
└── __tests__/        # Test files mirroring src structure
```

## Performance Considerations

- Use appropriate pagination sizes (10-50 items)
- Client implements automatic retry with exponential backoff
- GraphQL queries are optimized to request only needed fields
- Consider implementing caching for frequently accessed data
- Rate limits handled automatically by the client

## Security Notes

- API key stored only in environment variable
- Never log sensitive data or full API responses
- Input validation on all tool parameters
- GraphQL queries use parameterized inputs
- Error messages sanitized before returning to user