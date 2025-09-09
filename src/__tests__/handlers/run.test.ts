/**
 * @vitest-environment node
 */

import { vi } from 'vitest';
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
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock modules before importing the implementation
vi.mock('../../utils/logging/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

// Mock the repository and factory
const mockFindByRunId = vi.fn();
const mockFindByCommit = vi.fn();
const mockAnalysisRunRepository = {
  findByRunId: mockFindByRunId,
  findByCommit: mockFindByCommit,
} as unknown as IAnalysisRunRepository;

const mockCreateAnalysisRunRepository = vi.fn(() => mockAnalysisRunRepository);
const mockRepositoryFactory = vi.fn(() => ({
  createAnalysisRunRepository: mockCreateAnalysisRunRepository,
}));

vi.mock('../../infrastructure/factories/repository.factory', () => ({
  RepositoryFactory: mockRepositoryFactory,
}));

// Import the modules under test AFTER mocking
const { handleDeepsourceRun, createRunHandlerWithRepo } = await import('../../handlers/run');

describe('Run Handler', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('createRunHandlerWithRepo', () => {
    it('should create a handler that finds run by runId', async () => {
      // Mock domain analysis run
      const projectKey = asProjectKey('test-project');
      const runId = asRunId('run-123');
      const mockRun = {
        runId,
        projectKey,
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-abc'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-def'),
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
          byAnalyzer: [
            {
              analyzerShortcode: 'eslint',
              introduced: IssueCount.create(2),
              resolved: IssueCount.create(1),
              suppressed: IssueCount.create(0),
            },
          ],
          byCategory: [
            {
              category: 'BUG_RISK',
              introduced: IssueCount.create(3),
              resolved: IssueCount.create(1),
              suppressed: IssueCount.create(0),
            },
          ],
        },
      } as AnalysisRun;

      // Set up the mock to return the run
      mockFindByRunId.mockResolvedValue(mockRun);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler with runId
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'run-123',
        isCommitOid: false,
      });

      // Verify repository was used correctly
      expect(mockFindByRunId).toHaveBeenCalledWith(runId);
      expect(mockFindByCommit).not.toHaveBeenCalled();

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-123');
      expect(parsedContent.run.runUid).toBe('run-123');
      expect(parsedContent.run.status).toBe('SUCCESS');
      expect(parsedContent.run.commitOid).toBe('commit-abc');
      expect(parsedContent.run.branchName).toBe('main');
      expect(parsedContent.run.summary.occurrencesIntroduced).toBe(3);
      expect(parsedContent.run.summary.occurrencesResolved).toBe(1);
      expect(parsedContent.run.summary.occurrencesSuppressed).toBe(0);
      expect(parsedContent.analysis.analyzers_used).toEqual(['eslint']);
      expect(parsedContent.analysis.issue_categories).toEqual(['BUG_RISK']);
      expect(parsedContent.related_tools).toBeDefined();
    });

    it('should create a handler that finds run by commitOid', async () => {
      // Mock domain analysis run
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('commit-xyz');
      const mockRun = {
        runId: asRunId('run-456'),
        projectKey,
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: commitOid,
          branch: asBranchName('feature'),
          baseOid: asCommitOid('base-ghi'),
        },
        status: 'FAILURE' as const,
        timestamps: {
          createdAt: new Date('2023-01-02T00:00:00Z'),
          finishedAt: new Date('2023-01-02T00:03:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(5),
          totalResolved: IssueCount.create(0),
          totalSuppressed: IssueCount.create(1),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      // Set up the mock to return the run
      mockFindByCommit.mockResolvedValue(mockRun);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler with commitOid
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'commit-xyz',
        isCommitOid: true,
      });

      // Verify repository was used correctly
      expect(mockFindByCommit).toHaveBeenCalledWith(projectKey, commitOid);
      expect(mockFindByRunId).not.toHaveBeenCalled();

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-456');
      expect(parsedContent.run.status).toBe('FAILURE');
      expect(parsedContent.run.commitOid).toBe('commit-xyz');
      expect(parsedContent.run.branchName).toBe('feature');
      expect(parsedContent.analysis.status_info).toContain('failed');
    });

    it('should handle run not found', async () => {
      // Set up the mock to return null
      mockFindByRunId.mockResolvedValue(null);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'nonexistent-run',
        isCommitOid: false,
      });

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain('Run with runUid "nonexistent-run" not found');
      expect(parsedContent.details).toBe('Failed to retrieve run');
    });

    it('should handle run not found by commitOid', async () => {
      // Set up the mock to return null
      mockFindByCommit.mockResolvedValue(null);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'nonexistent-commit',
        isCommitOid: true,
      });

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain('Run with commitOid "nonexistent-commit" not found');
    });

    it('should handle errors using injected logger', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByRunId.mockRejectedValue(testError);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'run-123',
        isCommitOid: false,
      });

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith('Error in handleRun', expect.any(Object));

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Repository connection failed',
        details: 'Failed to retrieve run',
      });
    });

    it('should handle run with missing optional data', async () => {
      // Mock domain analysis run with minimal data
      const mockRun = {
        runId: asRunId('run-minimal'),
        projectKey: asProjectKey('test-project'),
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-minimal'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-minimal'),
        },
        status: 'PENDING' as const,
        timestamps: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(0),
          totalResolved: IssueCount.create(0),
          totalSuppressed: IssueCount.create(0),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      mockFindByRunId.mockResolvedValue(mockRun);

      const handler = createRunHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        runIdentifier: 'run-minimal',
        isCommitOid: false,
      });

      // Verify the response handles missing optional data gracefully
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.status).toBe('PENDING');
      expect(parsedContent.run.finishedAt).toBeUndefined();
      expect(parsedContent.analysis.analyzers_used).toEqual([]);
      expect(parsedContent.analysis.issue_categories).toEqual([]);
      expect(parsedContent.analysis.status_info).toContain('queued');
    });
  });

  describe('handleDeepsourceRun', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'run-123',
          isCommitOid: false,
        })
      ).rejects.toThrow('Configuration error: DeepSource API key is required but not configured');
    });

    it('should return run data successfully by runId', async () => {
      // Mock domain analysis run
      const runId = asRunId('run-success');
      const mockRun = {
        runId,
        projectKey: asProjectKey('test-project'),
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-success'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-success'),
        },
        status: 'SUCCESS' as const,
        timestamps: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          startedAt: new Date('2023-01-01T00:01:00Z'),
          finishedAt: new Date('2023-01-01T00:05:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(2),
          totalResolved: IssueCount.create(1),
          totalSuppressed: IssueCount.create(0),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      // Set up the mock to return the run
      mockFindByRunId.mockResolvedValue(mockRun);

      // Call the handler
      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'run-success',
        isCommitOid: false,
      });

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createAnalysisRunRepository was called
      expect(mockCreateAnalysisRunRepository).toHaveBeenCalled();

      // Verify findByRunId was called
      expect(mockFindByRunId).toHaveBeenCalledWith(runId);

      // Verify logging behavior
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching run from repository',
        expect.any(Object)
      );

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-success');
      expect(parsedContent.run.status).toBe('SUCCESS');
    });

    it('should return run data successfully by commitOid', async () => {
      // Mock domain analysis run
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('commit-by-oid');
      const mockRun = {
        runId: asRunId('run-by-commit'),
        projectKey,
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: commitOid,
          branch: asBranchName('develop'),
          baseOid: asCommitOid('base-by-oid'),
        },
        status: 'SUCCESS' as const,
        timestamps: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          finishedAt: new Date('2023-01-01T00:03:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(1),
          totalResolved: IssueCount.create(2),
          totalSuppressed: IssueCount.create(0),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      // Set up the mock to return the run
      mockFindByCommit.mockResolvedValue(mockRun);

      // Call the handler
      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'commit-by-oid',
        isCommitOid: true,
      });

      // Verify findByCommit was called with correct parameters
      expect(mockFindByCommit).toHaveBeenCalledWith(projectKey, commitOid);

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.commitOid).toBe('commit-by-oid');
      expect(parsedContent.run.branchName).toBe('develop');
    });

    it('should throw error when repository fails', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByRunId.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'run-123',
          isCommitOid: false,
        })
      ).rejects.toThrow('Repository connection failed');
    });

    it('should throw error when run not found', async () => {
      // Set up the mock to return null
      mockFindByRunId.mockResolvedValue(null);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'nonexistent-run',
          isCommitOid: false,
        })
      ).rejects.toThrow('Run with runUid "nonexistent-run" not found');
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindByRunId.mockRejectedValue('Just a string error');

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: 'run-123',
          isCommitOid: false,
        })
      ).rejects.toThrow('Unknown error');
    });
  });
});
