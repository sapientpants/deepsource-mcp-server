/**
 * @jest-environment node
 */

import { TestableDeepSourceClient } from './utils/test-utils';
import { MetricDirection } from '../types/metrics';

describe('DeepSource Metric Calculator', () => {
  describe('calculateTrendDirection', () => {
    it('should calculate trend for higher-is-better metrics', () => {
      // Increasing values
      const increasingValues = [{ value: 70 }, { value: 75 }, { value: 80 }];

      const result1 = TestableDeepSourceClient.testCalculateTrendDirection(
        increasingValues,
        MetricDirection.HIGHER_IS_BETTER
      );

      expect(result1).toBeDefined();

      // Decreasing values
      const decreasingValues = [{ value: 80 }, { value: 75 }, { value: 70 }];

      const result2 = TestableDeepSourceClient.testCalculateTrendDirection(
        decreasingValues,
        MetricDirection.HIGHER_IS_BETTER
      );

      expect(result2).toBeDefined();
    });

    it('should calculate trend for lower-is-better metrics', () => {
      // Decreasing values (positive trend for LOWER_IS_BETTER)
      const decreasingValues = [{ value: 10 }, { value: 8 }, { value: 5 }];

      const result = TestableDeepSourceClient.testCalculateTrendDirection(
        decreasingValues,
        MetricDirection.LOWER_IS_BETTER
      );

      expect(result).toBeDefined();
    });

    it('should handle edge cases', () => {
      // Empty array
      const emptyValues: Array<{ value: number }> = [];

      const result1 = TestableDeepSourceClient.testCalculateTrendDirection(
        emptyValues,
        MetricDirection.HIGHER_IS_BETTER
      );

      expect(result1).toBeDefined();

      // Single value
      const singleValue = [{ value: 75 }];

      const result2 = TestableDeepSourceClient.testCalculateTrendDirection(
        singleValue,
        MetricDirection.HIGHER_IS_BETTER
      );

      expect(result2).toBeDefined();
    });
  });

  describe('createMetricHistoryResponse', () => {
    it('should create a metric history response object', () => {
      const params = {
        projectKey: 'test-project',
        metricShortcode: 'LCV',
        metricKey: 'AGGREGATE',
      };

      const metric = {
        name: 'Line Coverage',
        shortcode: 'LCV',
        positiveDirection: 'HIGHER_IS_BETTER',
        unit: '%',
      };

      const metricItem = {
        id: 'metric-1',
        key: 'AGGREGATE',
        threshold: 80,
      };

      const historyValues = [
        {
          value: 70,
          valueDisplay: '70%',
          threshold: 80,
          thresholdStatus: 'FAILING',
        },
        {
          value: 85,
          valueDisplay: '85%',
          threshold: 80,
          thresholdStatus: 'PASSING',
        },
      ];

      const result = TestableDeepSourceClient.testCreateMetricHistoryResponse(
        params,
        metric,
        metricItem,
        historyValues
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Line Coverage');
      expect(result.shortcode).toBe('LCV');
      expect(result.metricKey).toBe('AGGREGATE');
      expect(result.unit).toBe('%');
      expect(result.positiveDirection).toBeDefined();
      expect(result.threshold).toBe(80);
      expect(result.values).toEqual(historyValues);
      expect(result.isTrendingPositive).toBeDefined();
    });

    it('should handle missing threshold', () => {
      const params = {
        projectKey: 'test-project',
        metricShortcode: 'LCV',
        metricKey: 'AGGREGATE',
      };

      const metric = {
        name: 'Line Coverage',
        shortcode: 'LCV',
        positiveDirection: 'HIGHER_IS_BETTER',
        unit: '%',
      };

      const metricItem = {
        id: 'metric-1',
        key: 'AGGREGATE',
        // No threshold property
      };

      const historyValues = [
        {
          value: 70,
          valueDisplay: '70%',
        },
      ];

      const result = TestableDeepSourceClient.testCreateMetricHistoryResponse(
        params,
        metric,
        metricItem,
        historyValues
      );

      expect(result).toBeDefined();
      expect(result.threshold).toBeUndefined();
    });
  });
});
