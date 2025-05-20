/**
 * @jest-environment node
 */

import {
  MetricShortcode,
  MetricKey,
  MetricThresholdStatus,
  MetricDirection,
  MetricSetting,
  UpdateMetricThresholdParams,
  UpdateMetricSettingParams,
  MetricThresholdUpdateResponse,
  MetricSettingUpdateResponse,
  RepositoryMetricItem,
  RepositoryMetric,
  MetricHistoryValue,
  MetricHistoryParams,
  MetricHistoryResponse,
} from '../../models/metrics';

describe('Metrics Models', () => {
  describe('Enum Types', () => {
    describe('MetricShortcode', () => {
      it('should define the correct metric shortcodes', () => {
        expect(MetricShortcode.LCV).toBe('LCV'); // Line Coverage
        expect(MetricShortcode.BCV).toBe('BCV'); // Branch Coverage
        expect(MetricShortcode.DCV).toBe('DCV'); // Documentation Coverage
        expect(MetricShortcode.DDP).toBe('DDP'); // Duplicate Code Percentage
        expect(MetricShortcode.SCV).toBe('SCV'); // Statement Coverage
        expect(MetricShortcode.TCV).toBe('TCV'); // Type Coverage
        expect(MetricShortcode.CMP).toBe('CMP'); // Complexity
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(MetricShortcode).length).toBe(7);
      });
    });

    describe('MetricKey', () => {
      it('should define the correct metric keys', () => {
        expect(MetricKey.AGGREGATE).toBe('AGGREGATE');
        expect(MetricKey.PYTHON).toBe('PYTHON');
        expect(MetricKey.JAVASCRIPT).toBe('JAVASCRIPT');
        expect(MetricKey.TYPESCRIPT).toBe('TYPESCRIPT');
        expect(MetricKey.GO).toBe('GO');
        expect(MetricKey.JAVA).toBe('JAVA');
        expect(MetricKey.RUBY).toBe('RUBY');
        expect(MetricKey.RUST).toBe('RUST');
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(MetricKey).length).toBe(8);
      });
    });

    describe('MetricThresholdStatus', () => {
      it('should define the correct threshold statuses', () => {
        expect(MetricThresholdStatus.PASSING).toBe('PASSING');
        expect(MetricThresholdStatus.FAILING).toBe('FAILING');
        expect(MetricThresholdStatus.UNKNOWN).toBe('UNKNOWN');
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(MetricThresholdStatus).length).toBe(3);
      });
    });

    describe('MetricDirection', () => {
      it('should define the correct metric directions', () => {
        expect(MetricDirection.UPWARD).toBe('UPWARD');
        expect(MetricDirection.DOWNWARD).toBe('DOWNWARD');
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(MetricDirection).length).toBe(2);
      });
    });
  });

  describe('Interface Type Checking', () => {
    describe('MetricSetting', () => {
      it('should validate a correct metric setting object', () => {
        const metricSetting: MetricSetting = {
          isReported: true,
          isThresholdEnforced: false,
        };

        // TypeScript type checking will ensure this compiles correctly
        expect(metricSetting.isReported).toBe(true);
        expect(metricSetting.isThresholdEnforced).toBe(false);
      });
    });

    describe('UpdateMetricThresholdParams', () => {
      it('should validate a correct update threshold params object', () => {
        const updateParams: UpdateMetricThresholdParams = {
          repositoryId: 'repo_123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.PYTHON,
          thresholdValue: 85,
        };

        expect(updateParams.repositoryId).toBe('repo_123');
        expect(updateParams.metricShortcode).toBe(MetricShortcode.LCV);
        expect(updateParams.metricKey).toBe(MetricKey.PYTHON);
        expect(updateParams.thresholdValue).toBe(85);
      });

      it('should allow thresholdValue to be null', () => {
        const updateParams: UpdateMetricThresholdParams = {
          repositoryId: 'repo_123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.PYTHON,
          thresholdValue: null,
        };

        expect(updateParams.thresholdValue).toBeNull();
      });
    });

    describe('UpdateMetricSettingParams', () => {
      it('should validate a correct update setting params object', () => {
        const updateParams: UpdateMetricSettingParams = {
          repositoryId: 'repo_123',
          metricShortcode: MetricShortcode.BCV,
          isReported: true,
          isThresholdEnforced: false,
        };

        expect(updateParams.repositoryId).toBe('repo_123');
        expect(updateParams.metricShortcode).toBe(MetricShortcode.BCV);
        expect(updateParams.isReported).toBe(true);
        expect(updateParams.isThresholdEnforced).toBe(false);
      });
    });

    describe('Response Interfaces', () => {
      it('should validate MetricThresholdUpdateResponse', () => {
        const response: MetricThresholdUpdateResponse = {
          ok: true,
        };

        expect(response.ok).toBe(true);
      });

      it('should validate MetricSettingUpdateResponse', () => {
        const response: MetricSettingUpdateResponse = {
          ok: false,
        };

        expect(response.ok).toBe(false);
      });
    });

    describe('RepositoryMetricItem', () => {
      it('should validate a valid metric item with threshold', () => {
        const metricItem: RepositoryMetricItem = {
          id: 'metric_123',
          key: MetricKey.TYPESCRIPT,
          threshold: 80,
          latestValue: 75.5,
          latestValueDisplay: '75.5%',
          thresholdStatus: MetricThresholdStatus.FAILING,
        };

        expect(metricItem.id).toBe('metric_123');
        expect(metricItem.key).toBe(MetricKey.TYPESCRIPT);
        expect(metricItem.threshold).toBe(80);
        expect(metricItem.latestValue).toBe(75.5);
        expect(metricItem.latestValueDisplay).toBe('75.5%');
        expect(metricItem.thresholdStatus).toBe(MetricThresholdStatus.FAILING);
      });

      it('should validate a valid metric item without threshold', () => {
        const metricItem: RepositoryMetricItem = {
          id: 'metric_123',
          key: MetricKey.TYPESCRIPT,
          threshold: null,
          latestValue: 75.5,
          latestValueDisplay: '75.5%',
          thresholdStatus: MetricThresholdStatus.UNKNOWN,
        };

        expect(metricItem.threshold).toBeNull();
      });

      it('should validate a valid metric item without latest value', () => {
        const metricItem: RepositoryMetricItem = {
          id: 'metric_123',
          key: MetricKey.TYPESCRIPT,
          threshold: 80,
          latestValue: null,
          latestValueDisplay: 'N/A',
          thresholdStatus: MetricThresholdStatus.UNKNOWN,
        };

        expect(metricItem.latestValue).toBeNull();
        expect(metricItem.latestValueDisplay).toBe('N/A');
      });
    });

    describe('RepositoryMetric', () => {
      it('should validate a complete repository metric object', () => {
        const metric: RepositoryMetric = {
          name: 'Line Coverage',
          shortcode: MetricShortcode.LCV,
          description: 'Percentage of lines covered by tests',
          positiveDirection: MetricDirection.UPWARD,
          unit: '%',
          minValueAllowed: 0,
          maxValueAllowed: 100,
          isReported: true,
          isThresholdEnforced: true,
          items: [
            {
              id: 'metric_agg_123',
              key: MetricKey.AGGREGATE,
              threshold: 80,
              latestValue: 78.5,
              latestValueDisplay: '78.5%',
              thresholdStatus: MetricThresholdStatus.FAILING,
            },
            {
              id: 'metric_py_123',
              key: MetricKey.PYTHON,
              threshold: 75,
              latestValue: 82.3,
              latestValueDisplay: '82.3%',
              thresholdStatus: MetricThresholdStatus.PASSING,
            },
          ],
        };

        expect(metric.name).toBe('Line Coverage');
        expect(metric.shortcode).toBe(MetricShortcode.LCV);
        expect(metric.positiveDirection).toBe(MetricDirection.UPWARD);
        expect(metric.items.length).toBe(2);
        expect(metric.items[0].key).toBe(MetricKey.AGGREGATE);
        expect(metric.items[1].key).toBe(MetricKey.PYTHON);
      });
    });

    describe('MetricHistoryValue', () => {
      it('should validate a valid metric history value', () => {
        const historyValue: MetricHistoryValue = {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: 80,
          thresholdStatus: MetricThresholdStatus.PASSING,
          commitOid: 'abc123def456',
          createdAt: '2023-01-15T12:30:45Z',
        };

        expect(historyValue.value).toBe(85.5);
        expect(historyValue.valueDisplay).toBe('85.5%');
        expect(historyValue.threshold).toBe(80);
        expect(historyValue.thresholdStatus).toBe(MetricThresholdStatus.PASSING);
        expect(historyValue.commitOid).toBe('abc123def456');
        expect(historyValue.createdAt).toBe('2023-01-15T12:30:45Z');
      });

      it('should allow optional fields to be undefined', () => {
        const historyValue: MetricHistoryValue = {
          value: 85.5,
          valueDisplay: '85.5%',
          commitOid: 'abc123def456',
          createdAt: '2023-01-15T12:30:45Z',
        };

        expect(historyValue.threshold).toBeUndefined();
        expect(historyValue.thresholdStatus).toBeUndefined();
      });

      it('should allow threshold to be null', () => {
        const historyValue: MetricHistoryValue = {
          value: 85.5,
          valueDisplay: '85.5%',
          threshold: null,
          thresholdStatus: MetricThresholdStatus.UNKNOWN,
          commitOid: 'abc123def456',
          createdAt: '2023-01-15T12:30:45Z',
        };

        expect(historyValue.threshold).toBeNull();
      });
    });

    describe('MetricHistoryParams', () => {
      it('should validate a minimal parameter set', () => {
        const params: MetricHistoryParams = {
          projectKey: 'project_123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        };

        expect(params.projectKey).toBe('project_123');
        expect(params.metricShortcode).toBe(MetricShortcode.LCV);
        expect(params.metricKey).toBe(MetricKey.AGGREGATE);
      });

      it('should validate a complete parameter set', () => {
        const params: MetricHistoryParams = {
          projectKey: 'project_123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-02-01T00:00:00Z',
          limit: 30,
        };

        expect(params.startDate).toBe('2023-01-01T00:00:00Z');
        expect(params.endDate).toBe('2023-02-01T00:00:00Z');
        expect(params.limit).toBe(30);
      });
    });

    describe('MetricHistoryResponse', () => {
      it('should validate a valid history response', () => {
        const response: MetricHistoryResponse = {
          shortcode: MetricShortcode.LCV,
          metricKey: MetricKey.PYTHON,
          name: 'Line Coverage',
          unit: '%',
          positiveDirection: MetricDirection.UPWARD,
          threshold: 80,
          isTrendingPositive: true,
          values: [
            {
              value: 78.5,
              valueDisplay: '78.5%',
              threshold: 80,
              thresholdStatus: MetricThresholdStatus.FAILING,
              commitOid: 'abc123',
              createdAt: '2023-01-01T00:00:00Z',
            },
            {
              value: 85.2,
              valueDisplay: '85.2%',
              threshold: 80,
              thresholdStatus: MetricThresholdStatus.PASSING,
              commitOid: 'def456',
              createdAt: '2023-01-15T00:00:00Z',
            },
          ],
        };

        expect(response.shortcode).toBe(MetricShortcode.LCV);
        expect(response.metricKey).toBe(MetricKey.PYTHON);
        expect(response.name).toBe('Line Coverage');
        expect(response.threshold).toBe(80);
        expect(response.isTrendingPositive).toBe(true);
        expect(response.values.length).toBe(2);
        expect(response.values[0].value).toBe(78.5);
        expect(response.values[1].thresholdStatus).toBe(MetricThresholdStatus.PASSING);
      });

      it('should allow threshold to be null', () => {
        const response: MetricHistoryResponse = {
          shortcode: MetricShortcode.LCV,
          metricKey: MetricKey.PYTHON,
          name: 'Line Coverage',
          unit: '%',
          positiveDirection: MetricDirection.UPWARD,
          threshold: null,
          isTrendingPositive: true,
          values: [],
        };

        expect(response.threshold).toBeNull();
      });
    });
  });

  // Additional test for serialization and deserialization
  describe('JSON Serialization & Deserialization', () => {
    it('should correctly serialize and deserialize metric objects', () => {
      const original: RepositoryMetric = {
        name: 'Line Coverage',
        shortcode: MetricShortcode.LCV,
        description: 'Percentage of lines covered by tests',
        positiveDirection: MetricDirection.UPWARD,
        unit: '%',
        minValueAllowed: 0,
        maxValueAllowed: 100,
        isReported: true,
        isThresholdEnforced: true,
        items: [
          {
            id: 'metric_agg_123',
            key: MetricKey.AGGREGATE,
            threshold: 80,
            latestValue: 78.5,
            latestValueDisplay: '78.5%',
            thresholdStatus: MetricThresholdStatus.FAILING,
          },
        ],
      };

      const json = JSON.stringify(original);
      const deserialized = JSON.parse(json) as RepositoryMetric;

      expect(deserialized).toEqual(original);
      expect(deserialized.shortcode).toBe(MetricShortcode.LCV);
      expect(deserialized.positiveDirection).toBe(MetricDirection.UPWARD);
      expect(deserialized.items[0].thresholdStatus).toBe(MetricThresholdStatus.FAILING);
    });

    it('should handle nullable fields during serialization', () => {
      const original: RepositoryMetricItem = {
        id: 'metric_123',
        key: MetricKey.TYPESCRIPT,
        threshold: null,
        latestValue: null,
        latestValueDisplay: 'N/A',
        thresholdStatus: MetricThresholdStatus.UNKNOWN,
      };

      const json = JSON.stringify(original);
      const deserialized = JSON.parse(json) as RepositoryMetricItem;

      expect(deserialized.threshold).toBeNull();
      expect(deserialized.latestValue).toBeNull();
    });
  });
});