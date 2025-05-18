import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DeepSourceClient } from '../deepsource.js';
import nock from 'nock';
import type { PaginatedResponse, DeepSourceRun } from '../deepsource.js';

describe('DeepSourceClient.getLatestRunForBranch', () => {
  let client: DeepSourceClient;
  const API_KEY = 'test-api-key';

  beforeEach(() => {
    client = new DeepSourceClient(API_KEY);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  it('should return the latest run for a specific branch', async () => {
    const mockRuns: DeepSourceRun[] = [
      {
        id: 'run1',
        runUid: 'uuid1',
        commitOid: 'commit1',
        branchName: 'main',
        baseOid: 'base1',
        status: 'SUCCESS',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        finishedAt: '2024-01-01T00:02:00Z',
        summary: {
          occurrencesIntroduced: 0,
          occurrencesResolved: 5,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
      {
        id: 'run2',
        runUid: 'uuid2',
        commitOid: 'commit2',
        branchName: 'main',
        baseOid: 'base2',
        status: 'SUCCESS',
        createdAt: '2024-01-02T00:00:00Z', // More recent
        updatedAt: '2024-01-02T00:01:00Z',
        finishedAt: '2024-01-02T00:02:00Z',
        summary: {
          occurrencesIntroduced: 2,
          occurrencesResolved: 3,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
      {
        id: 'run3',
        runUid: 'uuid3',
        commitOid: 'commit3',
        branchName: 'feature',
        baseOid: 'base3',
        status: 'SUCCESS',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:01:00Z',
        finishedAt: '2024-01-03T00:02:00Z',
        summary: {
          occurrencesIntroduced: 1,
          occurrencesResolved: 1,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
    ];

    const mockPaginatedResponse: PaginatedResponse<DeepSourceRun> = {
      items: mockRuns,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      },
      totalCount: 3,
    };

    jest.spyOn(client, 'listRuns').mockResolvedValue(mockPaginatedResponse);

    const result = await client.getLatestRunForBranch('project-key', 'main');

    expect(result).toBeDefined();
    expect(result?.id).toBe('run2'); // Should return the most recent run
    expect(result?.branchName).toBe('main');
    expect(result?.createdAt).toBe('2024-01-02T00:00:00Z');
  });

  it('should return null if no runs exist for the branch', async () => {
    const mockRuns: DeepSourceRun[] = [
      {
        id: 'run1',
        runUid: 'uuid1',
        commitOid: 'commit1',
        branchName: 'different-branch',
        baseOid: 'base1',
        status: 'SUCCESS',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        finishedAt: '2024-01-01T00:02:00Z',
        summary: {
          occurrencesIntroduced: 0,
          occurrencesResolved: 5,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
    ];

    const mockPaginatedResponse: PaginatedResponse<DeepSourceRun> = {
      items: mockRuns,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      },
      totalCount: 1,
    };

    jest.spyOn(client, 'listRuns').mockResolvedValue(mockPaginatedResponse);

    const result = await client.getLatestRunForBranch('project-key', 'main');

    expect(result).toBeNull();
  });

  it('should handle empty runs list', async () => {
    const mockPaginatedResponse: PaginatedResponse<DeepSourceRun> = {
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    };

    jest.spyOn(client, 'listRuns').mockResolvedValue(mockPaginatedResponse);

    const result = await client.getLatestRunForBranch('project-key', 'main');

    expect(result).toBeNull();
  });

  it('should handle errors from listRuns', async () => {
    const mockError = new Error('API Error');
    jest.spyOn(client, 'listRuns').mockRejectedValue(mockError);

    await expect(client.getLatestRunForBranch('project-key', 'main')).rejects.toThrow('API Error');
  });

  it('should correctly sort runs by creation date', async () => {
    const mockRuns: DeepSourceRun[] = [
      {
        id: 'run1',
        runUid: 'uuid1',
        commitOid: 'commit1',
        branchName: 'main',
        baseOid: 'base1',
        status: 'SUCCESS',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:01:00Z',
        finishedAt: '2024-01-03T00:02:00Z',
        summary: {
          occurrencesIntroduced: 0,
          occurrencesResolved: 5,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
      {
        id: 'run2',
        runUid: 'uuid2',
        commitOid: 'commit2',
        branchName: 'main',
        baseOid: 'base2',
        status: 'SUCCESS',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
        finishedAt: '2024-01-01T00:02:00Z',
        summary: {
          occurrencesIntroduced: 2,
          occurrencesResolved: 3,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
      {
        id: 'run3',
        runUid: 'uuid3',
        commitOid: 'commit3',
        branchName: 'main',
        baseOid: 'base3',
        status: 'SUCCESS',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:01:00Z',
        finishedAt: '2024-01-02T00:02:00Z',
        summary: {
          occurrencesIntroduced: 1,
          occurrencesResolved: 1,
          occurrencesSuppressed: 0,
          occurrenceDistributionByAnalyzer: [],
          occurrenceDistributionByCategory: [],
        },
        repository: { name: 'test-repo', id: 'repo1' },
      },
    ];

    const mockPaginatedResponse: PaginatedResponse<DeepSourceRun> = {
      items: mockRuns,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      },
      totalCount: 3,
    };

    jest.spyOn(client, 'listRuns').mockResolvedValue(mockPaginatedResponse);

    const result = await client.getLatestRunForBranch('project-key', 'main');

    expect(result).toBeDefined();
    expect(result?.id).toBe('run1'); // run1 has the most recent date
    expect(result?.createdAt).toBe('2024-01-03T00:00:00Z');
  });
});
