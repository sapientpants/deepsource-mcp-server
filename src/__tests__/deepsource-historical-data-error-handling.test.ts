/**
 * @jest-environment node
 */

import { DeepSourceClient } from '../deepsource';

describe('DeepSourceClient Historical Data Error Handling', () => {
  // Create a testable version of DeepSourceClient that exposes the private processHistoricalData method
  class TestableDeepSourceClient extends DeepSourceClient {
    static testProcessHistoricalData(
      data: Record<string, unknown>,
      params: Record<string, unknown>
    ) {
      // @ts-expect-error - accessing private static method for testing
      return DeepSourceClient.processHistoricalData(data, params);
    }
  }

  describe('processHistoricalData method error cases', () => {
    it('should throw an error when repository or metrics data is missing (line 3203)', () => {
      // Create data without repository or metrics
      const invalidData = {
        // repository is missing
      };

      // Call the method and expect it to throw
      expect(() => {
        TestableDeepSourceClient.testProcessHistoricalData(invalidData, {
          metricShortcode: 'LCV',
          metricKey: 'AGGREGATE',
        });
      }).toThrow('Repository or metrics data not found in response');
    });

    it('should throw an error when the specified metric is not found (line 3212)', () => {
      // Create data with repository and metrics, but not the requested metric
      const dataWithoutMetric = {
        repository: {
          metrics: [
            {
              shortcode: 'DDP', // Different from what we'll request
              name: 'Duplicate Code Percentage',
              items: [],
            },
          ],
        },
      };

      // Call the method and expect it to throw
      expect(() => {
        TestableDeepSourceClient.testProcessHistoricalData(dataWithoutMetric, {
          metricShortcode: 'LCV', // Request a metric that doesn't exist in the data
          metricKey: 'AGGREGATE',
        });
      }).toThrow('Metric with shortcode LCV not found in response');
    });

    it('should throw an error when metric item data is invalid (line 3221)', () => {
      // Create data with repository and the correct metric, but invalid metric item data
      const dataWithInvalidItem = {
        repository: {
          metrics: [
            {
              shortcode: 'LCV',
              name: 'Line Coverage',
              items: [
                {
                  key: 'PYTHON', // Different from what we'll request
                  // values is missing
                },
              ],
            },
          ],
        },
      };

      // Call the method and expect it to throw
      expect(() => {
        TestableDeepSourceClient.testProcessHistoricalData(dataWithInvalidItem, {
          metricShortcode: 'LCV',
          metricKey: 'AGGREGATE', // Request a metric key that doesn't exist in the data
        });
      }).toThrow('Metric item data not found or invalid in response');
    });
  });
});
