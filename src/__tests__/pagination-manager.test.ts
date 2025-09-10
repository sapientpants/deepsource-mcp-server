/**
 * @fileoverview Tests for the pagination manager
 */

import { describe, it, expect, vi } from 'vitest';
import {
  fetchMultiplePages,
  addPaginationMetadata,
  processPaginationParams,
  isValidCursor,
  mergeResponses,
  createPaginationIterator,
} from '../utils/pagination/manager';
import { PaginatedResponse } from '../utils/pagination/types';

describe('PaginationManager', () => {
  describe('fetchMultiplePages', () => {
    it('should fetch a single page when maxPages is 1', async () => {
      const mockData = ['item1', 'item2'];
      const mockFetcher = vi.fn().mockResolvedValue({
        items: mockData,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor1',
        },
        totalCount: 10,
      });

      const result = await fetchMultiplePages(mockFetcher, {
        maxPages: 1,
        pageSize: 2,
      });

      expect(result.items).toEqual(mockData);
      expect(result.pagesFetched).toBe(1);
      expect(result.hasMore).toBe(true);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should fetch multiple pages until no more pages', async () => {
      const page1 = ['item1', 'item2'];
      const page2 = ['item3', 'item4'];
      const page3 = ['item5'];

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce({
          items: page1,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            endCursor: 'cursor1',
          },
          totalCount: 5,
        })
        .mockResolvedValueOnce({
          items: page2,
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: true,
            startCursor: 'cursor1',
            endCursor: 'cursor2',
          },
          totalCount: 5,
        })
        .mockResolvedValueOnce({
          items: page3,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: 'cursor2',
          },
          totalCount: 5,
        });

      const result = await fetchMultiplePages(mockFetcher, {
        maxPages: 5,
        pageSize: 2,
      });

      expect(result.items).toEqual([...page1, ...page2, ...page3]);
      expect(result.pagesFetched).toBe(3);
      expect(result.hasMore).toBe(false);
      expect(result.totalCount).toBe(5);
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });

    it('should stop at maxPages limit even if more pages exist', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor',
        },
        totalCount: 100,
      });

      const result = await fetchMultiplePages(mockFetcher, {
        maxPages: 3,
        pageSize: 1,
      });

      expect(result.pagesFetched).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });

    it('should call progress callback when provided', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item'],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      });

      const onProgress = vi.fn();

      await fetchMultiplePages(mockFetcher, {
        maxPages: 1,
        pageSize: 1,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });

    it('should handle errors during page fetching', async () => {
      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce({
          items: ['item1'],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            endCursor: 'cursor1',
          },
          totalCount: 3,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fetchMultiplePages(mockFetcher, {
          maxPages: 3,
          pageSize: 1,
        })
      ).rejects.toThrow('Network error');

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should fetch all pages when fetchAll is true', async () => {
      let callCount = 0;
      const mockFetcher = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          items: [`item${callCount}`],
          pageInfo: {
            hasNextPage: callCount < 5,
            hasPreviousPage: callCount > 1,
            endCursor: `cursor${callCount}`,
          },
          totalCount: 5,
        });
      });

      const result = await fetchMultiplePages(mockFetcher, {
        fetchAll: true,
        pageSize: 1,
      });

      expect(result.items).toEqual(['item1', 'item2', 'item3', 'item4', 'item5']);
      expect(result.pagesFetched).toBe(5);
      expect(result.hasMore).toBe(false);
      expect(mockFetcher).toHaveBeenCalledTimes(5);
    });
  });

  describe('addPaginationMetadata', () => {
    it('should add user-friendly metadata to response', () => {
      const response: PaginatedResponse<string> = {
        items: ['item1', 'item2'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor1',
        },
        totalCount: 10,
      };

      const result = addPaginationMetadata(response, 2, true);

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.has_more_pages).toBe(true);
      expect(result.pagination?.next_cursor).toBe('cursor1');
      expect(result.pagination?.page_size).toBe(2);
      expect(result.pagination?.pages_fetched).toBe(2);
      expect(result.pagination?.limit_reached).toBe(true);
    });
  });

  describe('processPaginationParams', () => {
    it('should handle page_size as alias for first', () => {
      const result = processPaginationParams({
        page_size: 10,
        max_pages: 3,
      });

      expect(result.normalizedParams.first).toBe(10);
      expect(result.maxPages).toBe(3);
    });

    it('should prefer first over page_size when both provided', () => {
      const result = processPaginationParams({
        first: 20,
        page_size: 10,
        max_pages: 3,
      });

      expect(result.normalizedParams.first).toBe(20);
      expect(result.maxPages).toBe(3);
    });
  });

  describe('isValidCursor', () => {
    it('should accept undefined cursor', () => {
      expect(isValidCursor(undefined)).toBe(true);
    });

    it('should accept valid string cursor', () => {
      expect(isValidCursor('validCursor123')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidCursor('')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(isValidCursor('   ')).toBe(false);
    });
  });

  describe('mergeResponses', () => {
    it('should merge multiple responses correctly', () => {
      const responses: PaginatedResponse<string>[] = [
        {
          items: ['item1', 'item2'],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: 'start1',
            endCursor: 'end1',
          },
          totalCount: 5,
        },
        {
          items: ['item3', 'item4'],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: true,
            startCursor: 'start2',
            endCursor: 'end2',
          },
          totalCount: 5,
        },
        {
          items: ['item5'],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: 'start3',
            endCursor: 'end3',
          },
          totalCount: 5,
        },
      ];

      const result = mergeResponses(responses);

      expect(result.items).toEqual(['item1', 'item2', 'item3', 'item4', 'item5']);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBe('start1');
      expect(result.pageInfo.endCursor).toBe('end3');
      expect(result.totalCount).toBe(5);
    });

    it('should handle empty array', () => {
      const result = mergeResponses([]);

      expect(result.items).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.totalCount).toBe(0);
    });

    it('should handle sparse array with undefined elements', () => {
      // Create a sparse array where accessing elements returns undefined
      const sparseArray: PaginatedResponse<string>[] = new Array(2);
      sparseArray[1] = {
        items: ['item1'],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      };

      const result = mergeResponses(sparseArray);

      expect(result.items).toEqual(['item1']);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('createPaginationIterator', () => {
    it('should iterate through pages', async () => {
      let callCount = 0;
      const mockFetcher = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          items: [`item${callCount}`],
          pageInfo: {
            hasNextPage: callCount < 3,
            hasPreviousPage: callCount > 1,
            endCursor: callCount < 3 ? `cursor${callCount}` : undefined,
          },
          totalCount: 3,
        });
      });

      const iterator = createPaginationIterator(mockFetcher, 1);
      const results: string[][] = [];

      for await (const page of iterator) {
        results.push(page);
      }

      expect(results).toEqual([['item1'], ['item2'], ['item3']]);
      expect(mockFetcher).toHaveBeenCalledTimes(3);
      expect(mockFetcher).toHaveBeenNthCalledWith(1, undefined, 1);
      expect(mockFetcher).toHaveBeenNthCalledWith(2, 'cursor1', 1);
      expect(mockFetcher).toHaveBeenNthCalledWith(3, 'cursor2', 1);
    });

    it('should handle empty result set', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });

      const iterator = createPaginationIterator(mockFetcher);
      const results: string[][] = [];

      for await (const page of iterator) {
        results.push(page);
      }

      expect(results).toEqual([[]]);
      expect(mockFetcher).toHaveBeenCalledOnce();
    });

    it('should handle errors during iteration', async () => {
      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce({
          items: ['item1'],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            endCursor: 'cursor1',
          },
          totalCount: 3,
        })
        .mockRejectedValueOnce(new Error('Fetch error'));

      const iterator = createPaginationIterator(mockFetcher);
      const results: string[][] = [];

      try {
        for await (const page of iterator) {
          results.push(page);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Fetch error');
      }

      expect(results).toEqual([['item1']]);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should use default page size when not specified', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item'],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      });

      const iterator = createPaginationIterator(mockFetcher);
      const results: string[][] = [];

      for await (const page of iterator) {
        results.push(page);
      }

      expect(mockFetcher).toHaveBeenCalledWith(undefined, 50);
    });
  });
});
