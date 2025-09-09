/**
 * @vitest-environment node
 */

import { vi, beforeEach, describe, expect, it, MockedFunction } from 'vitest';

// Mock the logger module
vi.mock('../utils/logger.js', () => ({
  defaultLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock axios module before any imports
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: vi.fn(),
    })),
  },
}));

// Import axios to get the mocked version
const axios = await import('axios');
interface MockAxios {
  create: MockedFunction<() => MockAxiosInstance>;
}
interface MockAxiosInstance {
  interceptors: {
    request: { use: MockedFunction<unknown> };
    response: { use: MockedFunction<unknown> };
  };
  post: MockedFunction<(url: string, data?: unknown, config?: unknown) => Promise<unknown>>;
}
const mockAxios = axios.default as MockAxios;

// Import DeepSourceClient after mocking
const { DeepSourceClient } = await import('../deepsource.js');

// Type definition for accessing private instance methods
type DeepSourceClientWithPrivateMethods = InstanceType<typeof DeepSourceClient> & {
  findMostRecentRun: (projectKey: string, branchName: string) => Promise<Record<string, unknown>>;
};

describe('DeepSourceClient - findMostRecentRun', () => {
  let client: InstanceType<typeof DeepSourceClient>;
  let mockAxiosInstance: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mocked axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: vi.fn(),
    };

    mockAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client instance
    client = new DeepSourceClient({ apiKey: 'test-key' });

    // Mock listProjects to return a valid project (needed by listRuns)
    vi.spyOn(client, 'listProjects').mockResolvedValue([
      {
        name: 'Test Project',
        key: 'test-key',
        repository: {
          login: 'testuser',
          provider: 'GITHUB',
        },
        defaultBranch: 'main',
        isPrivate: false,
        isActivated: true,
      },
    ]);
  });

  describe('findMostRecentRun', () => {
    it('should find the most recent run for a branch', async () => {
      // Mock the listRuns response - corrected to match actual GraphQL query structure
      const mockResponse = {
        data: {
          data: {
            repository: {
              analysisRuns: {
                edges: [
                  {
                    node: {
                      id: 'run3',
                      runUid: 'uuid-3',
                      commitOid: 'commit3',
                      branchName: 'main',
                      baseOid: 'base3',
                      status: 'SUCCESS',
                      createdAt: '2023-01-03T00:00:00Z',
                      updatedAt: '2023-01-03T00:00:00Z',
                      finishedAt: '2023-01-03T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  {
                    node: {
                      id: 'run2',
                      runUid: 'uuid-2',
                      commitOid: 'commit2',
                      branchName: 'feature',
                      baseOid: 'base2',
                      status: 'SUCCESS',
                      createdAt: '2023-01-02T00:00:00Z',
                      updatedAt: '2023-01-02T00:00:00Z',
                      finishedAt: '2023-01-02T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  {
                    node: {
                      id: 'run1',
                      runUid: 'uuid-1',
                      commitOid: 'commit1',
                      branchName: 'main',
                      baseOid: 'base1',
                      status: 'SUCCESS',
                      createdAt: '2023-01-01T00:00:00Z',
                      updatedAt: '2023-01-01T00:00:00Z',
                      finishedAt: '2023-01-01T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  endCursor: null,
                },
              },
            },
          },
        },
      };

      // Mock the response
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute the private method using type assertion
      const findMostRecentRun = (
        client as DeepSourceClientWithPrivateMethods
      ).findMostRecentRun.bind(client);
      const result = await findMostRecentRun('test-key', 'main');

      // Verify the result is the most recent run for the 'main' branch
      expect(result.runUid).toBe('uuid-3');
      expect(result.branchName).toBe('main');
      expect(result.createdAt).toBe('2023-01-03T00:00:00Z');
    });

    it('should handle pagination when finding the most recent run', async () => {
      // Mock the first page
      const firstPageResponse = {
        data: {
          data: {
            repository: {
              analysisRuns: {
                edges: [
                  {
                    node: {
                      id: 'run1',
                      runUid: 'uuid-1',
                      commitOid: 'commit1',
                      branchName: 'main',
                      baseOid: 'base1',
                      status: 'SUCCESS',
                      createdAt: '2023-01-01T00:00:00Z',
                      updatedAt: '2023-01-01T00:00:00Z',
                      finishedAt: '2023-01-01T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  hasNextPage: true,
                  endCursor: 'cursor1',
                },
              },
            },
          },
        },
      };

      // Mock the second page with a more recent run
      const secondPageResponse = {
        data: {
          data: {
            repository: {
              analysisRuns: {
                edges: [
                  {
                    node: {
                      id: 'run2',
                      runUid: 'uuid-2',
                      commitOid: 'commit2',
                      branchName: 'main',
                      baseOid: 'base2',
                      status: 'SUCCESS',
                      createdAt: '2023-01-02T00:00:00Z',
                      updatedAt: '2023-01-02T00:00:00Z',
                      finishedAt: '2023-01-02T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  endCursor: null,
                },
              },
            },
          },
        },
      };

      // Mock the responses in order
      mockAxiosInstance.post
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      // Execute
      const findMostRecentRun = (
        client as DeepSourceClientWithPrivateMethods
      ).findMostRecentRun.bind(client);
      const result = await findMostRecentRun('test-key', 'main');

      // Verify the result is the most recent run from all pages
      expect(result.runUid).toBe('uuid-2');
      expect(result.createdAt).toBe('2023-01-02T00:00:00Z');

      // Verify pagination was used
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no runs found for branch', async () => {
      // Mock empty response
      const mockResponse = {
        data: {
          data: {
            repository: {
              analysisRuns: {
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        },
      };

      // Mock the response
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute and expect error
      const findMostRecentRun = (
        client as DeepSourceClientWithPrivateMethods
      ).findMostRecentRun.bind(client);
      await expect(findMostRecentRun('test-key', 'non-existent')).rejects.toThrow(
        "No runs found for branch 'non-existent' in project 'test-key'"
      );
    });

    it('should handle multiple runs with the same timestamp', async () => {
      // Mock response with runs having the same timestamp
      const mockResponse = {
        data: {
          data: {
            repository: {
              analysisRuns: {
                edges: [
                  {
                    node: {
                      id: 'run1',
                      runUid: 'uuid-1',
                      commitOid: 'commit1',
                      branchName: 'main',
                      baseOid: 'base1',
                      status: 'SUCCESS',
                      createdAt: '2023-01-01T00:00:00Z',
                      updatedAt: '2023-01-01T00:00:00Z',
                      finishedAt: '2023-01-01T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  {
                    node: {
                      id: 'run2',
                      runUid: 'uuid-2',
                      commitOid: 'commit2',
                      branchName: 'main',
                      baseOid: 'base2',
                      status: 'SUCCESS',
                      createdAt: '2023-01-01T00:00:00Z',
                      updatedAt: '2023-01-01T00:00:00Z',
                      finishedAt: '2023-01-01T00:00:00Z',
                      summary: {
                        occurrencesIntroduced: 0,
                        occurrencesResolved: 0,
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
                  endCursor: null,
                },
              },
            },
          },
        },
      };

      // Mock the response
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const findMostRecentRun = (
        client as DeepSourceClientWithPrivateMethods
      ).findMostRecentRun.bind(client);
      const result = await findMostRecentRun('test-key', 'main');

      // Verify it returns one of the runs with the same timestamp
      expect(['uuid-1', 'uuid-2']).toContain(result.runUid);
      expect(result.createdAt).toBe('2023-01-01T00:00:00Z');
    });
  });
});
