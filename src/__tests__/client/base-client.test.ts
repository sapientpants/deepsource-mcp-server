/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import nock from 'nock';
import { BaseDeepSourceClient } from '../../client/base-client.js';
import { GraphQLResponse } from '../../types/graphql-responses.js';

// Extend the BaseDeepSourceClient to expose the protected methods
class TestableBaseClient extends BaseDeepSourceClient {
  // Expose protected methods for testing
  async testExecuteGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    return this.executeGraphQL(query, variables);
  }

  async testExecuteGraphQLMutation<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return this.executeGraphQLMutation(mutation, variables);
  }

  async testFindProjectByKey(projectKey: string) {
    return this.findProjectByKey(projectKey);
  }

  async testFetchWithPagination<T>(
    fetcher: (params: any) => Promise<any>,
    params: any
  ): Promise<any> {
    return this.fetchWithPagination<T>(fetcher, params);
  }

  // skipcq: JS-0105 - Test helper method calling static method
  testNormalizePaginationParams(params: Record<string, unknown>) {
    return BaseDeepSourceClient.normalizePaginationParams(params);
  }

  // skipcq: JS-0105 - Test helper method calling static method
  testCreateEmptyPaginatedResponse<T>() {
    return BaseDeepSourceClient.createEmptyPaginatedResponse<T>();
  }

  // skipcq: JS-0105 - Test helper method calling static method
  testExtractErrorMessages(errors: Array<{ message: string }>) {
    return BaseDeepSourceClient.extractErrorMessages(errors);
  }
}

describe('BaseDeepSourceClient', () => {
  const API_KEY = 'test-api-key';
  const API_URL = 'https://api.deepsource.io';

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('constructor', () => {
    it('should throw an error when API key is not provided', () => {
      expect(() => new BaseDeepSourceClient('')).toThrow('DeepSource API key is required');
      expect(() => new BaseDeepSourceClient(null as unknown as string)).toThrow(
        'DeepSource API key is required'
      );
      expect(() => new BaseDeepSourceClient(undefined as unknown as string)).toThrow(
        'DeepSource API key is required'
      );
    });
  });

  describe('executeGraphQL', () => {
    it('should execute a GraphQL query successfully', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const query = 'query { viewer { email } }';
      const mockResponseData = {
        data: {
          viewer: {
            email: 'test@example.com',
          },
        },
      };

      // Mock API response
      nock(API_URL).post('/graphql/', { query }).reply(200, { data: mockResponseData });

      // Execute
      const result = await client.testExecuteGraphQL(query);

      // Verify
      expect(result).toEqual({ data: mockResponseData });
    });

    it('should throw an error when GraphQL response contains errors', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const query = 'query { invalidField }';
      const mockErrors = [{ message: "Field invalidField doesn't exist" }];

      // Mock API response
      nock(API_URL).post('/graphql/', { query }).reply(200, { errors: mockErrors });

      // Execute and verify
      await expect(client.testExecuteGraphQL(query)).rejects.toThrow(/GraphQL Errors/);
    });

    it('should handle network errors', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const query = 'query { viewer { email } }';

      // Mock network error
      nock(API_URL)
        .post('/graphql/', { query })
        .replyWithError('Network error: Connection refused');

      // Execute and verify
      await expect(client.testExecuteGraphQL(query)).rejects.toThrow(/Network error/);
    });

    it('should handle HTTP error responses', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const query = 'query { viewer { email } }';

      // Mock HTTP error
      nock(API_URL).post('/graphql/', { query }).reply(401, { message: 'Unauthorized' });

      // Execute and verify
      await expect(client.testExecuteGraphQL(query)).rejects.toThrow(/Authentication error/);
    });
  });

  describe('executeGraphQLMutation', () => {
    it('should execute a GraphQL mutation successfully', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const mutation = 'mutation { updateProject(id: "123") { id } }';
      const mockResponseData = {
        data: {
          updateProject: {
            id: '123',
          },
        },
      };

      // Mock API response
      nock(API_URL).post('/graphql/', { query: mutation }).reply(200, { data: mockResponseData });

      // Execute
      const result = await client.testExecuteGraphQLMutation(mutation);

      // Verify
      expect(result).toEqual({ data: mockResponseData });
    });

    it('should throw an error when GraphQL mutation response contains errors', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY);
      const mutation = 'mutation { updateProject(id: "123") { id } }';
      const mockErrors = [{ message: 'Permission denied' }];

      // Mock API response
      nock(API_URL).post('/graphql/', { query: mutation }).reply(200, { errors: mockErrors });

      // Execute and verify
      await expect(client.testExecuteGraphQLMutation(mutation)).rejects.toThrow(/GraphQL Errors/);
    });

    it('should handle timeout errors', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY, {
        timeout: 100, // Very short timeout
      });
      const mutation = 'mutation { updateProject(id: "123") { id } }';

      // Mock a delayed response to trigger timeout
      nock(API_URL)
        .post('/graphql/', { query: mutation })
        .delayConnection(200) // Delay longer than timeout
        .reply(200, { data: { updateProject: { id: '123' } } });

      // Execute and verify
      await expect(client.testExecuteGraphQLMutation(mutation)).rejects.toThrow(/timeout/i);
    });
  });

  describe('findProjectByKey', () => {
    it('should return a project for a valid project key', async () => {
      const client = new TestableBaseClient(API_KEY);
      const projectKey = 'organization/repository';

      const result = await client.testFindProjectByKey(projectKey);

      expect(result).not.toBeNull();
      expect(result?.key).toBe(projectKey);
      expect(result?.name).toBe('Project');
      expect(result?.repository.login).toBe('organization');
      expect(result?.repository.name).toBe('repository');
    });

    it('should handle simple project keys without slash', async () => {
      const client = new TestableBaseClient(API_KEY);
      const projectKey = 'simple-project';

      const result = await client.testFindProjectByKey(projectKey);

      expect(result).not.toBeNull();
      expect(result?.key).toBe(projectKey);
      // When there's no slash, split returns the full key for both parts
      expect(result?.repository.login).toBe('simple-project');
      expect(result?.repository.name).toBe('unknown');
    });

    it('should handle normal processing without errors', async () => {
      const client = new TestableBaseClient(API_KEY);
      const projectKey = 'test/project';

      const result = await client.testFindProjectByKey(projectKey);

      expect(result).not.toBeNull();
      expect(result?.key).toBe(projectKey);
      expect(result?.repository.login).toBe('test');
      expect(result?.repository.name).toBe('project');
    });
  });

  describe('normalizePaginationParams', () => {
    const client = new TestableBaseClient(API_KEY);

    it('should normalize offset to non-negative integer', () => {
      const result = client.testNormalizePaginationParams({ offset: -5.7 });
      expect(result.offset).toBe(0);

      const result2 = client.testNormalizePaginationParams({ offset: 10.9 });
      expect(result2.offset).toBe(10);
    });

    it('should normalize first to positive integer', () => {
      const result = client.testNormalizePaginationParams({ first: -5 });
      expect(result.first).toBe(1);

      const result2 = client.testNormalizePaginationParams({ first: 15.7 });
      expect(result2.first).toBe(15);
    });

    it('should normalize last to positive integer', () => {
      const result = client.testNormalizePaginationParams({ last: -3 });
      expect(result.last).toBe(1);

      const result2 = client.testNormalizePaginationParams({ last: 20.2 });
      expect(result2.last).toBe(20);
    });

    it('should convert after and before to strings when they are not deleted by pagination logic', () => {
      // Test after conversion (before cursor logic doesn't apply here)
      const result1 = client.testNormalizePaginationParams({
        after: 123,
      });
      expect(result1.after).toBe('123');
      expect(result1.first).toBe(10); // default value

      // Test before conversion with empty string (null converts to empty string but empty string is falsy)
      const result2 = client.testNormalizePaginationParams({
        before: 'some-cursor',
      });
      expect(result2.before).toBe('some-cursor');
      expect(result2.last).toBe(10); // default value when before is truthy
    });

    it('should handle before cursor pagination precedence', () => {
      const result = client.testNormalizePaginationParams({
        before: 'cursor123',
        first: 10,
        after: 'cursor456',
      });

      expect(result.before).toBe('cursor123');
      expect(result.last).toBe(10);
      expect(result.first).toBeUndefined();
      expect(result.after).toBeUndefined();
    });

    it('should use last value when before is provided without first or last', () => {
      const result = client.testNormalizePaginationParams({
        before: 'cursor123',
      });

      expect(result.before).toBe('cursor123');
      expect(result.last).toBe(10); // default value
    });

    it('should handle pagination with both after and before (before takes precedence)', () => {
      const result = client.testNormalizePaginationParams({
        after: 'cursor456',
        last: 5,
        before: 'cursor789',
      });

      // before logic wins due to if/else if structure - before is preserved, after/first are deleted
      expect(result.before).toBe('cursor789');
      expect(result.last).toBe(5); // existing value preserved
      expect(result.first).toBeUndefined();
      expect(result.after).toBeUndefined();
    });

    it('should use existing first value when after is provided', () => {
      const result = client.testNormalizePaginationParams({
        after: 'cursor456',
        first: 25,
      });

      expect(result.after).toBe('cursor456');
      expect(result.first).toBe(25); // preserved existing value
    });

    it('should preserve params when no cursor-based pagination is used', () => {
      const result = client.testNormalizePaginationParams({
        first: 15,
        offset: 20,
      });

      expect(result.first).toBe(15);
      expect(result.offset).toBe(20);
      expect(result.after).toBeUndefined();
      expect(result.before).toBeUndefined();
    });
  });

  describe('createEmptyPaginatedResponse', () => {
    it('should create an empty paginated response with correct structure', () => {
      const client = new TestableBaseClient(API_KEY);

      const result = client.testCreateEmptyPaginatedResponse();

      expect(result).toEqual({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      });
    });
  });

  describe('extractErrorMessages', () => {
    it('should extract single error message', () => {
      const client = new TestableBaseClient(API_KEY);
      const errors = [{ message: 'Single error' }];

      const result = client.testExtractErrorMessages(errors);

      expect(result).toBe('Single error');
    });

    it('should extract multiple error messages joined by semicolon', () => {
      const client = new TestableBaseClient(API_KEY);
      const errors = [
        { message: 'First error' },
        { message: 'Second error' },
        { message: 'Third error' },
      ];

      const result = client.testExtractErrorMessages(errors);

      expect(result).toBe('First error; Second error; Third error');
    });

    it('should handle empty errors array', () => {
      const client = new TestableBaseClient(API_KEY);
      const errors: Array<{ message: string }> = [];

      const result = client.testExtractErrorMessages(errors);

      expect(result).toBe('');
    });
  });

  describe('fetchWithPagination', () => {
    let client: TestableBaseClient;

    beforeEach(() => {
      client = new TestableBaseClient(API_KEY);
    });

    it('should fetch single page when max_pages is not provided', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item1', 'item2'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor1',
        },
        totalCount: 10,
      });

      const result = await client.testFetchWithPagination(mockFetcher, {
        first: 2,
      });

      expect(result.items).toEqual(['item1', 'item2']);
      expect(mockFetcher).toHaveBeenCalledOnce();
      expect(mockFetcher).toHaveBeenCalledWith({ first: 2 });
    });

    it('should fetch multiple pages when max_pages is provided', async () => {
      const page1 = {
        items: ['item1', 'item2'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor1',
        },
        totalCount: 5,
      };

      const page2 = {
        items: ['item3', 'item4'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
        totalCount: 5,
      };

      const page3 = {
        items: ['item5'],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: 'cursor2',
        },
        totalCount: 5,
      };

      const mockFetcher = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)
        .mockResolvedValueOnce(page3);

      const result = await client.testFetchWithPagination(mockFetcher, {
        first: 2,
        max_pages: 5,
      });

      expect(result.items).toEqual(['item1', 'item2', 'item3', 'item4', 'item5']);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });

    it('should handle page_size alias', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item1'],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      });

      await client.testFetchWithPagination(mockFetcher, {
        page_size: 10,
      });

      expect(mockFetcher).toHaveBeenCalledWith({ first: 10 });
    });

    it('should return correct structure when max_pages is 1', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        items: ['item1', 'item2'],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor1',
        },
        totalCount: 10,
      });

      const result = await client.testFetchWithPagination(mockFetcher, {
        first: 2,
        max_pages: 1,
      });

      expect(result.items).toEqual(['item1', 'item2']);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBe('cursor1');
      expect(result.totalCount).toBe(10);
    });

    it('should handle errors during multi-page fetching', async () => {
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
        client.testFetchWithPagination(mockFetcher, {
          first: 1,
          max_pages: 3,
        })
      ).rejects.toThrow('Network error');

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });
});
