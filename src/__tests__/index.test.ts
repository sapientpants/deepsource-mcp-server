/**
 * @jest-environment node
 */

import { mcpServer, handleDeepsourceProjects, handleDeepsourceProjectIssues } from '../index.js';
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
};

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

  describe('deepsource_projects tool', () => {
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
      DeepSourceClient.prototype.listProjects = function (...args) {
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
      DeepSourceClient.prototype.listProjects = function () {
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
      DeepSourceClient.prototype.listProjects = function () {
        return Promise.reject(new Error('API error'));
      };

      // Verify the error is propagated
      await expect(handleDeepsourceProjects()).rejects.toThrow('API error');
    });
  });

  describe('deepsource_project_issues tool', () => {
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
      DeepSourceClient.prototype.getIssues = function (projectKey, pagination) {
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
      DeepSourceClient.prototype.getIssues = function (projectKey, pagination) {
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
      DeepSourceClient.prototype.getIssues = function (projectKey, pagination) {
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
      DeepSourceClient.prototype.getIssues = function () {
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
});
