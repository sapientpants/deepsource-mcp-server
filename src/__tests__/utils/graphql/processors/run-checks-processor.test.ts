/**
 * @vitest-environment node
 */

import { RunChecksProcessor } from '../../../../utils/graphql/processors/run-checks-processor.js';

describe('RunChecksProcessor', () => {
  describe('process', () => {
    it('should process valid response with issues', () => {
      const response = {
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
                          startCursor: 'cursor1',
                          endCursor: 'cursor2',
                        },
                        totalCount: 2,
                        edges: [
                          {
                            node: {
                              id: 'issue1',
                              issue: {
                                shortcode: 'PY-D001',
                                title: 'Missing docstring',
                                category: 'DOCUMENTATION',
                                severity: 'MAJOR',
                                description: 'Function is missing a docstring',
                                tags: ['documentation', 'style'],
                              },
                              path: 'src/main.py',
                              beginLine: 10,
                            },
                          },
                          {
                            node: {
                              id: 'issue2',
                              issue: {
                                shortcode: 'PY-R002',
                                title: 'Unused variable',
                                category: 'REFACTOR',
                                severity: 'MINOR',
                                description: 'Variable is declared but never used',
                                tags: ['cleanup'],
                              },
                              path: 'src/utils.py',
                              beginLine: 25,
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

      const result = RunChecksProcessor.process(response);

      expect(result.issues).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor2',
      });

      // Check first issue
      expect(result.issues[0]).toEqual({
        id: 'issue1',
        shortcode: 'PY-D001',
        title: 'Missing docstring',
        category: 'DOCUMENTATION',
        severity: 'MAJOR',
        status: 'OPEN',
        issue_text: 'Function is missing a docstring',
        file_path: 'src/main.py',
        line_number: 10,
        tags: ['documentation', 'style'],
      });

      // Check second issue
      expect(result.issues[1]).toEqual({
        id: 'issue2',
        shortcode: 'PY-R002',
        title: 'Unused variable',
        category: 'REFACTOR',
        severity: 'MINOR',
        status: 'OPEN',
        issue_text: 'Variable is declared but never used',
        file_path: 'src/utils.py',
        line_number: 25,
        tags: ['cleanup'],
      });
    });

    it('should handle empty response', () => {
      const response = {
        data: {
          data: {},
        },
      };

      const result = RunChecksProcessor.process(response);

      expect(result.issues).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
    });

    it('should handle missing optional fields', () => {
      const response = {
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
                              issue: {},
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

      const result = RunChecksProcessor.process(response);

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
    });

    it('should handle invalid response structure', () => {
      const response = {
        invalid: 'structure',
      };

      const result = RunChecksProcessor.process(response);

      expect(result.issues).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: undefined,
        endCursor: undefined,
      });
    });

    it('should handle null/undefined response', () => {
      const result1 = RunChecksProcessor.process(null);
      const result2 = RunChecksProcessor.process(undefined);

      [result1, result2].forEach((result) => {
        expect(result.issues).toHaveLength(0);
        expect(result.totalCount).toBe(0);
        expect(result.pageInfo).toEqual({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        });
      });
    });

    it('should skip nodes without issues', () => {
      const response = {
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
                              id: 'issue1',
                              issue: {
                                shortcode: 'PY-D001',
                                title: 'Has issue',
                              },
                            },
                          },
                          {
                            node: {
                              id: 'issue2',
                              // No issue property
                            },
                          },
                          {
                            // No node property
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

      const result = RunChecksProcessor.process(response);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].id).toBe('issue1');
    });

    it('should aggregate totalCount from multiple checks', () => {
      const response = {
        data: {
          data: {
            run: {
              checks: {
                edges: [
                  {
                    node: {
                      occurrences: {
                        totalCount: 5,
                        pageInfo: {
                          hasNextPage: true,
                          hasPreviousPage: false,
                        },
                        edges: [],
                      },
                    },
                  },
                  {
                    node: {
                      occurrences: {
                        totalCount: 3,
                        edges: [],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = RunChecksProcessor.process(response);

      expect(result.totalCount).toBe(8); // 5 + 3
      expect(result.pageInfo.hasNextPage).toBe(true); // Uses first check's pageInfo
    });
  });
});
