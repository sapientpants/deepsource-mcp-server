/**
 * @fileoverview Tests for issues client
 * This file adds coverage for the previously untested issues-client.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssuesClient } from '../../client/issues-client.js';
import type { IssuesClientTestable, MockDeepSourceClient } from '../test-types.js';
import { TestableIssuesClient } from '../utils/test-utils.js';

describe('IssuesClient', () => {
  let issuesClient: IssuesClient;
  let mockBaseClient: MockDeepSourceClient;

  beforeEach(() => {
    issuesClient = new IssuesClient('test-api-key');
    mockBaseClient = issuesClient as unknown as MockDeepSourceClient;

    // Mock the methods we need
    mockBaseClient.findProjectByKey = vi.fn();
    mockBaseClient.executeGraphQL = vi.fn();
    mockBaseClient.createEmptyPaginatedResponse = vi.fn();
    mockBaseClient.normalizePaginationParams = vi.fn();
    mockBaseClient.logger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };
  });

  describe('getIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            issues: {
              edges: [
                {
                  node: {
                    id: 'issue-1',
                    title: 'Test Issue',
                    shortcode: 'JS-0001',
                    category: 'BUG_RISK',
                    severity: 'HIGH',
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ-1',
                            status: 'ACTIVE',
                            issueText: 'Test issue description',
                            filePath: '/src/test.js',
                            beginLine: 10,
                            tags: ['security'],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          },
        },
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({
        first: 20,
        after: null,
      });
      mockBaseClient.executeGraphQL.mockResolvedValue(mockResponse);

      const result = await issuesClient.getIssues('test-project');

      expect(mockBaseClient.findProjectByKey).toHaveBeenCalledWith('test-project');
      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getRepositoryIssues'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('occ-1'); // Uses occurrence ID as issue ID
      expect(result.items[0]?.shortcode).toBe('JS-0001');
      expect(result.items[0]?.category).toBe('BUG_RISK');
    });

    it('should return empty response when project not found', async () => {
      mockBaseClient.findProjectByKey.mockResolvedValue(null);
      mockBaseClient.createEmptyPaginatedResponse.mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });

      const result = await issuesClient.getIssues('nonexistent-project');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle GraphQL errors', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL.mockRejectedValue(new Error('GraphQL error'));

      await expect(issuesClient.getIssues('test-project')).rejects.toThrow('GraphQL error');
    });

    it('should handle missing data in response', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: null,
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL.mockResolvedValue(mockResponse);

      await expect(issuesClient.getIssues('test-project')).rejects.toThrow(
        'No data received from GraphQL API'
      );
    });

    it('should handle filter parameters', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            issues: {
              edges: [],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          },
        },
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });
      mockBaseClient.executeGraphQL.mockResolvedValue(mockResponse);

      await issuesClient.getIssues('test-project', {
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });

      // The normalizePaginationParams is now a static method and its behavior
      // is tested separately in base-client tests
    });

    it('should handle null issuesData in response', async () => {
      const mockProject = {
        key: 'test-project',
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      // Mock response with no issues data
      const mockResponse = {
        data: {
          repository: null, // This will cause issuesData to be undefined
        },
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({ first: 10 });
      mockBaseClient.executeGraphQL.mockResolvedValue(mockResponse);

      const result = await issuesClient.getIssues('test-project', { first: 10 });

      // Should return empty response when repository is null
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should handle missing pageInfo in issuesData', async () => {
      const mockProject = {
        key: 'test-project',
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      // Mock response with issues but no pageInfo
      const mockResponse = {
        data: {
          repository: {
            issues: {
              edges: [
                {
                  node: {
                    id: 'issue-1',
                    title: 'Test Issue',
                    category: 'BUG',
                    shortcode: 'TEST-001',
                    severity: 'HIGH',
                    occurrences: {
                      edges: [
                        {
                          node: {
                            id: 'occ-1',
                            status: 'ACTIVE',
                            issueText: 'Test issue',
                            filePath: '/test.js',
                            beginLine: 10,
                            tags: [],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              totalCount: 1,
              // pageInfo is missing - this will trigger the fallback
            },
          },
        },
      };

      mockBaseClient.findProjectByKey.mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams.mockReturnValue({ first: 10 });
      mockBaseClient.executeGraphQL.mockResolvedValue(mockResponse);

      const result = await issuesClient.getIssues('test-project', { first: 10 });

      // Should use default pageInfo when missing
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('buildIssuesQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableIssuesClient.testBuildIssuesQuery();

      expect(query).toContain('query getRepositoryIssues');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('issues(');
      expect(query).toContain('occurrences(');
    });
  });

  describe('extractIssuesFromResponse', () => {
    it('should extract issues from GraphQL response', () => {
      const mockResponseData = {
        repository: {
          issues: {
            edges: [
              {
                node: {
                  id: 'issue-1',
                  title: 'Test Issue',
                  shortcode: 'JS-0001',
                  category: 'BUG_RISK',
                  severity: 'HIGH',
                  occurrences: {
                    edges: [
                      {
                        node: {
                          id: 'occ-1',
                          status: 'ACTIVE',
                          issueText: 'Test issue description',
                          filePath: '/src/test.js',
                          beginLine: 10,
                          tags: ['security'],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(1);
      expect(issues[0]?.id).toBe('occ-1'); // Uses occurrence ID as issue ID
      expect(issues[0]?.shortcode).toBe('JS-0001');
      expect(issues[0]?.category).toBe('BUG_RISK');
    });

    it('should handle missing issues in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(0);
    });

    it('should handle missing occurrences in response', () => {
      const mockResponseData = {
        repository: {
          issues: {
            edges: [
              {
                node: {
                  id: 'issue-1',
                  title: 'Test Issue',
                  shortcode: 'JS-0001',
                  category: 'BUG_RISK',
                  severity: 'HIGH',
                  occurrences: {
                    edges: [],
                  },
                },
              },
            ],
          },
        },
      };

      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(0); // No occurrences means no issues
    });

    it('should handle null occurrences edges in response', () => {
      const mockResponseData = {
        repository: {
          issues: {
            edges: [
              {
                node: {
                  id: 'issue-1',
                  title: 'Test Issue',
                  shortcode: 'JS-0001',
                  category: 'BUG_RISK',
                  severity: 'HIGH',
                  occurrences: {
                    edges: null,
                  },
                },
              },
            ],
          },
        },
      };

      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(0); // Null edges means no issues
    });

    it('should handle missing occurrences property entirely', () => {
      const mockResponseData = {
        repository: {
          issues: {
            edges: [
              {
                node: {
                  id: 'issue-1',
                  title: 'Test Issue',
                  shortcode: 'JS-0001',
                  category: 'BUG_RISK',
                  severity: 'HIGH',
                  // occurrences is missing entirely
                },
              },
            ],
          },
        },
      };

      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(0); // Missing occurrences means no issues
    });

    it('should handle error thrown during extraction', () => {
      const mockResponseData = {
        repository: {
          issues: {
            edges: 'invalid', // This will cause an error when trying to iterate
          },
        },
      };

      // Should not throw, but handle the error gracefully
      const issues = (issuesClient as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      ) as unknown[];

      expect(issues).toHaveLength(0); // Error results in empty array
    });
  });

  describe('getIssue', () => {
    it('should fetch a specific issue by calling getIssues', async () => {
      const mockIssues = {
        items: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            shortcode: 'JS-0001',
            category: 'BUG_RISK',
            severity: 'HIGH',
            status: 'ACTIVE',
            issue_text: 'Issue description',
            file_path: '/src/test.js',
            line_number: 10,
            tags: ['security'],
          },
          {
            id: 'issue-2',
            title: 'Test Issue 2',
            shortcode: 'JS-0002',
            category: 'SECURITY',
            severity: 'CRITICAL',
            status: 'ACTIVE',
            issue_text: 'Another issue',
            file_path: '/src/test2.js',
            line_number: 20,
            tags: ['performance'],
          },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 2,
      };

      // Mock getIssues to return our test issues
      vi.spyOn(issuesClient, 'getIssues').mockResolvedValue(mockIssues);

      const result = await issuesClient.getIssue('test-project', 'issue-2');

      expect(result).toBeDefined();
      expect(result?.id).toBe('issue-2');
      expect(result?.shortcode).toBe('JS-0002');
      expect(result?.category).toBe('SECURITY');
    });

    it('should return null when issue not found', async () => {
      const mockIssues = {
        items: [
          {
            id: 'issue-1',
            title: 'Test Issue 1',
            shortcode: 'JS-0001',
            category: 'BUG_RISK',
            severity: 'HIGH',
            status: 'ACTIVE',
            issue_text: 'Issue description',
            file_path: '/src/test.js',
            line_number: 10,
            tags: ['security'],
          },
        ],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 1,
      };

      vi.spyOn(issuesClient, 'getIssues').mockResolvedValue(mockIssues);

      const result = await issuesClient.getIssue('test-project', 'non-existent-issue');

      expect(result).toBeNull();
    });

    it('should handle errors from getIssues', async () => {
      vi.spyOn(issuesClient, 'getIssues').mockRejectedValue(new Error('Failed to fetch issues'));

      await expect(issuesClient.getIssue('test-project', 'issue-1')).rejects.toThrow(
        'Failed to fetch issues'
      );
    });
  });

  describe('handleIssuesError', () => {
    it('should return empty response for NoneType errors', () => {
      const error = new Error('NoneType error');

      const result = (issuesClient as IssuesClientTestable).handleIssuesError(error);

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should re-throw non-NoneType errors', () => {
      const error = new Error('Other error');

      expect(() => {
        (issuesClient as IssuesClientTestable).handleIssuesError(error);
      }).toThrow('Other error');
    });
  });
});
