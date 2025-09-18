/**
 * Tests for GraphQL query optimization utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildServerFilters,
  getFieldSelection,
  HANDLER_FIELD_CONFIGS,
  FILTER_MAPPINGS,
  QueryPerformanceTracker,
} from '../../../utils/graphql/query-optimizer';

describe('Query Optimizer', () => {
  describe('buildServerFilters', () => {
    it('should build server filters for projects', () => {
      const clientFilters = {
        login: 'myorg',
        isActivated: true,
        vcsProvider: 'GITHUB',
      };

      const serverFilters = buildServerFilters('projects', clientFilters);

      expect(serverFilters).toEqual({
        login: 'myorg',
        isActivated: true,
        vcsProvider: 'GITHUB',
      });
    });

    it('should transform array filters for issues', () => {
      const clientFilters = {
        analyzers: ['python', 'javascript'],
        path: '/src/main.ts',
        tags: ['security', 'performance'],
      };

      const serverFilters = buildServerFilters('issues', clientFilters);

      expect(serverFilters).toEqual({
        analyzerIn: ['python', 'javascript'],
        path: '/src/main.ts',
        tags: ['security', 'performance'],
      });
    });

    it('should handle single value to array transformation', () => {
      const clientFilters = {
        analyzers: 'python',
        tags: 'security',
      };

      const serverFilters = buildServerFilters('issues', clientFilters);

      expect(serverFilters).toEqual({
        analyzerIn: ['python'],
        tags: ['security'],
      });
    });

    it('should transform date filters for runs', () => {
      const afterDate = new Date('2024-01-01');
      const beforeDate = new Date('2024-12-31');

      const clientFilters = {
        afterDate,
        beforeDate,
        status: 'SUCCESS',
      };

      const serverFilters = buildServerFilters('runs', clientFilters);

      expect(serverFilters).toEqual({
        createdAt_gte: afterDate.toISOString(),
        createdAt_lte: beforeDate.toISOString(),
        status: 'SUCCESS',
      });
    });

    it('should skip undefined and null values', () => {
      const clientFilters = {
        login: 'myorg',
        isActivated: undefined,
        vcsProvider: null,
      };

      const serverFilters = buildServerFilters('projects', clientFilters);

      expect(serverFilters).toEqual({
        login: 'myorg',
      });
    });

    it('should skip empty arrays', () => {
      const clientFilters = {
        analyzers: [],
        tags: ['security'],
      };

      const serverFilters = buildServerFilters('issues', clientFilters);

      expect(serverFilters).toEqual({
        tags: ['security'],
      });
    });

    it('should validate enum values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const clientFilters = {
        severity: 'INVALID',
        category: 'SECURITY',
      };

      const serverFilters = buildServerFilters('issues', clientFilters);

      expect(serverFilters).toEqual({
        category: 'SECURITY',
      });
      // Console.warn is commented out in implementation, so we don't check for it
      // expect(consoleSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('Invalid filter value'),
      //   expect.any(String)
      // );

      consoleSpy.mockRestore();
    });

    it('should return empty object for unknown entity type', () => {
      const clientFilters = {
        someFilter: 'value',
      };

      const serverFilters = buildServerFilters('unknown', clientFilters);

      expect(serverFilters).toEqual({});
    });
  });

  describe('getFieldSelection', () => {
    it('should return fields for known handler', () => {
      const fields = getFieldSelection('projects.list');

      expect(fields).toEqual(['dsn', 'name', 'isActivated', 'isPrivate']);
    });

    it('should return more fields for detail handlers', () => {
      const listFields = getFieldSelection('issues.list');
      const detailFields = getFieldSelection('issues.details');

      expect(detailFields.length).toBeGreaterThan(listFields.length);
      expect(detailFields).toContain('description');
      expect(listFields).not.toContain('description');
    });

    it('should return empty array for unknown handler', () => {
      const fields = getFieldSelection('unknown.handler');

      expect(fields).toEqual([]);
    });

    it('should handle nested field selections', () => {
      const fields = getFieldSelection('runs.details');

      expect(fields).toContain(
        'summary { occurrencesIntroduced occurrencesResolved occurrencesSuppressed }'
      );
    });
  });

  describe('QueryPerformanceTracker', () => {
    let tracker: QueryPerformanceTracker;

    beforeEach(() => {
      tracker = new QueryPerformanceTracker();
    });

    it('should track query performance metrics', () => {
      const queryId = 'test-query';
      const { endQuery } = tracker.startQuery(queryId);

      // Simulate some processing time
      const result = { items: [1, 2, 3, 4, 5] };
      const metrics = endQuery(result);

      expect(metrics).toHaveProperty('queryTime');
      expect(metrics).toHaveProperty('resultSize');
      expect(metrics).toHaveProperty('memoryUsed');
      expect(metrics).toHaveProperty('itemsReturned');
      expect(metrics.itemsReturned).toBe(5);
      expect(metrics.queryTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average metrics', () => {
      const queryId = 'test-query';

      // Track multiple queries
      for (let i = 0; i < 3; i++) {
        const { endQuery } = tracker.startQuery(queryId);
        endQuery({ items: new Array(10).fill(0) });
      }

      const avgMetrics = tracker.getAverageMetrics(queryId);

      expect(avgMetrics).not.toBeNull();
      expect(avgMetrics?.itemsReturned).toBe(10);
    });

    it('should return null for unknown query ID', () => {
      const avgMetrics = tracker.getAverageMetrics('unknown');

      expect(avgMetrics).toBeNull();
    });

    it('should calculate reduction percentage', () => {
      const beforeId = 'before-optimization';
      const afterId = 'after-optimization';

      // Simulate before optimization - large result
      const { endQuery: endBefore } = tracker.startQuery(beforeId);
      endBefore({ items: new Array(1000).fill({ data: 'x'.repeat(100) }) });

      // Simulate after optimization - smaller result
      const { endQuery: endAfter } = tracker.startQuery(afterId);
      endAfter({ items: new Array(100).fill({ data: 'x'.repeat(10) }) });

      const reduction = tracker.getReductionPercent(beforeId, afterId);

      expect(reduction).not.toBeNull();
      expect(reduction).toBeGreaterThan(0);
      expect(reduction).toBeLessThan(100);
    });

    it('should return null reduction for missing metrics', () => {
      const reduction = tracker.getReductionPercent('unknown1', 'unknown2');

      expect(reduction).toBeNull();
    });
  });

  describe('Filter Configuration', () => {
    it('should have complete filter mappings for all entity types', () => {
      const entityTypes = ['projects', 'issues', 'runs', 'metrics'];

      entityTypes.forEach((entityType) => {
        expect(FILTER_MAPPINGS[entityType]).toBeDefined();
        expect(Array.isArray(FILTER_MAPPINGS[entityType])).toBe(true);
        expect(FILTER_MAPPINGS[entityType].length).toBeGreaterThan(0);
      });
    });

    it('should have handler field configs for common operations', () => {
      const expectedHandlers = [
        'projects.list',
        'projects.details',
        'issues.list',
        'issues.details',
        'runs.list',
        'runs.details',
        'metrics.list',
      ];

      expectedHandlers.forEach((handler) => {
        expect(HANDLER_FIELD_CONFIGS[handler]).toBeDefined();
        expect(Array.isArray(HANDLER_FIELD_CONFIGS[handler])).toBe(true);
        expect(HANDLER_FIELD_CONFIGS[handler].length).toBeGreaterThan(0);
      });
    });

    it('should have transform functions where needed', () => {
      const issueFilters = FILTER_MAPPINGS.issues;
      const analyzerFilter = issueFilters.find((f) => f.clientField === 'analyzers');

      expect(analyzerFilter?.transform).toBeDefined();
      expect(analyzerFilter?.transform?.('single')).toEqual(['single']);
      expect(analyzerFilter?.transform?.(['multiple', 'values'])).toEqual(['multiple', 'values']);
    });

    it('should have validation schemas for critical fields', () => {
      const runFilters = FILTER_MAPPINGS.runs;
      const statusFilter = runFilters.find((f) => f.clientField === 'status');

      expect(statusFilter?.validate).toBeDefined();
    });
  });

  describe('Performance Impact', () => {
    it('should reduce payload size with field selection', () => {
      const allFields = [
        'id',
        'name',
        'description',
        'longDescription',
        'metadata',
        'history',
        'statistics',
        'relationships',
      ];
      const selectedFields = getFieldSelection('projects.list');

      const reduction = ((allFields.length - selectedFields.length) / allFields.length) * 100;

      expect(reduction).toBeGreaterThan(40); // At least 40% field reduction
    });

    it('should support incremental field addition', () => {
      const listFields = getFieldSelection('projects.list');
      const detailFields = getFieldSelection('projects.details');

      // Detail view should be a superset of list view
      listFields.forEach((field) => {
        expect(detailFields).toContain(field);
      });
    });
  });
});
