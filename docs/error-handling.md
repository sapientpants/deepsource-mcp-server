# DeepSource MCP Server Error Handling Guide

## Overview

The DeepSource MCP Server implements a comprehensive error handling system that provides consistent, informative error responses across all tool handlers. This guide explains the error handling architecture, patterns, and best practices.

## Architecture

### Error Classification System

The error handling system classifies errors into categories for better debugging and user experience:

```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  GRAPHQL = 'graphql',
  INTERNAL = 'internal',
  CONFIGURATION = 'configuration',
}
```

### Core Components

1. **Error Factory (`src/utils/errors/factory.ts`)**
   - Creates classified errors with consistent structure
   - Preserves original error context
   - Adds metadata for debugging

2. **Error Handlers (`src/utils/errors/handlers.ts`)**
   - Specialized handlers for different error types
   - GraphQL error parsing
   - HTTP status code mapping
   - User-friendly message generation

3. **MCP Error Utilities (`src/utils/error-handling/mcp-errors.ts`)**
   - Tool-specific error handling
   - Response formatting
   - Error logging integration

## Error Flow

```
User Request → Tool Handler → Domain Layer → Infrastructure Layer
                    ↓               ↓                ↓
                Error Caught    Error Caught    Error Thrown
                    ↓               ↓                ↓
                Classify        Transform         Create
                    ↓               ↓                ↓
                Format Response ← Log Error ← Add Context
```

## Error Types and Handling

### Authentication Errors

**When:** API key is missing, invalid, or expired

```typescript
// Example error response
{
  "error": "Authentication error: Invalid or expired API key",
  "details": "Please check your DEEPSOURCE_API_KEY environment variable"
}
```

**Common causes:**

- Missing `DEEPSOURCE_API_KEY` environment variable
- Expired API key
- Invalid API key format

### Network Errors

**When:** Network timeouts, connection failures

```typescript
// Example error response
{
  "error": "Network error: Connection timeout",
  "details": "Failed to connect to DeepSource API"
}
```

**Common causes:**

- Network connectivity issues
- DeepSource API downtime
- Firewall/proxy blocking

### GraphQL Errors

**When:** GraphQL query failures, schema mismatches

```typescript
// Example error response
{
  "error": "GraphQL error: Field 'invalidField' not found",
  "details": "The requested field does not exist in the schema"
}
```

**Common causes:**

- API version mismatch
- Invalid query structure
- Schema changes

### Validation Errors

**When:** Invalid parameters, missing required fields

```typescript
// Example error response
{
  "error": "Validation error: Missing required parameter 'projectKey'",
  "details": "The projectKey parameter is required for this operation"
}
```

**Common causes:**

- Missing required parameters
- Invalid parameter types
- Out-of-range values

### Rate Limit Errors

**When:** API rate limits exceeded

```typescript
// Example error response
{
  "error": "Rate limit exceeded",
  "details": "Please wait 60 seconds before retrying"
}
```

## Implementation Examples

### Basic Error Handling in Handlers

```typescript
export async function handleProjects(deps: ProjectsHandlerDeps): Promise<ApiResponse> {
  try {
    const projects = await deps.projectRepository.findAll();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ projects }),
        },
      ],
    };
  } catch (error) {
    deps.logger.error('Error in handleProjects', { error });

    // Error is automatically classified and formatted
    return createErrorResponse(error);
  }
}
```

### Custom Error Handling

```typescript
export const createQualityMetricsHandler = createBaseHandlerFactory(
  'quality_metrics',
  async (deps, params) => {
    try {
      const metrics = await deps.repository.getMetrics(params.projectKey);

      // Custom validation
      if (metrics.length === 0) {
        throw createClassifiedError('No metrics found for project', ErrorCategory.NOT_FOUND, null, {
          projectKey: params.projectKey,
        });
      }

      return formatMetricsResponse(metrics);
    } catch (error) {
      // Base handler factory automatically handles errors
      throw error;
    }
  }
);
```

### Error Context Preservation

```typescript
try {
  const result = await apiCall();
} catch (error) {
  // Preserve original error while adding context
  throw createClassifiedError(
    'Failed to fetch project data',
    ErrorCategory.NETWORK,
    error, // Original error preserved
    {
      projectKey: params.projectKey,
      attempt: retryCount,
    }
  );
}
```

## Best Practices

### 1. Use Error Classification

Always classify errors to help with debugging and monitoring:

```typescript
// Good
throw createClassifiedError('Project not found', ErrorCategory.NOT_FOUND, null, { projectKey });

// Avoid
throw new Error('Project not found');
```

### 2. Preserve Error Context

Always preserve the original error when rethrowing:

```typescript
// Good
catch (error) {
  throw createClassifiedError(
    'Failed to process request',
    ErrorCategory.INTERNAL,
    error, // Original error preserved
    { context: 'additional info' }
  );
}

// Avoid
catch (error) {
  throw new Error('Failed to process request');
}
```

### 3. Provide Actionable Error Messages

Error messages should guide users to resolution:

```typescript
// Good
{
  error: "Authentication failed: Invalid API key",
  details: "Please verify your DEEPSOURCE_API_KEY in environment variables"
}

// Avoid
{
  error: "Error",
  details: "Something went wrong"
}
```

### 4. Log Errors Appropriately

Use appropriate log levels:

```typescript
// Authentication/validation errors - expected
logger.warn('Invalid API key provided', { maskedKey });

// Network/internal errors - unexpected
logger.error('Unexpected error in handler', { error, stack });
```

### 5. Handle Async Errors

Always handle promises and async operations:

```typescript
// Good - errors are caught by handler factory
export const handler = createBaseHandlerFactory('tool_name', async (deps, params) => {
  const result = await asyncOperation(); // Errors automatically caught
  return formatResponse(result);
});

// Manual error handling when needed
try {
  const results = await Promise.all([operation1(), operation2()]);
} catch (error) {
  // Handle aggregated errors
}
```

## Error Response Format

All errors follow a consistent response format:

```typescript
interface ErrorResponse {
  content: [
    {
      type: 'text';
      text: string; // JSON stringified error object
    },
  ];
  isError: true;
}

interface ErrorObject {
  error: string; // Human-readable error message
  details?: string; // Additional context
  code?: string; // Error code (e.g., 'AUTH_001')
  metadata?: object; // Debug information (not shown to users)
}
```

## Monitoring and Debugging

### Error Logging

All errors are logged with context:

```typescript
logger.error('Handler failed', {
  handler: 'quality_metrics',
  error: error.message,
  category: error.category,
  metadata: error.metadata,
  stack: error.stack,
});
```

### Debug Mode

Enable debug logging for detailed error information:

```bash
export LOG_LEVEL=DEBUG
```

### Common Error Patterns

1. **Authentication Chain**

   ```
   API Key Missing → Check Environment → Return Configuration Error
   API Key Invalid → GraphQL 401 → Return Authentication Error
   ```

2. **Network Failures**

   ```
   Connection Timeout → Retry Logic → Return Network Error
   DNS Failure → No Retry → Return Network Error
   ```

3. **GraphQL Errors**
   ```
   Field Error → Parse GraphQL Response → Return Validation Error
   Query Error → Check Schema → Return GraphQL Error
   ```

## Testing Error Handling

### Unit Tests

```typescript
it('should handle authentication errors', async () => {
  const error = new Error('401 Unauthorized');
  mockClient.listProjects.mockRejectedValue(error);

  const result = await handler({ projectKey: 'test' });

  expect(result.isError).toBe(true);
  expect(JSON.parse(result.content[0].text)).toMatchObject({
    error: expect.stringContaining('Authentication error'),
  });
});
```

### Integration Tests

```typescript
it('should handle network timeouts gracefully', async () => {
  const timeoutError = new Error('ETIMEDOUT');
  mockApiCall.mockRejectedValue(timeoutError);

  const result = await callTool('projects');

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Network error');
});
```

## Troubleshooting

### Common Issues

1. **"Cannot read property of undefined"**
   - Usually indicates missing error handling in async code
   - Check for unhandled promise rejections

2. **"Maximum call stack exceeded"**
   - Error handler throwing errors
   - Circular error handling logic

3. **Silent Failures**
   - Errors caught but not logged
   - Check error handler middleware

### Debug Checklist

- [ ] Check environment variables
- [ ] Verify API key validity
- [ ] Check network connectivity
- [ ] Review error logs
- [ ] Test with debug logging enabled
- [ ] Verify error handler registration

## Future Improvements

1. **Retry Logic**
   - Automatic retry for transient errors
   - Exponential backoff for rate limits

2. **Error Aggregation**
   - Collect related errors
   - Provide comprehensive error reports

3. **Error Recovery**
   - Graceful degradation
   - Fallback strategies

4. **Monitoring Integration**
   - Error tracking service integration
   - Performance monitoring
   - Alert configuration
