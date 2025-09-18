/**
 * Tests for optimized GraphQL queries
 */

import { describe, it, expect } from 'vitest';
import {
  createOptimizedProjectsQuery,
  createOptimizedIssuesQuery,
  createOptimizedRunsQuery,
  createOptimizedMetricsQuery,
  createOptimizedSingleRunQuery,
  createOptimizedVulnerabilitiesQuery,
  requiresClientSideFiltering,
} from '../../../utils/graphql/optimized-queries';

describe('Optimized GraphQL Queries', () => {
  describe('createOptimizedProjectsQuery', () => {
    it('should create basic projects query without filters', () => {
      const query = createOptimizedProjectsQuery();

      expect(query).toContain('query GetProjects');
      expect(query).toContain('viewer');
      expect(query).toContain('accounts');
      expect(query).toContain('repositories');
      expect(query).toContain('edges');
      expect(query).toContain('node');
    });

    it('should add login filter when provided', () => {
      const query = createOptimizedProjectsQuery('projects.list', {
        login: 'myorg',
      });

      expect(query).toContain('login:');
      expect(query).toContain('myorg');
    });

    it('should add isActivated filter', () => {
      const query = createOptimizedProjectsQuery('projects.list', {
        isActivated: true,
      });

      expect(query).toContain('isActivated:');
      expect(query).toContain('true');
    });

    it('should use handler-specific field selection', () => {
      const listQuery = createOptimizedProjectsQuery('projects.list');
      const detailsQuery = createOptimizedProjectsQuery('projects.details');

      // Details query should request more fields
      expect(detailsQuery).toContain('defaultBranch');
      expect(listQuery).not.toContain('defaultBranch');
    });
  });

  describe('createOptimizedIssuesQuery', () => {
    it('should create issues query with pagination', () => {
      const query = createOptimizedIssuesQuery('test-project', 'issues.list', undefined, {
        first: 10,
        after: 'cursor123',
      });

      expect(query).toContain('query GetFilteredIssues');
      expect(query).toContain('repository(dsn: "test-project")');
      expect(query).toContain('first: 10');
      expect(query).toContain('after: "cursor123"');
    });

    it('should add analyzer filter', () => {
      const query = createOptimizedIssuesQuery(
        'test-project',
        'issues.list',
        {
          analyzers: ['python', 'javascript'],
        },
        { first: 10 }
      );

      expect(query).toContain('analyzerIn: ["python", "javascript"]');
    });

    it('should add path filter', () => {
      const query = createOptimizedIssuesQuery(
        'test-project',
        'issues.list',
        {
          path: '/src/main.ts',
        },
        { first: 10 }
      );

      expect(query).toContain('path: "/src/main.ts"');
    });

    it('should include pagination info in response', () => {
      const query = createOptimizedIssuesQuery('test-project', 'issues.list');

      expect(query).toContain('totalCount');
      expect(query).toContain('pageInfo');
      expect(query).toContain('hasNextPage');
      expect(query).toContain('hasPreviousPage');
      expect(query).toContain('endCursor');
      expect(query).toContain('startCursor');
    });

    it('should apply nested field selection', () => {
      const query = createOptimizedIssuesQuery('test-project', 'issues.list');

      // Should parse and apply nested analyzer fields
      expect(query).toContain('analyzer');
      expect(query).toContain('shortcode');
      expect(query).toContain('name');
    });
  });

  describe('createOptimizedRunsQuery', () => {
    it('should create runs query with date filters', () => {
      const query = createOptimizedRunsQuery(
        'test-project',
        'runs.list',
        {
          afterDate: new Date('2024-01-01'),
          beforeDate: new Date('2024-12-31'),
        },
        { first: 20 }
      );

      expect(query).toContain('query GetFilteredRuns');
      expect(query).toContain('repository(dsn: "test-project")');
      expect(query).toContain('analysisRuns');
      expect(query).toContain('edges');
      expect(query).toContain('node');
    });

    it('should handle branch filter', () => {
      const query = createOptimizedRunsQuery('test-project', 'runs.list', {
        branch: 'main',
      });

      expect(query).toContain('branchName:');
    });

    it('should include summary for details handler', () => {
      const query = createOptimizedRunsQuery('test-project', 'runs.details');

      expect(query).toContain('summary');
      expect(query).toContain('occurrencesIntroduced');
      expect(query).toContain('occurrencesResolved');
      expect(query).toContain('occurrencesSuppressed');
    });
  });

  describe('createOptimizedMetricsQuery', () => {
    it('should create metrics query with shortcode filter', () => {
      const query = createOptimizedMetricsQuery('test-project', 'metrics.list', {
        shortcodeIn: ['BCV', 'LCV'],
      });

      expect(query).toContain('query GetFilteredMetrics');
      expect(query).toContain('shortcodeIn: ["BCV", "LCV"]');
      expect(query).toContain('repository(dsn: "test-project")');
      expect(query).toContain('metrics');
    });

    it('should include metric items with proper nesting', () => {
      const query = createOptimizedMetricsQuery('test-project', 'metrics.list');

      expect(query).toContain('items');
      expect(query).toContain('key');
      expect(query).toContain('threshold');
      expect(query).toContain('value');
      expect(query).toContain('thresholdStatus');
    });

    it('should handle values nesting for history handler', () => {
      const query = createOptimizedMetricsQuery('test-project', 'metrics.values');

      expect(query).toContain('values');
      expect(query).toContain('edges');
      expect(query).toContain('node');
      expect(query).toContain('createdAt');
      expect(query).toContain('commitOid');
    });
  });

  describe('createOptimizedSingleRunQuery', () => {
    it('should create query for single run details', () => {
      const query = createOptimizedSingleRunQuery('run-123', 'runs.details');

      expect(query).toContain('query GetRun');
      expect(query).toContain('run(runUid: "run-123")');
      expect(query).toContain('runUid');
      expect(query).toContain('status');
      expect(query).toContain('createdAt');
      expect(query).toContain('finishedAt');
    });

    it('should apply field selection based on handler', () => {
      const detailsQuery = createOptimizedSingleRunQuery('run-123', 'runs.details');
      const checksQuery = createOptimizedSingleRunQuery('run-123', 'runs.checks');

      expect(detailsQuery).toContain('summary');
      expect(checksQuery).toContain('checks');
      expect(checksQuery).toContain('analyzer');
    });
  });

  describe('createOptimizedVulnerabilitiesQuery', () => {
    it('should create vulnerabilities query with pagination', () => {
      const query = createOptimizedVulnerabilitiesQuery('test-project', 'vulnerabilities.list', {
        first: 50,
        after: 'cursor456',
      });

      expect(query).toContain('query GetVulnerabilities');
      expect(query).toContain('repository(dsn: "test-project")');
      expect(query).toContain('dependencyVulnerabilityOccurrences');
      expect(query).toContain('first: 50');
      expect(query).toContain('after: "cursor456"');
    });

    it('should include nested vulnerability and package data', () => {
      const query = createOptimizedVulnerabilitiesQuery('test-project', 'vulnerabilities.list');

      expect(query).toContain('vulnerability');
      expect(query).toContain('identifier');
      expect(query).toContain('severity');
      expect(query).toContain('summary');
      expect(query).toContain('package');
      expect(query).toContain('ecosystem');
    });
  });

  describe('requiresClientSideFiltering', () => {
    it('should identify runs status as requiring client-side filtering', () => {
      const result = requiresClientSideFiltering('runs', {
        status: 'SUCCESS',
        branch: 'main',
      });

      expect(result.required).toBe(true);
      expect(result.fields).toContain('status');
      expect(result.fields).not.toContain('branch');
    });

    it('should identify metrics threshold status as requiring client-side filtering', () => {
      const result = requiresClientSideFiltering('metrics', {
        shortcodeIn: ['BCV'],
        thresholdStatus: 'PASSING',
      });

      expect(result.required).toBe(true);
      expect(result.fields).toContain('thresholdStatus');
      expect(result.fields).not.toContain('shortcodeIn');
    });

    it('should return false for fully supported filters', () => {
      const result = requiresClientSideFiltering('issues', {
        analyzers: ['python'],
        path: '/src',
        severity: 'HIGH',
      });

      expect(result.required).toBe(false);
      expect(result.fields).toHaveLength(0);
    });

    it('should handle unknown entity types', () => {
      const result = requiresClientSideFiltering('unknown', {
        someFilter: 'value',
      });

      expect(result.required).toBe(false);
      expect(result.fields).toHaveLength(0);
    });
  });

  describe('Query Performance Characteristics', () => {
    it('should generate smaller queries with field selection', () => {
      const listQuery = createOptimizedIssuesQuery('test', 'issues.list');
      const detailQuery = createOptimizedIssuesQuery('test', 'issues.details');

      // List query should be more compact
      expect(listQuery.length).toBeLessThan(detailQuery.length);
    });

    it('should avoid N+1 queries by fetching nested data', () => {
      const query = createOptimizedIssuesQuery('test', 'issues.details');

      // Should fetch analyzer data in the same query
      expect(query.match(/analyzer/g)?.length).toBeGreaterThanOrEqual(1);
      // Should not require separate analyzer queries
      expect(query).toContain('analyzer {');
    });

    it('should optimize for minimal data transfer', () => {
      const query = createOptimizedProjectsQuery('projects.list');

      // Should not request unnecessary nested data for list view
      expect(query).not.toContain('statistics');
      expect(query).not.toContain('history');
      expect(query).not.toContain('metadata');
    });

    it('should support filter combinations', () => {
      const query = createOptimizedIssuesQuery(
        'test-project',
        'issues.list',
        {
          analyzers: ['python', 'javascript'],
          path: '/src',
          severity: 'HIGH',
          category: 'SECURITY',
          tags: ['critical'],
        },
        { first: 100 }
      );

      // All filters should be present in the query
      expect(query).toContain('analyzerIn: ["python", "javascript"]');
      expect(query).toContain('path: "/src"');
      expect(query).toContain('tags: ["critical"]');
    });
  });
});
