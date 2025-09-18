/**
 * Optimized GraphQL queries with server-side filtering and dynamic field selection
 */

import { buildServerFilters, getFieldSelection } from './query-optimizer.js';
import type { PaginationParams } from '../../models/pagination.js';

/**
 * Build optimized projects query with server-side filtering
 */
export function createOptimizedProjectsQuery(
  handlerKey: string = 'projects.list',
  filters?: {
    login?: string;
    isActivated?: boolean;
    vcsProvider?: string;
  }
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  // Build filter arguments
  const filterArgs: string[] = [];
  if (filters?.login) {
    filterArgs.push(`login: "${filters.login}"`);
  }
  if (filters?.isActivated !== undefined) {
    filterArgs.push(`isActivated: ${filters.isActivated}`);
  }

  const filterString = filterArgs.length > 0 ? `(${filterArgs.join(', ')})` : '';

  // Build the query string directly for simplicity
  return `
    query GetProjects {
      viewer {
        accounts${filterString} {
          edges {
            node {
              login
              vcsProvider
              repositories {
                edges {
                  node {
                    ${fieldString}
                  }
                }
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      }
    }
  `;
}

/**
 * Build optimized issues query with comprehensive server-side filtering
 */
export function createOptimizedIssuesQuery(
  projectKey: string,
  handlerKey: string = 'issues.list',
  filters?: {
    analyzers?: string[];
    path?: string;
    severity?: string;
    category?: string;
    tags?: string[];
  },
  pagination?: PaginationParams
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  // Build server filters
  const serverFilters = buildServerFilters('issues', filters || {});

  // Build filter arguments for the query
  const filterArgs: string[] = [];
  Object.entries(serverFilters).forEach(([key, value]) => {
    if (value !== undefined) {
      if (typeof value === 'string') {
        filterArgs.push(`${key}: "${value}"`);
      } else if (Array.isArray(value)) {
        const arrayString = value.map((v) => `"${v}"`).join(', ');
        filterArgs.push(`${key}: [${arrayString}]`);
      } else {
        filterArgs.push(`${key}: ${value}`);
      }
    }
  });

  // Add pagination arguments
  if (pagination?.first) filterArgs.push(`first: ${pagination.first}`);
  if (pagination?.after) filterArgs.push(`after: "${pagination.after}"`);
  if (pagination?.last) filterArgs.push(`last: ${pagination.last}`);
  if (pagination?.before) filterArgs.push(`before: "${pagination.before}"`);

  const argsString = filterArgs.length > 0 ? `(${filterArgs.join(', ')})` : '';

  return `
    query GetFilteredIssues {
      repository(dsn: "${projectKey}") {
        issues${argsString} {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
            startCursor
          }
          edges {
            node {
              ${fieldString}
            }
          }
        }
      }
    }
  `;
}

/**
 * Build optimized runs query with server-side filtering
 */
export function createOptimizedRunsQuery(
  projectKey: string,
  handlerKey: string = 'runs.list',
  filters?: {
    status?: string;
    branch?: string;
    afterDate?: Date | string;
    beforeDate?: Date | string;
    analyzers?: string[];
  },
  pagination?: PaginationParams
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  // Build server filters
  const serverFilters = buildServerFilters('runs', filters || {});

  // Build filter arguments
  const filterArgs: string[] = [];
  Object.entries(serverFilters).forEach(([key, value]) => {
    if (value !== undefined) {
      if (typeof value === 'string') {
        filterArgs.push(`${key}: "${value}"`);
      } else if (Array.isArray(value)) {
        const arrayString = value.map((v) => `"${v}"`).join(', ');
        filterArgs.push(`${key}: [${arrayString}]`);
      } else {
        filterArgs.push(`${key}: ${value}`);
      }
    }
  });

  // Add pagination
  if (pagination?.first) filterArgs.push(`first: ${pagination.first}`);
  if (pagination?.after) filterArgs.push(`after: "${pagination.after}"`);

  const argsString = filterArgs.length > 0 ? `(${filterArgs.join(', ')})` : '';

  return `
    query GetFilteredRuns {
      repository(dsn: "${projectKey}") {
        analysisRuns${argsString} {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              ${fieldString}
            }
          }
        }
      }
    }
  `;
}

/**
 * Build optimized metrics query with server-side filtering
 */
export function createOptimizedMetricsQuery(
  projectKey: string,
  handlerKey: string = 'metrics.list',
  filters?: {
    shortcodeIn?: string[];
    thresholdStatus?: string;
  }
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  // Build server filters - currently unused but will be used for threshold filtering
  // const serverFilters = buildServerFilters('metrics', filters || {});

  // Build filter arguments
  const filterArgs: string[] = [];
  if (filters?.shortcodeIn) {
    const arrayString = filters.shortcodeIn.map((v) => `"${v}"`).join(', ');
    filterArgs.push(`shortcodeIn: [${arrayString}]`);
  }

  const argsString = filterArgs.length > 0 ? `(${filterArgs.join(', ')})` : '';

  return `
    query GetFilteredMetrics {
      repository(dsn: "${projectKey}") {
        metrics${argsString} {
          ${fieldString}
        }
      }
    }
  `;
}

/**
 * Build optimized single run query with minimal field selection
 */
export function createOptimizedSingleRunQuery(
  runId: string,
  handlerKey: string = 'runs.details'
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  return `
    query GetRun {
      run(runUid: "${runId}") {
        ${fieldString}
      }
    }
  `;
}

/**
 * Build optimized vulnerabilities query
 */
export function createOptimizedVulnerabilitiesQuery(
  projectKey: string,
  handlerKey: string = 'vulnerabilities.list',
  pagination?: PaginationParams
): string {
  const fields = getFieldSelection(handlerKey);
  const fieldString = fields.join(' ');

  // Build pagination arguments
  const filterArgs: string[] = [];
  if (pagination?.first) filterArgs.push(`first: ${pagination.first}`);
  if (pagination?.after) filterArgs.push(`after: "${pagination.after}"`);

  const argsString = filterArgs.length > 0 ? `(${filterArgs.join(', ')})` : '';

  return `
    query GetVulnerabilities {
      repository(dsn: "${projectKey}") {
        dependencyVulnerabilityOccurrences${argsString} {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              ${fieldString}
            }
          }
        }
      }
    }
  `;
}

/**
 * Helper to determine if client-side filtering is still needed
 */
export function requiresClientSideFiltering(
  entityType: string,
  filters: Record<string, unknown>
): { required: boolean; fields: string[] } {
  // Check which filters cannot be handled server-side
  const unsupportedFilters: string[] = [];

  switch (entityType) {
    case 'runs':
      // Status filtering still needs client-side for now
      if (filters.status) {
        unsupportedFilters.push('status');
      }
      break;
    case 'metrics':
      // Threshold status filtering needs client-side
      if (filters.thresholdStatus) {
        unsupportedFilters.push('thresholdStatus');
      }
      break;
    default:
      // Most other filters are supported server-side
      break;
  }

  return {
    required: unsupportedFilters.length > 0,
    fields: unsupportedFilters,
  };
}
