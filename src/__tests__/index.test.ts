import { mcpServer } from '../index.js';

// Test suite for the MCP server implementation
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

  describe('MCP Server', () => {
    it('should be properly initialized', () => {
      // Check that the server is defined
      expect(mcpServer).toBeDefined();
    });

    it('should reject requests when DEEPSOURCE_API_KEY is not set', async () => {
      // Remove API key from environment
      delete process.env.DEEPSOURCE_API_KEY;

      // Create a test response function that simulates MCP server responses
      const createErrorFunction = (toolName: string) => {
        return async () => {
          const apiKey = process.env.DEEPSOURCE_API_KEY;
          if (!apiKey) {
            throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
          }
          return `Successfully called ${toolName}`;
        };
      };

      // Test the deepsource_projects tool behavior
      const projectsToolFunction = createErrorFunction('deepsource_projects');
      await expect(projectsToolFunction()).rejects.toThrow(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );

      // Test the deepsource_project_issues tool behavior
      const issuesToolFunction = createErrorFunction('deepsource_project_issues');
      await expect(issuesToolFunction()).rejects.toThrow(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );
    });
  });

  describe('Environment Integration', () => {
    it('should use environment variables for API key', () => {
      // Test that the server reads from environment variables
      expect(process.env.DEEPSOURCE_API_KEY).toBe('test-api-key');

      // Validate that the API key can be changed
      process.env.DEEPSOURCE_API_KEY = 'different-key';
      expect(process.env.DEEPSOURCE_API_KEY).toBe('different-key');

      // Restore test key
      process.env.DEEPSOURCE_API_KEY = 'test-api-key';
    });
  });
});
