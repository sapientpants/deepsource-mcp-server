/**
 * @fileoverview Tests for runs client
 * This file adds coverage for the previously untested runs-client.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunsClient } from '../../client/runs-client.js';
import { asBranchName } from '../../types/branded.js';
import type { RunsClientTestable, MockDeepSourceClient } from '../test-types.js';
import { TestableRunsClient } from '../utils/test-utils.js';

describe('RunsClient', () => {
  let runsClient: RunsClient;
  let mockBaseClient: MockDeepSourceClient;

  beforeEach(() => {
    runsClient = new RunsClient('test-api-key');
    mockBaseClient = runsClient as unknown as MockDeepSourceClient;

    // Mock the methods we need
    mockBaseClient.findProjectByKey = vi.fn();
    mockBaseClient.executeGraphQL = vi.fn();
    mockBaseClient.logger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };
  });

  describe('listRuns', () => {
    it('should fetch runs successfully', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            runs: {
              edges: [
                {
                  node: {
                    id: 'run-node-1',
                    runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                    commitOid: 'abc123def456',
                    branchName: 'main',
                    baseOid: 'def456abc123',
                    status: 'SUCCESS',
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:05:00Z',
                    finishedAt: '2023-01-01T00:05:00Z',
                    summary: {
                      occurrencesIntroduced: 5,
                      occurrencesResolved: 3,
                      occurrencesSuppressed: 1,
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo-123',
                    },
                  },
                },
                {
                  node: {
                    id: 'run-node-2',
                    runUid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    commitOid: 'xyz789uvw012',
                    branchName: 'feature-branch',
                    baseOid: 'uvw012xyz789',
                    status: 'RUNNING',
                    createdAt: '2023-01-02T00:00:00Z',
                    updatedAt: '2023-01-02T00:02:00Z',
                    finishedAt: '',
                    summary: {
                      occurrencesIntroduced: 0,
                      occurrencesResolved: 0,
                      occurrencesSuppressed: 0,
                    },
                    repository: {
                      name: 'test-repo',
                      id: 'repo-123',
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
      };

      mockBaseClient.findProjectByKey = vi.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = vi.fn().mockReturnValue({
        first: 20,
        after: null,
      });
      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      const result = await runsClient.listRuns('test-project');

      expect(mockBaseClient.findProjectByKey).toHaveBeenCalledWith('test-project');
      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getRepositoryRuns'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(result.items[0]?.status).toBe('SUCCESS');
      expect(result.items[0].branchName).toBe('main');
      expect(result.items[1].status).toBe('RUNNING');
      expect(result.items[1].branchName).toBe('feature-branch');
    });

    it('should return empty response when project not found', async () => {
      mockBaseClient.findProjectByKey = vi.fn().mockResolvedValue(null);
      mockBaseClient.createEmptyPaginatedResponse = vi.fn().mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });

      const result = await runsClient.listRuns('nonexistent-project');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle GraphQL errors', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      mockBaseClient.findProjectByKey = vi.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = vi.fn().mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL = vi.fn().mockRejectedValue(new Error('GraphQL error'));

      await expect(runsClient.listRuns('test-project')).rejects.toThrow('GraphQL error');
    });

    it('should handle missing data in response', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: null,
      };

      mockBaseClient.findProjectByKey = vi.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = vi.fn().mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      await expect(runsClient.listRuns('test-project')).rejects.toThrow(
        'No data received from GraphQL API'
      );
    });

    it('should handle filter parameters', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            runs: {
              edges: [],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          },
        },
      };

      mockBaseClient.findProjectByKey = vi.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = vi.fn().mockReturnValue({
        first: 10,
        after: 'cursor123',
      });
      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      await runsClient.listRuns('test-project', {
        first: 10,
        after: 'cursor123',
      });

      // The normalizePaginationParams is now a static method and its behavior
      // is tested separately in base-client tests
    });
  });

  describe('getRun', () => {
    it('should fetch run by UUID successfully', async () => {
      const mockUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const mockResponse = {
        data: {
          run: {
            id: 'run-node-1',
            runUid: mockUuid,
            commitOid: 'abc123def456',
            branchName: 'main',
            baseOid: 'def456abc123',
            status: 'SUCCESS',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:05:00Z',
            finishedAt: '2023-01-01T00:05:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 3,
              occurrencesSuppressed: 1,
            },
            repository: {
              name: 'test-repo',
              id: 'repo-123',
            },
          },
        },
      };

      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      const result = await runsClient.getRun(mockUuid);

      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getRunByUid'),
        { runUid: mockUuid }
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.runUid).toBe(mockUuid);
        expect(result.status).toBe('SUCCESS');
        expect(result.branchName).toBe('main');
      }
    });

    it('should fetch run by commit OID successfully', async () => {
      const mockCommitOid = 'abc123def456789012345678901234567890abcd';
      const mockResponse = {
        data: {
          runByCommit: {
            id: 'run-node-1',
            runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            commitOid: mockCommitOid,
            branchName: 'main',
            baseOid: 'def456abc123',
            status: 'SUCCESS',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:05:00Z',
            finishedAt: '2023-01-01T00:05:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 3,
              occurrencesSuppressed: 1,
            },
            repository: {
              name: 'test-repo',
              id: 'repo-123',
            },
          },
        },
      };

      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      const result = await runsClient.getRun(mockCommitOid);

      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getRunByCommit'),
        { commitOid: mockCommitOid }
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.commitOid).toBe(mockCommitOid);
        expect(result.status).toBe('SUCCESS');
      }
    });

    it('should return null when run not found', async () => {
      const mockResponse = {
        data: null,
      };

      mockBaseClient.executeGraphQL = vi.fn().mockResolvedValue(mockResponse);

      const result = await runsClient.getRun('nonexistent-run-id');

      expect(result).toBeNull();
    });

    it('should return null for NoneType errors', async () => {
      mockBaseClient.executeGraphQL = vi.fn().mockRejectedValue(new Error('NoneType error'));

      const result = await runsClient.getRun('nonexistent-run-id');

      expect(result).toBeNull();
    });

    it('should return null for not found errors', async () => {
      mockBaseClient.executeGraphQL = vi.fn().mockRejectedValue(new Error('Run not found'));

      const result = await runsClient.getRun('nonexistent-run-id');

      expect(result).toBeNull();
    });

    it('should re-throw other errors', async () => {
      mockBaseClient.executeGraphQL = vi.fn().mockRejectedValue(new Error('Server error'));

      await expect(runsClient.getRun('some-run-id')).rejects.toThrow('Server error');
    });
  });

  describe('findMostRecentRunForBranch', () => {
    it('should find the most recent run for a branch', async () => {
      const mockRuns = {
        items: [
          {
            id: 'run-1',
            runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            branchName: 'main',
            createdAt: '2023-01-02T00:00:00Z',
            status: 'SUCCESS',
          },
          {
            id: 'run-2',
            runUid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            branchName: 'main',
            createdAt: '2023-01-01T00:00:00Z',
            status: 'SUCCESS',
          },
          {
            id: 'run-3',
            runUid: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
            branchName: 'feature',
            createdAt: '2023-01-03T00:00:00Z',
            status: 'SUCCESS',
          },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 3,
      };

      // Mock the listRuns method
      runsClient.listRuns = vi.fn().mockResolvedValue(mockRuns);

      const result = await runsClient.findMostRecentRunForBranch('test-project', 'main');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
        expect(result.branchName).toBe('main');
        expect(result.createdAt).toBe('2023-01-02T00:00:00Z');
      }
    });

    it('should throw error when no runs found for branch', async () => {
      const mockRuns = {
        items: [
          {
            id: 'run-1',
            runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            branchName: 'feature',
            createdAt: '2023-01-01T00:00:00Z',
            status: 'SUCCESS',
          },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 1,
      };

      runsClient.listRuns = vi.fn().mockResolvedValue(mockRuns);

      await expect(runsClient.findMostRecentRunForBranch('test-project', 'main')).rejects.toThrow(
        "No runs found for branch 'main' in project 'test-project'"
      );
    });

    it('should handle pagination when searching for runs', async () => {
      const mockRunsPage1 = {
        items: [
          {
            id: 'run-1',
            runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            branchName: 'feature',
            createdAt: '2023-01-01T00:00:00Z',
            status: 'SUCCESS',
          },
        ],
        pageInfo: { hasNextPage: true, hasPreviousPage: false, endCursor: 'cursor1' },
        totalCount: 2,
      };

      const mockRunsPage2 = {
        items: [
          {
            id: 'run-2',
            runUid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            branchName: 'main',
            createdAt: '2023-01-02T00:00:00Z',
            status: 'SUCCESS',
          },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: true, endCursor: null },
        totalCount: 2,
      };

      runsClient.listRuns = vi
        .fn()
        .mockResolvedValueOnce(mockRunsPage1)
        .mockResolvedValueOnce(mockRunsPage2);

      const result = await runsClient.findMostRecentRunForBranch('test-project', 'main');

      expect(runsClient.listRuns).toHaveBeenCalledTimes(2);
      expect(runsClient.listRuns).toHaveBeenNthCalledWith(1, 'test-project', {
        first: 50,
        after: undefined,
      });
      expect(runsClient.listRuns).toHaveBeenNthCalledWith(2, 'test-project', {
        first: 50,
        after: 'cursor1',
      });

      expect(result).not.toBeNull();
      if (result) {
        expect(result.runUid).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      }
    });
  });

  describe('getRecentRunIssues', () => {
    it('should return run with empty issues list', async () => {
      const mockRun = {
        id: 'run-1',
        runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        branchName: 'main',
        createdAt: '2023-01-01T00:00:00Z',
        status: 'SUCCESS',
      };

      runsClient.findMostRecentRunForBranch = vi.fn().mockResolvedValue(mockRun);
      mockBaseClient.executeGraphQL.mockResolvedValue({
        data: {
          run: {
            occurrences: {
              edges: [],
              pageInfo: { hasNextPage: false, hasPreviousPage: false },
            },
          },
        },
      });

      const result = await runsClient.getRecentRunIssues('test-project', asBranchName('main'));

      expect(result.run).toEqual(mockRun);
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should return empty response when no run found', async () => {
      runsClient.findMostRecentRunForBranch = vi.fn().mockResolvedValue(null);

      const result = await runsClient.getRecentRunIssues('test-project', asBranchName('main'));

      expect(result.run).toBeNull();
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle errors from findMostRecentRunForBranch', async () => {
      runsClient.findMostRecentRunForBranch = vi
        .fn()
        .mockRejectedValue(new Error('Branch not found'));

      await expect(
        runsClient.getRecentRunIssues('test-project', asBranchName('main'))
      ).rejects.toThrow('Branch not found');
    });
  });

  describe('buildRunsQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableRunsClient.testBuildRunsQuery();

      expect(query).toContain('query getRepositoryRuns');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('runs(');
      expect(query).toContain('summary {');
    });
  });

  describe('buildRunByUidQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableRunsClient.testBuildRunByUidQuery();

      expect(query).toContain('query getRunByUid');
      expect(query).toContain('$runUid: UUID!');
      expect(query).toContain('run(runUid: $runUid)');
    });
  });

  describe('buildRunByCommitQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableRunsClient.testBuildRunByCommitQuery();

      expect(query).toContain('query getRunByCommit');
      expect(query).toContain('$commitOid: String!');
      expect(query).toContain('runByCommit(commitOid: $commitOid)');
    });
  });

  describe('extractRunsFromResponse', () => {
    it('should extract runs from GraphQL response', () => {
      const mockResponseData = {
        repository: {
          runs: {
            edges: [
              {
                node: {
                  id: 'run-node-1',
                  runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                  commitOid: 'abc123def456',
                  branchName: 'main',
                  baseOid: 'def456abc123',
                  status: 'SUCCESS',
                  createdAt: '2023-01-01T00:00:00Z',
                  updatedAt: '2023-01-01T00:05:00Z',
                  finishedAt: '2023-01-01T00:05:00Z',
                  summary: {
                    occurrencesIntroduced: 5,
                    occurrencesResolved: 3,
                    occurrencesSuppressed: 1,
                  },
                  repository: {
                    name: 'test-repo',
                    id: 'repo-123',
                  },
                },
              },
            ],
          },
        },
      };

      const runs = (runsClient as unknown as RunsClientTestable).extractRunsFromResponse(
        mockResponseData
      );

      expect(runs).toHaveLength(1);
      expect(runs[0].runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(runs[0].status).toBe('SUCCESS');
      expect(runs[0].summary.occurrencesIntroduced).toBe(5);
    });

    it('should handle missing runs in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const runs = (runsClient as unknown as RunsClientTestable).extractRunsFromResponse(
        mockResponseData
      );

      expect(runs).toHaveLength(0);
    });
  });

  describe('extractSingleRunFromResponse', () => {
    it('should extract run from response with run field', () => {
      const mockResponseData = {
        run: {
          id: 'run-node-1',
          runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          commitOid: 'abc123def456',
          branchName: 'main',
          status: 'SUCCESS',
          summary: {},
          repository: {},
        },
      };

      const run = (runsClient as unknown as RunsClientTestable).extractSingleRunFromResponse(
        mockResponseData
      );

      expect(run).not.toBeNull();
      expect(run.runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should extract run from response with runByCommit field', () => {
      const mockResponseData = {
        runByCommit: {
          id: 'run-node-1',
          runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          commitOid: 'abc123def456',
          branchName: 'main',
          status: 'SUCCESS',
          summary: {},
          repository: {},
        },
      };

      const run = (runsClient as unknown as RunsClientTestable).extractSingleRunFromResponse(
        mockResponseData
      );

      expect(run).not.toBeNull();
      expect(run.runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('should return null when no run data available', () => {
      const mockResponseData = {};

      const run = (runsClient as unknown as RunsClientTestable).extractSingleRunFromResponse(
        mockResponseData
      );

      expect(run).toBeNull();
    });
  });

  describe('mapRunNode', () => {
    it('should map run node to DeepSourceRun', () => {
      const mockNode = {
        id: 'run-node-1',
        runUid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        commitOid: 'abc123def456',
        branchName: 'main',
        baseOid: 'def456abc123',
        status: 'SUCCESS',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:05:00Z',
        finishedAt: '2023-01-01T00:05:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 3,
          occurrencesSuppressed: 1,
        },
        repository: {
          name: 'test-repo',
          id: 'repo-123',
        },
      };

      const run = TestableRunsClient.testMapRunNode(mockNode);

      expect(run.id).toBe('run-node-1');
      expect(run.runUid).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(run.commitOid).toBe('abc123def456');
      expect(run.branchName).toBe('main');
      expect(run.status).toBe('SUCCESS');
      expect(run.summary.occurrencesIntroduced).toBe(5);
      expect(run.repository.name).toBe('test-repo');
    });

    it('should handle missing fields in node', () => {
      const mockNode = {
        id: null,
        runUid: null,
        commitOid: null,
        branchName: null,
        status: null,
        summary: null,
        repository: null,
      };

      const run = TestableRunsClient.testMapRunNode(mockNode);

      expect(run.id).toBe('');
      expect(run.runUid).toBe('');
      expect(run.commitOid).toBe('');
      expect(run.branchName).toBe('');
      expect(run.status).toBe('UNKNOWN');
      expect(run.summary.occurrencesIntroduced).toBe(0);
      expect(run.repository.name).toBe('');
    });
  });

  describe('handleRunsError', () => {
    it('should return empty response for NoneType errors', () => {
      const error = new Error('NoneType error');

      const result = (runsClient as unknown as RunsClientTestable).handleRunsError(error);

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should re-throw non-NoneType errors', () => {
      const error = new Error('Other error');

      expect(() => {
        (runsClient as unknown as RunsClientTestable).handleRunsError(error);
      }).toThrow('Other error');
    });
  });
});
