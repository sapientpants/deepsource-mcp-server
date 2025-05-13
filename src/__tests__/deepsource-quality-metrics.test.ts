import nock from 'nock';
import { jest } from '@jest/globals';
import { DeepSourceClient, MetricShortcode } from '../deepsource';
import { MetricKey } from '../types/metrics';

describe('DeepSourceClient Quality Metrics', () => {
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

  describe('getQualityMetrics', () => {
    it('should return quality metrics for a project', async () => {
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
                    latestValue: 85.5,
                    latestValueDisplay: '85.5%',
                    thresholdStatus: 'PASSING',
                  },
                  {
                    id: 'metric2',
                    key: 'PYTHON',
                    threshold: 75,
                    latestValue: 70.2,
                    latestValueDisplay: '70.2%',
                    thresholdStatus: 'FAILING',
                  },
                ],
              },
              {
                name: 'Duplicate Code Percentage',
                shortcode: 'DDP',
                description: 'Percentage of code that is duplicated',
                positiveDirection: 'DOWNWARD',
                unit: '%',
                minValueAllowed: 0,
                maxValueAllowed: 100,
                isReported: true,
                isThresholdEnforced: false,
                items: [
                  {
                    id: 'metric3',
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

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockMetricsResponse);

      // Call the method
      const metrics = await client.getQualityMetrics(PROJECT_KEY);

      // Verify the response
      expect(metrics).toHaveLength(2);

      // Verify first metric (Line Coverage)
      expect(metrics[0].name).toBe('Line Coverage');
      expect(metrics[0].shortcode).toBe('LCV');
      expect(metrics[0].positiveDirection).toBe('UPWARD');
      expect(metrics[0].isReported).toBe(true);
      expect(metrics[0].isThresholdEnforced).toBe(true);

      // Verify first metric items
      expect(metrics[0].items).toHaveLength(2);
      expect(metrics[0].items[0].key).toBe('AGGREGATE');
      expect(metrics[0].items[0].threshold).toBe(80);
      expect(metrics[0].items[0].latestValue).toBe(85.5);
      expect(metrics[0].items[0].thresholdStatus).toBe('PASSING');

      expect(metrics[0].items[1].key).toBe('PYTHON');
      expect(metrics[0].items[1].threshold).toBe(75);
      expect(metrics[0].items[1].latestValue).toBe(70.2);
      expect(metrics[0].items[1].thresholdStatus).toBe('FAILING');

      // Verify second metric (Duplicate Code Percentage)
      expect(metrics[1].name).toBe('Duplicate Code Percentage');
      expect(metrics[1].shortcode).toBe('DDP');
      expect(metrics[1].positiveDirection).toBe('DOWNWARD');
      expect(metrics[1].isReported).toBe(true);
      expect(metrics[1].isThresholdEnforced).toBe(false);
    });

    it('should handle filtering metrics by shortcode', async () => {
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

      // Mock metrics response with only LCV metric
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

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockMetricsResponse);

      // Call the method with filter
      const metrics = await client.getQualityMetrics(PROJECT_KEY, {
        shortcodeIn: [MetricShortcode.LCV],
      });

      // Verify the response
      expect(metrics).toHaveLength(1);
      expect(metrics[0].shortcode).toBe('LCV');
    });

    it('should return empty array when project is not found', async () => {
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
      const metrics = await client.getQualityMetrics('non-existent-project');

      // Verify the response
      expect(metrics).toEqual([]);
    });

    it('should handle API errors', async () => {
      // Mock projects response
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

      // Set up nock to intercept API calls
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjectsResponse)
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(401, { errors: [{ message: 'Unauthorized access' }] });

      // Call the method and expect it to throw
      await expect(client.getQualityMetrics(PROJECT_KEY)).rejects.toThrow(
        'GraphQL Error: Unauthorized access'
      );
    });
  });

  describe('setMetricThreshold', () => {
    it('should successfully update a threshold', async () => {
      // Mock response for setting threshold
      const mockResponse = {
        data: {
          setRepositoryMetricThreshold: {
            ok: true,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method
      const result = await client.setMetricThreshold({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 85,
      });

      // Verify the response
      expect(result.ok).toBe(true);
    });

    it('should handle null threshold value', async () => {
      // Mock response for removing threshold
      const mockResponse = {
        data: {
          setRepositoryMetricThreshold: {
            ok: true,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method with null threshold to remove it
      const result = await client.setMetricThreshold({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: null,
      });

      // Verify the response
      expect(result.ok).toBe(true);
    });

    it('should handle failure when updating threshold', async () => {
      // Mock response for failed threshold update
      const mockResponse = {
        data: {
          setRepositoryMetricThreshold: {
            ok: false,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method
      const result = await client.setMetricThreshold({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 85,
      });

      // Verify the response
      expect(result.ok).toBe(false);
    });

    it('should handle API errors', async () => {
      // Set up nock to intercept API call and return error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(400, { errors: [{ message: 'Invalid input' }] });

      // Call the method and expect it to throw
      await expect(
        client.setMetricThreshold({
          repositoryId: REPOSITORY_ID,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
          thresholdValue: 85,
        })
      ).rejects.toThrow('GraphQL Error: Invalid input');
    });
  });

  describe('updateMetricSetting', () => {
    it('should successfully update metric settings', async () => {
      // Mock response for updating settings
      const mockResponse = {
        data: {
          updateRepositoryMetricSetting: {
            ok: true,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method
      const result = await client.updateMetricSetting({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: true,
      });

      // Verify the response
      expect(result.ok).toBe(true);
    });

    it('should handle disabling a metric', async () => {
      // Mock response for disabling a metric
      const mockResponse = {
        data: {
          updateRepositoryMetricSetting: {
            ok: true,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method to disable a metric
      const result = await client.updateMetricSetting({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        isReported: false,
        isThresholdEnforced: false,
      });

      // Verify the response
      expect(result.ok).toBe(true);
    });

    it('should handle failure when updating settings', async () => {
      // Mock response for failed settings update
      const mockResponse = {
        data: {
          updateRepositoryMetricSetting: {
            ok: false,
          },
        },
      };

      // Set up nock to intercept API call
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockResponse);

      // Call the method
      const result = await client.updateMetricSetting({
        repositoryId: REPOSITORY_ID,
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: true,
      });

      // Verify the response
      expect(result.ok).toBe(false);
    });

    it('should handle API errors', async () => {
      // Set up nock to intercept API call and return error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(400, { errors: [{ message: 'Invalid input' }] });

      // Call the method and expect it to throw
      await expect(
        client.updateMetricSetting({
          repositoryId: REPOSITORY_ID,
          metricShortcode: MetricShortcode.LCV,
          isReported: true,
          isThresholdEnforced: true,
        })
      ).rejects.toThrow('GraphQL Error: Invalid input');
    });
  });
});
