/**
 * Query optimizer for server-side filtering and dynamic field selection
 * Optimizes GraphQL queries to reduce payload size and improve performance
 */

import { z } from 'zod';

/**
 * Configuration for field selection per handler
 */
export const HANDLER_FIELD_CONFIGS: Record<string, string[]> = {
  // Project handlers
  'projects.list': ['dsn', 'name', 'isActivated', 'isPrivate'],
  'projects.details': [
    'dsn',
    'name',
    'defaultBranch',
    'isActivated',
    'isPrivate',
    'vcsProvider',
    'vcsUrl',
  ],

  // Issue handlers
  'issues.list': ['shortcode', 'title', 'category', 'severity', 'analyzer { shortcode name }'],
  'issues.details': [
    'shortcode',
    'title',
    'category',
    'severity',
    'description',
    'analyzer { shortcode name }',
    'autofixAvailable',
    'tags',
  ],
  'issues.byPath': [
    'shortcode',
    'title',
    'category',
    'path',
    'beginLine',
    'endLine',
    'beginColumn',
    'endColumn',
  ],

  // Run handlers
  'runs.list': ['runUid', 'status', 'createdAt', 'branchName', 'commitOid'],
  'runs.details': [
    'runUid',
    'status',
    'createdAt',
    'finishedAt',
    'branchName',
    'commitOid',
    'baseOid',
    'summary { occurrencesIntroduced occurrencesResolved occurrencesSuppressed }',
  ],
  'runs.checks': [
    'runUid',
    'checks { edges { node { sequence status analyzer { shortcode } summary { occurrencesIntroduced } } } }',
  ],

  // Metrics handlers
  'metrics.list': [
    'shortcode',
    'name',
    'items { key threshold value thresholdStatus }',
    'isReported',
    'isThresholdEnforced',
  ],
  'metrics.values': [
    'shortcode',
    'items { key values { edges { node { value threshold thresholdStatus createdAt commitOid } } } }',
  ],

  // Vulnerability handlers
  'vulnerabilities.list': [
    'edges { node { id vulnerability { identifier severity summary } package { name ecosystem } } }',
    'totalCount',
    'pageInfo { hasNextPage endCursor }',
  ],
};

/**
 * Server-side filter configuration
 */
export interface FilterConfig {
  clientField: string;
  serverField: string;
  transform?: (value: unknown) => unknown;
  validate?: z.ZodType;
}

/**
 * Filter mappings for different entity types
 */
export const FILTER_MAPPINGS: Record<string, FilterConfig[]> = {
  projects: [
    {
      clientField: 'login',
      serverField: 'login',
      validate: z.string(),
    },
    {
      clientField: 'isActivated',
      serverField: 'isActivated',
      validate: z.boolean(),
    },
    {
      clientField: 'vcsProvider',
      serverField: 'vcsProvider',
      validate: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET']),
    },
  ],
  issues: [
    {
      clientField: 'analyzers',
      serverField: 'analyzerIn',
      transform: (v) => (Array.isArray(v) ? v : [v]),
      validate: z.union([z.string(), z.array(z.string())]),
    },
    {
      clientField: 'path',
      serverField: 'path',
      validate: z.string(),
    },
    {
      clientField: 'severity',
      serverField: 'severity',
      validate: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'HIGH', 'MEDIUM', 'LOW']),
    },
    {
      clientField: 'category',
      serverField: 'category',
      validate: z.enum([
        'ANTI_PATTERN',
        'BUG_RISK',
        'PERFORMANCE',
        'SECURITY',
        'COVERAGE',
        'TYPECHECK',
        'STYLE',
        'DOCUMENTATION',
      ]),
    },
    {
      clientField: 'tags',
      serverField: 'tags',
      transform: (v) => (Array.isArray(v) ? v : [v]),
      validate: z.union([z.string(), z.array(z.string())]),
    },
  ],
  runs: [
    {
      clientField: 'status',
      serverField: 'status',
      validate: z.enum(['PENDING', 'SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCEL']),
    },
    {
      clientField: 'branch',
      serverField: 'branchName',
      validate: z.string(),
    },
    {
      clientField: 'afterDate',
      serverField: 'createdAt_gte',
      transform: (v) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString()),
      validate: z.union([z.string(), z.date()]),
    },
    {
      clientField: 'beforeDate',
      serverField: 'createdAt_lte',
      transform: (v) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString()),
      validate: z.union([z.string(), z.date()]),
    },
    {
      clientField: 'analyzers',
      serverField: 'analyzerIn',
      transform: (v) => (Array.isArray(v) ? v : [v]),
      validate: z.union([z.string(), z.array(z.string())]),
    },
  ],
  metrics: [
    {
      clientField: 'shortcodeIn',
      serverField: 'shortcodeIn',
      transform: (v) => (Array.isArray(v) ? v : [v]),
      validate: z.array(z.string()),
    },
    {
      clientField: 'thresholdStatus',
      serverField: 'items_some { thresholdStatus }',
      validate: z.enum(['PASSING', 'FAILING']),
    },
  ],
};

/**
 * Build server-side filters for GraphQL query
 */
export function buildServerFilters(
  entityType: string,
  clientFilters: Record<string, unknown>
): Record<string, unknown> {
  const mappings = FILTER_MAPPINGS[entityType];
  if (!mappings) {
    return {};
  }

  const serverFilters: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = clientFilters[mapping.clientField];
    if (value === undefined || value === null) {
      continue;
    }

    // Validate if schema provided
    if (mapping.validate) {
      const result = mapping.validate.safeParse(value);
      if (!result.success) {
        // Skip invalid filter values
        // console.warn(
        //   `Invalid filter value for ${mapping.clientField}: ${value}`,
        //   result.error.message
        // );
        continue;
      }
    }

    // Transform if needed
    const transformedValue = mapping.transform ? mapping.transform(value) : value;

    // Skip empty arrays
    if (Array.isArray(transformedValue) && transformedValue.length === 0) {
      continue;
    }

    serverFilters[mapping.serverField] = transformedValue;
  }

  return serverFilters;
}

/**
 * Get optimized field selection for a handler
 */
export function getFieldSelection(handlerKey: string): string[] {
  return HANDLER_FIELD_CONFIGS[handlerKey] || [];
}

/**
 * Build optimized GraphQL query with server-side filtering and field selection
 */
export function buildOptimizedQuery(
  baseQuery: string,
  handlerKey: string,
  filters?: Record<string, unknown>,
  entityType?: string
): string {
  // Get field selection for handler
  const fields = getFieldSelection(handlerKey);

  // Build server filters if provided
  const serverFilters = filters && entityType ? buildServerFilters(entityType, filters) : {};

  // Replace field placeholders in query
  let optimizedQuery = baseQuery;

  // Replace field selection
  if (fields.length > 0) {
    const fieldString = fields.join('\n    ');
    optimizedQuery = optimizedQuery.replace(/\{[\s\S]*?\}/, `{\n    ${fieldString}\n  }`);
  }

  // Add filters to query
  if (Object.keys(serverFilters).length > 0) {
    const filterString = Object.entries(serverFilters)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');

    // Find the appropriate place to insert filters
    optimizedQuery = optimizedQuery.replace(
      /(\w+)\s*\(/,
      (match, entityName) => `${entityName}(${filterString}, `
    );
  }

  return optimizedQuery;
}

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  queryTime: number;
  resultSize: number;
  memoryUsed: number;
  fieldsRequested: number;
  filtersApplied: number;
  itemsReturned: number;
  totalItems?: number;
  reductionPercent?: number;
}

/**
 * Track query performance metrics
 */
export class QueryPerformanceTracker {
  private metrics: Map<string, QueryMetrics[]> = new Map();

  startQuery(queryId: string): { endQuery: (result: unknown) => QueryMetrics } {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      endQuery: (result: unknown): QueryMetrics => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        const metrics: QueryMetrics = {
          queryTime: endTime - startTime,
          memoryUsed: endMemory - startMemory,
          resultSize: JSON.stringify(result).length,
          fieldsRequested: 0, // Will be calculated based on query
          filtersApplied: 0, // Will be calculated based on query
          itemsReturned: Array.isArray(result)
            ? result.length
            : (result as Record<string, unknown>)?.items &&
                Array.isArray((result as Record<string, unknown>).items)
              ? ((result as Record<string, unknown>).items as unknown[]).length
              : 1,
        };

        // Store metrics
        const existingMetrics = this.metrics.get(queryId) || [];
        existingMetrics.push(metrics);
        this.metrics.set(queryId, existingMetrics);

        return metrics;
      },
    };
  }

  getAverageMetrics(queryId: string): QueryMetrics | null {
    const metricsArray = this.metrics.get(queryId);
    if (!metricsArray || metricsArray.length === 0) {
      return null;
    }

    const sum = metricsArray.reduce(
      (acc, m) => ({
        queryTime: acc.queryTime + m.queryTime,
        resultSize: acc.resultSize + m.resultSize,
        memoryUsed: acc.memoryUsed + m.memoryUsed,
        fieldsRequested: acc.fieldsRequested + m.fieldsRequested,
        filtersApplied: acc.filtersApplied + m.filtersApplied,
        itemsReturned: acc.itemsReturned + m.itemsReturned,
      }),
      {
        queryTime: 0,
        resultSize: 0,
        memoryUsed: 0,
        fieldsRequested: 0,
        filtersApplied: 0,
        itemsReturned: 0,
      }
    );

    const count = metricsArray.length;
    return {
      queryTime: Math.round(sum.queryTime / count),
      resultSize: Math.round(sum.resultSize / count),
      memoryUsed: Math.round(sum.memoryUsed / count),
      fieldsRequested: Math.round(sum.fieldsRequested / count),
      filtersApplied: Math.round(sum.filtersApplied / count),
      itemsReturned: Math.round(sum.itemsReturned / count),
    };
  }

  getReductionPercent(beforeQueryId: string, afterQueryId: string): number | null {
    const before = this.getAverageMetrics(beforeQueryId);
    const after = this.getAverageMetrics(afterQueryId);

    if (!before || !after || before.resultSize === 0) {
      return null;
    }

    return Math.round(((before.resultSize - after.resultSize) / before.resultSize) * 100);
  }
}

// Export singleton tracker
export const queryPerformanceTracker = new QueryPerformanceTracker();
