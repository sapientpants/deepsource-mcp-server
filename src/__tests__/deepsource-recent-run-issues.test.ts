/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { beforeEach, describe, expect, it } from '@jest/globals';

// Mock the logger module
jest.unstable_mockModule('../utils/logger.js', () => ({
  defaultLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock axios module before any imports
jest.unstable_mockModule('axios', () => ({
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
    })),
  },
}));

// Import axios to get the mocked version
const axios = await import('axios');
const mockAxios = axios.default as jest.Mocked<typeof axios.default>;

// Import DeepSourceClient after mocking
const { DeepSourceClient } = await import('../deepsource.js');

describe('DeepSourceClient - getRecentRunIssues', () => {
  let client: InstanceType<typeof DeepSourceClient>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mocked axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
    };

    (mockAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    // Create client instance
    client = new DeepSourceClient({ apiKey: 'test-key' });
  });

  describe('getRecentRunIssues', () => {
    it('should successfully retrieve issues from the most recent run', async () => {
      // Mock listProjects response to find the project
      const projectsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      id: 'account1',
                      name: 'Test Account',
                      repositories: {
                        edges: [
                          {
                            node: {
                              id: 'repo1',
                              key: 'test-project',
                              name: 'Test Project',
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
        },
      };

      // Mock listRuns response
      const runsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      repositories: {
                        edges: [
                          {
                            node: {
                              runs: {
                                edges: [
                                  {
                                    node: {
                                      id: 'run1',
                                      runUid: 'run-uid-1',
                                      commitOid: 'commit1',
                                      branchName: 'main',
                                      baseOid: 'base1',
                                      status: 'SUCCESS',
                                      createdAt: '2023-01-02T00:00:00Z',
                                      updatedAt: '2023-01-02T00:00:00Z',
                                      finishedAt: '2023-01-02T00:00:00Z',
                                      summary: {
                                        occurrencesIntroduced: 5,
                                        occurrencesResolved: 3,
                                        occurrencesSuppressed: 0,
                                        occurrenceDistributionByAnalyzer: [],
                                        occurrenceDistributionByCategory: [],
                                      },
                                      repository: {
                                        id: 'repo1',
                                        name: 'Test Project',
                                      },
                                    },
                                  },
                                ],
                                pageInfo: {
                                  hasNextPage: false,
                                  hasPreviousPage: false,
                                  startCursor: null,
                                  endCursor: null,
                                },
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
        },
      };

      // Mock the run checks response
      const checksResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        edges: [
                          {
                            node: {
                              id: 'occ1',
                              issue: {
                                shortcode: 'JS-0001',
                                title: 'Test Issue',
                                category: 'BUG',
                                severity: 'HIGH',
                                description: 'Test description',
                                tags: ['test'],
                              },
                              path: 'test.js',
                              beginLine: 10,
                            },
                          },
                        ],
                        pageInfo: {
                          hasNextPage: false,
                          hasPreviousPage: false,
                          startCursor: 'start',
                          endCursor: 'end',
                        },
                        totalCount: 1,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      // Set up mock responses in the correct order
      mockAxiosInstance.post.mockImplementation((url: string, data: any) => {
        const query = data.query;
        if (query.includes('viewer') && query.includes('accounts')) {
          return Promise.resolve(projectsResponse);
        } else if (query.includes('runs(first:')) {
          return Promise.resolve(runsResponse);
        } else if (query.includes('run(runUid:')) {
          return Promise.resolve(checksResponse);
        }
        return Promise.reject(new Error('Unexpected query'));
      });

      // Execute
      const result = await client.getRecentRunIssues('test-project', 'main', { first: 10 });

      // Verify
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'occ1',
        shortcode: 'JS-0001',
        title: 'Test Issue',
        category: 'BUG',
        severity: 'HIGH',
        status: 'OPEN',
        issue_text: 'Test description',
        file_path: 'test.js',
        line_number: 10,
        tags: ['test'],
      });
      expect(result.run.runUid).toBe('run-uid-1');
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(1);
    });

    it('should handle project not found error', async () => {
      // Mock empty projects response
      const projectsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [],
              },
            },
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(projectsResponse);

      // Execute and expect error
      await expect(client.getRecentRunIssues('non-existent', 'main')).rejects.toThrow(
        'Project with key non-existent not found'
      );
    });

    it('should handle no runs found for branch', async () => {
      // Mock projects response
      const projectsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      repositories: {
                        edges: [
                          {
                            node: {
                              key: 'test-project',
                              name: 'Test Project',
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
        },
      };

      // Mock empty runs response
      const runsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      repositories: {
                        edges: [
                          {
                            node: {
                              runs: {
                                edges: [],
                                pageInfo: {
                                  hasNextPage: false,
                                  endCursor: null,
                                },
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
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce(projectsResponse)
        .mockResolvedValueOnce(runsResponse);

      // Execute and expect error
      await expect(
        client.getRecentRunIssues('test-project', 'non-existent-branch')
      ).rejects.toThrow("No runs found for branch 'non-existent-branch' in project 'test-project'");
    });

    it('should handle GraphQL errors in checks response', async () => {
      const projectsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      repositories: {
                        edges: [
                          {
                            node: {
                              key: 'test-project',
                              name: 'Test Project',
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
        },
      };

      const runsResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      repositories: {
                        edges: [
                          {
                            node: {
                              runs: {
                                edges: [
                                  {
                                    node: {
                                      id: 'run1',
                                      runUid: 'run-uid-1',
                                      branchName: 'main',
                                      createdAt: '2023-01-01T00:00:00Z',
                                      repository: { name: 'Test' },
                                      summary: {},
                                    },
                                  },
                                ],
                                pageInfo: {
                                  hasNextPage: false,
                                },
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
        },
      };

      // Mock error response
      const errorResponse = {
        data: {
          errors: [{ message: 'GraphQL Error' }],
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce(projectsResponse)
        .mockResolvedValueOnce(runsResponse)
        .mockResolvedValueOnce(errorResponse);

      // Execute and expect error
      await expect(client.getRecentRunIssues('test-project', 'main')).rejects.toThrow(
        'GraphQL Errors: GraphQL Error'
      );
    });
  });
});
