/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import type { DeepSourceIssue } from '../models/issues';
import type { PaginatedResult } from '../utils/pagination/types';

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock modules before importing the implementation
jest.unstable_mockModule('../utils/logging/logger', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

// Mock the DeepSource client
const mockGetIssues = jest.fn();
jest.unstable_mockModule('../deepsource', () => ({
  DeepSourceClient: jest.fn().mockImplementation(() => ({
    getIssues: mockGetIssues,
  })),
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
    jest.clearAllMocks();
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
      ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should handle errors from the client', async () => {
      // Set up the mock to throw an error
      const testError = new Error('API client error');
      mockGetIssues.mockRejectedValue(testError);

      // Call the handler
      const result = await handleDeepsourceProjectIssues({
        projectKey: 'test-project',
      });

      // Verify error response structure
      expect(result).toHaveProperty('isError', true);
      expect(result.content).toHaveLength(1);

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveProperty('error', 'API client error');
    });
  });
});
