/**
 * @fileoverview Tests for AnalysisRunRepository
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AnalysisRunRepository } from '../analysis-run.repository.js';
import { DeepSourceClient } from '../../../deepsource.js';
import { DeepSourceRun } from '../../../models/runs.js';
import type { Project } from '../../../models/projects.js';
import type { PaginatedRunResponse } from '../../../client/runs-client.js';
import {
  asRunId,
  asProjectKey,
  asCommitOid,
  asBranchName,
  asGraphQLNodeId,
} from '../../../types/branded.js';
import { AnalysisRun } from '../../../domain/aggregates/analysis-run/analysis-run.aggregate.js';
import { PaginatedResponse } from '../../../utils/pagination/types.js';

// Mock the DeepSourceClient
jest.mock('../../../deepsource.js');

// Mock the logger
jest.mock('../../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('AnalysisRunRepository', () => {
  let repository: AnalysisRunRepository;
  let mockClient: jest.Mocked<DeepSourceClient>;
  let mockApiRuns: DeepSourceRun[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock DeepSourceClient
    mockClient = {
      listProjects: jest.fn(),
      listRuns: jest.fn(),
    } as unknown as jest.Mocked<DeepSourceClient>;

    // Create test data
    mockApiRuns = [
      {
        id: asGraphQLNodeId('R_run1'),
        runUid: asRunId('run-1'),
        commitOid: asCommitOid('commit-1'),
        branchName: asBranchName('main'),
        baseOid: asCommitOid('base-1'),
        status: 'SUCCESS',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:05:00Z',
        finishedAt: '2024-01-15T10:10:00Z',
        summary: {
          occurrencesIntroduced: 10,
          occurrencesResolved: 5,
          occurrencesSuppressed: 2,
        },
        repository: {
          name: 'test-repo',
          id: asGraphQLNodeId('R_repo123'),
        },
      },
      {
        id: asGraphQLNodeId('R_run2'),
        runUid: asRunId('run-2'),
        commitOid: asCommitOid('commit-2'),
        branchName: asBranchName('feature'),
        baseOid: asCommitOid('base-2'),
        status: 'FAILURE',
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:05:00Z',
        finishedAt: '2024-01-14T10:15:00Z',
        summary: {
          occurrencesIntroduced: 20,
          occurrencesResolved: 0,
          occurrencesSuppressed: 0,
        },
        repository: {
          name: 'test-repo',
          id: asGraphQLNodeId('R_repo123'),
        },
      },
      {
        id: asGraphQLNodeId('R_run3'),
        runUid: asRunId('run-3'),
        commitOid: asCommitOid('commit-3'),
        branchName: asBranchName('main'),
        baseOid: asCommitOid('base-3'),
        status: 'READY',
        createdAt: '2024-01-13T10:00:00Z',
        updatedAt: '2024-01-13T10:05:00Z',
        summary: {
          occurrencesIntroduced: 0,
          occurrencesResolved: 0,
          occurrencesSuppressed: 0,
        },
        repository: {
          name: 'test-repo',
          id: asGraphQLNodeId('R_repo123'),
        },
      },
    ];

    // Setup default mock behavior
    const mockResponse: PaginatedResponse<DeepSourceRun> = {
      items: mockApiRuns,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      },
    };
    mockClient.listRuns.mockResolvedValue(mockResponse);

    // Create repository instance
    repository = new AnalysisRunRepository(mockClient);
  });

  describe('findById', () => {
    it('should find run by ID', async () => {
      const runId = asRunId('run-1');
      mockClient.listProjects.mockResolvedValue([
        {
          key: asProjectKey('test-project'),
          name: 'Test Project',
          repository: {},
        } as unknown as Project,
      ]);

      const run = await repository.findById(runId);

      expect(run).not.toBeNull();
      expect(run?.runId).toBe(runId);
      expect(run?.status).toBe('SUCCESS');
      expect(mockClient.listProjects).toHaveBeenCalledTimes(1);
      expect(mockClient.listRuns).toHaveBeenCalledWith('test-project', {
        first: 50,
        after: undefined,
      });
    });

    it('should return null when run not found', async () => {
      mockClient.listProjects.mockResolvedValue([
        {
          key: asProjectKey('test-project'),
          name: 'Test Project',
          repository: {},
        } as unknown as Project,
      ]);

      const run = await repository.findById(asRunId('non-existent'));

      expect(run).toBeNull();
    });

    it('should search through multiple projects', async () => {
      mockClient.listProjects.mockResolvedValue([
        { key: asProjectKey('project-1'), name: 'Project 1', repository: {} } as unknown as Project,
        { key: asProjectKey('project-2'), name: 'Project 2', repository: {} } as unknown as Project,
      ]);

      // First project returns empty
      mockClient.listRuns.mockResolvedValueOnce({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as PaginatedRunResponse);

      // Second project has the run
      mockClient.listRuns.mockResolvedValueOnce({
        items: [mockApiRuns[0]],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as PaginatedRunResponse);

      const run = await repository.findById(asRunId('run-1'));

      expect(run).not.toBeNull();
      expect(mockClient.listRuns).toHaveBeenCalledTimes(2);
    });

    it('should handle pagination when searching', async () => {
      mockClient.listProjects.mockResolvedValue([
        {
          key: asProjectKey('test-project'),
          name: 'Test Project',
          repository: {},
        } as unknown as Project,
      ]);

      // First page doesn't have the run
      mockClient.listRuns.mockResolvedValueOnce({
        items: [mockApiRuns[1]],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor-1',
        },
      } as PaginatedRunResponse);

      // Second page has the run
      mockClient.listRuns.mockResolvedValueOnce({
        items: [mockApiRuns[0]],
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      } as PaginatedRunResponse);

      const run = await repository.findById(asRunId('run-1'));

      expect(run).not.toBeNull();
      expect(mockClient.listRuns).toHaveBeenCalledWith('test-project', {
        first: 50,
        after: 'cursor-1',
      });
    });
  });

  describe('findByProject', () => {
    it('should return paginated runs for project', async () => {
      const projectKey = asProjectKey('test-project');
      const result = await repository.findByProject(projectKey, { page: 1, pageSize: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
      expect(mockClient.listRuns).toHaveBeenCalledWith(projectKey, { first: 2 });
    });

    it('should handle pagination correctly', async () => {
      const projectKey = asProjectKey('test-project');
      const result = await repository.findByProject(projectKey, { page: 2, pageSize: 2 });

      expect(result.items).toHaveLength(1); // Only one item on page 2
      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
      expect(mockClient.listRuns).toHaveBeenCalledWith(projectKey, { first: 4 });
    });

    it('should return empty results when no runs exist', async () => {
      mockClient.listRuns.mockResolvedValue({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as PaginatedRunResponse);

      const result = await repository.findByProject(asProjectKey('test-project'), {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('findMostRecent', () => {
    it('should find most recent run for project', async () => {
      const projectKey = asProjectKey('test-project');

      const run = await repository.findMostRecent(projectKey);

      expect(run).not.toBeNull();
      expect(run?.runId).toBe('run-1');
      expect(mockClient.listRuns).toHaveBeenCalledWith(projectKey, {
        first: 50,
        after: undefined,
      });
    });

    it('should find most recent run for specific branch', async () => {
      const projectKey = asProjectKey('test-project');
      const branch = asBranchName('feature');

      const run = await repository.findMostRecent(projectKey, branch);

      expect(run).not.toBeNull();
      expect(run?.runId).toBe('run-2');
      expect(run?.commitInfo.branch).toBe(branch);
      expect(mockClient.listRuns).toHaveBeenCalled();
    });

    it('should return null when no runs exist', async () => {
      mockClient.listRuns.mockResolvedValue({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as PaginatedRunResponse);

      const run = await repository.findMostRecent(asProjectKey('test-project'));

      expect(run).toBeNull();
    });
  });

  describe('findByCommit', () => {
    it('should find run by commit OID', async () => {
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('commit-2');

      const run = await repository.findByCommit(projectKey, commitOid);

      expect(run).not.toBeNull();
      expect(run?.runId).toBe('run-2');
      expect(run?.commitInfo.oid).toBe(commitOid);
    });

    it('should return null when no run found for commit', async () => {
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('non-existent-commit');

      const run = await repository.findByCommit(projectKey, commitOid);

      expect(run).toBeNull();
    });

    it('should handle pagination when searching for commit', async () => {
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('commit-on-page-2');

      // First page doesn't have the commit
      mockClient.listRuns.mockResolvedValueOnce({
        items: mockApiRuns.slice(0, 2),
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor-1',
        },
      } as PaginatedRunResponse);

      // Second page has the commit
      const runOnPage2 = {
        ...mockApiRuns[0],
        runUid: asRunId('run-page-2'),
        commitOid,
      };
      mockClient.listRuns.mockResolvedValueOnce({
        items: [runOnPage2],
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      } as PaginatedRunResponse);

      const run = await repository.findByCommit(projectKey, commitOid);

      expect(run).not.toBeNull();
      expect(run?.commitInfo.oid).toBe(commitOid);
      expect(mockClient.listRuns).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByStatus', () => {
    it('should find runs by status', async () => {
      const projectKey = asProjectKey('test-project');
      const result = await repository.findByStatus(projectKey, 'SUCCESS', {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('SUCCESS');
      expect(result.totalCount).toBe(1);
    });

    it('should handle RUNNING status mapping', async () => {
      const projectKey = asProjectKey('test-project');
      const result = await repository.findByStatus(projectKey, 'RUNNING', {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].runId).toBe('run-3'); // READY maps to RUNNING
      expect(result.items[0].status).toBe('RUNNING');
    });

    it('should paginate status results', async () => {
      // Add more runs with the same status
      const moreRuns = Array.from({ length: 15 }, (_, i) => ({
        ...mockApiRuns[0],
        runUid: asRunId(`run-success-${i}`),
        status: 'SUCCESS',
      }));

      mockClient.listRuns.mockResolvedValue({
        items: moreRuns,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as PaginatedRunResponse);

      const result = await repository.findByStatus(asProjectKey('test-project'), 'SUCCESS', {
        page: 2,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(5); // 15 total, page 2 with size 10
      expect(result.page).toBe(2);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe('findByDateRange', () => {
    it('should find runs within date range', async () => {
      const projectKey = asProjectKey('test-project');
      const startDate = new Date('2024-01-14T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const result = await repository.findByDateRange(projectKey, startDate, endDate, {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(2); // run-1 and run-2
      expect(result.items.map((r) => r.runId)).toContain('run-1');
      expect(result.items.map((r) => r.runId)).toContain('run-2');
      expect(result.items.map((r) => r.runId)).not.toContain('run-3');
    });

    it('should stop fetching when runs are before start date', async () => {
      const projectKey = asProjectKey('test-project');
      const startDate = new Date('2024-01-14T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      // First page has runs in range
      mockClient.listRuns.mockResolvedValueOnce({
        items: [mockApiRuns[0], mockApiRuns[1]],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor-1',
        },
      } as PaginatedRunResponse);

      // Second page has runs before start date
      mockClient.listRuns.mockResolvedValueOnce({
        items: [mockApiRuns[2]], // This is from 2024-01-13
        pageInfo: { hasNextPage: true, hasPreviousPage: true },
      } as PaginatedRunResponse);

      const result = await repository.findByDateRange(projectKey, startDate, endDate, {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(mockClient.listRuns).toHaveBeenCalledTimes(2);
    });

    it('should handle empty date range', async () => {
      const projectKey = asProjectKey('test-project');
      const startDate = new Date('2024-01-20T00:00:00Z');
      const endDate = new Date('2024-01-21T23:59:59Z');

      const result = await repository.findByDateRange(projectKey, startDate, endDate, {
        page: 1,
        pageSize: 10,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('countByProject', () => {
    it('should count all runs for project', async () => {
      const projectKey = asProjectKey('test-project');
      const count = await repository.countByProject(projectKey);

      expect(count).toBe(3);
      expect(mockClient.listRuns).toHaveBeenCalledWith(projectKey, {
        first: 100,
        after: undefined,
      });
    });

    it('should handle pagination when counting', async () => {
      const projectKey = asProjectKey('test-project');

      // First page
      mockClient.listRuns.mockResolvedValueOnce({
        items: Array(100).fill(mockApiRuns[0]),
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          endCursor: 'cursor-1',
        },
      } as PaginatedRunResponse);

      // Second page
      mockClient.listRuns.mockResolvedValueOnce({
        items: Array(50).fill(mockApiRuns[0]),
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
      } as PaginatedRunResponse);

      const count = await repository.countByProject(projectKey);

      expect(count).toBe(150);
      expect(mockClient.listRuns).toHaveBeenCalledTimes(2);
    });
  });

  describe('countByStatus', () => {
    it('should count runs by status', async () => {
      const projectKey = asProjectKey('test-project');
      const count = await repository.countByStatus(projectKey, 'SUCCESS');

      expect(count).toBe(1);
    });

    it('should handle status mapping when counting', async () => {
      const projectKey = asProjectKey('test-project');
      const count = await repository.countByStatus(projectKey, 'RUNNING');

      expect(count).toBe(1); // READY maps to RUNNING
    });

    it('should return 0 for status with no runs', async () => {
      const projectKey = asProjectKey('test-project');
      const count = await repository.countByStatus(projectKey, 'TIMEOUT');

      expect(count).toBe(0);
    });
  });

  describe('existsForCommit', () => {
    it('should return true when run exists for commit', async () => {
      const projectKey = asProjectKey('test-project');
      const exists = await repository.existsForCommit(projectKey, asCommitOid('commit-1'));

      expect(exists).toBe(true);
    });

    it('should return false when no run exists for commit', async () => {
      const projectKey = asProjectKey('test-project');
      const exists = await repository.existsForCommit(projectKey, asCommitOid('non-existent'));

      expect(exists).toBe(false);
    });
  });

  describe('save', () => {
    it('should throw error indicating operation not supported', async () => {
      const run = AnalysisRun.create({
        runId: asRunId('new-run'),
        projectKey: asProjectKey('test-project'),
        repositoryId: asGraphQLNodeId('R_repo123'),
        commitInfo: {
          oid: asCommitOid('new-commit'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-commit'),
        },
      });

      await expect(repository.save(run)).rejects.toThrow(
        'Save operation is not supported by DeepSource API'
      );
    });
  });

  describe('delete', () => {
    it('should throw error indicating operation not supported', async () => {
      await expect(repository.delete(asRunId('run-1'))).rejects.toThrow(
        'Delete operation is not supported by DeepSource API'
      );
    });
  });

  describe('data freshness', () => {
    it('should fetch fresh data on every request', async () => {
      const projectKey = asProjectKey('test-project');

      // First call
      await repository.findByProject(projectKey, { page: 1, pageSize: 10 });

      // Update mock data
      mockApiRuns[0].status = 'FAILURE';

      // Second call should get fresh data
      await repository.findByProject(projectKey, { page: 1, pageSize: 10 });

      expect(mockClient.listRuns).toHaveBeenCalledTimes(2);
    });

    it('should not cache results between different method calls', async () => {
      const projectKey = asProjectKey('test-project');

      await repository.findByProject(projectKey, { page: 1, pageSize: 10 });
      await repository.findMostRecent(projectKey);
      await repository.findByCommit(projectKey, asCommitOid('commit-1'));
      await repository.countByProject(projectKey);

      // All methods use listRuns
      expect(mockClient.listRuns).toHaveBeenCalledTimes(4);
    });
  });
});
