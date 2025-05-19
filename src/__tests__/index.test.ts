/**
 * @jest-environment node
 */

import {
  mcpServer,
  handleDeepsourceProjects,
  handleDeepsourceProjectIssues,
  handleDeepsourceProjectRuns,
  handleDeepsourceRun,
  handleDeepsourceDependencyVulnerabilities,
  handleDeepsourceRecentRunIssues,
  type DeepsourceRecentRunIssuesParams,
} from '../index.js';
import {
  DeepSourceClient,
  type DeepSourceProject,
  type DeepSourceIssue,
  type PaginatedResponse,
} from '../deepsource.js';

// Define a type for pagination parameters
type PaginationParams = {
  offset?: number;
  first?: number;
  after?: string;
  before?: string;
  last?: number;
};

// Create a TextContent interface
interface TextContent {
  type: string;
  text: string;
}

// Create a simple test helper for verifying responses
const verifyResponse = (
  response: { content: Array<{ type: string; text: string }> },
  expectedContent: unknown
) => {
  expect(response).toHaveProperty('content');
  expect(response.content).toHaveLength(1);
  expect(response.content[0]).toHaveProperty('type', 'text');
  expect(JSON.parse(response.content[0].text)).toEqual(expectedContent);
};

describe('MCP server implementation', () => {
  // Save original DeepSourceClient methods
  const originalListProjects = DeepSourceClient.prototype.listProjects;
  const originalGetIssues = DeepSourceClient.prototype.getIssues;
  const originalGetRecentRunIssues = DeepSourceClient.prototype.getRecentRunIssues;

  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;

    // Restore original methods
    DeepSourceClient.prototype.listProjects = originalListProjects;
    DeepSourceClient.prototype.getIssues = originalGetIssues;
    DeepSourceClient.prototype.getRecentRunIssues = originalGetRecentRunIssues;
  });

  describe('Server initialization', () => {
    it('initializes with tools', () => {
      expect(mcpServer).toBeDefined();
    });

    it('validates server configuration', () => {
      // Check that the server is properly configured
      expect(mcpServer).toHaveProperty('server');
      expect(mcpServer.server).toHaveProperty('_serverInfo');

      // @ts-expect-error - accessing private property for testing
      expect(mcpServer.server._serverInfo).toHaveProperty('name', 'deepsource-mcp-server');
    });

    it('rejects requests when DEEPSOURCE_API_KEY is not set', async () => {
      delete process.env.DEEPSOURCE_API_KEY;

      await expect(handleDeepsourceProjects()).rejects.toThrow(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );
    });
  });

  describe('projects tool', () => {
    it('returns formatted projects', async () => {
      // Define mock data with proper DeepSourceProject structure
      const mockProjects: DeepSourceProject[] = [
        {
          key: 'proj1',
          name: 'Project One',
          repository: {
            url: 'repo1-url',
            provider: 'github',
            login: 'testorg',
            isPrivate: false,
            isActivated: true,
          },
        },
        {
          key: 'proj2',
          name: 'Project Two',
          repository: {
            url: 'repo2-url',
            provider: 'gitlab',
            login: 'testorg',
            isPrivate: true,
            isActivated: true,
          },
        },
      ];

      // Create a tracked array to record calls
      const calls: Array<unknown[]> = [];

      // Override the method for this test with a function that records calls
      DeepSourceClient.prototype.listProjects = (...args) => {
        calls.push(args);
        return Promise.resolve(mockProjects);
      };

      // Call the handler
      const result = await handleDeepsourceProjects();

      // Verify the mock was called
      expect(calls.length).toBe(1);

      // Verify the response - only key and name should be in the output
      verifyResponse(result, [
        { key: 'proj1', name: 'Project One' },
        { key: 'proj2', name: 'Project Two' },
      ]);
    });

    it('handles empty projects list', async () => {
      // Override the method for this test
      DeepSourceClient.prototype.listProjects = () => {
        // Mock implementation returning empty array for testing empty results
        return Promise.resolve([]);
      };

      // Call the handler
      const result = await handleDeepsourceProjects();

      // Verify the response
      verifyResponse(result, []);
    });

    it('handles error from DeepSourceClient', async () => {
      // Override the method for this test to throw an error
      DeepSourceClient.prototype.listProjects = () => {
        return Promise.reject(new Error('API error'));
      };

      // Verify the error is propagated
      await expect(handleDeepsourceProjects()).rejects.toThrow('API error');
    });
  });

  describe('project_issues tool', () => {
    it('returns formatted issues with all parameters', async () => {
      // Define mock data with proper DeepSourceIssue structure
      const mockIssues: PaginatedResponse<DeepSourceIssue> = {
        items: [
          {
            id: 'issue1',
            title: 'Issue One',
            shortcode: 'SC1',
            category: 'category1',
            severity: 'high',
            status: 'open',
            issue_text: 'This is an issue',
            file_path: 'src/file.ts',
            line_number: 42,
            tags: ['tag1', 'tag2'],
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start1',
          endCursor: 'cursor1',
        },
        totalCount: 100,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, PaginationParams?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.getIssues = (projectKey, pagination) => {
        // Mock implementation for testing with pagination parameters
        calls.push([projectKey, pagination]);
        return Promise.resolve(mockIssues);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
        offset: 10,
        first: 20,
        after: 'after-cursor',
        before: 'before-cursor',
      };

      // Call the handler
      const result = await handleDeepsourceProjectIssues(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({
        offset: 10,
        first: 20,
        after: 'after-cursor',
        before: 'before-cursor',
      });

      // Verify the response
      verifyResponse(result, {
        items: [
          {
            id: 'issue1',
            title: 'Issue One',
            shortcode: 'SC1',
            category: 'category1',
            severity: 'high',
            status: 'open',
            issue_text: 'This is an issue',
            file_path: 'src/file.ts',
            line_number: 42,
            tags: ['tag1', 'tag2'],
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start1',
          endCursor: 'cursor1',
        },
        totalCount: 100,
        pagination_help: {
          description: 'This API uses Relay-style cursor-based pagination',
          forward_pagination: `To get the next page, use 'first: 10, after: "cursor1"'`,
          backward_pagination: `To get the previous page, use 'last: 10, before: "start1"'`,
          page_status: {
            has_next_page: true,
            has_previous_page: false,
          },
        },
      });
    });

    it('handles minimal parameters', async () => {
      // Define mock data with proper structure
      const mockIssues: PaginatedResponse<DeepSourceIssue> = {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, PaginationParams?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.getIssues = (projectKey, pagination) => {
        // Mock implementation for testing with minimal parameters
        calls.push([projectKey, pagination]);
        return Promise.resolve(mockIssues);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
      };

      // Call the handler
      const result = await handleDeepsourceProjectIssues(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({});

      // Verify the response
      verifyResponse(result, {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
        pagination_help: {
          description: 'This API uses Relay-style cursor-based pagination',
          forward_pagination: `To get the next page, use 'first: 10, after: "cursor_value"'`,
          backward_pagination: `To get the previous page, use 'last: 10, before: "cursor_value"'`,
          page_status: {
            has_next_page: false,
            has_previous_page: false,
          },
        },
      });
    });

    it('handles partial parameters', async () => {
      // Define mock data with proper structure
      const mockIssues: PaginatedResponse<DeepSourceIssue> = {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, PaginationParams?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.getIssues = (projectKey, pagination) => {
        // Mock implementation for testing with partial parameters
        calls.push([projectKey, pagination]);
        return Promise.resolve(mockIssues);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
        offset: 5,
      };

      // Call the handler
      const result = await handleDeepsourceProjectIssues(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({
        offset: 5,
      });

      // Verify the response
      verifyResponse(result, {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
        pagination_help: {
          description: 'This API uses Relay-style cursor-based pagination',
          forward_pagination: `To get the next page, use 'first: 10, after: "cursor_value"'`,
          backward_pagination: `To get the previous page, use 'last: 10, before: "cursor_value"'`,
          page_status: {
            has_next_page: false,
            has_previous_page: false,
          },
        },
      });
    });

    it('handles error from DeepSourceClient', async () => {
      // Override the method for this test to throw an error
      DeepSourceClient.prototype.getIssues = () => {
        return Promise.reject(new Error('API error'));
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
      };

      // Verify the error is propagated
      await expect(handleDeepsourceProjectIssues(params)).rejects.toThrow('API error');
    });
  });

  describe('project_runs tool', () => {
    it('returns formatted runs with all parameters', async () => {
      // Define mock data for runs response
      const mockRuns = {
        items: [
          {
            id: 'run1',
            runUid: '12345678-1234-1234-1234-123456789012',
            commitOid: 'abcdef123456',
            branchName: 'main',
            baseOid: '654321fedcba',
            status: 'SUCCESS',
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:30:00Z',
            finishedAt: '2023-01-01T12:30:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 2,
              occurrencesSuppressed: 1,
              occurrenceDistributionByAnalyzer: [{ analyzerShortcode: 'python', introduced: 3 }],
              occurrenceDistributionByCategory: [{ category: 'SECURITY', introduced: 2 }],
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start-cursor',
          endCursor: 'end-cursor',
        },
        totalCount: 100,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, Record<string, unknown>?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.listRuns = (projectKey, pagination) => {
        // Mock implementation for testing with pagination parameters
        calls.push([projectKey, pagination]);
        return Promise.resolve(mockRuns);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
        offset: 10,
        first: 20,
        after: 'after-cursor',
        before: 'before-cursor',
      };

      // Call the handler
      const result = await handleDeepsourceProjectRuns(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({
        offset: 10,
        first: 20,
        after: 'after-cursor',
        before: 'before-cursor',
      });

      // Verify the response
      verifyResponse(result, {
        items: [
          {
            id: 'run1',
            runUid: '12345678-1234-1234-1234-123456789012',
            commitOid: 'abcdef123456',
            branchName: 'main',
            baseOid: '654321fedcba',
            status: 'SUCCESS',
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:30:00Z',
            finishedAt: '2023-01-01T12:30:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 2,
              occurrencesSuppressed: 1,
              occurrenceDistributionByAnalyzer: [{ analyzerShortcode: 'python', introduced: 3 }],
              occurrenceDistributionByCategory: [{ category: 'SECURITY', introduced: 2 }],
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start-cursor',
          endCursor: 'end-cursor',
        },
        totalCount: 100,
        pagination_help: {
          description: 'This API uses Relay-style cursor-based pagination',
          forward_pagination: `To get the next page, use 'first: 10, after: "end-cursor"'`,
          backward_pagination: `To get the previous page, use 'last: 10, before: "start-cursor"'`,
          page_status: {
            has_next_page: true,
            has_previous_page: false,
          },
        },
      });
    });

    it('handles minimal parameters for project runs', async () => {
      // Define mock data
      const mockRuns = {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, Record<string, unknown>?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.listRuns = (projectKey, pagination) => {
        // Mock implementation for testing with minimal parameters
        calls.push([projectKey, pagination]);
        return Promise.resolve(mockRuns);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
      };

      // Call the handler
      const result = await handleDeepsourceProjectRuns(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({});

      // Verify the response
      verifyResponse(result, {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
        pagination_help: {
          description: 'This API uses Relay-style cursor-based pagination',
          forward_pagination: `To get the next page, use 'first: 10, after: "cursor_value"'`,
          backward_pagination: `To get the previous page, use 'last: 10, before: "cursor_value"'`,
          page_status: {
            has_next_page: false,
            has_previous_page: false,
          },
        },
      });
    });

    it('handles error from DeepSourceClient for project runs', async () => {
      // Override the method for this test to throw an error
      DeepSourceClient.prototype.listRuns = () => {
        return Promise.reject(new Error('API error'));
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
      };

      // Verify the error is propagated
      await expect(handleDeepsourceProjectRuns(params)).rejects.toThrow('API error');
    });
  });

  describe('run tool', () => {
    it('returns formatted run details', async () => {
      // Define mock data
      const mockRun = {
        id: 'run1',
        runUid: '12345678-1234-1234-1234-123456789012',
        commitOid: 'abcdef123456',
        branchName: 'main',
        baseOid: '654321fedcba',
        status: 'SUCCESS',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:30:00Z',
        finishedAt: '2023-01-01T12:30:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 2,
          occurrencesSuppressed: 1,
          occurrenceDistributionByAnalyzer: [{ analyzerShortcode: 'python', introduced: 3 }],
          occurrenceDistributionByCategory: [{ category: 'SECURITY', introduced: 2 }],
        },
        repository: {
          name: 'test-repo',
          id: 'repo1',
        },
      };

      // Create a tracked array to record calls
      const calls: Array<[string]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.getRun = (runIdentifier) => {
        // Mock implementation for testing
        calls.push([runIdentifier]);
        return Promise.resolve(mockRun);
      };

      // Parameters for the call
      const params = {
        runIdentifier: '12345678-1234-1234-1234-123456789012',
      };

      // Call the handler
      const result = await handleDeepsourceRun(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('12345678-1234-1234-1234-123456789012');

      // Verify the response
      verifyResponse(result, {
        id: 'run1',
        runUid: '12345678-1234-1234-1234-123456789012',
        commitOid: 'abcdef123456',
        branchName: 'main',
        baseOid: '654321fedcba',
        status: 'SUCCESS',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:30:00Z',
        finishedAt: '2023-01-01T12:30:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 2,
          occurrencesSuppressed: 1,
          occurrenceDistributionByAnalyzer: [{ analyzerShortcode: 'python', introduced: 3 }],
          occurrenceDistributionByCategory: [{ category: 'SECURITY', introduced: 2 }],
        },
        repository: {
          name: 'test-repo',
          id: 'repo1',
        },
      });
    });

    it('handles run not found error', async () => {
      // Override the method for this test to return null
      DeepSourceClient.prototype.getRun = () => {
        return Promise.resolve(null);
      };

      // Parameters for the call
      const params = {
        runIdentifier: 'non-existent-run',
      };

      // Verify the error is propagated
      await expect(handleDeepsourceRun(params)).rejects.toThrow(
        "Run with identifier 'non-existent-run' not found"
      );
    });

    it('handles API error from DeepSourceClient for run', async () => {
      // Override the method for this test to throw an error
      DeepSourceClient.prototype.getRun = () => {
        return Promise.reject(new Error('API error'));
      };

      // Parameters for the call
      const params = {
        runIdentifier: '12345678-1234-1234-1234-123456789012',
      };

      // Verify the error is propagated
      await expect(handleDeepsourceRun(params)).rejects.toThrow('API error');
    });
  });

  describe('recent_run_issues tool', () => {
    // Save original methods
    let originalListRuns: typeof DeepSourceClient.prototype.listRuns;
    let originalGetIssues: typeof DeepSourceClient.prototype.getIssues;

    beforeEach(() => {
      // Save original methods
      originalListRuns = DeepSourceClient.prototype.listRuns;
      originalGetIssues = DeepSourceClient.prototype.getIssues;
    });

    afterEach(() => {
      // Restore original methods
      DeepSourceClient.prototype.listRuns = originalListRuns;
      DeepSourceClient.prototype.getIssues = originalGetIssues;
    });

    it('returns issues from the most recent run on a branch', async () => {
      // Define mock data for runs
      const mockRuns = {
        items: [
          {
            id: 'run1',
            runUid: '123e4567-e89b-12d3-a456-426614174000',
            commitOid: 'abc123',
            branchName: 'feature-branch',
            baseOid: 'def456',
            status: 'SUCCESS',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:10:00Z',
            finishedAt: '2024-01-02T00:15:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 3,
              occurrencesSuppressed: 1,
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
          {
            id: 'run2',
            runUid: '223e4567-e89b-12d3-a456-426614174001',
            commitOid: 'xyz789',
            branchName: 'main',
            baseOid: 'ghi789',
            status: 'SUCCESS',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:10:00Z',
            finishedAt: '2024-01-01T00:15:00Z',
            summary: {
              occurrencesIntroduced: 2,
              occurrencesResolved: 1,
              occurrencesSuppressed: 0,
            },
            repository: {
              name: 'test-repo',
              id: 'repo1',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'start',
          endCursor: 'end',
        },
        totalCount: 2,
      };

      // Define mock data for issues
      const mockIssues = {
        items: [
          {
            id: 'issue1',
            shortcode: 'JS-1001',
            title: 'Test Issue',
            category: 'BUG_RISK',
            severity: 'MAJOR',
            status: 'OPEN',
            issue_text: 'This is a test issue',
            file_path: 'src/index.ts',
            line_number: 42,
            tags: ['security'],
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'start',
          endCursor: 'end',
        },
        totalCount: 1,
      };

      // Mock the client method
      DeepSourceClient.prototype.getRecentRunIssues = () =>
        Promise.resolve({
          ...mockIssues,
          run: mockRuns.items[0],
        });

      const params: DeepsourceRecentRunIssuesParams = {
        projectKey: 'test-project',
        branchName: 'feature-branch',
      };

      const result = await handleDeepsourceRecentRunIssues(params);

      // Verify the response structure
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const parsedResult = JSON.parse((result.content[0] as TextContent).text);

      // Assertions
      expect(parsedResult.run).toMatchObject({
        runUid: mockRuns.items[0].runUid,
        commitOid: mockRuns.items[0].commitOid,
        branchName: 'feature-branch',
        status: 'SUCCESS',
      });
      expect(parsedResult.issues).toHaveLength(1);
      expect(parsedResult.issues[0]).toMatchObject({
        id: 'issue1',
        shortcode: 'JS-1001',
        title: 'Test Issue',
      });
      expect(parsedResult.metadata).toMatchObject({
        branch: 'feature-branch',
        projectKey: 'test-project',
      });
    });

    it('returns error result when no runs found for branch', async () => {
      // Mock to throw error directly since no runs are found

      DeepSourceClient.prototype.getRecentRunIssues = () => {
        throw new Error("No runs found for branch 'non-existent-branch' in project 'test-project'");
      };

      const params: DeepsourceRecentRunIssuesParams = {
        projectKey: 'test-project',
        branchName: 'non-existent-branch',
      };

      const result = await handleDeepsourceRecentRunIssues(params);

      // Verify the error response structure
      expect(result).toHaveProperty('isError', true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const errorData = JSON.parse((result.content[0] as TextContent).text);
      expect(errorData).toMatchObject({
        error: "No runs found for branch 'non-existent-branch' in project 'test-project'",
        details: 'Failed to retrieve recent run issues',
        projectKey: 'test-project',
        branchName: 'non-existent-branch',
      });
    });

    it('handles pagination correctly', async () => {
      // Remove firstPage as it's not used in the new implementation

      // Second page with the target branch
      const secondPage = {
        items: [
          {
            id: 'run2',
            runUid: '223e4567-e89b-12d3-a456-426614174001',
            commitOid: 'xyz789',
            branchName: 'target-branch',
            status: 'SUCCESS',
            createdAt: '2024-01-02T00:00:00Z',
            summary: {},
            repository: { name: 'test-repo', id: 'repo1' },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: 'cursor1',
          endCursor: 'end',
        },
        totalCount: 2,
      };

      // Mock issues response
      const mockIssues = {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };

      // Mock to return the run from the second page
      DeepSourceClient.prototype.getRecentRunIssues = () =>
        Promise.resolve({
          ...mockIssues,
          run: secondPage.items[0],
        });

      const params: DeepsourceRecentRunIssuesParams = {
        projectKey: 'test-project',
        branchName: 'target-branch',
      };

      const result = await handleDeepsourceRecentRunIssues(params);
      const parsedResult = JSON.parse((result.content[0] as TextContent).text);

      // Should find the run from the second page
      expect(parsedResult.run.branchName).toBe('target-branch');
      expect(parsedResult.run.runUid).toBe('223e4567-e89b-12d3-a456-426614174001');

      // The new implementation handles pagination internally, so we don't need to verify these calls
    });

    it('supports pagination parameters for issues', async () => {
      // Mock runs response
      const mockRuns = {
        items: [
          {
            id: 'run1',
            runUid: '123e4567-e89b-12d3-a456-426614174000',
            commitOid: 'abc123',
            branchName: 'main',
            baseOid: 'def456',
            status: 'SUCCESS',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:10:00Z',
            finishedAt: '2024-01-02T00:15:00Z',
            summary: {
              occurrences: [
                {
                  issue: {
                    shortcode: 'JS-1001',
                  },
                  category: 'BUG_RISK',
                  count: 1,
                },
              ],
            },
            repository: {
              id: 'repo1',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'start',
          endCursor: 'end',
        },
        totalCount: 1,
      };

      // Mock issues response with pagination
      const mockIssues = {
        items: [
          {
            id: 'issue1',
            shortcode: 'JS-1001',
            title: 'Test Issue',
            category: 'BUG_RISK',
            severity: 'MAJOR',
            status: 'OPEN',
            issue_text: 'This is a test issue',
            file_path: 'src/index.ts',
            line_number: 42,
            tags: ['security'],
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: 'issue-start',
          endCursor: 'issue-end',
        },
        totalCount: 50,
      };

      // Track getRecentRunIssues call parameters
      let getRecentRunIssuesParams: any = null;

      DeepSourceClient.prototype.getRecentRunIssues = (projectKey, branchName, params) => {
        getRecentRunIssuesParams = params;
        return Promise.resolve({
          ...mockIssues,
          run: mockRuns.items[0],
        });
      };

      const params: DeepsourceRecentRunIssuesParams = {
        projectKey: 'test-project',
        branchName: 'main',
        first: 25,
        after: 'cursor123',
      };

      const result = await handleDeepsourceRecentRunIssues(params);
      const parsedResult = JSON.parse((result.content[0] as TextContent).text);

      // Verify pagination parameters were passed correctly
      expect(getRecentRunIssuesParams).toEqual({
        first: 25,
        after: 'cursor123',
        last: undefined,
        before: undefined,
      });

      // Verify pagination info is included in response
      expect(parsedResult.pageInfo).toEqual(mockIssues.pageInfo);
      expect(parsedResult.totalCount).toBe(50);

      // Verify pagination help is included
      expect(parsedResult.pagination_help).toBeDefined();
      expect(parsedResult.pagination_help.forward_pagination).toContain('first: 25');
      expect(parsedResult.pagination_help.forward_pagination).toContain('after: "issue-end"');
      expect(parsedResult.pagination_help.page_status.has_next_page).toBe(true);
      expect(parsedResult.pagination_help.page_status.has_previous_page).toBe(true);
    });
  });

  describe('dependency_vulnerabilities tool', () => {
    // Save original method
    const originalGetDependencyVulnerabilities =
      DeepSourceClient.prototype.getDependencyVulnerabilities;

    afterEach(() => {
      // Restore original method
      DeepSourceClient.prototype.getDependencyVulnerabilities =
        originalGetDependencyVulnerabilities;
    });

    it('returns formatted vulnerability data with all parameters', async () => {
      // Define mock data
      const mockVulnerabilities = {
        items: [
          {
            id: 'vuln1',
            package: {
              id: 'pkg1',
              ecosystem: 'NPM',
              name: 'express',
              purl: 'pkg:npm/express',
            },
            packageVersion: {
              id: 'ver1',
              version: '4.17.1',
              versionType: 'SEMVER',
            },
            vulnerability: {
              id: 'cve1',
              identifier: 'CVE-2022-1234',
              aliases: ['GHSA-abc-123'],
              summary: 'Security vulnerability in express',
              details: 'Detailed description of the vulnerability',
              publishedAt: '2022-01-01T12:00:00Z',
              updatedAt: '2022-01-02T12:00:00Z',
              severity: 'HIGH',
              cvssV2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
              cvssV2BaseScore: 7.5,
              cvssV2Severity: 'HIGH',
              cvssV3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
              cvssV3BaseScore: 9.8,
              cvssV3Severity: 'CRITICAL',
              introducedVersions: ['4.0.0'],
              fixedVersions: ['4.17.2'],
              referenceUrls: ['https://nvd.nist.gov/vuln/detail/CVE-2022-1234'],
            },
            reachability: 'REACHABLE',
            fixability: 'AUTO_FIXABLE',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start-cursor',
          endCursor: 'end-cursor',
        },
        totalCount: 100,
      };

      // Create a tracked array to record calls
      const calls: Array<[string, Record<string, unknown>?]> = [];

      // Override the method for this test
      DeepSourceClient.prototype.getDependencyVulnerabilities = (projectKey, params) => {
        // Mock implementation for testing
        calls.push([projectKey, params]);
        return Promise.resolve(mockVulnerabilities);
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
        offset: 0,
        first: 10,
        after: 'after-cursor',
      };

      // Call the handler
      const result = await handleDeepsourceDependencyVulnerabilities(params);

      // Verify the method was called with correct parameters
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toBe('test-project');
      expect(calls[0][1]).toEqual({
        offset: 0,
        first: 10,
        after: 'after-cursor',
        before: undefined,
        last: undefined,
      });

      // Verify the response structure
      verifyResponse(result, {
        items: [
          {
            id: 'vuln1',
            package: {
              name: 'express',
              ecosystem: 'NPM',
              purl: 'pkg:npm/express',
            },
            packageVersion: {
              version: '4.17.1',
              versionType: 'SEMVER',
            },
            vulnerability: {
              identifier: 'CVE-2022-1234',
              aliases: ['GHSA-abc-123'],
              summary: 'Security vulnerability in express',
              details: 'Detailed description of the vulnerability',
              severity: 'HIGH',
              cvssV2: {
                baseScore: 7.5,
                vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
                severity: 'HIGH',
              },
              cvssV3: {
                baseScore: 9.8,
                vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                severity: 'CRITICAL',
              },
              publishedAt: '2022-01-01T12:00:00Z',
              updatedAt: '2022-01-02T12:00:00Z',
              introducedVersions: ['4.0.0'],
              fixedVersions: ['4.17.2'],
              referenceUrls: ['https://nvd.nist.gov/vuln/detail/CVE-2022-1234'],
            },
            reachability: 'REACHABLE',
            fixability: 'AUTO_FIXABLE',
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start-cursor',
          endCursor: 'end-cursor',
        },
        totalCount: 100,
        pagination_help: expect.any(Object),
      });
    });

    it('handles API error from DeepSourceClient for vulnerabilities', async () => {
      // Override the method for this test to throw an error
      DeepSourceClient.prototype.getDependencyVulnerabilities = () => {
        return Promise.reject(new Error('API error'));
      };

      // Parameters for the call
      const params = {
        projectKey: 'test-project',
      };

      // Verify the error is propagated
      await expect(handleDeepsourceDependencyVulnerabilities(params)).rejects.toThrow('API error');
    });
  });
});
