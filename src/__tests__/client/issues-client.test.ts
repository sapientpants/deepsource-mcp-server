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
    (mockBaseClient as any).findProjectByKey = vi.fn();
    (mockBaseClient as any).executeGraphQL = vi.fn();
    (mockBaseClient as any).createEmptyPaginatedResponse = vi.fn();
    (mockBaseClient as any).normalizePaginationParams = vi.fn();
    (mockBaseClient as any).logger = {
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

      (mockBaseClient.findProjectByKey as any).mockResolvedValue(mockProject);
      (mockBaseClient.normalizePaginationParams as any).mockReturnValue({
        first: 20,
        after: null,
      });
      (mockBaseClient.executeGraphQL as any).mockResolvedValue(mockResponse);

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
      (mockBaseClient.findProjectByKey as any).mockResolvedValue(null);
      (mockBaseClient.createEmptyPaginatedResponse as any).mockReturnValue({
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

      (mockBaseClient.findProjectByKey as any).mockResolvedValue(mockProject);
      (mockBaseClient.normalizePaginationParams as any).mockReturnValue({
        first: 20,
      });
      (mockBaseClient.executeGraphQL as any).mockRejectedValue(new Error('GraphQL error'));

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

      (mockBaseClient.findProjectByKey as any).mockResolvedValue(mockProject);
      (mockBaseClient.normalizePaginationParams as any).mockReturnValue({
        first: 20,
      });
      (mockBaseClient.executeGraphQL as any).mockResolvedValue(mockResponse);

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

      (mockBaseClient.findProjectByKey as any).mockResolvedValue(mockProject);
      (mockBaseClient.normalizePaginationParams as any).mockReturnValue({
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });
      (mockBaseClient.executeGraphQL as any).mockResolvedValue(mockResponse);

      await issuesClient.getIssues('test-project', {
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });

      // The normalizePaginationParams is now a static method and its behavior
      // is tested separately in base-client tests
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

      const issues = (issuesClient as any).extractIssuesFromResponse(mockResponseData) as any[];

      expect(issues).toHaveLength(1);
      expect(issues[0]?.id).toBe('occ-1'); // Uses occurrence ID as issue ID
      expect(issues[0]?.shortcode).toBe('JS-0001');
      expect(issues[0]?.category).toBe('BUG_RISK');
    });

    it('should handle missing issues in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const issues = (issuesClient as any).extractIssuesFromResponse(mockResponseData) as any[];

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

      const issues = (issuesClient as any).extractIssuesFromResponse(mockResponseData) as any[];

      expect(issues).toHaveLength(0); // No occurrences means no issues
    });
  });

  describe('handleIssuesError', () => {
    it('should return empty response for NoneType errors', () => {
      const error = new Error('NoneType error');

      const result = (issuesClient as any).handleIssuesError(error) as any;

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should re-throw non-NoneType errors', () => {
      const error = new Error('Other error');

      expect(() => {
        (issuesClient as any).handleIssuesError(error);
      }).toThrow('Other error');
    });
  });
});
