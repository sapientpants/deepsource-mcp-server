/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import {
  asProjectKey,
  asRunId,
  asCommitOid,
  asBranchName,
  asGraphQLNodeId,
} from '../../types/branded';
import type { IAnalysisRunRepository } from '../../domain/aggregates/analysis-run/analysis-run.repository';
import type { AnalysisRun } from '../../domain/aggregates/analysis-run/analysis-run.aggregate';
import type { Logger } from '../../utils/logging/logger';
import { IssueCount } from '../../domain/value-objects/issue-count';

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock modules before importing the implementation
jest.unstable_mockModule('../../utils/logging/logger', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

// Mock the repository and factory
const mockFindByProject = jest.fn();
const mockAnalysisRunRepository = {
  findByProject: mockFindByProject,
} as unknown as IAnalysisRunRepository;

const mockCreateAnalysisRunRepository = jest.fn(() => mockAnalysisRunRepository);
const mockRepositoryFactory = jest.fn(() => ({
  createAnalysisRunRepository: mockCreateAnalysisRunRepository,
}));

jest.unstable_mockModule('../../infrastructure/factories/repository.factory', () => ({
  RepositoryFactory: mockRepositoryFactory,
}));

// Import the modules under test AFTER mocking
const { handleDeepsourceProjectRuns, createProjectRunsHandlerWithRepo } = await import(
  '../../handlers/project-runs'
);

describe('Project Runs Handler', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('createProjectRunsHandlerWithRepo', () => {
    it('should create a handler that uses injected dependencies', async () => {
      // Mock domain analysis runs
      const projectKey = asProjectKey('test-project');
      const mockRuns = [
        {
          runId: asRunId('run-1'),
          projectKey,
          repositoryId: asGraphQLNodeId('repo-1'),
          commitInfo: {
            oid: asCommitOid('commit-1'),
            branch: asBranchName('main'),
            baseOid: asCommitOid('base-1'),
          },
          status: 'SUCCESS' as const,
          timestamps: {
            createdAt: new Date('2023-01-01T00:00:00Z'),
            startedAt: new Date('2023-01-01T00:01:00Z'),
            finishedAt: new Date('2023-01-01T00:05:00Z'),
          },
          summary: {
            totalIntroduced: IssueCount.create(5),
            totalResolved: IssueCount.create(2),
            totalSuppressed: IssueCount.create(1),
            byAnalyzer: [],
            byCategory: [],
          },
        },
        {
          runId: asRunId('run-2'),
          projectKey,
          repositoryId: asGraphQLNodeId('repo-1'),
          commitInfo: {
            oid: asCommitOid('commit-2'),
            branch: asBranchName('feature'),
            baseOid: asCommitOid('base-2'),
          },
          status: 'FAILURE' as const,
          timestamps: {
            createdAt: new Date('2023-01-02T00:00:00Z'),
            finishedAt: new Date('2023-01-02T00:03:00Z'),
          },
          summary: {
            totalIntroduced: IssueCount.create(3),
            totalResolved: IssueCount.create(0),
            totalSuppressed: IssueCount.create(0),
            byAnalyzer: [],
            byCategory: [],
          },
        },
      ] as AnalysisRun[];

      // Set up the mock to return paginated results
      mockFindByProject.mockResolvedValue({
        items: mockRuns,
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const handler = createProjectRunsHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        first: 20,
      });

      // Verify repository was used
      expect(mockFindByProject).toHaveBeenCalledWith(projectKey, {
        page: 1,
        pageSize: 20,
      });

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.runs).toHaveLength(2);
      expect(parsedContent.runs[0].id).toBe('run-1');
      expect(parsedContent.runs[0].status).toBe('SUCCESS');
      expect(parsedContent.runs[0].commitOid).toBe('commit-1');
      expect(parsedContent.runs[0].branchName).toBe('main');
      expect(parsedContent.runs[0].summary.occurrencesIntroduced).toBe(5);
      expect(parsedContent.runs[0].summary.occurrencesResolved).toBe(2);
      expect(parsedContent.runs[0].summary.occurrencesSuppressed).toBe(1);

      expect(parsedContent.runs[1].id).toBe('run-2');
      expect(parsedContent.runs[1].status).toBe('FAILURE');
      expect(parsedContent.runs[1].branchName).toBe('feature');

      expect(parsedContent.totalCount).toBe(2);
      expect(parsedContent.pageInfo.hasNextPage).toBe(false);
      expect(parsedContent.pageInfo.hasPreviousPage).toBe(false);
      expect(parsedContent.usage_examples).toBeDefined();
    });

    it('should handle empty results', async () => {
      // Set up the mock to return empty results
      mockFindByProject.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const handler = createProjectRunsHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'empty-project',
        first: 20,
      });

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.runs).toHaveLength(0);
      expect(parsedContent.totalCount).toBe(0);
      expect(parsedContent.pageInfo.hasNextPage).toBe(false);
    });

    it('should handle errors using injected logger', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProject.mockRejectedValue(testError);

      const handler = createProjectRunsHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        first: 20,
      });

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in handleProjectRuns',
        expect.any(Object)
      );

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Repository connection failed',
        details: 'Failed to retrieve project runs',
      });
    });
  });

  describe('handleDeepsourceProjectRuns', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceProjectRuns({
          projectKey: 'test-project',
          first: 20,
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should return project runs successfully', async () => {
      // Mock domain analysis run
      const projectKey = asProjectKey('test-project');
      const mockRun = {
        runId: asRunId('run-1'),
        projectKey,
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-1'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-1'),
        },
        status: 'SUCCESS' as const,
        timestamps: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          startedAt: new Date('2023-01-01T00:01:00Z'),
          finishedAt: new Date('2023-01-01T00:05:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(3),
          totalResolved: IssueCount.create(1),
          totalSuppressed: IssueCount.create(0),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      // Set up the mock to return the run
      mockFindByProject.mockResolvedValue({
        items: [mockRun],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Call the handler
      const result = await handleDeepsourceProjectRuns({
        projectKey: 'test-project',
        first: 20,
      });

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createAnalysisRunRepository was called
      expect(mockCreateAnalysisRunRepository).toHaveBeenCalled();

      // Verify findByProject was called
      expect(mockFindByProject).toHaveBeenCalledWith(projectKey, {
        page: 1,
        pageSize: 20,
      });

      // Verify logging behavior - check that key operations were logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching project runs from repository',
        expect.any(Object)
      );

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.runs).toHaveLength(1);
      expect(parsedContent.runs[0].id).toBe('run-1');
      expect(parsedContent.runs[0].status).toBe('SUCCESS');
      expect(parsedContent.totalCount).toBe(1);
    });

    it('should throw error when repository fails', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProject.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceProjectRuns({
          projectKey: 'test-project',
          first: 20,
        })
      ).rejects.toThrow('Repository connection failed');
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindByProject.mockRejectedValue('Just a string error');

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceProjectRuns({
          projectKey: 'test-project',
          first: 20,
        })
      ).rejects.toThrow('Unknown error');
    });

    it('should handle pagination parameters', async () => {
      // Mock empty response
      mockFindByProject.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Call the handler with custom pagination
      await handleDeepsourceProjectRuns({
        projectKey: 'test-project',
        first: 10,
        after: 'cursor-123',
      });

      // Verify pagination was handled (converted to page/pageSize)
      expect(mockFindByProject).toHaveBeenCalledWith(asProjectKey('test-project'), {
        page: 1,
        pageSize: 10,
      });
    });

    it('should handle analyzer filtering parameter (logged but not yet implemented)', async () => {
      // Mock empty response
      mockFindByProject.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      // Call the handler with analyzer filter
      await handleDeepsourceProjectRuns({
        projectKey: 'test-project',
        analyzerIn: ['eslint', 'typescript'],
        first: 20,
      });

      // Verify that analyzer filtering was logged (though not yet implemented in repository)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching project runs from repository',
        expect.objectContaining({
          projectKey: 'test-project',
          hasAnalyzerFilter: true,
        })
      );

      // Repository should still be called without analyzer filter
      expect(mockFindByProject).toHaveBeenCalledWith(asProjectKey('test-project'), {
        page: 1,
        pageSize: 20,
      });
    });
  });
});
