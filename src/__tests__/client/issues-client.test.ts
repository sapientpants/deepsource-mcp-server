/**
 * @fileoverview Tests for issues client
 * This file adds coverage for the previously untested issues-client.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IssuesClient } from '../../client/issues-client.js';
import type { IssuesClientTestable, MockDeepSourceClient } from '../test-types.js';

// Mock the base client
jest.mock('../../client/base-client.js', () => ({
  BaseDeepSourceClient: jest.fn().mockImplementation(() => ({
    findProjectByKey: jest.fn(),
    executeGraphQL: jest.fn(),
    createEmptyPaginatedResponse: jest.fn(),
    normalizePaginationParams: jest.fn(),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  })),
}));

describe('IssuesClient', () => {
  let issuesClient: IssuesClient;
  let mockBaseClient: MockDeepSourceClient;

  beforeEach(() => {
    issuesClient = new IssuesClient('test-api-key');
    mockBaseClient = issuesClient as unknown as MockDeepSourceClient;
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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = jest.fn().mockReturnValue({
        first: 20,
        after: null,
      });
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

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
      expect(result.items[0].id).toBe('occ-1'); // Uses occurrence ID as issue ID
      expect(result.items[0].shortcode).toBe('JS-0001');
      expect(result.items[0].category).toBe('BUG_RISK');
    });

    it('should return empty response when project not found', async () => {
      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(null);
      mockBaseClient.createEmptyPaginatedResponse = jest.fn().mockReturnValue({
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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = jest.fn().mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL = jest.fn().mockRejectedValue(new Error('GraphQL error'));

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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = jest.fn().mockReturnValue({
        first: 20,
      });
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.normalizePaginationParams = jest.fn().mockReturnValue({
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      await issuesClient.getIssues('test-project', {
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });

      expect(mockBaseClient.normalizePaginationParams).toHaveBeenCalledWith({
        analyzerIn: ['javascript'],
        tags: ['security'],
        path: '/src/',
        first: 10,
      });
    });
  });

  describe('buildIssuesQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = (IssuesClient as any).buildIssuesQuery();

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

      const issues = (issuesClient as unknown as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].id).toBe('occ-1'); // Uses occurrence ID as issue ID
      expect(issues[0].shortcode).toBe('JS-0001');
      expect(issues[0].category).toBe('BUG_RISK');
    });

    it('should handle missing issues in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const issues = (issuesClient as unknown as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      );

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

      const issues = (issuesClient as unknown as IssuesClientTestable).extractIssuesFromResponse(
        mockResponseData
      );

      expect(issues).toHaveLength(0); // No occurrences means no issues
    });
  });

  describe('handleIssuesError', () => {
    it('should return empty response for NoneType errors', () => {
      const error = new Error('NoneType error');

      const result = (issuesClient as unknown as IssuesClientTestable).handleIssuesError(error);

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should re-throw non-NoneType errors', () => {
      const error = new Error('Other error');

      expect(() => {
        (issuesClient as unknown as IssuesClientTestable).handleIssuesError(error);
      }).toThrow('Other error');
    });
  });
});
