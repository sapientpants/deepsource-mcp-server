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

  describe('deepsource_project_runs tool', () => {
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

  describe('deepsource_run tool', () => {
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

  describe('deepsource_dependency_vulnerabilities tool', () => {
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
