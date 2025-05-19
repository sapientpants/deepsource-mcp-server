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

    // Mock listProjects to return test project
    jest.spyOn(client, 'listProjects').mockResolvedValue([
      {
        name: 'Test Project',
        key: 'test-project',
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

  describe('getRecentRunIssues', () => {
    it('should successfully retrieve issues from the most recent run', async () => {
      // Mock the findMostRecentRun method
      jest.spyOn(client as any, 'findMostRecentRun').mockResolvedValue({
        id: 'run1',
        runUid: 'run-uid-1',
        commitOid: 'commit1',
        branchName: 'main',
        baseOid: 'base1',
        status: 'SUCCESS' as const,
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
      });

      // Mock the initial checks fetch response
      const checksListResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      id: 'check1',
                      analyzer: {
                        shortcode: 'javascript',
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

      // Mock the occurrences fetch response for the check
      const occurrencesResponse = {
        data: {
          data: {
            node: {
              id: 'check1',
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
                  endCursor: null,
                },
                totalCount: 1,
              },
            },
          },
        },
      };

      // Mock the responses in order
      mockAxiosInstance.post.mockResolvedValueOnce(checksListResponse);
      mockAxiosInstance.post.mockResolvedValueOnce(occurrencesResponse);

      // Execute
      const result = await client.getRecentRunIssues('test-project', 'main');

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
      // Mock listProjects to return empty array
      jest.spyOn(client, 'listProjects').mockResolvedValue([]);

      // Execute and expect error
      await expect(client.getRecentRunIssues('non-existent', 'main')).rejects.toThrow(
        'Project with key non-existent not found'
      );
    });

    it('should handle no runs found for branch', async () => {
      // Mock findMostRecentRun to throw the expected error
      jest
        .spyOn(client as any, 'findMostRecentRun')
        .mockRejectedValue(
          new Error("No runs found for branch 'non-existent-branch' in project 'test-project'")
        );

      // Execute and expect error
      await expect(
        client.getRecentRunIssues('test-project', 'non-existent-branch')
      ).rejects.toThrow("No runs found for branch 'non-existent-branch' in project 'test-project'");
    });

    it('should handle GraphQL errors in checks fetch', async () => {
      // Mock findMostRecentRun to succeed
      jest.spyOn(client as any, 'findMostRecentRun').mockResolvedValue({
        id: 'run1',
        runUid: 'run-uid-1',
        commitOid: 'commit1',
        branchName: 'main',
        baseOid: 'base1',
        status: 'SUCCESS' as const,
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
      });

      // Mock error response
      const errorResponse = {
        data: {
          errors: [{ message: 'GraphQL Error' }],
        },
      };

      // Mock the checks list response to return an error
      mockAxiosInstance.post.mockResolvedValueOnce(errorResponse);

      // Execute and expect error
      await expect(client.getRecentRunIssues('test-project', 'main')).rejects.toThrow(
        'GraphQL Errors: GraphQL Error'
      );
    });

    it('should handle GraphQL errors in occurrences fetch', async () => {
      // Mock findMostRecentRun to succeed
      jest.spyOn(client as any, 'findMostRecentRun').mockResolvedValue({
        id: 'run1',
        runUid: 'run-uid-1',
        commitOid: 'commit1',
        branchName: 'main',
        baseOid: 'base1',
        status: 'SUCCESS' as const,
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
      });

      // Mock the initial checks fetch response
      const checksListResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      id: 'check1',
                      analyzer: {
                        shortcode: 'javascript',
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

      // Mock error response
      const errorResponse = {
        data: {
          errors: [{ message: 'GraphQL Error in occurrences' }],
        },
      };

      // Mock the checks list to succeed but occurrences fetch to fail
      mockAxiosInstance.post.mockResolvedValueOnce(checksListResponse);
      mockAxiosInstance.post.mockResolvedValueOnce(errorResponse);

      // Execute and expect error
      await expect(client.getRecentRunIssues('test-project', 'main')).rejects.toThrow(
        'GraphQL Errors: GraphQL Error in occurrences'
      );
    });
  });
});
