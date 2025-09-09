# GraphQL Query Builder Documentation

## Overview

The DeepSource MCP Server includes a powerful GraphQL query builder that provides a type-safe, maintainable way to construct GraphQL queries for the DeepSource API. This system eliminates string concatenation, reduces errors, and improves code readability.

## Architecture

### Core Components

1. **Query Builder (`src/utils/graphql/query-builder.ts`)**
   - Main builder class with fluent API
   - Type-safe field selection
   - Automatic formatting and validation

2. **Query Fragments (`src/utils/graphql/queries.ts`)**
   - Reusable query fragments
   - Centralized field definitions
   - Consistent data fetching

3. **Query Processor (`src/utils/graphql/processor.ts`)**
   - Response transformation
   - Error handling
   - Data normalization

## Basic Usage

### Simple Query

```typescript
import { GraphQLQueryBuilder } from './utils/graphql/query-builder.js';

const query = new GraphQLQueryBuilder().query('viewer').select(['login', 'email']).build();

// Result:
// query {
//   viewer {
//     login
//     email
//   }
// }
```

### Query with Arguments

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select(['name', 'defaultBranch'])
  .build();

// Result:
// query {
//   repository(dsn: "project-key") {
//     name
//     defaultBranch
//   }
// }
```

### Nested Selections

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    'name',
    {
      field: 'metrics',
      args: { shortcodeIn: ['LCV', 'BCV'] },
      selection: [
        'shortcode',
        'name',
        {
          field: 'items',
          selection: ['key', 'latestValue', 'threshold'],
        },
      ],
    },
  ])
  .build();
```

## Advanced Features

### Aliases

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    { field: 'name', alias: 'projectName' },
    { field: 'defaultBranch', alias: 'mainBranch' },
  ])
  .build();

// Result:
// query {
//   repository(dsn: "project-key") {
//     projectName: name
//     mainBranch: defaultBranch
//   }
// }
```

### Multiple Root Queries

```typescript
const query = new GraphQLQueryBuilder()
  .addField('viewer', {}, ['login', 'email'])
  .addField('repository', { dsn: projectKey }, ['name', 'status'])
  .build();

// Result:
// query {
//   viewer {
//     login
//     email
//   }
//   repository(dsn: "project-key") {
//     name
//     status
//   }
// }
```

### Fragments and Reusable Selections

```typescript
// Define reusable fragments
const METRIC_FIELDS = ['shortcode', 'name', 'description', 'unit', 'positiveDirection'];

const METRIC_ITEM_FIELDS = [
  'key',
  'threshold',
  'latestValue',
  'latestValueDisplay',
  'thresholdStatus',
];

// Use in queries
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    'name',
    {
      field: 'metrics',
      selection: [
        ...METRIC_FIELDS,
        {
          field: 'items',
          selection: METRIC_ITEM_FIELDS,
        },
      ],
    },
  ])
  .build();
```

### Pagination Support

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    {
      field: 'issues',
      args: {
        first: 10,
        after: cursor,
        states: ['ACTIVE'],
      },
      selection: [
        {
          field: 'edges',
          selection: [
            'cursor',
            {
              field: 'node',
              selection: ['id', 'code', 'title'],
            },
          ],
        },
        {
          field: 'pageInfo',
          selection: ['hasNextPage', 'endCursor'],
        },
        'totalCount',
      ],
    },
  ])
  .build();
```

## Query Fragments Library

### Project Fragments

```typescript
import {
  PROJECT_BASIC_FRAGMENT,
  PROJECT_METRICS_FRAGMENT,
  PROJECT_FULL_FRAGMENT,
} from './utils/graphql/queries.js';

// Basic project info
const basicQuery = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select(PROJECT_BASIC_FRAGMENT)
  .build();

// Project with metrics
const metricsQuery = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select(PROJECT_METRICS_FRAGMENT)
  .build();
```

### Available Fragments

```typescript
// Project fragments
export const PROJECT_BASIC_FRAGMENT = ['name', 'defaultBranch', 'dsn'];

// Metric fragments
export const METRIC_FRAGMENT = [
  'shortcode',
  'name',
  'description',
  'positiveDirection',
  'unit',
  'isReported',
  'isThresholdEnforced',
  {
    field: 'items',
    selection: METRIC_ITEM_FRAGMENT,
  },
];

// Issue fragments
export const ISSUE_FRAGMENT = [
  'id',
  'code',
  'title',
  'message',
  'category',
  {
    field: 'location',
    selection: ['path', { field: 'position', selection: ['beginLine'] }],
  },
];

// Run fragments
export const RUN_FRAGMENT = [
  'runUid',
  'commitOid',
  'branchName',
  'status',
  'createdAt',
  {
    field: 'summary',
    selection: ['occurrencesIntroduced', 'occurrencesResolved'],
  },
];
```

## Integration with DeepSource Client

### Using Query Builder in Client Methods

```typescript
class DeepSourceClient {
  async getQualityMetrics(projectKey: string, filters?: MetricFilters) {
    const query = new GraphQLQueryBuilder()
      .query('repository', { dsn: projectKey })
      .select([
        {
          field: 'metrics',
          args: this.buildMetricArgs(filters),
          selection: METRIC_FRAGMENT,
        },
      ])
      .build();

    const response = await this.graphqlClient.request(query);
    return this.processMetrics(response.repository?.metrics);
  }

  private buildMetricArgs(filters?: MetricFilters) {
    const args: any = {};
    if (filters?.shortcodeIn) {
      args.shortcodeIn = filters.shortcodeIn;
    }
    return args;
  }
}
```

### Error Handling

```typescript
try {
  const query = new GraphQLQueryBuilder()
    .query('repository', { dsn: projectKey })
    .select(['invalidField']) // This will cause an error
    .build();

  const response = await client.request(query);
} catch (error) {
  if (error.response?.errors) {
    // GraphQL errors
    const graphqlError = error.response.errors[0];
    console.error(`Field error: ${graphqlError.message}`);
  } else {
    // Network or other errors
    console.error(`Request failed: ${error.message}`);
  }
}
```

## Best Practices

### 1. Use Fragments for Consistency

Define fragments for commonly used field selections:

```typescript
// Good - Reusable and consistent
const AUTHOR_FRAGMENT = ['login', 'email', 'avatarUrl'];

const query1 = builder.select([{ field: 'author', selection: AUTHOR_FRAGMENT }]);
const query2 = builder.select([{ field: 'committer', selection: AUTHOR_FRAGMENT }]);

// Avoid - Repetitive and error-prone
const query1 = builder.select([{ field: 'author', selection: ['login', 'email', 'avatarUrl'] }]);
const query2 = builder.select([{ field: 'committer', selection: ['login', 'email', 'avatarUrl'] }]);
```

### 2. Type Arguments Properly

Always type query arguments for better type safety:

```typescript
interface RepositoryArgs {
  dsn: string;
}

interface IssuesArgs {
  first?: number;
  after?: string;
  states?: string[];
}

const query = new GraphQLQueryBuilder()
  .query<RepositoryArgs>('repository', { dsn: projectKey })
  .select([
    {
      field: 'issues',
      args: { first: 10, states: ['ACTIVE'] } as IssuesArgs,
      selection: ISSUE_FRAGMENT,
    },
  ])
  .build();
```

### 3. Handle Nullable Fields

Account for nullable fields in your queries:

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    'name',
    {
      field: 'latestRun', // May be null
      selection: RUN_FRAGMENT,
    },
  ])
  .build();

// Handle in response
const latestRun = response.repository?.latestRun || null;
```

### 4. Optimize Query Depth

Avoid deeply nested queries that can impact performance:

```typescript
// Good - Reasonable nesting
const query = builder
  .query('repository')
  .select([
    'name',
    { field: 'issues', selection: ['edges', { field: 'node', selection: ['id', 'title'] }] },
  ]);

// Avoid - Too deeply nested
const query = builder.query('repository').select([
  {
    field: 'issues',
    selection: [
      {
        field: 'edges',
        selection: [
          {
            field: 'node',
            selection: [
              {
                field: 'author',
                selection: [
                  {
                    field: 'organization',
                    selection: [
                      {
                        field: 'repositories',
                        selection: ['edges'], // Too deep!
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
```

### 5. Use Aliases for Clarity

Use aliases when fetching the same field with different arguments:

```typescript
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select([
    {
      field: 'issues',
      alias: 'openIssues',
      args: { states: ['ACTIVE'] },
      selection: ['totalCount'],
    },
    {
      field: 'issues',
      alias: 'closedIssues',
      args: { states: ['RESOLVED'] },
      selection: ['totalCount'],
    },
  ])
  .build();
```

## Testing Queries

### Unit Testing Query Construction

```typescript
describe('GraphQLQueryBuilder', () => {
  it('should build a simple query', () => {
    const query = new GraphQLQueryBuilder().query('viewer').select(['login']).build();

    expect(query).toBe('query { viewer { login } }');
  });

  it('should handle nested selections', () => {
    const query = new GraphQLQueryBuilder()
      .query('repository', { dsn: 'test-project' })
      .select([
        'name',
        {
          field: 'metrics',
          selection: ['shortcode', 'name'],
        },
      ])
      .build();

    expect(query).toContain('repository(dsn: "test-project")');
    expect(query).toContain('metrics { shortcode name }');
  });
});
```

### Testing with Mock Responses

```typescript
it('should fetch metrics using query builder', async () => {
  const mockResponse = {
    repository: {
      metrics: [{ shortcode: 'LCV', name: 'Line Coverage', latestValue: 85 }],
    },
  };

  mockGraphQLClient.request.mockResolvedValue(mockResponse);

  const metrics = await client.getQualityMetrics('test-project');

  expect(mockGraphQLClient.request).toHaveBeenCalledWith(expect.stringContaining('metrics'));
  expect(metrics).toHaveLength(1);
  expect(metrics[0].shortcode).toBe('LCV');
});
```

## Common Patterns

### Fetching with Pagination

```typescript
async function fetchAllIssues(projectKey: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const query = new GraphQLQueryBuilder()
      .query('repository', { dsn: projectKey })
      .select([
        {
          field: 'issues',
          args: { first: 100, after: cursor },
          selection: [
            { field: 'edges', selection: ['cursor', { field: 'node', selection: ISSUE_FRAGMENT }] },
            { field: 'pageInfo', selection: ['hasNextPage', 'endCursor'] },
          ],
        },
      ])
      .build();

    const response = await client.request(query);
    const issueData = response.repository?.issues;

    if (issueData?.edges) {
      issues.push(...issueData.edges.map((e) => e.node));
      cursor = issueData.pageInfo.endCursor;
      hasMore = issueData.pageInfo.hasNextPage;
    } else {
      hasMore = false;
    }
  }

  return issues;
}
```

### Conditional Field Selection

```typescript
function buildMetricsQuery(projectKey: string, includeHistory: boolean = false): string {
  const metricSelection = [...METRIC_FRAGMENT];

  if (includeHistory) {
    metricSelection.push({
      field: 'history',
      args: { last: 30 },
      selection: ['value', 'measuredAt'],
    });
  }

  return new GraphQLQueryBuilder()
    .query('repository', { dsn: projectKey })
    .select([{ field: 'metrics', selection: metricSelection }])
    .build();
}
```

### Batch Queries

```typescript
function buildBatchQuery(projectKeys: string[]): string {
  const builder = new GraphQLQueryBuilder();

  projectKeys.forEach((key, index) => {
    builder.addField(
      'repository',
      { dsn: key },
      PROJECT_BASIC_FRAGMENT,
      `project${index}` // Alias
    );
  });

  return builder.build();
}
```

## Performance Considerations

1. **Minimize Over-fetching**
   - Only request fields you need
   - Use fragments to standardize field selection

2. **Batch Related Queries**
   - Combine multiple queries into one request
   - Use aliases for multiple instances of the same field

3. **Implement Caching**
   - Cache query results when appropriate
   - Use ETags or timestamps for cache invalidation

4. **Handle Large Result Sets**
   - Use pagination for lists
   - Implement streaming for very large datasets

## Troubleshooting

### Common Issues

1. **"Cannot query field X on type Y"**
   - Field doesn't exist in schema
   - Check API documentation for correct field names

2. **"Syntax Error: Expected Name"**
   - Malformed query structure
   - Check for missing commas or brackets

3. **"Variable $X of type Y was provided invalid value"**
   - Type mismatch in arguments
   - Ensure argument types match schema

### Debug Tips

1. **Log Generated Queries**

   ```typescript
   const query = builder.build();
   console.log('Generated query:', query);
   ```

2. **Use GraphQL Playground**
   - Test queries in GraphQL playground first
   - Verify field availability and types

3. **Enable Debug Mode**
   ```typescript
   const client = new DeepSourceClient(apiKey, {
     debug: true, // Logs all queries and responses
   });
   ```

## Migration Guide

### From String Concatenation

```typescript
// Old approach
const query = `
  query {
    repository(dsn: "${projectKey}") {
      name
      metrics {
        shortcode
        name
      }
    }
  }
`;

// New approach
const query = new GraphQLQueryBuilder()
  .query('repository', { dsn: projectKey })
  .select(['name', { field: 'metrics', selection: ['shortcode', 'name'] }])
  .build();
```

### From Template Literals

```typescript
// Old approach
const createMetricsQuery = (projectKey: string, metricTypes: string[]) => `
  query {
    repository(dsn: "${projectKey}") {
      metrics(shortcodeIn: [${metricTypes.map((t) => `"${t}"`).join(', ')}]) {
        shortcode
        latestValue
      }
    }
  }
`;

// New approach
const createMetricsQuery = (projectKey: string, metricTypes: string[]) =>
  new GraphQLQueryBuilder()
    .query('repository', { dsn: projectKey })
    .select([
      {
        field: 'metrics',
        args: { shortcodeIn: metricTypes },
        selection: ['shortcode', 'latestValue'],
      },
    ])
    .build();
```

## Future Enhancements

1. **Type Generation**
   - Generate TypeScript types from GraphQL schema
   - Compile-time query validation

2. **Query Optimization**
   - Automatic query deduplication
   - Field-level caching

3. **Developer Tools**
   - VS Code extension for query building
   - Query performance analyzer

4. **Advanced Features**
   - Subscription support
   - Directive handling
   - Fragment definitions
