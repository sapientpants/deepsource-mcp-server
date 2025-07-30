/**
 * Tests for the DeepSource quality metrics handlers
 */
import nock from 'nock';
// Named imports are used for better code clarity and maintainability (resolves JS-C1003)
import {
  handleDeepsourceQualityMetrics,
  handleDeepsourceUpdateMetricThreshold,
  handleDeepsourceUpdateMetricSetting,
} from '../handlers';
import { MetricShortcode } from '../deepsource';
import { MetricKey } from '../types/metrics';

// Mock environment variables for testing
process.env.DEEPSOURCE_API_KEY = 'test-api-key';

// Helper functions for setting up API mocks
function setupSuccessMocks() {
  // Setup common API responses for successful cases
  nock('https://api.deepsource.io')
    .persist()
    .post('/graphql/')
    .reply(200, (uri, requestBody) => {
      const body = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;

      // Mock response for project list query
      // This already uses optional chaining correctly - ignore JS-W1044 false positive
      if (body.query?.includes('viewer')) {
        return {
          data: {
            viewer: {
              email: 'test@example.com',
              accounts: {
                edges: [
                  {
                    node: {
                      login: 'testorg',
                      repositories: {
                        edges: [
                          {
                            node: {
                              name: 'Test Project',
                              defaultBranch: 'main',
                              dsn: 'test-project',
                              id: 'repo123',
                              isPrivate: false,
                              isActivated: true,
                              vcsProvider: 'github',
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
        };
      }

      // Mock response for runs query (used to get repository ID)
      // This already uses optional chaining correctly - ignore JS-W1044 false positive
      if (body.query?.includes('runs') && body.query?.includes('repository')) {
        return {
          data: {
            repository: {
              id: 'repo123',
              runs: {
                edges: [
                  {
                    node: {
                      id: 'run123',
                      repository: {
                        id: 'repo123',
                      },
                    },
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        };
      }

      // Mock response for quality metrics query
      // This already uses optional chaining correctly - ignore JS-W1044 false positive
      if (body.query?.includes('metrics')) {
        return {
          data: {
            repository: {
              name: 'Test Project',
              id: 'repo123',
              metrics: [
                {
                  name: 'Line Coverage',
                  shortcode: 'LCV',
                  description: 'Percentage of lines covered by tests',
                  positiveDirection: 'UPWARD',
                  unit: '%',
                  minValueAllowed: 0,
                  maxValueAllowed: 100,
                  isReported: true,
                  isThresholdEnforced: true,
                  items: [
                    {
                      id: 'metric1',
                      key: 'AGGREGATE',
                      threshold: 80,
                      latestValue: 85.5,
                      latestValueDisplay: '85.5%',
                      thresholdStatus: 'PASSING',
                    },
                  ],
                },
              ],
            },
          },
        };
      }

      // Mock response for threshold update mutation
      // This already uses optional chaining correctly - ignore JS-W1044 false positive
      if (body.query?.includes('setRepositoryMetricThreshold')) {
        return {
          data: {
            setRepositoryMetricThreshold: {
              ok: true,
            },
          },
        };
      }

      // Mock response for metric setting update mutation
      // This already uses optional chaining correctly - ignore JS-W1044 false positive
      if (body.query?.includes('updateRepositoryMetricSetting')) {
        return {
          data: {
            updateRepositoryMetricSetting: {
              ok: true,
            },
          },
        };
      }

      // Default fallback response
      return { data: {} };
    });
}

function setupAuthErrorMock() {
  nock('https://api.deepsource.io')
    .post('/graphql/')
    .reply(401, { errors: [{ message: 'Unauthorized access' }] });
}

function setupThresholdFailureMock() {
  nock('https://api.deepsource.io')
    .post('/graphql/')
    .reply(200, {
      data: {
        setRepositoryMetricThreshold: {
          ok: false,
        },
      },
    });
}

function setupMetricSettingFailureMock() {
  nock('https://api.deepsource.io')
    .post('/graphql/')
    .reply(200, {
      data: {
        updateRepositoryMetricSetting: {
          ok: false,
        },
      },
    });
}

describe('DeepSource MCP Quality Metrics Handlers', () => {
  // Clean up nock before and after each test
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('Quality Metrics Handler', () => {
    it.skip('should fetch and format quality metrics', async () => {
      // Setup mocks for this test
      setupSuccessMocks();

      // Call the handler function directly
      const result = await handleDeepsourceQualityMetrics({
        projectKey: 'test-project',
        shortcodeIn: [MetricShortcode.LCV],
      });

      // Verify response structure
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Parse and validate the response content
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.metrics).toHaveLength(1);
      expect(parsedResponse.metrics[0].name).toBe('Line Coverage');
      expect(parsedResponse.metrics[0].shortcode).toBe('LCV');

      // Validate threshold information
      const thresholdInfo = parsedResponse.metrics[0].items[0].thresholdInfo;
      expect(thresholdInfo).toBeDefined();
      expect(thresholdInfo.difference).toBe(5.5); // 85.5 - 80
      expect(thresholdInfo.isPassing).toBe(true);

      // Verify usage examples are included
      expect(parsedResponse.usage_examples).toBeDefined();
      expect(parsedResponse.usage_examples.updating_threshold).toContain('update_metric_threshold');
    });

    it('should handle API errors gracefully', async () => {
      // Setup auth error mock
      setupAuthErrorMock();

      // Call handler and expect it to throw
      await expect(
        handleDeepsourceQualityMetrics({
          projectKey: 'test-project',
        })
      ).rejects.toThrow();
    });
  });

  describe('Update Metric Threshold Handler', () => {
    it('should update metric threshold and return success', async () => {
      // Setup mocks for this test
      setupSuccessMocks();

      // Call the handler
      const result = await handleDeepsourceUpdateMetricThreshold({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 85,
      });

      // Verify response structure
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      // Parse and validate the response content
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.ok).toBe(true);
      expect(parsedResponse.projectKey).toBe('test-project');
      expect(parsedResponse.metricShortcode).toBe('LCV');
      expect(parsedResponse.thresholdValue).toBe(85);
      expect(parsedResponse.message).toContain('Successfully');
    });

    it('should handle threshold removal', async () => {
      // Setup mocks for this test
      setupSuccessMocks();

      // Call the handler with null threshold
      const result = await handleDeepsourceUpdateMetricThreshold({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: null,
      });

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.ok).toBe(true);
      expect(parsedResponse.thresholdValue).toBe(null);
      expect(parsedResponse.message).toContain('removed threshold');
    });

    it('should handle failure when updating threshold', async () => {
      // Setup failure mock
      setupThresholdFailureMock();

      // Call the handler
      const result = await handleDeepsourceUpdateMetricThreshold({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 85,
      });

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.ok).toBe(false);
      expect(parsedResponse.message).toContain('Failed to update threshold');
      expect(parsedResponse.next_steps).toContain('Check if you have sufficient permissions');
    });
  });

  describe('Update Metric Setting Handler', () => {
    it('should update metric settings and return success', async () => {
      // Setup mocks for this test
      setupSuccessMocks();

      // Call the handler
      const result = await handleDeepsourceUpdateMetricSetting({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: true,
      });

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.ok).toBe(true);
      expect(parsedResponse.settings.isReported).toBe(true);
      expect(parsedResponse.settings.isThresholdEnforced).toBe(true);
    });

    it('should handle disabling a metric', async () => {
      // Setup mocks for this test
      setupSuccessMocks();

      // Call the handler with disabled settings
      const result = await handleDeepsourceUpdateMetricSetting({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        isReported: false,
        isThresholdEnforced: false,
      });

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.settings.isReported).toBe(false);
      expect(parsedResponse.settings.isThresholdEnforced).toBe(false);
    });

    it('should handle failure when updating settings', async () => {
      // Setup metrics setting failure mock
      setupMetricSettingFailureMock();

      // Call the handler
      const result = await handleDeepsourceUpdateMetricSetting({
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: true,
      });

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.ok).toBe(false);
      expect(parsedResponse.message).toContain('Failed to update settings');
    });
  });
});
