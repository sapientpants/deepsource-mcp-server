import nock from 'nock';
import { DeepSourceClient } from '../deepsource';

// Mock the DeepSourceClient's getIssues method for specific tests
const originalGetIssues = DeepSourceClient.prototype.getIssues;

describe('DeepSourceClient', () => {
  const API_KEY = 'test-api-key';
  const client = new DeepSourceClient(API_KEY);

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
    // Restore the original method after all tests
    DeepSourceClient.prototype.getIssues = originalGetIssues;
  });

  describe('listProjects', () => {
    it('should return a list of projects', async () => {
      const mockGraphQLResponse = {
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
                            name: 'Project One',
                            defaultBranch: 'main',
                            dsn: 'project1',
                            isPrivate: false,
                            isActivated: true,
                            vcsProvider: 'github',
                          },
                        },
                        {
                          node: {
                            name: 'Project Two',
                            defaultBranch: 'main',
                            dsn: 'project2',
                            isPrivate: true,
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

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockGraphQLResponse);

      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0]).toEqual({
        key: 'project1',
        name: 'Project One',
        repository: {
          url: 'project1',
          provider: 'github',
          login: 'testorg',
          isPrivate: false,
          isActivated: true,
        },
      });
    });

    it('should handle API errors', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(401, { errors: [{ message: 'Unauthorized' }] });

      await expect(client.listProjects()).rejects.toThrow('GraphQL Error: Unauthorized');
    });

    it('should handle non-GraphQL errors in listProjects', async () => {
      nock('https://api.deepsource.io').post('/graphql/').replyWithError('Network error');

      const client = new DeepSourceClient(API_KEY);
      await expect(client.listProjects()).rejects.toThrow('Network error');
    });
  });

  describe('getIssues', () => {
    const projectKey = 'test-project';

    it('should return a list of issues for a project', async () => {
      // Mock the listProjects call first
      const mockProjectsResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'testorg',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'test-repo',
                            defaultBranch: 'main',
                            dsn: 'test-project',
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

      const mockIssuesResponse = {
        data: {
          repository: {
            name: 'test-repo',
            defaultBranch: 'main',
            dsn: 'test-project',
            isPrivate: false,
            issues: {
              pageInfo: {
                hasNextPage: true,
                hasPreviousPage: false,
                startCursor: 'cursor1',
                endCursor: 'cursor2',
              },
              totalCount: 5,
              edges: [
                {
                  node: {
                    id: 'issue1',
                    issue: {
                      shortcode: 'SEC001',
                      title: 'Security Issue',
                      category: 'security',
                      severity: 'high',
                      description: 'Potential security vulnerability',
                    },
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ1',
                            path: 'src/main.ts',
                            beginLine: 42,
                            endLine: 42,
                            beginColumn: 1,
                            endColumn: 10,
                            title: 'Security Issue',
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

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockIssuesResponse);

      const result = await client.getIssues(projectKey);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'occ1',
        shortcode: 'SEC001',
        title: 'Security Issue',
        category: 'security',
        severity: 'high',
        status: 'OPEN',
        issue_text: 'Potential security vulnerability',
        file_path: 'src/main.ts',
        line_number: 42,
        tags: [],
      });
      expect(result.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor2',
      });
      expect(result.totalCount).toBe(5);
    });

    it('should support pagination parameters', async () => {
      // Mock the listProjects call first
      const mockProjectsResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'testorg',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'test-repo',
                            defaultBranch: 'main',
                            dsn: 'test-project',
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

      const mockIssuesResponse = {
        data: {
          repository: {
            name: 'test-repo',
            defaultBranch: 'main',
            dsn: 'test-project',
            isPrivate: false,
            issues: {
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                startCursor: 'cursor3',
                endCursor: 'cursor4',
              },
              totalCount: 10,
              edges: [
                {
                  node: {
                    id: 'issue2',
                    issue: {
                      shortcode: 'PERF002',
                      title: 'Performance Issue',
                      category: 'performance',
                      severity: 'medium',
                      description: 'Potential performance issue',
                    },
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ2',
                            path: 'src/utils.ts',
                            beginLine: 100,
                            endLine: 100,
                            beginColumn: 5,
                            endColumn: 15,
                            title: 'Performance Issue',
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

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockIssuesResponse);

      const pagination = {
        first: 5,
        after: 'cursor2',
      };

      const result = await client.getIssues(projectKey, pagination);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('occ2');
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'cursor3',
        endCursor: 'cursor4',
      });
      expect(result.totalCount).toBe(10);
    });

    it('should handle API errors when fetching issues', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(404, { errors: [{ message: 'Project not found' }] });

      await expect(client.getIssues(projectKey)).rejects.toThrow(
        'GraphQL Error: Project not found'
      );
    });

    it('should return empty result when project not found', async () => {
      // Mock empty project response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, { data: { viewer: { accounts: { edges: [] } } } });

      const result = await client.getIssues('non-existent-project');
      expect(result.items).toEqual([]);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(result.totalCount).toBe(0);
    });

    it('should handle NoneType errors in getIssues', async () => {
      // First mock to find the project
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      login: 'testorg',
                      repositories: {
                        edges: [
                          {
                            node: {
                              name: 'test-repo',
                              defaultBranch: 'main',
                              dsn: 'test-project',
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
        });

      // Then mock the issues call to return a NoneType error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, { errors: [{ message: 'NoneType object has no attribute' }] });

      const client = new DeepSourceClient(API_KEY);
      const result = await client.getIssues('test-project');

      expect(result).toEqual({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });
    });

    it('should handle project not found in getIssues', async () => {
      // Mock the listProjects call to return no matching projects
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      login: 'testorg',
                      repositories: {
                        edges: [
                          {
                            node: {
                              name: 'test-repo',
                              defaultBranch: 'main',
                              dsn: 'different-project', // This doesn't match our request
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
        });

      const client = new DeepSourceClient(API_KEY);
      const result = await client.getIssues('non-existent-project');

      expect(result).toEqual({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });
    });
  });

  describe('getIssue', () => {
    const projectKey = 'test-project';
    const issueId = 'issue1';

    it('should return a specific issue by ID', async () => {
      // Mock the getIssues call
      const mockIssuesResponse = {
        items: [
          {
            id: 'issue1',
            title: 'Test Issue',
            shortcode: 'TEST-001',
            category: 'BUG',
            severity: 'HIGH',
            status: 'OPEN',
            issue_text: 'This is a test issue',
            file_path: 'src/test.ts',
            line_number: 10,
            tags: ['bug'],
          },
          {
            id: 'issue2',
            title: 'Another Issue',
            shortcode: 'TEST-002',
            category: 'SECURITY',
            severity: 'CRITICAL',
            status: 'OPEN',
            issue_text: 'This is another test issue',
            file_path: 'src/main.ts',
            line_number: 20,
            tags: ['security'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 2,
      };

      // Create a mocked version of getIssues for this test
      DeepSourceClient.prototype.getIssues = async () => mockIssuesResponse;

      const client = new DeepSourceClient('test-api-key');
      const issue = await client.getIssue(projectKey, issueId);

      expect(issue).not.toBeNull();
      expect(issue).toEqual({
        id: 'issue1',
        title: 'Test Issue',
        shortcode: 'TEST-001',
        category: 'BUG',
        severity: 'HIGH',
        status: 'OPEN',
        issue_text: 'This is a test issue',
        file_path: 'src/test.ts',
        line_number: 10,
        tags: ['bug'],
      });
    });

    it('should return null for non-existent issue ID', async () => {
      // Mock the getIssues call with results
      const mockIssuesResponse = {
        items: [
          {
            id: 'issue2',
            title: 'Another Issue',
            shortcode: 'TEST-002',
            category: 'SECURITY',
            severity: 'CRITICAL',
            status: 'OPEN',
            issue_text: 'This is another test issue',
            file_path: 'src/main.ts',
            line_number: 20,
            tags: ['security'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      };

      // Create a mocked version of getIssues for this test
      DeepSourceClient.prototype.getIssues = async () => mockIssuesResponse;

      const client = new DeepSourceClient('test-api-key');
      const issue = await client.getIssue(projectKey, 'non-existent-id');

      expect(issue).toBeNull();
    });

    it('should handle errors from getIssues', async () => {
      // Store the original method
      const originalGetIssues = DeepSourceClient.prototype.getIssues;

      try {
        // Create a mocked version of getIssues that throws an error
        DeepSourceClient.prototype.getIssues = async () => {
          throw new Error('API Error');
        };

        const client = new DeepSourceClient('test-api-key');
        await expect(client.getIssue(projectKey, issueId)).rejects.toThrow('API Error');
      } finally {
        // Restore the original method
        DeepSourceClient.prototype.getIssues = originalGetIssues;
      }
    });
  });

  describe('Error handling', () => {
    it('should handle NoneType errors in listProjects', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, { errors: [{ message: 'NoneType object has no attribute' }] });

      const client = new DeepSourceClient(API_KEY);
      const result = await client.listProjects();

      expect(result).toEqual([]);
    });

    it('should handle non-GraphQL errors in listProjects', async () => {
      nock('https://api.deepsource.io').post('/graphql/').replyWithError('Network error');

      const client = new DeepSourceClient(API_KEY);
      await expect(client.listProjects()).rejects.toThrow('Network error');
    });
  });
});
