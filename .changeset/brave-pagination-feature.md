---
'deepsource-mcp-server': minor
---

feat: implement true pagination for all list queries

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
