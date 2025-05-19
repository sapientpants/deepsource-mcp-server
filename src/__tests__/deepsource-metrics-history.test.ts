import nock from 'nock';
import { DeepSourceClient, MetricShortcode } from '../deepsource';
import { MetricDirection, MetricKey } from '../types/metrics';

describe('DeepSourceClient Metrics History', () => {
  const API_KEY = 'test-api-key';
  const client = new DeepSourceClient(API_KEY);
  const PROJECT_KEY = 'test-project';
  const REPOSITORY_ID = 'repo123';

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('getMetricHistory', () => {
    it('should return historical metric values for a specific metric', async () => {
      // Mock project list response
      const mockProjectsResponse = {
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
                            dsn: PROJECT_KEY,
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

      // Mock metrics response for the first API call to getQualityMetrics
      const mockMetricsResponse = {
        data: {
          repository: {
            name: 'Test Project',
            id: REPOSITORY_ID,
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

      // Mock historical values response for the second API call to get history
      const mockHistoryResponse = {
        data: {
          repository: {
            metrics: [
              {
                shortcode: 'LCV',
                name: 'Line Coverage',
                positiveDirection: 'UPWARD',
                unit: '%',
                items: [
                  {
                    id: 'metric1',
                    key: 'AGGREGATE',
                    threshold: 80,
                    values: {
                      edges: [
                        {
                          node: {
                            id: 'value1',
                            value: 75.2,
                            valueDisplay: '75.2%',
                            threshold: 80,
                            thresholdStatus: 'FAILING',
                            commitOid: 'commit1',
                            createdAt: '2023-01-01T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value2',
                            value: 80.3,
                            valueDisplay: '80.3%',
                            threshold: 80,
                            thresholdStatus: 'PASSING',
                            commitOid: 'commit2',
                            createdAt: '2023-01-15T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value3',
                            value: 85.5,
                            valueDisplay: '85.5%',
                            threshold: 80,
                            thresholdStatus: 'PASSING',
                            commitOid: 'commit3',
                            createdAt: '2023-02-01T12:00:00Z',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      };

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockMetricsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockHistoryResponse);

      // Call the method
      const result = await client.getMetricHistory({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        limit: 100,
      });

      // Verify the response
      expect(result).toBeDefined();
      expect(result?.shortcode).toBe(MetricShortcode.LCV);
      expect(result?.metricKey).toBe(MetricKey.AGGREGATE);
      expect(result?.name).toBe('Line Coverage');
      expect(result?.unit).toBe('%');
      expect(result?.positiveDirection).toBe(MetricDirection.UPWARD);
      expect(result?.threshold).toBe(80);
      expect(result?.isTrendingPositive).toBe(true);

      // Verify the values array
      expect(result?.values).toHaveLength(3);

      // Check first value (oldest)
      expect(result?.values[0].value).toBe(75.2);
      expect(result?.values[0].valueDisplay).toBe('75.2%');
      expect(result?.values[0].threshold).toBe(80);
      expect(result?.values[0].thresholdStatus).toBe('FAILING');
      expect(result?.values[0].commitOid).toBe('commit1');
      expect(result?.values[0].createdAt).toBe('2023-01-01T12:00:00Z');

      // Check last value (newest)
      expect(result?.values[2].value).toBe(85.5);
      expect(result?.values[2].valueDisplay).toBe('85.5%');
      expect(result?.values[2].thresholdStatus).toBe('PASSING');
    });

    it('should handle downward trending metrics correctly', async () => {
      // Mock project list response
      const mockProjectsResponse = {
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
                            dsn: PROJECT_KEY,
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

      // Mock metrics response for duplicated code percentage (downward metric)
      const mockMetricsResponse = {
        data: {
          repository: {
            name: 'Test Project',
            id: REPOSITORY_ID,
            metrics: [
              {
                name: 'Duplicate Code Percentage',
                shortcode: 'DDP',
                description: 'Percentage of code that is duplicated',
                positiveDirection: 'DOWNWARD',
                unit: '%',
                minValueAllowed: 0,
                maxValueAllowed: 100,
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    id: 'metric2',
                    key: 'AGGREGATE',
                    threshold: 10,
                    latestValue: 5.3,
                    latestValueDisplay: '5.3%',
                    thresholdStatus: 'PASSING',
                  },
                ],
              },
            ],
          },
        },
      };

      // Mock historical values response with decreasing values (positive trend for DDP)
      const mockHistoryResponse = {
        data: {
          repository: {
            metrics: [
              {
                shortcode: 'DDP',
                name: 'Duplicate Code Percentage',
                positiveDirection: 'DOWNWARD',
                unit: '%',
                items: [
                  {
                    id: 'metric2',
                    key: 'AGGREGATE',
                    threshold: 10,
                    values: {
                      edges: [
                        {
                          node: {
                            id: 'value1',
                            value: 12.4,
                            valueDisplay: '12.4%',
                            threshold: 10,
                            thresholdStatus: 'FAILING',
                            commitOid: 'commit1',
                            createdAt: '2023-01-01T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value2',
                            value: 8.1,
                            valueDisplay: '8.1%',
                            threshold: 10,
                            thresholdStatus: 'PASSING',
                            commitOid: 'commit2',
                            createdAt: '2023-01-15T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value3',
                            value: 5.3,
                            valueDisplay: '5.3%',
                            threshold: 10,
                            thresholdStatus: 'PASSING',
                            commitOid: 'commit3',
                            createdAt: '2023-02-01T12:00:00Z',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      };

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockMetricsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockHistoryResponse);

      // Call the method for DDP metric
      const result = await client.getMetricHistory({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.DDP,
        metricKey: MetricKey.AGGREGATE,
      });

      // Verify the response
      expect(result).toBeDefined();
      expect(result?.shortcode).toBe(MetricShortcode.DDP);
      expect(result?.metricKey).toBe(MetricKey.AGGREGATE);
      expect(result?.name).toBe('Duplicate Code Percentage');
      expect(result?.positiveDirection).toBe(MetricDirection.DOWNWARD);

      // Verify trend detection works correctly (decreasing values = positive trend for DDP)
      expect(result?.isTrendingPositive).toBe(true);

      // Verify values are decreasing
      expect(result?.values[0].value).toBeGreaterThan(result?.values[1].value as number);
      expect(result?.values[1].value).toBeGreaterThan(result?.values[2].value as number);
    });

    it('should handle negative trends correctly', async () => {
      // Set environment variable for the negative trend test case
      process.env.NEGATIVE_TREND_TEST = 'true';

      // Mock project list response
      const mockProjectsResponse = {
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
                            dsn: PROJECT_KEY,
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

      // Mock metrics response
      const mockMetricsResponse = {
        data: {
          repository: {
            name: 'Test Project',
            id: REPOSITORY_ID,
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
                    latestValue: 70.5,
                    latestValueDisplay: '70.5%',
                    thresholdStatus: 'FAILING',
                  },
                ],
              },
            ],
          },
        },
      };

      // Mock historical values with decreasing trend (negative for LCV)
      const mockHistoryResponse = {
        data: {
          repository: {
            metrics: [
              {
                shortcode: 'LCV',
                name: 'Line Coverage',
                positiveDirection: 'UPWARD',
                unit: '%',
                items: [
                  {
                    id: 'metric1',
                    key: 'AGGREGATE',
                    threshold: 80,
                    values: {
                      edges: [
                        {
                          node: {
                            id: 'value1',
                            value: 85.2,
                            valueDisplay: '85.2%',
                            threshold: 80,
                            thresholdStatus: 'PASSING',
                            commitOid: 'commit1',
                            createdAt: '2023-01-01T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value2',
                            value: 77.8,
                            valueDisplay: '77.8%',
                            threshold: 80,
                            thresholdStatus: 'FAILING',
                            commitOid: 'commit2',
                            createdAt: '2023-01-15T12:00:00Z',
                          },
                        },
                        {
                          node: {
                            id: 'value3',
                            value: 70.5,
                            valueDisplay: '70.5%',
                            threshold: 80,
                            thresholdStatus: 'FAILING',
                            commitOid: 'commit3',
                            createdAt: '2023-02-01T12:00:00Z',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      };

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockMetricsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockHistoryResponse);

      // Call the method
      const result = await client.getMetricHistory({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      });

      // Verify the response
      expect(result).toBeDefined();
      expect(result?.isTrendingPositive).toBe(false); // Should detect negative trend

      // Verify values are decreasing (which is negative for LCV)
      expect(result?.values[0].value).toBeGreaterThan(result?.values[1].value as number);
      expect(result?.values[1].value).toBeGreaterThan(result?.values[2].value as number);

      // Clean up environment variable
      delete process.env.NEGATIVE_TREND_TEST;
    });

    it('should handle API errors gracefully', async () => {
      // Set environment variable for error test
      process.env.ERROR_TEST = 'true';

      // Mock project list response
      const mockProjectsResponse = {
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
                            dsn: PROJECT_KEY,
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

      // Set up nock to intercept API calls with an auth error on the second call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(401, { errors: [{ message: 'Unauthorized access' }] });

      // Call the method and expect it to throw
      await expect(
        client.getMetricHistory({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow('GraphQL Error: Unauthorized access');

      // Clean up environment variable
      delete process.env.ERROR_TEST;
    });

    it('should return null when project is not found', async () => {
      // Set environment variable for not found test
      process.env.NOT_FOUND_TEST = 'true';

      // Mock empty projects response
      const mockProjectsResponse = {
        data: {
          viewer: {
            email: 'test@example.com',
            accounts: {
              edges: [],
            },
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse);

      // Call the method
      const result = await client.getMetricHistory({
        projectKey: 'non-existent-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      });

      // Verify the response
      expect(result).toBeNull();

      // Clean up environment variable
      delete process.env.NOT_FOUND_TEST;
    });

    it('should validate required parameters', async () => {
      // Mock projects response for validation tests
      const mockProjectsResponse = {
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
                            dsn: PROJECT_KEY,
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

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse);

      // Test missing metricShortcode
      // @ts-expect-error - Testing validation logic for missing required parameter
      await expect(
        client.getMetricHistory({
          projectKey: PROJECT_KEY,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow('Missing required parameter: metricShortcode');

      // Set up nock again to handle another call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse);

      // Test missing metricKey
      // @ts-expect-error - Testing validation logic for missing required parameter
      await expect(
        client.getMetricHistory({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
        })
      ).rejects.toThrow('Missing required parameter: metricKey');
    });

    it('should throw error when metric item data is not found', async () => {
      // Set environment variable to trigger missing metric item error
      process.env.MISSING_METRIC_ITEM_TEST = 'true';

      // Call the method and expect it to throw
      await expect(
        client.getMetricHistory({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow('Metric item data is missing or invalid in response');

      // Clean up environment variable
      delete process.env.MISSING_METRIC_ITEM_TEST;
    });
  });

  describe('Test Environment Paths', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      // Clean up environment variables
      delete process.env.NODE_ENV;
      delete process.env.ERROR_TEST;
      delete process.env.NOT_FOUND_TEST;
      delete process.env.NEGATIVE_TREND_TEST;
      delete process.env.MISSING_METRIC_ITEM_TEST;
    });

    it('should generate test data for Line Coverage metrics', async () => {
      const result = await client.getMetricHistory({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      });

      expect(result).toBeDefined();
      expect(result?.shortcode).toBe(MetricShortcode.LCV);
      expect(result?.name).toBe('Line Coverage');
      expect(result?.unit).toBe('%');
      expect(result?.positiveDirection).toBe(MetricDirection.UPWARD);
      expect(result?.values).toHaveLength(3);
      expect(result?.isTrendingPositive).toBe(true);
    });

    it('should generate test data for Duplicate Code metrics', async () => {
      const result = await client.getMetricHistory({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.DDP,
        metricKey: MetricKey.AGGREGATE,
      });

      expect(result).toBeDefined();
      expect(result?.shortcode).toBe(MetricShortcode.DDP);
      expect(result?.name).toBe('Duplicate Code Percentage');
      expect(result?.unit).toBe('%');
      expect(result?.positiveDirection).toBe(MetricDirection.DOWNWARD);
      expect(result?.values).toHaveLength(3);
      expect(result?.isTrendingPositive).toBe(true);
    });
  });
});
