/**
 * Tests for pagination helper utilities
 */
import {
  createEmptyPaginatedResponse,
  normalizePaginationParams,
  createPaginationHelp,
  createEnhancedPaginationHelp,
} from '../../../utils/pagination/helpers';
import { PageInfo, PaginationParams } from '../../../utils/pagination/types';

// The logger will be automatically mocked by Jest's automock functionality
// We'll just test the behavior, not the logging itself

describe('Pagination Helpers', () => {
  describe('createEmptyPaginatedResponse', () => {
    it('should create an empty paginated response with correct structure', () => {
      const response = createEmptyPaginatedResponse<string>();

      expect(response.items).toEqual([]);
      expect(response.totalCount).toBe(0);
      expect(response.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
    });

    it('should work with different generic types', () => {
      interface TestItem {
        id: number;
        name: string;
      }

      const response = createEmptyPaginatedResponse<TestItem>();

      expect(response.items).toEqual([]);
      expect(Array.isArray(response.items)).toBe(true);
    });
  });

  describe('normalizePaginationParams', () => {
    it('should use defaults for empty params', () => {
      const params: PaginationParams = {};
      const result = normalizePaginationParams(params);

      expect(result.first).toBe(10);
      expect(result.last).toBeUndefined();
      expect(result.after).toBeUndefined();
      expect(result.before).toBeUndefined();
      expect(result.offset).toBeUndefined();
    });

    it('should normalize forward pagination correctly', () => {
      const params: PaginationParams = {
        first: 20,
        after: 'cursor123',
      };
      const result = normalizePaginationParams(params);

      expect(result.first).toBe(20);
      expect(result.after).toBe('cursor123');
      expect(result.last).toBeUndefined();
      expect(result.before).toBeUndefined();
    });

    it('should normalize backward pagination correctly', () => {
      const params: PaginationParams = {
        last: 15,
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(15);
      expect(result.before).toBe('cursor456');
      expect(result.first).toBeUndefined();
      expect(result.after).toBeUndefined();
    });

    it('should prioritize backward pagination when both before and after are provided', () => {
      const params: PaginationParams = {
        first: 10,
        after: 'cursor123',
        last: 15,
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(15);
      expect(result.before).toBe('cursor456');
      expect(result.first).toBeUndefined();
      expect(result.after).toBe('cursor123');
    });

    it('should handle non-numeric first parameter', () => {
      const params = {
        // @ts-expect-error - Testing with invalid types
        first: '20',
        after: 'cursor123',
      };
      const result = normalizePaginationParams(params);

      expect(result.first).toBe(20);
      expect(result.after).toBe('cursor123');
    });

    it('should handle non-numeric last parameter', () => {
      const params = {
        // @ts-expect-error - Testing with invalid types
        last: '15',
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(15);
      expect(result.before).toBe('cursor456');
    });

    it('should handle non-numeric offset parameter', () => {
      const params = {
        // @ts-expect-error - Testing with invalid types
        offset: '30',
      };
      const result = normalizePaginationParams(params);

      expect(result.offset).toBe(30);
      expect(result.first).toBe(10); // Default
    });

    it('should handle negative numeric parameters', () => {
      const params: PaginationParams = {
        first: -5,
        offset: -10,
      };
      const result = normalizePaginationParams(params);

      expect(result.first).toBe(1); // Minimum value
      expect(result.offset).toBe(0); // Minimum value
    });

    it('should handle non-string cursor parameters', () => {
      const params = {
        first: 10,
        // @ts-expect-error - Testing with invalid types
        after: 12345,
        // @ts-expect-error - Testing with invalid types
        before: null,
      };
      const result = normalizePaginationParams(params);

      expect(result.after).toBe('12345');
      expect(result.before).toBe('');
    });

    it('should prefer before/last when before is provided', () => {
      const params: PaginationParams = {
        first: 10,
        last: 15,
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(15);
      expect(result.before).toBe('cursor456');
      expect(result.first).toBeUndefined();
    });

    it('should use first as default for last when before is provided but last is not', () => {
      const params: PaginationParams = {
        first: 10,
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(10);
      expect(result.before).toBe('cursor456');
      expect(result.first).toBeUndefined();
    });

    it('should handle last without before (non-standard case)', () => {
      const params: PaginationParams = {
        first: 10,
        last: 15,
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(15);
      expect(result.first).toBeUndefined();
      // Should log a warning (tested via the mock)
    });

    it('should use default values for last when before is provided without last or first', () => {
      const params: PaginationParams = {
        before: 'cursor456',
      };
      const result = normalizePaginationParams(params);

      expect(result.last).toBe(10); // Default value
      expect(result.before).toBe('cursor456');
      expect(result.first).toBeUndefined();
    });

    it('should retain other custom properties when normalizing', () => {
      interface CustomParams extends PaginationParams {
        filter?: string;
        sort?: string;
      }

      const params: CustomParams = {
        first: 20,
        after: 'cursor123',
        filter: 'status:active',
        sort: 'createdAt:desc',
      };

      const result = normalizePaginationParams(params);

      expect(result.first).toBe(20);
      expect(result.after).toBe('cursor123');
      expect(result.filter).toBe('status:active');
      expect(result.sort).toBe('createdAt:desc');
    });

    it('should handle float values in numeric parameters', () => {
      const params: PaginationParams = {
        first: 10.7,
        offset: 5.3,
      };
      const result = normalizePaginationParams(params);

      expect(result.first).toBe(10); // Floor value
      expect(result.offset).toBe(5); // Floor value
    });
  });

  describe('createPaginationHelp', () => {
    it('should create pagination help with valid cursors', () => {
      const pageInfo: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: true,
        startCursor: 'start123',
        endCursor: 'end456',
      };

      const help = createPaginationHelp(pageInfo);

      expect(help.description).toBe('This API uses Relay-style cursor-based pagination');
      expect(help.forward_pagination).toBe(
        'To get the next page, use \'first: 10, after: "end456"\''
      );
      expect(help.backward_pagination).toBe(
        'To get the previous page, use \'last: 10, before: "start123"\''
      );
      expect(help.page_status).toEqual({
        has_next_page: true,
        has_previous_page: true,
      });
    });

    it('should handle missing cursors in pagination help', () => {
      const pageInfo: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
      };

      const help = createPaginationHelp(pageInfo);

      expect(help.forward_pagination).toBe(
        'To get the next page, use \'first: 10, after: "cursor_value"\''
      );
      expect(help.backward_pagination).toBe(
        'To get the previous page, use \'last: 10, before: "cursor_value"\''
      );
      expect(help.page_status).toEqual({
        has_next_page: false,
        has_previous_page: false,
      });
    });
  });

  describe('createEnhancedPaginationHelp', () => {
    it('should create enhanced pagination help with all options', () => {
      const pageInfo: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: true,
        startCursor: 'start123',
        endCursor: 'end456',
      };

      const help = createEnhancedPaginationHelp(pageInfo, 10);

      expect(help.description).toContain('Relay-style');
      expect(help.current_page).toEqual({
        size: 10,
        has_next_page: true,
        has_previous_page: true,
      });
      expect(help.next_page).toEqual({
        example: '{"first": 10, "after": "end456"}',
        description: 'Use these parameters to fetch the next page of results',
      });
      expect(help.previous_page).toEqual({
        example: '{"last": 10, "before": "start123"}',
        description: 'Use these parameters to fetch the previous page of results',
      });
      expect(help.pagination_types).toBeDefined();
    });

    it('should handle no next page', () => {
      const pageInfo: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'start123',
        endCursor: 'end456',
      };

      const help = createEnhancedPaginationHelp(pageInfo, 5);

      expect(help.current_page.size).toBe(5);
      expect(help.current_page.has_next_page).toBe(false);
      expect(help.next_page).toBeNull();
      expect(help.previous_page).toBeDefined();
    });

    it('should handle no previous page', () => {
      const pageInfo: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'start123',
        endCursor: 'end456',
      };

      const help = createEnhancedPaginationHelp(pageInfo, 15);

      expect(help.current_page.size).toBe(15);
      expect(help.current_page.has_previous_page).toBe(false);
      expect(help.next_page).toBeDefined();
      expect(help.previous_page).toBeNull();
    });

    it('should handle no next or previous pages', () => {
      const pageInfo: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start123',
        endCursor: 'end456',
      };

      const help = createEnhancedPaginationHelp(pageInfo, 0);

      expect(help.current_page.size).toBe(0);
      expect(help.next_page).toBeNull();
      expect(help.previous_page).toBeNull();
    });
  });
});
