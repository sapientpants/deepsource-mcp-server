/**
 * Tests for DeepSource historical data error handling
 * This file focuses specifically on testing error paths for historical data retrieval
 */
import { jest } from '@jest/globals';
import {
  DeepSourceClient,
  MetricDirection,
  MetricHistoryParams,
  MetricShortcode,
} from '../deepsource.js';
import { MetricKey } from '../types/metrics.js';
import { getPrivateMethod } from './test-utils/private-method-access.js';

describe('DeepSource Historical Data Error Handling', () => {
  let client: DeepSourceClient;

  // Create a mock axios client for testing
  const mockAxiosClient = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a client with the mock axios instance
    client = new DeepSourceClient('test-api-key');
    // @ts-expect-error - Setting private property for testing
    client.client = mockAxiosClient;
  });

  describe('validateAndGetMetricInfo', () => {
    // Access the private method
    const validateAndGetMetricInfoMethod = 'validateAndGetMetricInfo';

    it('should throw error when project is not found', async () => {
      // Mock the listProjects response to be empty
      jest.spyOn(client, 'listProjects').mockResolvedValue([]);

      // Attempt to validate with non-existent project
      const params: MetricHistoryParams = {
        projectKey: 'non-existent-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // @ts-expect-error - Accessing private method for testing
      await expect(client[validateAndGetMetricInfoMethod](params)).rejects.toThrow(
        'Project with key non-existent-project not found'
      );
    });

    it('should throw error when metricShortcode is missing', async () => {
      // Create params with missing metricShortcode
      const params = {
        projectKey: 'test-project',
        metricKey: MetricKey.AGGREGATE,
      } as MetricHistoryParams;

      // @ts-expect-error - Accessing private method for testing
      await expect(client[validateAndGetMetricInfoMethod](params)).rejects.toThrow(
        'Missing required parameter: metricShortcode'
      );
    });

    it('should throw error when metricKey is missing', async () => {
      // Create params with missing metricKey
      const params = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
      } as MetricHistoryParams;

      // @ts-expect-error - Accessing private method for testing
      await expect(client[validateAndGetMetricInfoMethod](params)).rejects.toThrow(
        'Missing required parameter: metricKey'
      );
    });

    it('should throw error when metric is not found', async () => {
      // Mock necessary responses
      const mockProject = {
        key: 'test-project',
        name: 'Test Project',
        repository: {
          login: 'testorg',
          name: 'test-repo',
          provider: 'github',
        },
      };

      jest.spyOn(client, 'listProjects').mockResolvedValue([mockProject]);
      jest.spyOn(client, 'getQualityMetrics').mockResolvedValue([]);

      // Valid params but metric doesn't exist
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // @ts-expect-error - Accessing private method for testing
      await expect(client[validateAndGetMetricInfoMethod](params)).rejects.toThrow(
        'Metric with shortcode LCV not found in project'
      );
    });

    it('should throw error when metric item is not found', async () => {
      // Mock necessary responses
      const mockProject = {
        key: 'test-project',
        name: 'Test Project',
        repository: {
          login: 'testorg',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockMetric = {
        shortcode: MetricShortcode.LCV,
        name: 'Line Coverage',
        items: [], // Empty items so metric item won't be found
      };

      jest.spyOn(client, 'listProjects').mockResolvedValue([mockProject]);
      jest.spyOn(client, 'getQualityMetrics').mockResolvedValue([mockMetric]);

      // Valid params but metric item doesn't exist
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // @ts-expect-error - Accessing private method for testing
      await expect(client[validateAndGetMetricInfoMethod](params)).rejects.toThrow(
        'Metric item with key AGGREGATE not found in metric LCV'
      );
    });
  });

  describe('fetchHistoricalValues', () => {
    // Access the private method
    const fetchHistoricalValuesMethod = 'fetchHistoricalValues';

    it('should throw error when GraphQL response contains errors', async () => {
      // Mock the project and metric item
      const mockProject = {
        key: 'test-project',
        name: 'Test Project',
        repository: {
          login: 'testorg',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockMetricItem = {
        id: 'metric-item-id',
        key: MetricKey.AGGREGATE,
      };

      // Mock the API response to contain GraphQL errors
      mockAxiosClient.post.mockResolvedValue({
        data: {
          errors: [{ message: 'GraphQL error: Resource not found' }],
        },
      });

      // Valid params
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // @ts-expect-error - Accessing private method for testing
      await expect(
        client[fetchHistoricalValuesMethod](params, mockProject, mockMetricItem)
      ).rejects.toThrow('GraphQL Errors: GraphQL error: Resource not found');
    });
  });

  describe('processHistoricalData', () => {
    // Access the static private method
    const processHistoricalData =
      getPrivateMethod<(_data: Record<string, unknown>, _params: MetricHistoryParams) => unknown[]>(
        'processHistoricalData'
      );

    it('should throw error when repository data is missing', () => {
      // Invalid response without repository
      const invalidData = {};

      // Valid params
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      expect(() => processHistoricalData(invalidData, params)).toThrow(
        'Repository or metrics data not found in response'
      );
    });

    it('should throw error when metrics array is missing', () => {
      // Invalid response with repository but without metrics array
      const invalidData = {
        repository: {
          // No metrics property
        },
      };

      // Valid params
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      expect(() => processHistoricalData(invalidData, params)).toThrow(
        'Repository or metrics data not found in response'
      );
    });

    it('should throw error when metric with matching shortcode is not found', () => {
      // Response with metrics but none match the requested shortcode
      const invalidData = {
        repository: {
          metrics: [
            {
              shortcode: 'DDP', // Different shortcode
              name: 'Duplicate Code Percentage',
              items: [],
            },
          ],
        },
      };

      // Valid params
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      expect(() => processHistoricalData(invalidData, params)).toThrow(
        'Metric with shortcode LCV not found in response'
      );
    });

    it('should throw error when metric item data is invalid or missing', () => {
      // Response with correct metric but missing values or edges
      const invalidData = {
        repository: {
          metrics: [
            {
              shortcode: 'LCV',
              name: 'Line Coverage',
              items: [
                {
                  key: 'AGGREGATE',
                  // Missing values property
                },
              ],
            },
          ],
        },
      };

      // Valid params
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      expect(() => processHistoricalData(invalidData, params)).toThrow(
        'Metric item data not found or invalid in response'
      );
    });
  });

  describe('calculateTrendDirection', () => {
    // Access the static private method
    const calculateTrendDirection =
      getPrivateMethod<
        (
          _values: { value: number; createdAt: string }[],
          _direction: string | MetricDirection
        ) => boolean
      >('calculateTrendDirection');

    it('should handle empty values array', () => {
      const result = calculateTrendDirection([], MetricDirection.UPWARD);
      expect(result).toBe(true); // Default to true when not enough data
    });

    it('should handle single value in array', () => {
      const values = [{ value: 75, createdAt: '2023-01-01T12:00:00Z' }];

      const result = calculateTrendDirection(values, MetricDirection.UPWARD);
      expect(result).toBe(true); // Default to true when not enough data
    });

    it('should correctly interpret upward trend with string direction', () => {
      const values = [
        { value: 70, createdAt: '2023-01-01T12:00:00Z' },
        { value: 80, createdAt: '2023-01-15T12:00:00Z' },
      ];

      expect(calculateTrendDirection(values, 'UPWARD')).toBe(true);
    });

    it('should correctly interpret downward trend with string direction', () => {
      const values = [
        { value: 20, createdAt: '2023-01-01T12:00:00Z' },
        { value: 10, createdAt: '2023-01-15T12:00:00Z' },
      ];

      expect(calculateTrendDirection(values, 'DOWNWARD')).toBe(true);
    });
  });

  describe('createMetricHistoryResponse', () => {
    // Access the static private method
    const createMetricHistoryResponse = getPrivateMethod<
      (
        _params: MetricHistoryParams,
        _metric: { name: string; unit: string; positiveDirection: string | MetricDirection },
        _metricItem: { threshold: number },
        _historyValues: any[]
      ) => unknown
    >('createMetricHistoryResponse');

    it('should create proper response with UPWARD direction', () => {
      // Test data
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      const metric = {
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: 'UPWARD',
      };

      const metricItem = {
        threshold: 80,
      };

      const historyValues = [
        { value: 75, createdAt: '2023-01-01T12:00:00Z' },
        { value: 85, createdAt: '2023-01-15T12:00:00Z' },
      ];

      // Spy on calculateTrendDirection method
      const calculateTrendDirection = getPrivateMethod<any>('calculateTrendDirection');
      const spy = jest.spyOn(
        DeepSourceClient,
        calculateTrendDirection.name as keyof typeof DeepSourceClient
      );
      spy.mockReturnValue(true);

      // Create the response
      const response = createMetricHistoryResponse(params, metric, metricItem, historyValues);

      // Verify the response
      expect(response).toEqual({
        shortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        name: 'Line Coverage',
        unit: '%',
        positiveDirection: MetricDirection.UPWARD,
        threshold: 80,
        isTrendingPositive: true,
        values: historyValues,
      });

      // Clean up
      spy.mockRestore();
    });

    it('should create proper response with DOWNWARD direction', () => {
      // Test data
      const params: MetricHistoryParams = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.DDP,
        metricKey: MetricKey.AGGREGATE,
      };

      const metric = {
        name: 'Duplicate Code Percentage',
        unit: '%',
        positiveDirection: 'DOWNWARD',
      };

      const metricItem = {
        threshold: 10,
      };

      const historyValues = [
        { value: 15, createdAt: '2023-01-01T12:00:00Z' },
        { value: 5, createdAt: '2023-01-15T12:00:00Z' },
      ];

      // Spy on calculateTrendDirection method
      const calculateTrendDirection = getPrivateMethod<any>('calculateTrendDirection');
      const spy = jest.spyOn(
        DeepSourceClient,
        calculateTrendDirection.name as keyof typeof DeepSourceClient
      );
      spy.mockReturnValue(true);

      // Create the response
      const response = createMetricHistoryResponse(params, metric, metricItem, historyValues);

      // Verify the response
      expect(response).toEqual({
        shortcode: MetricShortcode.DDP,
        metricKey: MetricKey.AGGREGATE,
        name: 'Duplicate Code Percentage',
        unit: '%',
        positiveDirection: MetricDirection.DOWNWARD,
        threshold: 10,
        isTrendingPositive: true,
        values: historyValues,
      });

      // Clean up
      spy.mockRestore();
    });
  });
});
