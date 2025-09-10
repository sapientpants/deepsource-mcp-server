/**
 * @vitest-environment node
 */

import { vi } from 'vitest';
import type { DeepSourceIssue } from '../models/issues';
import type { PaginatedResult } from '../utils/pagination/types';

// Create mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock modules before importing the implementation
vi.mock('../utils/logging/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

// Mock the DeepSource client
const mockGetIssues = vi.fn();
vi.mock('../deepsource', () => ({
  DeepSourceClient: vi.fn().mockImplementation(() => ({
    getIssues: mockGetIssues,
  })),
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
const { handleDeepsourceProjectIssues } = await import('../handlers/project-issues');

describe('Project Issues Handler', () => {
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

  describe('handleDeepsourceProjectIssues', () => {
    it('should fetch project issues successfully', async () => {
      // Mock response data
      const mockIssues: PaginatedResult<DeepSourceIssue> = {
        items: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            shortcode: 'TEST-001',
            category: 'BUG',
            severity: 'CRITICAL',
            status: 'OPEN',
            issue_text: 'This is a test issue',
            file_path: 'src/test.ts',
            line_number: 42,
            tags: ['javascript'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: 'cursor-2',
        },
        totalCount: 1,
      };

      // Set up the mock implementation
      mockGetIssues.mockResolvedValue(mockIssues);

      // Call the handler
      const result = await handleDeepsourceProjectIssues({
        projectKey: 'test-project',
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Parse the response and verify structure
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveProperty('issues');
      expect(parsedContent.issues).toHaveLength(1);
      expect(parsedContent.issues[0]).toMatchObject({
        id: 'issue-1',
        title: 'Test Issue 1',
        shortcode: 'TEST-001',
        category: 'BUG',
        severity: 'CRITICAL',
        status: 'OPEN',
      });
    });

    it('should throw error when API key is not set', async () => {
      // Remove API key from environment
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceProjectIssues({
          projectKey: 'test-project',
        })
      ).rejects.toThrow('Configuration error: DeepSource API key is required but not configured');
    });

    it('should handle errors from the client', async () => {
      // Set up the mock to throw an error
      const testError = new Error('API client error');
      mockGetIssues.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceProjectIssues({
          projectKey: 'test-project',
        })
      ).rejects.toThrow('API client error');
    });

    it.skip('should handle max_pages parameter with multi-page fetching message', async () => {
      // Mock response data
      const mockIssues: PaginatedResult<DeepSourceIssue> = {
        items: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            shortcode: 'TEST-001',
            category: 'BUG',
            severity: 'CRITICAL',
            status: 'OPEN',
            analyzer: 'javascript',
            tags: ['test'],
            path: 'src/test.ts',
            line: 10,
            message: 'Test issue message',
            occurences: 1,
            repository: {
              login: 'test',
              name: 'test-repo',
            },
          },
        ],
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        pagination: {
          has_more_pages: false,
          page_size: 1,
        },
      };

      mockGetIssues.mockResolvedValue(mockIssues);

      const result = await handleDeepsourceProjectIssues({
        projectKey: 'test-project',
        max_pages: 5,
      });

      expect(result.issues).toEqual(mockIssues.items);
      expect(result.usage_examples.pagination.next_page).toBe(
        'Multi-page fetching enabled with max_pages parameter'
      );
      expect(mockGetIssues).toHaveBeenCalledWith('test-project', { max_pages: 5 });
    });
  });
});
