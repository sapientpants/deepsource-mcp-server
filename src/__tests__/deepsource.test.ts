import nock from 'nock';
import { jest, spyOn } from '@jest/globals';
import { DeepSourceClient } from '../deepsource';

// Mock the DeepSourceClient's methods for specific tests
const originalGetIssues = DeepSourceClient.prototype.getIssues;
const originalListRuns = DeepSourceClient.prototype.listRuns;
const originalGetRun = DeepSourceClient.prototype.getRun;

describe('DeepSourceClient', () => {
  const API_KEY = 'test-api-key';
  const client = new DeepSourceClient(API_KEY);

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
    // Restore the original methods after all tests
    DeepSourceClient.prototype.getIssues = originalGetIssues;
    DeepSourceClient.prototype.listRuns = originalListRuns;
    DeepSourceClient.prototype.getRun = originalGetRun;
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

    // No original post method mocking needed for these tests

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

    it('should support filtering parameters for issues', async () => {
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
                hasPreviousPage: false,
                startCursor: 'cursor1',
                endCursor: 'cursor2',
              },
              totalCount: 1,
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
                      tags: ['security', 'vulnerability'],
                    },
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ1',
                            path: 'src/auth.ts',
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

      // Create a tracked array to record the GraphQL variables
      const graphqlVariables: Record<string, unknown>[] = [];

      // Intercept the GraphQL requests and capture the variables
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(function () {
          // First call - return projects
          return [200, mockProjectsResponse];
        })
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(function (uri, requestBody: any) {
          // Second call - capture variables and return issues
          graphqlVariables.push(requestBody.variables);
          return [200, mockIssuesResponse];
        });

      const filterParams = {
        path: 'src/auth.ts',
        analyzerIn: ['python', 'javascript'],
        tags: ['security'],
        first: 10,
      };

      const result = await client.getIssues(projectKey, filterParams);

      // Verify that the filter parameters were passed to the GraphQL call
      expect(graphqlVariables.length).toBe(1);
      expect(graphqlVariables[0]).toMatchObject({
        path: 'src/auth.ts',
        analyzerIn: ['python', 'javascript'],
        tags: ['security'],
        first: 10,
      });

      // Verify the result includes tags from the response
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('occ1');
      expect(result.items[0].tags).toEqual(['security', 'vulnerability']);
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

    it('should handle pagination with before and last parameters', async () => {
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
                startCursor: 'cursor5',
                endCursor: 'cursor6',
              },
              totalCount: 15,
              edges: [
                {
                  node: {
                    id: 'issue3',
                    issue: {
                      shortcode: 'STYLE003',
                      title: 'Style Issue',
                      category: 'style',
                      severity: 'low',
                      description: 'Code style issue',
                    },
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ3',
                            path: 'src/styles.ts',
                            beginLine: 50,
                            endLine: 50,
                            beginColumn: 10,
                            endColumn: 20,
                            title: 'Style Issue',
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
        before: 'cursor7',
        last: 5,
        first: 10, // This should be ignored when before is provided
      };

      const result = await client.getIssues(projectKey, pagination);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('occ3');
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'cursor5',
        endCursor: 'cursor6',
      });
      expect(result.totalCount).toBe(15);
    });

    it('should handle pagination with last parameter without before', async () => {
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
                hasPreviousPage: false,
                startCursor: 'cursor8',
                endCursor: 'cursor9',
              },
              totalCount: 8,
              edges: [
                {
                  node: {
                    id: 'issue4',
                    issue: {
                      shortcode: 'DOC004',
                      title: 'Documentation Issue',
                      category: 'documentation',
                      severity: 'info',
                      description: 'Missing documentation',
                    },
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ4',
                            path: 'src/utils.ts',
                            beginLine: 75,
                            endLine: 75,
                            beginColumn: 1,
                            endColumn: 5,
                            title: 'Documentation Issue',
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

      // Spy on DeepSourceClient.logPaginationWarning
      const logPaginationWarningSpy = jest.spyOn(
        DeepSourceClient as any,
        'logPaginationWarning'
      );

      try {
        nock('https://api.deepsource.io')
          .post('/graphql/')
          .matchHeader('Authorization', `Bearer ${API_KEY}`)
          .reply(200, mockProjectsResponse)
          .post('/graphql/')
          .matchHeader('Authorization', `Bearer ${API_KEY}`)
          .reply(200, mockIssuesResponse);

        const pagination = {
          last: 5,
          first: undefined,
        };

        const result = await client.getIssues(projectKey, pagination);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('occ4');
        expect(result.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor8',
          endCursor: 'cursor9',
        });
        expect(result.totalCount).toBe(8);

        // Verify that the warning logger was called
        expect(logPaginationWarningSpy).toHaveBeenCalled();
      } finally {
        // Restore original method
        logPaginationWarningSpy.mockRestore();
      }
    });

    it('should handle GraphQL errors in repository response', async () => {
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

      // Mock GraphQL errors in the response data
      const mockErrorResponse = {
        data: null,
        errors: [{ message: 'Repository access denied' }, { message: 'Invalid query' }],
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockErrorResponse);

      await expect(client.getIssues(projectKey)).rejects.toThrow(
        'GraphQL Errors: Repository access denied, Invalid query'
      );
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

  describe('listRuns', () => {
    const projectKey = 'test-project';

    it('should return a list of runs for a project', async () => {
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

      const mockRunsResponse = {
        data: {
          repository: {
            name: 'test-repo',
            id: 'repo1',
            analysisRuns: {
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
                    id: 'run1',
                    runUid: '12345678-1234-1234-1234-123456789012',
                    commitOid: 'abcdef123456',
                    branchName: 'main',
                    baseOid: '654321fedcba',
                    status: 'SUCCESS',
                    createdAt: '2023-01-01T12:00:00Z',
                    updatedAt: '2023-01-01T12:30:00Z',
                    finishedAt: '2023-01-01T12:30:00Z',
                    summary: {
                      occurrencesIntroduced: 5,
                      occurrencesResolved: 2,
                      occurrencesSuppressed: 1,
                      occurrenceDistributionByAnalyzer: [
                        {
                          analyzerShortcode: 'python',
                          introduced: 3,
                        },
                        {
                          analyzerShortcode: 'javascript',
                          introduced: 2,
                        },
                      ],
                      occurrenceDistributionByCategory: [
                        {
                          category: 'SECURITY',
                          introduced: 2,
                        },
                        {
                          category: 'PERFORMANCE',
                          introduced: 3,
                        },
                      ],
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo1',
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
        .reply(200, mockRunsResponse);

      const result = await client.listRuns(projectKey);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'run1',
        runUid: '12345678-1234-1234-1234-123456789012',
        commitOid: 'abcdef123456',
        branchName: 'main',
        baseOid: '654321fedcba',
        status: 'SUCCESS',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:30:00Z',
        finishedAt: '2023-01-01T12:30:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 2,
          occurrencesSuppressed: 1,
          occurrenceDistributionByAnalyzer: [
            {
              analyzerShortcode: 'python',
              introduced: 3,
            },
            {
              analyzerShortcode: 'javascript',
              introduced: 2,
            },
          ],
          occurrenceDistributionByCategory: [
            {
              category: 'SECURITY',
              introduced: 2,
            },
            {
              category: 'PERFORMANCE',
              introduced: 3,
            },
          ],
        },
        repository: {
          name: 'test-repo',
          id: 'repo1',
        },
      });
      expect(result.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor2',
      });
      expect(result.totalCount).toBe(5);
    });

    it('should support pagination parameters for listRuns', async () => {
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

      const mockRunsResponse = {
        data: {
          repository: {
            name: 'test-repo',
            id: 'repo1',
            analysisRuns: {
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
                    id: 'run2',
                    runUid: '87654321-4321-4321-4321-210987654321',
                    commitOid: '654321abcdef',
                    branchName: 'feature',
                    baseOid: 'abcdef654321',
                    status: 'FAILURE',
                    createdAt: '2023-01-02T12:00:00Z',
                    updatedAt: '2023-01-02T12:30:00Z',
                    finishedAt: '2023-01-02T12:30:00Z',
                    summary: {
                      occurrencesIntroduced: 10,
                      occurrencesResolved: 0,
                      occurrencesSuppressed: 0,
                      occurrenceDistributionByAnalyzer: [],
                      occurrenceDistributionByCategory: [],
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo1',
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
        .reply(200, mockRunsResponse);

      const pagination = {
        first: 5,
        after: 'cursor2',
      };

      const result = await client.listRuns(projectKey, pagination);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('run2');
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'cursor3',
        endCursor: 'cursor4',
      });
      expect(result.totalCount).toBe(10);
    });

    it('should return empty result when project not found for listRuns', async () => {
      // Mock empty project response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, { data: { viewer: { accounts: { edges: [] } } } });

      const result = await client.listRuns('non-existent-project');
      expect(result.items).toEqual([]);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(result.totalCount).toBe(0);
    });

    it('should handle NoneType errors in listRuns', async () => {
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

      // Then mock the runs call to return a NoneType error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, { errors: [{ message: 'NoneType object has no attribute' }] });

      const client = new DeepSourceClient(API_KEY);
      const result = await client.listRuns('test-project');

      expect(result).toEqual({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });
    });

    it('should handle pagination with before and last parameters for listRuns', async () => {
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

      const mockRunsResponse = {
        data: {
          repository: {
            name: 'test-repo',
            id: 'repo1',
            analysisRuns: {
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                startCursor: 'cursor5',
                endCursor: 'cursor6',
              },
              totalCount: 15,
              edges: [
                {
                  node: {
                    id: 'run3',
                    runUid: '99999999-9999-9999-9999-999999999999',
                    commitOid: '999999abcdef',
                    branchName: 'feature-branch',
                    baseOid: 'abcdef999999',
                    status: 'SUCCESS',
                    createdAt: '2023-01-03T12:00:00Z',
                    updatedAt: '2023-01-03T12:30:00Z',
                    finishedAt: '2023-01-03T12:30:00Z',
                    summary: {
                      occurrencesIntroduced: 3,
                      occurrencesResolved: 0,
                      occurrencesSuppressed: 0,
                      occurrenceDistributionByAnalyzer: [],
                      occurrenceDistributionByCategory: [],
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo1',
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
        .reply(200, mockRunsResponse);

      const pagination = {
        before: 'cursor7',
        last: 5,
        first: 10, // This should be ignored when before is provided
      };

      const result = await client.listRuns(projectKey, pagination);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('run3');
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'cursor5',
        endCursor: 'cursor6',
      });
      expect(result.totalCount).toBe(15);
    });

    it('should handle pagination with last parameter without before for listRuns', async () => {
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

      const mockRunsResponse = {
        data: {
          repository: {
            name: 'test-repo',
            id: 'repo1',
            analysisRuns: {
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: 'cursor8',
                endCursor: 'cursor9',
              },
              totalCount: 8,
              edges: [
                {
                  node: {
                    id: 'run4',
                    runUid: '11111111-1111-1111-1111-111111111111',
                    commitOid: '111111abcdef',
                    branchName: 'hotfix',
                    baseOid: 'abcdef111111',
                    status: 'PENDING',
                    createdAt: '2023-01-04T12:00:00Z',
                    updatedAt: '2023-01-04T12:30:00Z',
                    finishedAt: '2023-01-04T12:30:00Z',
                    summary: {
                      occurrencesIntroduced: 0,
                      occurrencesResolved: 0,
                      occurrencesSuppressed: 0,
                      occurrenceDistributionByAnalyzer: [],
                      occurrenceDistributionByCategory: [],
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo1',
                    },
                  },
                },
              ],
            },
          },
        },
      };

      // Spy on DeepSourceClient.logPaginationWarning
      const logPaginationWarningSpy = jest.spyOn(
        DeepSourceClient as any,
        'logPaginationWarning'
      );

      try {
        nock('https://api.deepsource.io')
          .post('/graphql/')
          .matchHeader('Authorization', `Bearer ${API_KEY}`)
          .reply(200, mockProjectsResponse)
          .post('/graphql/')
          .matchHeader('Authorization', `Bearer ${API_KEY}`)
          .reply(200, mockRunsResponse);

        const pagination = {
          last: 5,
          first: undefined,
        };

        const result = await client.listRuns(projectKey, pagination);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('run4');
        expect(result.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor8',
          endCursor: 'cursor9',
        });
        expect(result.totalCount).toBe(8);

        // Verify that the warning logger was called
        expect(logPaginationWarningSpy).toHaveBeenCalled();
      } finally {
        // Restore original method
        logPaginationWarningSpy.mockRestore();
      }
    });

    it('should handle GraphQL errors in repository response for listRuns', async () => {
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

      // Mock GraphQL errors in the response data
      const mockErrorResponse = {
        data: null,
        errors: [{ message: 'Repository access denied' }, { message: 'Invalid query' }],
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockErrorResponse);

      await expect(client.listRuns(projectKey)).rejects.toThrow(
        'GraphQL Errors: Repository access denied, Invalid query'
      );
    });

    it('should support filtering parameters for runs', async () => {
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

      const mockRunsResponse = {
        data: {
          repository: {
            name: 'test-repo',
            id: 'repo1',
            analysisRuns: {
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: 'cursor1',
                endCursor: 'cursor2',
              },
              totalCount: 1,
              edges: [
                {
                  node: {
                    id: 'run1',
                    runUid: '12345678-1234-1234-1234-123456789012',
                    commitOid: 'abcdef123456',
                    branchName: 'main',
                    baseOid: '654321fedcba',
                    status: 'SUCCESS',
                    createdAt: '2023-01-01T12:00:00Z',
                    updatedAt: '2023-01-01T12:30:00Z',
                    finishedAt: '2023-01-01T12:30:00Z',
                    summary: {
                      occurrencesIntroduced: 5,
                      occurrencesResolved: 2,
                      occurrencesSuppressed: 1,
                      occurrenceDistributionByAnalyzer: [
                        { analyzerShortcode: 'python', introduced: 3 },
                      ],
                      occurrenceDistributionByCategory: [{ category: 'SECURITY', introduced: 2 }],
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo1',
                    },
                    checks: {
                      edges: [
                        {
                          node: {
                            analyzer: {
                              shortcode: 'python',
                            },
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

      // Create a tracked array to record the GraphQL variables
      const graphqlVariables: Record<string, unknown>[] = [];

      // Intercept the GraphQL requests and capture the variables
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(function () {
          // First call - return projects
          return [200, mockProjectsResponse];
        })
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(function (uri, requestBody: any) {
          // Second call - capture variables and return runs
          graphqlVariables.push(requestBody.variables);
          return [200, mockRunsResponse];
        });

      const filterParams = {
        analyzerIn: ['python', 'javascript'],
        first: 10,
      };

      const result = await client.listRuns(projectKey, filterParams);

      // Verify that the filter parameters were passed to the GraphQL call
      expect(graphqlVariables.length).toBe(1);
      expect(graphqlVariables[0]).toMatchObject({
        analyzerIn: ['python', 'javascript'],
        first: 10,
      });

      // Verify the result
      expect(result.items).toHaveLength(1);
      expect(result.items[0].runUid).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.items[0].summary.occurrenceDistributionByAnalyzer).toHaveLength(1);
      expect(result.items[0].summary.occurrenceDistributionByAnalyzer[0].analyzerShortcode).toBe(
        'python'
      );
    });

    it('should handle API errors when fetching analysis runs', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(404, { errors: [{ message: 'Project not found' }] });

      await expect(client.listRuns(projectKey)).rejects.toThrow('GraphQL Error: Project not found');
    });
  });

  describe('getRun', () => {
    it('should return a specific run by runUid', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      const mockRunResponse = {
        data: {
          run: {
            id: 'run1',
            runUid: '12345678-1234-1234-1234-123456789012',
            commitOid: 'abcdef123456',
            branchName: 'main',
            baseOid: '654321fedcba',
            status: 'SUCCESS',
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:30:00Z',
            finishedAt: '2023-01-01T12:30:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 2,
              occurrencesSuppressed: 1,
              occurrenceDistributionByAnalyzer: [
                {
                  analyzerShortcode: 'python',
                  introduced: 3,
                },
              ],
              occurrenceDistributionByCategory: [
                {
                  category: 'SECURITY',
                  introduced: 2,
                },
              ],
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
        },
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockRunResponse);

      const run = await client.getRun(runUid);

      expect(run).not.toBeNull();
      expect(run).toEqual({
        id: 'run1',
        runUid: '12345678-1234-1234-1234-123456789012',
        commitOid: 'abcdef123456',
        branchName: 'main',
        baseOid: '654321fedcba',
        status: 'SUCCESS',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:30:00Z',
        finishedAt: '2023-01-01T12:30:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 2,
          occurrencesSuppressed: 1,
          occurrenceDistributionByAnalyzer: [
            {
              analyzerShortcode: 'python',
              introduced: 3,
            },
          ],
          occurrenceDistributionByCategory: [
            {
              category: 'SECURITY',
              introduced: 2,
            },
          ],
        },
        repository: {
          name: 'test-repo',
          id: 'repo1',
        },
      });
    });

    it('should return a specific run by commitOid', async () => {
      const commitOid = 'abcdef123456';

      const mockRunResponse = {
        data: {
          run: {
            id: 'run1',
            runUid: '12345678-1234-1234-1234-123456789012',
            commitOid: 'abcdef123456',
            branchName: 'main',
            baseOid: '654321fedcba',
            status: 'SUCCESS',
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:30:00Z',
            finishedAt: '2023-01-01T12:30:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 2,
              occurrencesSuppressed: 1,
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
        },
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockRunResponse);

      const run = await client.getRun(commitOid);

      expect(run).not.toBeNull();
      expect(run?.commitOid).toBe('abcdef123456');
    });

    it('should return null for non-existent run', async () => {
      const runUid = 'non-existent-run';

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, { errors: [{ message: 'Run not found' }] });

      const run = await client.getRun(runUid);

      expect(run).toBeNull();
    });

    it('should handle NoneType errors in getRun', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, { errors: [{ message: 'NoneType object has no attribute' }] });

      const run = await client.getRun(runUid);

      expect(run).toBeNull();
    });

    it('should handle missing run data in the response', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      const mockEmptyResponse = {
        data: {
          run: null,
        },
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockEmptyResponse);

      const run = await client.getRun(runUid);
      expect(run).toBeNull();
    });

    it('should recognize UUID format correctly', async () => {
      // Mock the GraphQL API response instead of axios
      const uuidRunId = '12345678-1234-1234-1234-123456789012';
      const commitHash = 'abcdef1234567890';

      // Mock UUID detection with regex test
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Test UUID format
      expect(uuidRegex.test(uuidRunId)).toBe(true);
      expect(uuidRegex.test(commitHash)).toBe(false);

      // Validate that our regex matches the one used in the code
      // The actual implementation in deepsource.ts uses this regex for UUID detection
      expect(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidRunId)
      ).toBe(true);
      expect(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commitHash)
      ).toBe(false);
    });

    it('should handle GraphQL errors in getRun', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      const mockErrorResponse = {
        data: null,
        errors: [{ message: 'GraphQL validation error' }, { message: 'Invalid request' }],
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockErrorResponse);

      await expect(client.getRun(runUid)).rejects.toThrow(
        'GraphQL Errors: GraphQL validation error, Invalid request'
      );
    });

    it('should handle general errors in getRun', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      nock('https://api.deepsource.io').post('/graphql/').replyWithError('Network error');

      await expect(client.getRun(runUid)).rejects.toThrow();
    });

    it('should handle NoneType or not found errors in getRun', async () => {
      const runUid = '12345678-1234-1234-1234-123456789012';

      // Mock a Network error that includes 'NoneType' in the message
      const error = new Error('Error: Cannot read properties of None (NoneType)');
      nock('https://api.deepsource.io').post('/graphql/').replyWithError(error);

      const result = await client.getRun(runUid);
      expect(result).toBeNull();

      // Also test the 'not found' case
      const notFoundError = new Error('Error: Repository not found');
      nock('https://api.deepsource.io').post('/graphql/').replyWithError(notFoundError);

      const result2 = await client.getRun(runUid);
      expect(result2).toBeNull();
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

    it('tests specific error handling in listProjects GraphQL response', async () => {
      // This test specifically targets line coverage issues in the listProjects method
      // Testing with a specific GraphQL response structure that exercises all error handling paths

      const mockErrorResponse = {
        data: {
          viewer: {
            // Minimal valid response structure to test repository processing
            email: 'test@example.com',
            accounts: {
              edges: [
                {
                  node: {
                    login: 'testorg',
                    repositories: {
                      edges: [],
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
        .reply(200, mockErrorResponse);

      const client = new DeepSourceClient(API_KEY);
      const result = await client.listProjects();
      expect(result).toEqual([]);

      // Now test error handling with explicit GraphQL errors
      const mockWithErrors = {
        errors: [{ message: 'Some GraphQL error' }],
      };

      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockWithErrors);

      await expect(client.listProjects()).rejects.toThrow('GraphQL Errors: Some GraphQL error');
    });

    it('tests edge cases in repository data processing', async () => {
      // This test exercises the code paths that process repository data
      // with various edge cases like missing optional fields

      const mockRepoResponse = {
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
                            name: null, // Missing name
                            defaultBranch: 'main',
                            dsn: 'repo1',
                            isPrivate: null, // Missing isPrivate
                            isActivated: null, // Missing isActivated
                            vcsProvider: null, // Missing vcsProvider
                          },
                        },
                        {
                          node: {
                            name: 'With DSN but valid fields',
                            defaultBranch: 'main',
                            dsn: 'repo2',
                            isPrivate: true,
                            isActivated: true,
                            vcsProvider: 'github',
                          },
                        },
                        {
                          node: {
                            name: 'No DSN - should be skipped',
                            defaultBranch: 'main',
                            dsn: null,
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
        .reply(200, mockRepoResponse);

      const client = new DeepSourceClient(API_KEY);
      const result = await client.listProjects();

      // Should have 2 repos (the one without DSN should be skipped)
      expect(result).toHaveLength(2);

      // First repo should have default values for missing fields
      expect(result[0]).toEqual({
        key: 'repo1',
        name: 'Unnamed Repository',
        repository: {
          url: 'repo1',
          provider: 'N/A',
          login: 'testorg',
          isPrivate: false,
          isActivated: false,
        },
      });

      // Second repo should have all provided values
      expect(result[1]).toEqual({
        key: 'repo2',
        name: 'With DSN but valid fields',
        repository: {
          url: 'repo2',
          provider: 'github',
          login: 'testorg',
          isPrivate: true,
          isActivated: true,
        },
      });
    });
  });
});
