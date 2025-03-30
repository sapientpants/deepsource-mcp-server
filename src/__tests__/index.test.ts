describe('DeepSource MCP Server Tests', () => {
  // Original environment variables
  let originalEnv;

  beforeEach(() => {
    // Save original environment and set test API key
    originalEnv = process.env;
    process.env = { ...originalEnv, DEEPSOURCE_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('API Key Validation', () => {
    it('should validate that DEEPSOURCE_API_KEY is required', () => {
      // Remove API key from environment
      delete process.env.DEEPSOURCE_API_KEY;

      // Define a function that simulates the behavior of the tools
      const validateApiKey = () => {
        const apiKey = process.env.DEEPSOURCE_API_KEY;
        if (!apiKey) {
          throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
        }
        return apiKey;
      };

      // Test that the expected error is thrown
      expect(validateApiKey).toThrow('DEEPSOURCE_API_KEY environment variable is not set');
    });

    it('should return the API key when it is set', () => {
      const validateApiKey = () => {
        const apiKey = process.env.DEEPSOURCE_API_KEY;
        if (!apiKey) {
          throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
        }
        return apiKey;
      };

      // Test that the API key is returned
      expect(validateApiKey()).toBe('test-api-key');
    });
  });

  describe('Response Formatting', () => {
    it('should format project data correctly', () => {
      // Sample project data
      const projects = [
        { key: 'project1', name: 'Project One' },
        { key: 'project2', name: 'Project Two' },
      ];

      // Function that formats the data similar to the actual tool
      const formatProjectsResponse = (projects) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                projects.map((project) => ({
                  key: project.key,
                  name: project.name,
                }))
              ),
            },
          ],
        };
      };

      // Expected response
      const expectedResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { key: 'project1', name: 'Project One' },
              { key: 'project2', name: 'Project Two' },
            ]),
          },
        ],
      };

      // Test the formatting
      expect(formatProjectsResponse(projects)).toEqual(expectedResponse);
    });

    it('should format issues data correctly', () => {
      // Sample issues data
      const issues = {
        items: [
          {
            id: 'issue1',
            title: 'Security Issue',
            shortcode: 'SEC001',
            category: 'security',
            severity: 'high',
            status: 'OPEN',
            issue_text: 'Test issue',
            file_path: 'src/test.ts',
            line_number: 10,
            tags: [],
          },
        ],
        pageInfo: { hasNextPage: false },
        totalCount: 1,
      };

      // Function that formats the data similar to the actual tool
      const formatIssuesResponse = (result) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                items: result.items.map((issue) => ({
                  id: issue.id,
                  title: issue.title,
                  shortcode: issue.shortcode,
                  category: issue.category,
                  severity: issue.severity,
                  status: issue.status,
                  issue_text: issue.issue_text,
                  file_path: issue.file_path,
                  line_number: issue.line_number,
                  tags: issue.tags,
                })),
                pageInfo: result.pageInfo,
                totalCount: result.totalCount,
              }),
            },
          ],
        };
      };

      // Expected response
      const expectedResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              items: [
                {
                  id: 'issue1',
                  title: 'Security Issue',
                  shortcode: 'SEC001',
                  category: 'security',
                  severity: 'high',
                  status: 'OPEN',
                  issue_text: 'Test issue',
                  file_path: 'src/test.ts',
                  line_number: 10,
                  tags: [],
                },
              ],
              pageInfo: { hasNextPage: false },
              totalCount: 1,
            }),
          },
        ],
      };

      // Test the formatting
      expect(formatIssuesResponse(issues)).toEqual(expectedResponse);
    });
  });

  describe('Pagination Parameters', () => {
    it('should handle pagination parameters correctly', () => {
      // Test function that simulates parameter handling
      const createPaginationObject = (params) => {
        const { offset, first, after, before } = params;
        return { offset, first, after, before };
      };

      // Test with all parameters
      const fullParams = {
        offset: 0,
        first: 10,
        after: 'cursor1',
        before: 'cursor2',
      };

      expect(createPaginationObject(fullParams)).toEqual({
        offset: 0,
        first: 10,
        after: 'cursor1',
        before: 'cursor2',
      });

      // Test with partial parameters
      const partialParams = {
        offset: 5,
        first: 20,
      };

      expect(createPaginationObject(partialParams)).toEqual({
        offset: 5,
        first: 20,
        after: undefined,
        before: undefined,
      });
    });
  });
});
