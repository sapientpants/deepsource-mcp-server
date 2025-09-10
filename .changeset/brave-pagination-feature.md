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

This implementation ensures complete data retrieval for large DeepSource accounts without silent truncation or memory issues.

Closes #152
