import { MetricDirection, MetricKey, MetricShortcode } from '../types/metrics.js';
import { getPrivateMethod } from './test-utils/private-method-access.js';

describe('DeepSource Historical Data Processing', () => {
  describe('processHistoricalData', () => {
    // Define types for better documentation
    type HistoricalParams = {
      projectKey: string;
      metricShortcode: MetricShortcode;
      metricKey: MetricKey;
      startDate?: string;
      endDate?: string;
      limit?: number;
    };

    type HistoricalValue = {
      value: number;
      valueDisplay: string;
      threshold?: number | null;
      thresholdStatus?: string;
      commitOid: string;
      createdAt: string;
    };

    // Access the private static method using our utility
    // Define a specific type for the historical data processor function
    type HistoricalDataProcessor = (_data: unknown, _params: HistoricalParams) => HistoricalValue[];

    const processHistoricalData =
      getPrivateMethod<HistoricalDataProcessor>('processHistoricalData');

    it('should process historical data from GraphQL response', () => {
      // Sample GraphQL response data
      const sampleData = {
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
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const params = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // Process the data
      const result = processHistoricalData(sampleData, params);

      // Verify the results
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);

      // Check first value
      expect(result[0].value).toBe(75.2);
      expect(result[0].valueDisplay).toBe('75.2%');
      expect(result[0].threshold).toBe(80);
      expect(result[0].thresholdStatus).toBe('FAILING');
      expect(result[0].commitOid).toBe('commit1');
      expect(result[0].createdAt).toBe('2023-01-01T12:00:00Z');

      // Check second value
      expect(result[1].value).toBe(80.3);
      expect(result[1].valueDisplay).toBe('80.3%');
      expect(result[1].threshold).toBe(80);
      expect(result[1].thresholdStatus).toBe('PASSING');
      expect(result[1].commitOid).toBe('commit2');
      expect(result[1].createdAt).toBe('2023-01-15T12:00:00Z');
    });

    it('should handle empty edges in GraphQL response', () => {
      // Sample with empty edges
      const sampleDataEmpty = {
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
                    edges: [],
                  },
                },
              ],
            },
          ],
        },
      };

      const params = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // Process the data
      const result = processHistoricalData(sampleDataEmpty, params);

      // Verify the results
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should handle missing node in GraphQL response', () => {
      // Sample with null node
      const sampleDataNullNode = {
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
                        node: null,
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
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const params = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // Process the data
      const result = processHistoricalData(sampleDataNullNode, params);

      // Verify the results
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);

      // Check the valid node is processed
      expect(result[0].value).toBe(80.3);
      expect(result[0].valueDisplay).toBe('80.3%');
    });

    it('should sort values by createdAt date', () => {
      // Sample with unsorted dates
      const sampleDataUnsorted = {
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
                          id: 'value3',
                          value: 85.5,
                          valueDisplay: '85.5%',
                          threshold: 80,
                          thresholdStatus: 'PASSING',
                          commitOid: 'commit3',
                          createdAt: '2023-02-01T12:00:00Z', // Latest
                        },
                      },
                      {
                        node: {
                          id: 'value1',
                          value: 75.2,
                          valueDisplay: '75.2%',
                          threshold: 80,
                          thresholdStatus: 'FAILING',
                          commitOid: 'commit1',
                          createdAt: '2023-01-01T12:00:00Z', // Earliest
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
                          createdAt: '2023-01-15T12:00:00Z', // Middle
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const params = {
        projectKey: 'test-project',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      };

      // Process the data
      const result = processHistoricalData(sampleDataUnsorted, params);

      // Verify the results are sorted by createdAt in ascending order
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);

      // Check sorted order
      expect(result[0].createdAt).toBe('2023-01-01T12:00:00Z');
      expect(result[1].createdAt).toBe('2023-01-15T12:00:00Z');
      expect(result[2].createdAt).toBe('2023-02-01T12:00:00Z');
    });
  });

  describe('calculateTrendDirection', () => {
    // Define type for better documentation
    type TrendValue = { value: number; createdAt: string };

    // Access the private static method using our utility
    // Define a specific type for the trend direction calculator function
    type TrendDirectionCalculator = (
      _values: TrendValue[],
      _direction: string | MetricDirection
    ) => boolean;

    const calculateTrendDirection =
      getPrivateMethod<TrendDirectionCalculator>('calculateTrendDirection');

    it('should return true when not enough data points', () => {
      // One data point isn't enough to determine a trend
      const singleValue = [{ value: 75, createdAt: '2023-01-01T12:00:00Z' }];

      expect(calculateTrendDirection(singleValue, 'UPWARD')).toBe(true);
      expect(calculateTrendDirection([], 'UPWARD')).toBe(true);
    });

    it('should identify positive trend for upward metrics', () => {
      const increasingValues = [
        { value: 70, createdAt: '2023-01-01T12:00:00Z' },
        { value: 75, createdAt: '2023-01-15T12:00:00Z' },
        { value: 80, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(increasingValues, 'UPWARD')).toBe(true);
      expect(calculateTrendDirection(increasingValues, MetricDirection.UPWARD)).toBe(true);
    });

    it('should identify negative trend for upward metrics', () => {
      const decreasingValues = [
        { value: 90, createdAt: '2023-01-01T12:00:00Z' },
        { value: 85, createdAt: '2023-01-15T12:00:00Z' },
        { value: 80, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(decreasingValues, 'UPWARD')).toBe(false);
      expect(calculateTrendDirection(decreasingValues, MetricDirection.UPWARD)).toBe(false);
    });

    it('should identify positive trend for downward metrics', () => {
      const decreasingValues = [
        { value: 15, createdAt: '2023-01-01T12:00:00Z' },
        { value: 10, createdAt: '2023-01-15T12:00:00Z' },
        { value: 5, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(decreasingValues, 'DOWNWARD')).toBe(true);
      expect(calculateTrendDirection(decreasingValues, MetricDirection.DOWNWARD)).toBe(true);
    });

    it('should identify negative trend for downward metrics', () => {
      const increasingValues = [
        { value: 5, createdAt: '2023-01-01T12:00:00Z' },
        { value: 10, createdAt: '2023-01-15T12:00:00Z' },
        { value: 15, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(increasingValues, 'DOWNWARD')).toBe(false);
      expect(calculateTrendDirection(increasingValues, MetricDirection.DOWNWARD)).toBe(false);
    });
  });
});
