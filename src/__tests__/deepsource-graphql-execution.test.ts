/**
 * Tests for GraphQL query execution and response handling in DeepSourceClient
 */
import { jest } from '@jest/globals';
import { DeepSourceClient } from '../deepsource';
import nock from 'nock';

describe('DeepSourceClient GraphQL Query Execution', () => {
  const API_KEY = 'test-api-key';
  const API_URL = 'https://api.deepsource.io';

  let client: DeepSourceClient;

  beforeEach(() => {
    client = new DeepSourceClient(API_KEY);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  // Test for lines 2511, 2479, 2471, 2465, 2461, 2458, 2453, 2450
  describe('listProjects', () => {
    it('should format and execute the GraphQL query correctly', async () => {
      // Mock the GraphQL response
      nock(API_URL)
        .post('/graphql/')
        .reply(200, () => {
          // Return mock data
          return {
            data: {
              viewer: {
                email: 'test@example.com',
                accounts: {
                  edges: [
                    {
                      node: {
                        login: 'testorg',
                        repositories: {
                          edges: [
                            {
                              node: {
                                name: 'Test Project',
                                defaultBranch: 'main',
                                dsn: 'test-project',
                                id: 'repo123',
                                isPrivate: false,
                                isActivated: true,
                                vcsProvider: 'github',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          };
        });

      // Call the method
      const projects = await client.listProjects();

      // Verify the result
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Test Project');
      expect(projects[0].key).toBe('test-project');
    });

    it('should handle errors in GraphQL response', async () => {
      // Mock the GraphQL response with errors
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'Authentication failed' }, { message: 'Invalid request' }],
        });

      // Call the method and expect it to throw
      await expect(client.listProjects()).rejects.toThrow(
        'GraphQL Errors: Authentication failed, Invalid request'
      );
    });

    it('should handle network errors', async () => {
      // Mock a network error
      nock(API_URL).post('/graphql/').replyWithError('Network error: Connection reset');

      // Call the method and expect it to throw
      await expect(client.listProjects()).rejects.toThrow(/Network error/);
    });
  });
});
