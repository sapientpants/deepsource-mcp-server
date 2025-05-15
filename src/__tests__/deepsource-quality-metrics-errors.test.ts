/**
 * Tests for DeepSource quality metrics error handling
 * This file focuses on error handling in the quality metrics retrieval
 */
import { jest, expect } from '@jest/globals';
import nock from 'nock';
import { DeepSourceClient, MetricShortcode } from '../deepsource.js';
import { ClassifiedError } from '../utils/errors.js';

describe('DeepSourceClient Quality Metrics Error Handling', () => {
  // Test variables
  const API_KEY = 'test-api-key';
  let client: DeepSourceClient;

  // Setup client and mock environment
  beforeEach(() => {
    client = new DeepSourceClient(API_KEY);
    nock.disableNetConnect();
  });

  // Clean up after each test
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
  });

  describe('getQualityMetrics', () => {
    // Mock for listProjects
    beforeEach(() => {
      // Mock the listProjects method to return a test project
      jest.spyOn(client, 'listProjects').mockResolvedValue([
        {
          key: 'test-project',
          name: 'Test Project',
          repository: {
            url: 'https://github.com/org/test-project',
            provider: 'GITHUB',
            login: 'org',
            isPrivate: false,
            isActivated: true,
          },
        },
      ]);
    });

    // Test NoneType error handling - This will specifically test line 2061
    it('should handle NoneType errors correctly', async () => {
      // Mock API to throw a NoneType error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'NoneType object has no attribute' }],
        });

      // This will force the code to enter the error handler that returns []
      const result = await client.getQualityMetrics('test-project', {});
      expect(result).toEqual([]);
    });

    // Test successful quality metrics retrieval
    it('should retrieve quality metrics successfully', async () => {
      // Mock successful response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              name: 'Test Project',
              id: 'repo-id',
              metrics: [
                {
                  name: 'Line Coverage',
                  shortcode: MetricShortcode.LCV,
                  description: 'Line coverage percentage',
                  positiveDirection: 'UPWARD',
                  unit: '%',
                  minValueAllowed: 0,
                  maxValueAllowed: 100,
                  isReported: true,
                  isThresholdEnforced: true,
                  items: [
                    {
                      id: 'item-id',
                      key: 'AGGREGATE',
                      threshold: 80,
                      latestValue: 75,
                      latestValueDisplay: '75%',
                      thresholdStatus: 'FAILING',
                    },
                  ],
                },
              ],
            },
          },
        });

      const result = await client.getQualityMetrics('test-project', {});
      expect(result).toHaveLength(1);
      expect(result[0].shortcode).toBe(MetricShortcode.LCV);
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].threshold).toBe(80);
    });

    // Note: The filtering is done on the server side, our mock returns the unfiltered response
    // so our test should verify that the shortcodeIn parameter is correctly passed
    it('should pass shortcodeIn parameter correctly', async () => {
      // Create a mock to verify the payload sent to the server
      const graphqlMock = nock('https://api.deepsource.io')
        .post('/graphql/', (body) => {
          // Verify that the shortcodeIn parameter is included in the variables
          return (
            body.variables &&
            body.variables.shortcodeIn &&
            body.variables.shortcodeIn.includes(MetricShortcode.LCV)
          );
        })
        .reply(200, {
          data: {
            repository: {
              name: 'Test Project',
              id: 'repo-id',
              metrics: [
                {
                  name: 'Line Coverage',
                  shortcode: MetricShortcode.LCV,
                  description: 'Line coverage percentage',
                  positiveDirection: 'UPWARD',
                  unit: '%',
                  minValueAllowed: 0,
                  maxValueAllowed: 100,
                  isReported: true,
                  isThresholdEnforced: true,
                  items: [],
                },
              ],
            },
          },
        });

      const result = await client.getQualityMetrics('test-project', {
        shortcodeIn: [MetricShortcode.LCV],
      });

      // Verify the request was made with the correct parameters
      expect(graphqlMock.isDone()).toBe(true);

      // Verify the response
      expect(result).toHaveLength(1);
      expect(result[0].shortcode).toBe(MetricShortcode.LCV);
    });

    // Test handling of other error types
    it('should handle other error types correctly', async () => {
      // Mock API to throw a different kind of error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'Authentication failed' }],
        });

      try {
        await client.getQualityMetrics('test-project', {});
        // The test should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Verify error categorization
        expect((error as ClassifiedError).category).toBeTruthy();
      }
    });

    // Test handling of project not found
    it('should handle project not found', async () => {
      // Override the mock to return empty array (no projects)
      jest.spyOn(client, 'listProjects').mockResolvedValue([]);

      const result = await client.getQualityMetrics('non-existent-project', {});
      expect(result).toEqual([]);
    });

    // Test handling of GraphQL errors
    it('should handle GraphQL errors in the response', async () => {
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'GraphQL Error: Invalid field' }],
        });

      try {
        await client.getQualityMetrics('test-project', {});
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('GraphQL Errors');
      }
    });
  });
});
