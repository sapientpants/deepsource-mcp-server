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
const mockFindMostRecent = jest.fn();
const mockAnalysisRunRepository = {
  findMostRecent: mockFindMostRecent,
} as unknown as IAnalysisRunRepository;

const mockCreateAnalysisRunRepository = jest.fn(() => mockAnalysisRunRepository);
const mockRepositoryFactory = jest.fn(() => ({
  createAnalysisRunRepository: mockCreateAnalysisRunRepository,
}));

jest.unstable_mockModule('../../infrastructure/factories/repository.factory', () => ({
  RepositoryFactory: mockRepositoryFactory,
}));

// Mock the DeepSource client
const mockGetRecentRunIssues = jest.fn();
const mockDeepSourceClient = jest.fn(() => ({
  getRecentRunIssues: mockGetRecentRunIssues,
}));

jest.unstable_mockModule('../../deepsource.js', () => ({
  DeepSourceClient: mockDeepSourceClient,
  ReportType: {
    OWASP_TOP_10: 'OWASP_TOP_10',
    SANS_TOP_25: 'SANS_TOP_25',
    MISRA_C: 'MISRA_C',
    CODE_COVERAGE: 'CODE_COVERAGE',
    CODE_HEALTH_TREND: 'CODE_HEALTH_TREND',
    ISSUE_DISTRIBUTION: 'ISSUE_DISTRIBUTION',
    ISSUES_PREVENTED: 'ISSUES_PREVENTED',
    ISSUES_AUTOFIXED: 'ISSUES_AUTOFIXED',
  },
  ReportStatus: {
    PASSING: 'PASSING',
    FAILING: 'FAILING',
    NOOP: 'NOOP',
  },
}));

// Import the modules under test AFTER mocking
const { handleDeepsourceRecentRunIssues, createRecentRunIssuesHandlerWithRepo } = await import(
  '../../handlers/recent-run-issues'
);

describe('Recent Run Issues Handler', () => {
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

  describe('createRecentRunIssuesHandlerWithRepo', () => {
    it('should create a handler that finds recent run and fetches issues', async () => {
      // Mock domain analysis run
      const projectKey = asProjectKey('test-project');
      const branchName = asBranchName('main');
      const mockRun = {
        runId: asRunId('run-123'),
        projectKey,
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-abc'),
          branch: branchName,
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

      // Mock client response for issues
      const mockClientResponse = {
        run: {
          id: 'run-graphql-id-1',
          runUid: 'run-123',
          commitOid: 'commit-abc',
          branchName: 'main',
          baseOid: 'base-def',
          status: 'SUCCESS',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:05:00Z',
          finishedAt: '2023-01-01T00:05:00Z',
          summary: {
            occurrencesIntroduced: 3,
            occurrencesResolved: 1,
            occurrencesSuppressed: 0,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        },
        items: [
          {
            id: 'issue-1',
            title: 'Test issue',
            shortcode: 'PY-E1101',
            category: 'BUG',
            severity: 'MAJOR',
            status: 'OPEN',
            issue_text: 'Instance of class has no attribute',
            file_path: 'src/test.py',
            line_number: 42,
            tags: ['python', 'bug-risk'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 1,
      };

      // Set up the mocks
      mockFindMostRecent.mockResolvedValue(mockRun);
      mockGetRecentRunIssues.mockResolvedValue(mockClientResponse);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify repository was used correctly
      expect(mockFindMostRecent).toHaveBeenCalledWith(projectKey, branchName);

      // Verify client was used correctly
      expect(mockGetRecentRunIssues).toHaveBeenCalledWith('test-project', 'main');

      // Verify the response structure
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-123');
      expect(parsedContent.run.runUid).toBe('run-123');
      expect(parsedContent.run.status).toBe('SUCCESS');
      expect(parsedContent.run.commitOid).toBe('commit-abc');
      expect(parsedContent.run.branchName).toBe('main');
      expect(parsedContent.run.summary.occurrencesIntroduced).toBe(3);
      expect(parsedContent.run.summary.occurrencesResolved).toBe(1);
      expect(parsedContent.run.summary.occurrencesSuppressed).toBe(0);
      expect(parsedContent.issues).toHaveLength(1);
      expect(parsedContent.issues[0].id).toBe('issue-1');
      expect(parsedContent.issues[0].title).toBe('Test issue');
      expect(parsedContent.totalCount).toBe(1);
      expect(parsedContent.usage_examples).toBeDefined();
    });

    it('should handle case when no recent run is found', async () => {
      // Set up the mock to return null
      mockFindMostRecent.mockResolvedValue(null);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'feature-branch',
      });

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain(
        'No recent analysis run found for branch "feature-branch" in project "test-project"'
      );
      expect(parsedContent.details).toBe('Failed to retrieve recent run issues');
    });

    it('should handle repository errors gracefully', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindMostRecent.mockRejectedValue(testError);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in handleRecentRunIssues',
        expect.any(Object)
      );

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Repository connection failed',
        details: 'Failed to retrieve recent run issues',
      });
    });

    it('should handle client errors gracefully', async () => {
      // Mock successful repository call but failing client call
      const mockRun = {
        runId: asRunId('run-123'),
        projectKey: asProjectKey('test-project'),
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-abc'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-def'),
        },
        status: 'SUCCESS' as const,
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

      mockFindMostRecent.mockResolvedValue(mockRun);

      const testError = new Error('Client API failed');
      mockGetRecentRunIssues.mockRejectedValue(testError);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('Client API failed');
    });

    it('should warn when domain run and client run mismatch', async () => {
      // Mock domain analysis run
      const mockRun = {
        runId: asRunId('run-123'),
        projectKey: asProjectKey('test-project'),
        repositoryId: asGraphQLNodeId('repo-1'),
        commitInfo: {
          oid: asCommitOid('commit-abc'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('base-def'),
        },
        status: 'SUCCESS' as const,
        timestamps: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
        },
        summary: {
          totalIntroduced: IssueCount.create(1),
          totalResolved: IssueCount.create(0),
          totalSuppressed: IssueCount.create(0),
          byAnalyzer: [],
          byCategory: [],
        },
      } as AnalysisRun;

      // Mock client response with different run ID
      const mockClientResponse = {
        run: {
          id: 'run-graphql-id-different',
          runUid: 'run-456', // Different from domain run
          commitOid: 'commit-different',
          branchName: 'main',
          status: 'SUCCESS',
          createdAt: '2023-01-01T00:00:00Z',
          summary: {
            occurrencesIntroduced: 1,
            occurrencesResolved: 0,
            occurrencesSuppressed: 0,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        },
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };

      mockFindMostRecent.mockResolvedValue(mockRun);
      mockGetRecentRunIssues.mockResolvedValue(mockClientResponse);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith('Mismatch between domain run and client run', {
        domainRunId: 'run-123',
        clientRunUid: 'run-456',
      });

      // Should still return successful response using domain data
      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-123'); // Uses domain data
      expect(parsedContent.run.runUid).toBe('run-123'); // Uses domain data
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

      const mockClientResponse = {
        run: {
          id: 'run-graphql-id-minimal',
          runUid: 'run-minimal',
          commitOid: 'commit-minimal',
          branchName: 'main',
          status: 'PENDING',
          createdAt: '2023-01-01T00:00:00Z',
          summary: {
            occurrencesIntroduced: 0,
            occurrencesResolved: 0,
            occurrencesSuppressed: 0,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        },
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };

      mockFindMostRecent.mockResolvedValue(mockRun);
      mockGetRecentRunIssues.mockResolvedValue(mockClientResponse);

      const mockClient = {
        getRecentRunIssues: mockGetRecentRunIssues,
      };

      const handler = createRecentRunIssuesHandlerWithRepo({
        analysisRunRepository: mockAnalysisRunRepository,
        client: mockClient,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify the response handles missing optional data gracefully
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.status).toBe('PENDING');
      expect(parsedContent.run.finishedAt).toBeUndefined();
      expect(parsedContent.issues).toEqual([]);
      expect(parsedContent.totalCount).toBe(0);
    });
  });

  describe('handleDeepsourceRecentRunIssues', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'main',
        })
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should return recent run issues successfully', async () => {
      // Mock domain analysis run
      const mockRun = {
        runId: asRunId('run-success'),
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

      const mockClientResponse = {
        run: {
          id: 'run-graphql-id-success',
          runUid: 'run-success',
          commitOid: 'commit-success',
          branchName: 'main',
          status: 'SUCCESS',
          createdAt: '2023-01-01T00:00:00Z',
          summary: {
            occurrencesIntroduced: 2,
            occurrencesResolved: 1,
            occurrencesSuppressed: 0,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        },
        items: [
          {
            id: 'issue-success',
            title: 'Success issue',
            shortcode: 'JS-0001',
            category: 'BUG',
            severity: 'MINOR',
            status: 'OPEN',
            issue_text: 'Test issue',
            file_path: 'src/success.js',
            line_number: 10,
            tags: ['javascript'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 1,
      };

      // Set up the mocks
      mockFindMostRecent.mockResolvedValue(mockRun);
      mockGetRecentRunIssues.mockResolvedValue(mockClientResponse);

      // Call the handler
      const result = await handleDeepsourceRecentRunIssues({
        projectKey: 'test-project',
        branchName: 'main',
      });

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createAnalysisRunRepository was called
      expect(mockCreateAnalysisRunRepository).toHaveBeenCalled();

      // Verify DeepSourceClient was created with the API key
      expect(mockDeepSourceClient).toHaveBeenCalledWith('test-api-key');

      // Verify logging behavior
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching recent run from repository and issues from client',
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
      expect(parsedContent.issues).toHaveLength(1);
      expect(parsedContent.issues[0].id).toBe('issue-success');
    });

    it('should throw error when repository fails', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindMostRecent.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'main',
        })
      ).rejects.toThrow('Repository connection failed');
    });

    it('should throw error when no recent run found', async () => {
      // Set up the mock to return null
      mockFindMostRecent.mockResolvedValue(null);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'feature-branch',
        })
      ).rejects.toThrow(
        'No recent analysis run found for branch "feature-branch" in project "test-project"'
      );
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindMostRecent.mockRejectedValue('Just a string error');

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceRecentRunIssues({
          projectKey: 'test-project',
          branchName: 'main',
        })
      ).rejects.toThrow('Unknown error');
    });
  });
});
