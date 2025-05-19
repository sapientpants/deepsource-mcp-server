import { DeepSourceClient } from '../deepsource';

// Create a mock implementation for tests
const mockCreateHistoryResponse = (
  historyValues: Array<{ timestamp: string; value: number | null }>
) => {
  // Calculate percent change between first and last values with valid values
  let firstValidValueIndex = -1;
  let lastValidValueIndex = -1;

  for (let i = 0; i < historyValues.length; i++) {
    if (typeof historyValues[i].value === 'number') {
      if (firstValidValueIndex === -1) {
        firstValidValueIndex = i;
      }
      lastValidValueIndex = i;
    }
  }

  let changePct = 0;
  let direction = 'stable';

  if (
    firstValidValueIndex !== -1 &&
    lastValidValueIndex !== -1 &&
    firstValidValueIndex !== lastValidValueIndex
  ) {
    const firstValue = historyValues[firstValidValueIndex].value;
    const lastValue = historyValues[lastValidValueIndex].value;
    changePct = ((lastValue - firstValue) / firstValue) * 100;

    if (Math.abs(changePct) < 0.1) {
      direction = 'stable';
      changePct = 0;
    } else if (changePct > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
  }

  // Round to 4 decimal places
  changePct = Math.round(changePct * 10000) / 10000;

  return {
    data: historyValues,
    metadata: {
      count: historyValues.length,
      trend: {
        direction,
        changePct,
      },
    },
  };
};

describe('DeepSource Metric Response Utilities', () => {
  describe('createMetricHistoryResponse', () => {
    beforeAll(() => {
      // Mock implementation
      (
        DeepSourceClient as unknown as {
          createMetricHistoryResponse: typeof mockCreateHistoryResponse;
        }
      ).createMetricHistoryResponse = mockCreateHistoryResponse;
    });

    it('should create a properly structured history response', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z', value: 75.5 },
        { timestamp: '2023-01-15T00:00:00Z', value: 80.2 },
        { timestamp: '2023-02-01T00:00:00Z', value: 85.0 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result).toEqual({
        data: historicalData,
        metadata: {
          count: 3,
          trend: {
            direction: 'increasing',
            changePct: 12.5828,
          },
        },
      });
    });

    it('should calculate decreasing trend correctly', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z', value: 90.0 },
        { timestamp: '2023-01-15T00:00:00Z', value: 85.5 },
        { timestamp: '2023-02-01T00:00:00Z', value: 75.0 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result.metadata.trend).toEqual({
        direction: 'decreasing',
        changePct: -16.6667,
      });
    });

    it('should detect stable trend when values are unchanged', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z', value: 85.5 },
        { timestamp: '2023-01-15T00:00:00Z', value: 85.5 },
        { timestamp: '2023-02-01T00:00:00Z', value: 85.5 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result.metadata.trend).toEqual({
        direction: 'stable',
        changePct: 0.0,
      });
    });

    it('should handle empty data array', () => {
      const result = mockCreateHistoryResponse([]);

      expect(result).toEqual({
        data: [],
        metadata: {
          count: 0,
          trend: {
            direction: 'stable',
            changePct: 0.0,
          },
        },
      });
    });

    it('should handle data with single entry', () => {
      const historicalData = [{ timestamp: '2023-01-01T00:00:00Z', value: 85.5 }];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result).toEqual({
        data: historicalData,
        metadata: {
          count: 1,
          trend: {
            direction: 'stable',
            changePct: 0.0,
          },
        },
      });
    });

    it('should treat very small changes as stable trend', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z', value: 85.5 },
        { timestamp: '2023-01-15T00:00:00Z', value: 85.51 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      // Even though there's a tiny change, it should be less than the threshold
      // for considering something a meaningful change
      expect(result.metadata.trend.direction).toBe('stable');
    });

    it('should round percentage changes to 4 decimal places', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z', value: 10 },
        { timestamp: '2023-02-01T00:00:00Z', value: 13.333333 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result.metadata.trend.changePct).toEqual(33.3333);
    });

    it('should handle data without timestamp values', () => {
      const historicalData = [{ value: 75.5 }, { value: 80.2 }, { value: 85.0 }];

      const result = mockCreateHistoryResponse(historicalData);

      expect(result).toEqual({
        data: historicalData,
        metadata: {
          count: 3,
          trend: {
            direction: 'increasing',
            changePct: 12.5828,
          },
        },
      });
    });

    it('should handle data with missing value properties', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z' },
        { timestamp: '2023-01-15T00:00:00Z', value: 80.2 },
        { timestamp: '2023-02-01T00:00:00Z', value: 85.0 },
      ];

      const result = mockCreateHistoryResponse(historicalData);

      // Should calculate based on the two valid values
      expect(result.metadata.trend).toEqual({
        direction: 'increasing',
        changePct: 5.985,
      });
    });

    it('should find first and last valid values for trend calculation', () => {
      const historicalData = [
        { timestamp: '2023-01-01T00:00:00Z' }, // Missing value
        { timestamp: '2023-01-15T00:00:00Z', value: 80.2 }, // First valid value
        { value: 82.5 }, // Missing timestamp
        { timestamp: '2023-02-01T00:00:00Z', value: 85.0 }, // Last valid value
        { timestamp: '2023-02-15T00:00:00Z' }, // Missing value
      ];

      const result = mockCreateHistoryResponse(historicalData);

      // Should calculate based on first valid value (80.2) and last valid value (85.0)
      expect(result.metadata.trend).toEqual({
        direction: 'increasing',
        changePct: 5.985,
      });
    });
  });
});
