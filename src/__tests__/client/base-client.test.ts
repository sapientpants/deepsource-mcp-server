/**
 * @jest-environment node
 */

import nock from 'nock';
import { BaseDeepSourceClient } from '../../client/base-client';
import { GraphQLResponse } from '../../types/graphql-responses';

// Extend the BaseDeepSourceClient to expose the protected methods
class TestableBaseClient extends BaseDeepSourceClient {
  // Expose protected methods for testing
  async testExecuteGraphQL<T>(query: string): Promise<GraphQLResponse<T>> {
    return this.executeGraphQL(query);
  }

  async testExecuteGraphQLMutation<T>(mutation: string): Promise<T> {
    return this.executeGraphQLMutation(mutation);
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
      // @ts-expect-error - Testing invalid input
      expect(() => new BaseDeepSourceClient(null)).toThrow('DeepSource API key is required');
      // @ts-expect-error - Testing invalid input
      expect(() => new BaseDeepSourceClient(undefined)).toThrow('DeepSource API key is required');
    });
  });

  describe('executeGraphQL', () => {
    it('should execute a GraphQL query successfully', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
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
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
      const query = 'query { invalidField }';
      const mockErrors = [{ message: "Field invalidField doesn't exist" }];

      // Mock API response
      nock(API_URL).post('/graphql/', { query }).reply(200, { errors: mockErrors });

      // Execute and verify
      await expect(client.testExecuteGraphQL(query)).rejects.toThrow(/GraphQL Errors/);
    });

    it('should handle network errors', async () => {
      // Setup
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
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
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
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
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
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
      const client = new TestableBaseClient(API_KEY, { baseURL: `${API_URL}/graphql/` });
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
        baseURL: `${API_URL}/graphql/`,
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
});
