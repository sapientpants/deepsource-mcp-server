/**
 * Tests for the DeepSource quality metrics handlers
 */
import nock from 'nock';
import * as indexModule from '../index';
import { MetricShortcode } from '../deepsource';
import { MetricKey } from '../types/metrics';

// Mock environment variables for testing
process.env.DEEPSOURCE_API_KEY = 'test-api-key';

describe('DeepSource MCP Quality Metrics Handlers', () => {
  // Mock API responses for consistent testing
  beforeEach(() => {
    nock.cleanAll();

    // Setup common API responses
    nock('https://api.deepsource.io')
      .persist()
      .post('/graphql/')
      .reply(200, (uri, requestBody) => {
        const body = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;

        // Mock response for project list query
        if (body.query && body.query.includes('viewer')) {
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

        // Mock response for quality metrics query
        if (body.query && body.query.includes('metrics')) {
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
        if (body.query && body.query.includes('setRepositoryMetricThreshold')) {
          return {
            data: {
              setRepositoryMetricThreshold: {
                ok: true,
              },
            },
          };
        }

        // Mock response for metric setting update mutation
        if (body.query && body.query.includes('updateRepositoryMetricSetting')) {
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
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('Quality Metrics Handler', () => {
    it('should fetch and format quality metrics', async () => {
      // Call the handler function directly
      const result = await indexModule.handleDeepsourceQualityMetrics({
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
      expect(parsedResponse.usage_examples.updating_threshold).toContain(
        'deepsource_update_metric_threshold'
      );
    });

    it('should handle API errors gracefully', async () => {
      // Setup a mock that returns an error
      nock.cleanAll();
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(401, { errors: [{ message: 'Unauthorized access' }] });

      // Call handler and expect it to throw
      await expect(
        indexModule.handleDeepsourceQualityMetrics({
          projectKey: 'test-project',
        })
      ).rejects.toThrow();
    });
  });

  describe('Update Metric Threshold Handler', () => {
    it('should update metric threshold and return success', async () => {
      // Call the handler
      const result = await indexModule.handleDeepsourceUpdateMetricThreshold({
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
      // Call the handler with null threshold
      const result = await indexModule.handleDeepsourceUpdateMetricThreshold({
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
      // Setup a mock that returns a failure
      nock.cleanAll();
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            setRepositoryMetricThreshold: {
              ok: false,
            },
          },
        });

      // Call the handler
      const result = await indexModule.handleDeepsourceUpdateMetricThreshold({
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
      // Call the handler
      const result = await indexModule.handleDeepsourceUpdateMetricSetting({
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
      // Call the handler with disabled settings
      const result = await indexModule.handleDeepsourceUpdateMetricSetting({
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
      // Setup a mock that returns a failure
      nock.cleanAll();
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            updateRepositoryMetricSetting: {
              ok: false,
            },
          },
        });

      // Call the handler
      const result = await indexModule.handleDeepsourceUpdateMetricSetting({
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
