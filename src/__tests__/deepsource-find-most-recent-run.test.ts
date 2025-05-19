/**
 * @jest-environment node
 */

import { jest, beforeEach, describe, expect, it } from '@jest/globals';

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

describe('DeepSourceClient - findMostRecentRun', () => {
  let client: InstanceType<typeof DeepSourceClient>;
  let mockAxiosInstance: Record<string, unknown>;

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

    // Mock listProjects to return a valid project (needed by listRuns)
    jest.spyOn(client, 'listProjects').mockResolvedValue([
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
      (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute the private method using type assertion
      const findMostRecentRun = (client as any).findMostRecentRun.bind(client);
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
      (mockAxiosInstance.post as jest.Mock)
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      // Execute
      const findMostRecentRun = (client as any).findMostRecentRun.bind(client);
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
      (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute and expect error
      const findMostRecentRun = (client as any).findMostRecentRun.bind(client);
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
      (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Execute
      const findMostRecentRun = (client as any).findMostRecentRun.bind(client);
      const result = await findMostRecentRun('test-key', 'main');

      // Verify it returns one of the runs with the same timestamp
      expect(['uuid-1', 'uuid-2']).toContain(result.runUid);
      expect(result.createdAt).toBe('2023-01-01T00:00:00Z');
    });
  });
});
