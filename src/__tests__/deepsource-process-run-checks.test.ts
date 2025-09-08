/**
 * @vitest-environment node
 */

import { jest, describe, expect, it } from 'vitest';

// Mock the logger module
vi.mock('../utils/logger.js', () => ({
  defaultLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import DeepSourceClient after mocking
const { DeepSourceClient } = await import('../deepsource.js');

// Type definition for accessing private static methods
type DeepSourceClientWithPrivateStatics = typeof DeepSourceClient & {
  processRunChecksResponse: (typeof DeepSourceClient)['processRunChecksResponse'];
};

describe('DeepSourceClient - processRunChecksResponse', () => {
  describe('processRunChecksResponse', () => {
    it('should process a response with issues correctly', () => {
      const mockResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        pageInfo: {
                          hasNextPage: false,
                          hasPreviousPage: false,
                          startCursor: 'start',
                          endCursor: 'end',
                        },
                        totalCount: 2,
                        edges: [
                          {
                            node: {
                              id: 'occ1',
                              issue: {
                                shortcode: 'JS-0001',
                                title: 'Missing semicolon',
                                category: 'STYLE',
                                severity: 'INFO',
                                description: 'Semicolon missing at end of statement',
                                tags: ['style', 'javascript'],
                              },
                              path: 'src/index.js',
                              beginLine: 42,
                            },
                          },
                          {
                            node: {
                              id: 'occ2',
                              issue: {
                                shortcode: 'JS-0002',
                                title: 'Undefined variable',
                                category: 'BUG',
                                severity: 'ERROR',
                                description: 'Variable is not defined',
                                tags: ['error', 'javascript'],
                              },
                              path: 'src/utils.js',
                              beginLine: 15,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      // Call the static method directly
      const result = (
        DeepSourceClient as DeepSourceClientWithPrivateStatics
      ).processRunChecksResponse(mockResponse);

      // Verify the response structure
      expect(result.issues).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'start',
        endCursor: 'end',
      });

      // Verify the first issue
      expect(result.issues[0]).toEqual({
        id: 'occ1',
        shortcode: 'JS-0001',
        title: 'Missing semicolon',
        category: 'STYLE',
        severity: 'INFO',
        status: 'OPEN',
        issue_text: 'Semicolon missing at end of statement',
        file_path: 'src/index.js',
        line_number: 42,
        tags: ['style', 'javascript'],
      });

      // Verify the second issue
      expect(result.issues[1]).toEqual({
        id: 'occ2',
        shortcode: 'JS-0002',
        title: 'Undefined variable',
        category: 'BUG',
        severity: 'ERROR',
        status: 'OPEN',
        issue_text: 'Variable is not defined',
        file_path: 'src/utils.js',
        line_number: 15,
        tags: ['error', 'javascript'],
      });
    });

    it('should handle empty response', () => {
      const mockResponse = {
        data: {
          data: {},
        },
      };

      const result = (
        DeepSourceClient as DeepSourceClientWithPrivateStatics
      ).processRunChecksResponse(mockResponse);

      expect(result.issues).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
    });

    it('should handle response with missing optional fields', () => {
      const mockResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        edges: [
                          {
                            node: {
                              issue: {
                                // Some fields missing
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = (
        DeepSourceClient as DeepSourceClientWithPrivateStatics
      ).processRunChecksResponse(mockResponse);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        id: 'unknown',
        shortcode: '',
        title: 'Untitled Issue',
        category: 'UNKNOWN',
        severity: 'UNKNOWN',
        status: 'OPEN',
        issue_text: '',
        file_path: 'N/A',
        line_number: 0,
        tags: [],
      });
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
    });

    it('should handle response with null occurrences', () => {
      const mockResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        edges: [
                          {
                            node: null,
                          },
                          {
                            // issue is missing
                            node: {
                              id: 'occ1',
                              path: 'test.js',
                              beginLine: 1,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = (
        DeepSourceClient as DeepSourceClientWithPrivateStatics
      ).processRunChecksResponse(mockResponse);

      expect(result.issues).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle multiple checks with pagination', () => {
      const mockResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        pageInfo: {
                          hasNextPage: true,
                          hasPreviousPage: false,
                          startCursor: 'start1',
                          endCursor: 'end1',
                        },
                        totalCount: 10,
                        edges: [
                          {
                            node: {
                              id: 'occ1',
                              issue: {
                                shortcode: 'PY-0001',
                                title: 'Unused import',
                                category: 'STYLE',
                                severity: 'INFO',
                                description: 'Module imported but not used',
                                tags: ['style', 'python'],
                              },
                              path: 'main.py',
                              beginLine: 5,
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    node: {
                      occurrences: {
                        pageInfo: {
                          hasNextPage: false,
                          hasPreviousPage: true,
                          startCursor: 'start2',
                          endCursor: 'end2',
                        },
                        totalCount: 5,
                        edges: [
                          {
                            node: {
                              id: 'occ2',
                              issue: {
                                shortcode: 'PY-0002',
                                title: 'Syntax error',
                                category: 'BUG',
                                severity: 'ERROR',
                                description: 'Invalid syntax',
                                tags: ['error', 'python'],
                              },
                              path: 'utils.py',
                              beginLine: 20,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = (
        DeepSourceClient as DeepSourceClientWithPrivateStatics
      ).processRunChecksResponse(mockResponse);

      expect(result.issues).toHaveLength(2);
      // The pagination info is taken from the last check's occurrences that has page info
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'start2',
        endCursor: 'end2',
      });
      // Total count is aggregated from all checks
      expect(result.totalCount).toBe(15);
    });
  });
});
