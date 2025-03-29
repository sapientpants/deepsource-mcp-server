import nock from 'nock';
import { DeepSourceClient } from '../deepsource';

describe('DeepSourceClient', () => {
  const API_KEY = 'test-api-key';
  const client = new DeepSourceClient(API_KEY);

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
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

      const issues = await client.getIssues(projectKey);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual({
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
    });

    it('should handle API errors when fetching issues', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(404, { errors: [{ message: 'Project not found' }] });

      await expect(client.getIssues(projectKey)).rejects.toThrow(
        'GraphQL Error: Project not found'
      );
    });
  });

  describe('getIssue', () => {
    const projectKey = 'test-project';
    const issueId = 'occ1';

    it('should return a specific issue by ID', async () => {
      // Mock the getIssues call with our test data
      const mockIssue = {
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
      };

      // Create a new client instance for this test
      const testClient = new DeepSourceClient('test-api-key');

      // Mock the API response for the GraphQL call
      nock('https://api.deepsource.io')
        .post('/graphql/')
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
        })
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              name: 'test-repo',
              defaultBranch: 'main',
              dsn: 'test-project',
              isPrivate: false,
              issues: {
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
        });

      const issue = await testClient.getIssue(projectKey, issueId);
      expect(issue).toEqual(mockIssue);
    });

    it('should return null when issue is not found', async () => {
      // Create a new client instance for this test
      const testClient = new DeepSourceClient('test-api-key');

      // Mock API to return a project with no issues
      nock('https://api.deepsource.io')
        .post('/graphql/')
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
        })
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              name: 'test-repo',
              defaultBranch: 'main',
              dsn: 'test-project',
              isPrivate: false,
              issues: {
                edges: [],
              },
            },
          },
        });

      const issue = await testClient.getIssue(projectKey, 'non-existent-id');
      expect(issue).toBeNull();
    });

    it('should handle errors', async () => {
      // Create a new client instance for this test
      const testClient = new DeepSourceClient('test-api-key');

      // Mock API to return an error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(500, { errors: [{ message: 'Test error' }] });

      await expect(testClient.getIssue(projectKey, issueId)).rejects.toThrow(
        'GraphQL Error: Test error'
      );
    });
  });
});
