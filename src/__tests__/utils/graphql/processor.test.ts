/**
 * Tests for GraphQL response processors
 */
import {
  processRunChecksResponse,
  extractGraphQLErrorMessages,
} from '../../../utils/graphql/processor';

describe('GraphQL Processor', () => {
  describe('processRunChecksResponse', () => {
    it('should process a valid response with issues', () => {
      // Arrange
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
                          startCursor: 'start123',
                          endCursor: 'end456',
                        },
                        totalCount: 2,
                        edges: [
                          {
                            node: {
                              id: 'issue1',
                              issue: {
                                shortcode: 'TEST-001',
                                title: 'Test Issue 1',
                                category: 'BUG',
                                severity: 'CRITICAL',
                                description: 'This is a test issue',
                                tags: ['test', 'bug'],
                              },
                              path: '/path/to/file1.js',
                              beginLine: 42,
                            },
                          },
                          {
                            node: {
                              id: 'issue2',
                              issue: {
                                shortcode: 'TEST-002',
                                title: 'Test Issue 2',
                                category: 'SECURITY',
                                severity: 'MAJOR',
                                description: 'This is another test issue',
                                tags: ['test', 'security'],
                              },
                              path: '/path/to/file2.js',
                              beginLine: 100,
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

      // Act
      const result = processRunChecksResponse(mockResponse);

      // Assert
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('pageInfo');
      expect(result).toHaveProperty('totalCount');

      // Check issues array
      expect(result.issues).toHaveLength(2);

      // Verify first issue
      expect(result.issues[0]).toEqual({
        id: 'issue1',
        shortcode: 'TEST-001',
        title: 'Test Issue 1',
        category: 'BUG',
        severity: 'CRITICAL',
        status: 'OPEN',
        issue_text: 'This is a test issue',
        file_path: '/path/to/file1.js',
        line_number: 42,
        tags: ['test', 'bug'],
      });

      // Verify second issue
      expect(result.issues[1]).toEqual({
        id: 'issue2',
        shortcode: 'TEST-002',
        title: 'Test Issue 2',
        category: 'SECURITY',
        severity: 'MAJOR',
        status: 'OPEN',
        issue_text: 'This is another test issue',
        file_path: '/path/to/file2.js',
        line_number: 100,
        tags: ['test', 'security'],
      });

      // Verify pagination info
      expect(result.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'start123',
        endCursor: 'end456',
      });

      // Verify total count
      expect(result.totalCount).toBe(2);
    });

    it('should handle empty response with no issues', () => {
      // Arrange
      const emptyResponse = {
        data: {
          data: {
            run: {
              checks: {
                edges: [],
              },
            },
          },
        },
      };

      // Act
      const result = processRunChecksResponse(emptyResponse);

      // Assert
      expect(result.issues).toHaveLength(0);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
      expect(result.totalCount).toBe(0);
    });

    it('should handle response with missing fields', () => {
      // Arrange
      const incompleteResponse = {
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
                              // Missing id field
                              issue: {
                                // Missing shortcode
                                title: 'Incomplete Issue',
                                // Missing category
                                severity: 'MINOR',
                                // Missing description
                              },
                              // Missing path
                              // Missing beginLine
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

      // Act
      const result = processRunChecksResponse(incompleteResponse);

      // Assert
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        id: 'unknown',
        shortcode: '',
        title: 'Incomplete Issue',
        category: 'UNKNOWN',
        severity: 'MINOR',
        status: 'OPEN',
        issue_text: '',
        file_path: 'N/A',
        line_number: 0,
        tags: [],
      });
    });

    it('should skip null or undefined occurrences', () => {
      // Arrange
      const responseWithNulls = {
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
                            node: {
                              issue: null,
                            },
                          },
                          {
                            node: {
                              id: 'validIssue',
                              issue: {
                                shortcode: 'VALID-001',
                                title: 'Valid Issue',
                                category: 'PERF',
                                severity: 'INFO',
                                description: 'This is a valid issue',
                              },
                              path: '/path/to/file.js',
                              beginLine: 10,
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

      // Act
      const result = processRunChecksResponse(responseWithNulls);

      // Assert
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].id).toBe('validIssue');
    });

    it('should handle multiple checks with different occurrences', () => {
      // Arrange
      const multipleChecksResponse = {
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
                          startCursor: 'check1start',
                          endCursor: 'check1end',
                        },
                        totalCount: 1,
                        edges: [
                          {
                            node: {
                              id: 'check1issue',
                              issue: {
                                shortcode: 'CHECK1-001',
                                title: 'Check 1 Issue',
                                category: 'BUG',
                                severity: 'CRITICAL',
                                description: 'Check 1 description',
                              },
                              path: '/check1/file.js',
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
                          hasNextPage: true,
                          hasPreviousPage: false,
                          startCursor: 'check2start',
                          endCursor: 'check2end',
                        },
                        totalCount: 2,
                        edges: [
                          {
                            node: {
                              id: 'check2issue1',
                              issue: {
                                shortcode: 'CHECK2-001',
                                title: 'Check 2 Issue 1',
                                category: 'SECURITY',
                                severity: 'MAJOR',
                                description: 'Check 2 description 1',
                              },
                              path: '/check2/file1.js',
                              beginLine: 10,
                            },
                          },
                          {
                            node: {
                              id: 'check2issue2',
                              issue: {
                                shortcode: 'CHECK2-002',
                                title: 'Check 2 Issue 2',
                                category: 'SECURITY',
                                severity: 'MINOR',
                                description: 'Check 2 description 2',
                              },
                              path: '/check2/file2.js',
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

      // Act
      const result = processRunChecksResponse(multipleChecksResponse);

      // Assert
      expect(result.issues).toHaveLength(3);

      // The implementation uses the pageInfo from the latest check with occurrences
      expect(result.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'check2start',
        endCursor: 'check2end',
      });

      // Total count should be aggregated
      expect(result.totalCount).toBe(3);
    });
  });

  describe('extractGraphQLErrorMessages', () => {
    it('should format a single error message', () => {
      // Arrange
      const errors = [{ message: 'Authentication failed' }];

      // Act
      const result = extractGraphQLErrorMessages(errors);

      // Assert
      expect(result).toBe('Authentication failed');
    });

    it('should combine multiple error messages with commas', () => {
      // Arrange
      const errors = [
        { message: 'Authentication failed' },
        { message: 'Invalid request' },
        { message: 'Timeout error' },
      ];

      // Act
      const result = extractGraphQLErrorMessages(errors);

      // Assert
      expect(result).toBe('Authentication failed, Invalid request, Timeout error');
    });

    it('should handle empty error array', () => {
      // Arrange
      const errors: Array<{ message: string }> = [];

      // Act
      const result = extractGraphQLErrorMessages(errors);

      // Assert
      expect(result).toBe('');
    });
  });
});
