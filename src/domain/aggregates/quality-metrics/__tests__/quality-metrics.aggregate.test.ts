/**
 * @fileoverview Tests for QualityMetrics aggregate
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { QualityMetrics } from '../quality-metrics.aggregate.js';
import type {
  CreateQualityMetricsParams,
  MetricConfiguration,
  UpdateMetricConfigParams,
  RecordMeasurementParams,
  MetricHistoryEntry,
} from '../quality-metrics.types.js';
import type { ProjectKey, GraphQLNodeId } from '../../../../types/branded.js';
import { MetricShortcode, MetricKey } from '../../../../models/metrics.js';
import { ThresholdValue } from '../../../value-objects/threshold-value.js';
import { MetricValue } from '../../../value-objects/metric-value.js';

describe('QualityMetrics Aggregate', () => {
  let validParams: CreateQualityMetricsParams;
  let projectKey: ProjectKey;
  let repositoryId: GraphQLNodeId;
  let configuration: MetricConfiguration;

  beforeEach(() => {
    projectKey = 'test-project' as ProjectKey;
    repositoryId = 'repo-456' as GraphQLNodeId;
    configuration = {
      name: 'Line Coverage',
      description: 'Percentage of lines covered by tests',
      shortcode: MetricShortcode.LCV,
      metricKey: MetricKey.AGGREGATE,
      unit: '%',
      minAllowed: 0,
      maxAllowed: 100,
      positiveDirection: 'UPWARD',
      isReported: true,
      isThresholdEnforced: true,
      threshold: ThresholdValue.createPercentage(80),
    };

    validParams = {
      projectKey,
      repositoryId,
      configuration,
    };
  });

  describe('create', () => {
    it('should create quality metrics with valid parameters', () => {
      const metrics = QualityMetrics.create(validParams);

      expect(metrics.projectKey).toBe(projectKey);
      expect(metrics.repositoryId).toBe(repositoryId);
      expect(metrics.configuration).toEqual(configuration);
      expect(metrics.currentValue).toBeNull();
      expect(metrics.history).toHaveLength(0);
      expect(metrics.domainEvents).toHaveLength(1);
      expect(metrics.domainEvents[0].eventType).toBe('QualityMetricsCreated');
    });

    it('should create metrics with current value', () => {
      const currentValue = MetricValue.create(85.5, '%');
      const params = {
        ...validParams,
        currentValue,
      };

      const metrics = QualityMetrics.create(params);
      expect(metrics.currentValue).toEqual(currentValue);
    });

    it('should create metrics with history', () => {
      const history: MetricHistoryEntry[] = [
        {
          value: MetricValue.create(75, '%'),
          threshold: ThresholdValue.createPercentage(80),
          thresholdStatus: 'FAILING',
          commitOid: 'commit1',
          recordedAt: new Date('2024-01-01'),
        },
      ];

      const params = {
        ...validParams,
        history,
      };

      const metrics = QualityMetrics.create(params);
      expect(metrics.history).toHaveLength(1);
      expect(metrics.history[0]).toEqual(history[0]);
    });

    it('should create composite ID from project key, metric key, and shortcode', () => {
      const metrics = QualityMetrics.create(validParams);

      // The ID should be a composite of projectKey:metricKey:shortcode
      expect(metrics.id).toBe(`${projectKey}:${MetricKey.AGGREGATE}:${MetricShortcode.LCV}`);
    });

    it('should throw error for empty metric name', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          name: '',
        },
      };

      expect(() => QualityMetrics.create(params)).toThrow('Metric name cannot be empty');
    });

    it('should throw error for whitespace-only metric name', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          name: '   ',
        },
      };

      expect(() => QualityMetrics.create(params)).toThrow('Metric name cannot be empty');
    });

    it('should throw error when min allowed >= max allowed', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          minAllowed: 100,
          maxAllowed: 100,
        },
      };

      expect(() => QualityMetrics.create(params)).toThrow(
        'Min allowed value must be less than max allowed value'
      );
    });

    it('should create metrics without threshold', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          threshold: null,
        },
      };

      const metrics = QualityMetrics.create(params);
      expect(metrics.configuration.threshold).toBeNull();
    });

    it('should emit QualityMetricsCreated event with correct payload', () => {
      const metrics = QualityMetrics.create(validParams);

      const events = metrics.domainEvents;
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('QualityMetricsCreated');
      expect(event.payload).toEqual({
        projectKey,
        metricKey: MetricKey.AGGREGATE,
        shortcode: MetricShortcode.LCV,
        threshold: 80,
      });
    });
  });

  describe('fromPersistence', () => {
    it('should recreate metrics from persistence without events', () => {
      const currentValue = MetricValue.create(85.5, '%');
      const history: MetricHistoryEntry[] = [
        {
          value: MetricValue.create(80, '%'),
          threshold: ThresholdValue.createPercentage(80),
          thresholdStatus: 'PASSING',
          commitOid: 'commit1',
          recordedAt: new Date('2024-01-01'),
        },
      ];

      const persistenceData = {
        id: `${projectKey}:${MetricKey.AGGREGATE}:${MetricShortcode.LCV}`,
        projectKey,
        repositoryId,
        configuration,
        currentValue,
        history,
        lastUpdated: new Date('2024-01-02'),
      };

      const metrics = QualityMetrics.fromPersistence(persistenceData);

      expect(metrics.projectKey).toBe(projectKey);
      expect(metrics.currentValue).toEqual(currentValue);
      expect(metrics.history).toEqual(history);
      expect(metrics.domainEvents).toHaveLength(0); // No events when loading
      expect(metrics.lastUpdated).toEqual(persistenceData.lastUpdated);
    });
  });

  describe('threshold management', () => {
    describe('updateThreshold', () => {
      it('should update threshold to new value', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        const newThreshold = ThresholdValue.createPercentage(90);
        metrics.updateThreshold(newThreshold);

        expect(metrics.configuration.threshold).toEqual(newThreshold);
        expect(metrics.domainEvents).toHaveLength(2); // MetricThresholdUpdated + AggregateModified
        expect(metrics.domainEvents[0].eventType).toBe('MetricThresholdUpdated');
        expect(metrics.domainEvents[0].payload).toEqual({
          oldThreshold: 80,
          newThreshold: 90,
          unit: '%',
        });
      });

      it('should allow removing threshold', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        metrics.updateThreshold(null);

        expect(metrics.configuration.threshold).toBeNull();
        expect(metrics.domainEvents[0].payload).toEqual({
          oldThreshold: 80,
          newThreshold: undefined,
          unit: '%',
        });
      });

      it('should throw error for mismatched units', () => {
        const metrics = QualityMetrics.create(validParams);
        const wrongThreshold = ThresholdValue.create(80, 'ms', 0, 1000);

        expect(() => metrics.updateThreshold(wrongThreshold)).toThrow(
          "Threshold unit 'ms' does not match metric unit '%'"
        );
      });

      it('should throw error for threshold outside allowed range', () => {
        const metrics = QualityMetrics.create(validParams);
        const outOfRangeThreshold = ThresholdValue.create(150, '%', 0, 200);

        expect(() => metrics.updateThreshold(outOfRangeThreshold)).toThrow(
          'Threshold value is outside allowed range for this metric'
        );
      });

      it('should update lastUpdated timestamp', async () => {
        const metrics = QualityMetrics.create(validParams);
        const originalLastUpdated = metrics.lastUpdated;

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        metrics.updateThreshold(ThresholdValue.createPercentage(85));

        expect(metrics.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
      });
    });
  });

  describe('configuration management', () => {
    describe('updateConfiguration', () => {
      it('should update metric name', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        const params: UpdateMetricConfigParams = {
          name: 'Updated Line Coverage',
        };

        metrics.updateConfiguration(params);

        expect(metrics.configuration.name).toBe('Updated Line Coverage');
        expect(metrics.domainEvents[0].eventType).toBe('MetricConfigurationUpdated');
        expect(metrics.domainEvents[0].payload).toEqual(params);
      });

      it('should trim metric name', () => {
        const metrics = QualityMetrics.create(validParams);

        metrics.updateConfiguration({ name: '  New Name  ' });

        expect(metrics.configuration.name).toBe('New Name');
      });

      it('should throw error for empty name update', () => {
        const metrics = QualityMetrics.create(validParams);

        expect(() => metrics.updateConfiguration({ name: '' })).toThrow(
          'Metric name cannot be empty'
        );
      });

      it('should update description', () => {
        const metrics = QualityMetrics.create(validParams);

        metrics.updateConfiguration({ description: 'New description' });

        expect(metrics.configuration.description).toBe('New description');
      });

      it('should update isReported flag', () => {
        const metrics = QualityMetrics.create(validParams);

        metrics.updateConfiguration({ isReported: false });

        expect(metrics.configuration.isReported).toBe(false);
      });

      it('should update isThresholdEnforced flag', () => {
        const metrics = QualityMetrics.create(validParams);

        metrics.updateConfiguration({ isThresholdEnforced: false });

        expect(metrics.configuration.isThresholdEnforced).toBe(false);
      });

      it('should update multiple fields at once', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        const params: UpdateMetricConfigParams = {
          name: 'New Name',
          description: 'New description',
          isReported: false,
          isThresholdEnforced: false,
        };

        metrics.updateConfiguration(params);

        expect(metrics.configuration.name).toBe('New Name');
        expect(metrics.configuration.description).toBe('New description');
        expect(metrics.configuration.isReported).toBe(false);
        expect(metrics.configuration.isThresholdEnforced).toBe(false);
        expect(metrics.domainEvents).toHaveLength(2);
      });

      it('should not emit event when no changes made', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        // Update with same values
        metrics.updateConfiguration({
          name: configuration.name,
          isReported: configuration.isReported,
        });

        expect(metrics.domainEvents).toHaveLength(0);
      });

      it('should update lastUpdated timestamp on change', async () => {
        const metrics = QualityMetrics.create(validParams);
        const originalLastUpdated = metrics.lastUpdated;

        await new Promise((resolve) => setTimeout(resolve, 10));

        metrics.updateConfiguration({ name: 'New Name' });

        expect(metrics.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
      });
    });
  });

  describe('measurement recording', () => {
    describe('recordMeasurement', () => {
      it('should record a new measurement', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        const params: RecordMeasurementParams = {
          value: 85.5,
          commitOid: 'abc123',
        };

        metrics.recordMeasurement(params);

        expect(metrics.currentValue).not.toBeNull();
        expect(metrics.currentValue?.value).toBe(85.5);
        expect(metrics.currentValue?.unit).toBe('%');
        expect(metrics.history).toHaveLength(1);
        expect(metrics.history[0].commitOid).toBe('abc123');
        expect(metrics.domainEvents[0].eventType).toBe('MeasurementRecorded');
      });

      it('should use provided timestamp', () => {
        const metrics = QualityMetrics.create(validParams);
        const customDate = new Date('2024-01-15');

        metrics.recordMeasurement({
          value: 85.5,
          commitOid: 'abc123',
          measuredAt: customDate,
        });

        expect(metrics.history[0].recordedAt).toEqual(customDate);
        expect(metrics.currentValue?.measuredAt).toEqual(customDate);
      });

      it('should throw error for value outside allowed range', () => {
        const metrics = QualityMetrics.create(validParams);

        expect(() =>
          metrics.recordMeasurement({
            value: 150,
            commitOid: 'abc123',
          })
        ).toThrow('Value 150 is outside allowed range [0, 100]');

        expect(() =>
          metrics.recordMeasurement({
            value: -10,
            commitOid: 'abc123',
          })
        ).toThrow('Value -10 is outside allowed range [0, 100]');
      });

      it('should update threshold status in history', () => {
        const metrics = QualityMetrics.create(validParams);

        // Record passing value
        metrics.recordMeasurement({
          value: 85,
          commitOid: 'commit1',
        });

        expect(metrics.history[0].thresholdStatus).toBe('PASSING');

        // Record failing value
        metrics.recordMeasurement({
          value: 75,
          commitOid: 'commit2',
        });

        expect(metrics.history[1].thresholdStatus).toBe('FAILING');
      });

      it('should handle metrics without threshold', () => {
        const params = {
          ...validParams,
          configuration: {
            ...configuration,
            threshold: null,
          },
        };

        const metrics = QualityMetrics.create(params);

        metrics.recordMeasurement({
          value: 85,
          commitOid: 'commit1',
        });

        expect(metrics.history[0].thresholdStatus).toBe('UNKNOWN');
      });

      it('should trim history to max entries', () => {
        const metrics = QualityMetrics.create(validParams);

        // Record more than MAX_HISTORY_ENTRIES (100)
        for (let i = 0; i < 105; i++) {
          metrics.recordMeasurement({
            value: 80 + (i % 20),
            commitOid: `commit${i}`,
          });
        }

        expect(metrics.history).toHaveLength(100);
        // First entries should be removed
        expect(metrics.history[0].commitOid).toBe('commit5');
        expect(metrics.history[99].commitOid).toBe('commit104');
      });

      it('should emit MeasurementRecorded event with correct payload', () => {
        const metrics = QualityMetrics.create(validParams);
        metrics.clearEvents();

        metrics.recordMeasurement({
          value: 85.5,
          commitOid: 'abc123',
        });

        const event = metrics.domainEvents[0];
        expect(event.eventType).toBe('MeasurementRecorded');
        expect(event.payload).toEqual({
          value: 85.5,
          unit: '%',
          commitOid: 'abc123',
          thresholdStatus: 'PASSING',
        });
      });
    });
  });

  describe('compliance evaluation', () => {
    it('should evaluate as compliant when value meets upward threshold', () => {
      const metrics = QualityMetrics.create(validParams);

      metrics.recordMeasurement({
        value: 85,
        commitOid: 'commit1',
      });

      expect(metrics.isCompliant).toBe(true);
      expect(metrics.thresholdStatus).toBe('PASSING');
    });

    it('should evaluate as non-compliant when value fails upward threshold', () => {
      const metrics = QualityMetrics.create(validParams);

      metrics.recordMeasurement({
        value: 75,
        commitOid: 'commit1',
      });

      expect(metrics.isCompliant).toBe(false);
      expect(metrics.thresholdStatus).toBe('FAILING');
    });

    it('should evaluate downward metrics correctly', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          shortcode: MetricShortcode.DDP, // Duplicate code percentage
          positiveDirection: 'DOWNWARD' as const,
          threshold: ThresholdValue.createPercentage(10), // Max 10% duplication
        },
      };

      const metrics = QualityMetrics.create(params);

      // 5% duplication - should pass
      metrics.recordMeasurement({
        value: 5,
        commitOid: 'commit1',
      });
      expect(metrics.isCompliant).toBe(true);

      // 15% duplication - should fail
      metrics.recordMeasurement({
        value: 15,
        commitOid: 'commit2',
      });
      expect(metrics.isCompliant).toBe(false);
    });

    it('should be compliant when no threshold set', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          threshold: null,
        },
      };

      const metrics = QualityMetrics.create(params);

      metrics.recordMeasurement({
        value: 50,
        commitOid: 'commit1',
      });

      expect(metrics.isCompliant).toBe(true);
      expect(metrics.thresholdStatus).toBe('UNKNOWN');
    });

    it('should be compliant when no value recorded', () => {
      const metrics = QualityMetrics.create(validParams);

      expect(metrics.isCompliant).toBe(true);
      expect(metrics.thresholdStatus).toBe('UNKNOWN');
    });

    describe('evaluateCompliance', () => {
      it('should evaluate arbitrary values', () => {
        const metrics = QualityMetrics.create(validParams);

        expect(metrics.evaluateCompliance(90)).toBe(true);
        expect(metrics.evaluateCompliance(70)).toBe(false);
        expect(metrics.evaluateCompliance(80)).toBe(true); // Exactly at threshold
      });

      it('should return true when no threshold', () => {
        const params = {
          ...validParams,
          configuration: {
            ...configuration,
            threshold: null,
          },
        };

        const metrics = QualityMetrics.create(params);

        expect(metrics.evaluateCompliance(50)).toBe(true);
        expect(metrics.evaluateCompliance(0)).toBe(true);
      });
    });
  });

  describe('trend analysis', () => {
    describe('getTrend', () => {
      it('should return null with insufficient data', () => {
        const metrics = QualityMetrics.create(validParams);

        expect(metrics.getTrend()).toBeNull();

        metrics.recordMeasurement({
          value: 80,
          commitOid: 'commit1',
        });

        expect(metrics.getTrend()).toBeNull(); // Still only 1 entry
      });

      it('should calculate improving trend for upward metrics', () => {
        const metrics = QualityMetrics.create(validParams);

        const now = new Date();
        const daysAgo = (days: number) => {
          const date = new Date(now);
          date.setDate(date.getDate() - days);
          return date;
        };

        // Record measurements over time
        metrics.recordMeasurement({
          value: 70,
          commitOid: 'commit1',
          measuredAt: daysAgo(20),
        });

        metrics.recordMeasurement({
          value: 75,
          commitOid: 'commit2',
          measuredAt: daysAgo(10),
        });

        metrics.recordMeasurement({
          value: 80,
          commitOid: 'commit3',
          measuredAt: daysAgo(5),
        });

        metrics.recordMeasurement({
          value: 85,
          commitOid: 'commit4',
          measuredAt: now,
        });

        const trend = metrics.getTrend(30);

        expect(trend).not.toBeNull();
        expect(trend?.direction).toBe('IMPROVING');
        expect(trend?.changePercentage).toBeCloseTo(21.43, 1); // (85-70)/70 * 100
        expect(trend?.periodDays).toBe(30);
      });

      it('should calculate degrading trend for upward metrics', () => {
        const metrics = QualityMetrics.create(validParams);

        const now = new Date();
        const daysAgo = (days: number) => {
          const date = new Date(now);
          date.setDate(date.getDate() - days);
          return date;
        };

        metrics.recordMeasurement({
          value: 90,
          commitOid: 'commit1',
          measuredAt: daysAgo(20),
        });

        metrics.recordMeasurement({
          value: 80,
          commitOid: 'commit2',
          measuredAt: now,
        });

        const trend = metrics.getTrend(30);

        expect(trend?.direction).toBe('DEGRADING');
        expect(trend?.changePercentage).toBeCloseTo(-11.11, 1);
      });

      it('should calculate stable trend for minimal changes', () => {
        const metrics = QualityMetrics.create(validParams);

        const now = new Date();
        const daysAgo = (days: number) => {
          const date = new Date(now);
          date.setDate(date.getDate() - days);
          return date;
        };

        metrics.recordMeasurement({
          value: 80,
          commitOid: 'commit1',
          measuredAt: daysAgo(20),
        });

        metrics.recordMeasurement({
          value: 80.5,
          commitOid: 'commit2',
          measuredAt: now,
        });

        const trend = metrics.getTrend(30);

        expect(trend?.direction).toBe('STABLE'); // Less than 1% change
      });

      it('should handle downward metrics correctly', () => {
        const params = {
          ...validParams,
          configuration: {
            ...configuration,
            positiveDirection: 'DOWNWARD' as const,
          },
        };

        const metrics = QualityMetrics.create(params);

        const now = new Date();
        const daysAgo = (days: number) => {
          const date = new Date(now);
          date.setDate(date.getDate() - days);
          return date;
        };

        // For downward metrics, decreasing values are improving
        metrics.recordMeasurement({
          value: 20,
          commitOid: 'commit1',
          measuredAt: daysAgo(20),
        });

        metrics.recordMeasurement({
          value: 15,
          commitOid: 'commit2',
          measuredAt: now,
        });

        const trend = metrics.getTrend(30);

        expect(trend?.direction).toBe('IMPROVING'); // Decreasing is good for downward metrics
      });

      it('should respect period parameter', () => {
        const metrics = QualityMetrics.create(validParams);

        const now = new Date();
        const daysAgo = (days: number) => {
          const date = new Date(now);
          date.setDate(date.getDate() - days);
          return date;
        };

        // Old measurement outside period
        metrics.recordMeasurement({
          value: 60,
          commitOid: 'commit1',
          measuredAt: daysAgo(40),
        });

        // Recent measurements
        metrics.recordMeasurement({
          value: 80,
          commitOid: 'commit2',
          measuredAt: daysAgo(20),
        });

        metrics.recordMeasurement({
          value: 85,
          commitOid: 'commit3',
          measuredAt: now,
        });

        const trend = metrics.getTrend(30); // Only last 30 days

        // Should only consider last two measurements
        expect(trend?.changePercentage).toBeCloseTo(6.25, 1); // (85-80)/80 * 100
      });
    });
  });

  describe('getters', () => {
    it('should return immutable configuration', () => {
      const metrics = QualityMetrics.create(validParams);
      const config = metrics.configuration;

      // Verify it's a copy
      expect(config).not.toBe(configuration);
      expect(config).toEqual(configuration);
    });

    it('should return history as array', () => {
      const metrics = QualityMetrics.create(validParams);

      metrics.recordMeasurement({
        value: 80,
        commitOid: 'commit1',
      });

      metrics.recordMeasurement({
        value: 85,
        commitOid: 'commit2',
      });

      const history = metrics.history;
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(2);
    });
  });

  describe('toPersistence', () => {
    it('should convert to persistence format', () => {
      const metrics = QualityMetrics.create(validParams);

      metrics.recordMeasurement({
        value: 85.5,
        commitOid: 'abc123',
      });

      const persistence = metrics.toPersistence();

      expect(persistence).toEqual({
        id: `${projectKey}:${MetricKey.AGGREGATE}:${MetricShortcode.LCV}`,
        projectKey,
        repositoryId,
        configuration,
        currentValue: expect.objectContaining({
          value: 85.5,
          unit: '%',
        }),
        history: expect.arrayContaining([
          expect.objectContaining({
            value: expect.objectContaining({ value: 85.5 }),
            commitOid: 'abc123',
          }),
        ]),
        lastUpdated: expect.any(Date),
      });
    });

    it('should preserve all data through persistence round-trip', () => {
      const metrics = QualityMetrics.create(validParams);

      metrics.recordMeasurement({
        value: 75,
        commitOid: 'commit1',
      });

      metrics.updateThreshold(ThresholdValue.createPercentage(70));

      metrics.recordMeasurement({
        value: 85,
        commitOid: 'commit2',
      });

      const persistence = metrics.toPersistence();
      const reconstructed = QualityMetrics.fromPersistence(persistence);

      expect(reconstructed.projectKey).toBe(metrics.projectKey);
      expect(reconstructed.configuration).toEqual(metrics.configuration);
      expect(reconstructed.currentValue?.value).toBe(85);
      expect(reconstructed.history).toHaveLength(2);
      expect(reconstructed.lastUpdated).toEqual(metrics.lastUpdated);
    });
  });

  describe('domain events', () => {
    it('should accumulate multiple events', () => {
      const metrics = QualityMetrics.create(validParams);
      metrics.clearEvents();

      metrics.updateThreshold(ThresholdValue.createPercentage(90));
      metrics.recordMeasurement({
        value: 95,
        commitOid: 'commit1',
      });
      metrics.updateConfiguration({ name: 'New Name' });

      // Each operation emits 2 events (operation + AggregateModified)
      expect(metrics.domainEvents).toHaveLength(6);

      const eventTypes = metrics.domainEvents.map((e) => e.eventType);
      expect(eventTypes).toEqual([
        'MetricThresholdUpdated',
        'AggregateModified',
        'MeasurementRecorded',
        'AggregateModified',
        'MetricConfigurationUpdated',
        'AggregateModified',
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle all metric shortcodes', () => {
      const shortcodes = [
        MetricShortcode.LCV,
        MetricShortcode.BCV,
        MetricShortcode.DCV,
        MetricShortcode.DDP,
        MetricShortcode.SCV,
        MetricShortcode.TCV,
        MetricShortcode.CMP,
      ];

      shortcodes.forEach((shortcode) => {
        const params = {
          ...validParams,
          configuration: {
            ...configuration,
            shortcode,
          },
        };

        const metrics = QualityMetrics.create(params);
        expect(metrics.configuration.shortcode).toBe(shortcode);
      });
    });

    it('should handle all metric keys', () => {
      const metricKeys = [
        MetricKey.AGGREGATE,
        MetricKey.PYTHON,
        MetricKey.JAVASCRIPT,
        MetricKey.TYPESCRIPT,
        MetricKey.GO,
        MetricKey.JAVA,
        MetricKey.RUBY,
        MetricKey.RUST,
      ];

      metricKeys.forEach((metricKey) => {
        const params = {
          ...validParams,
          configuration: {
            ...configuration,
            metricKey,
          },
        };

        const metrics = QualityMetrics.create(params);
        expect(metrics.configuration.metricKey).toBe(metricKey);
      });
    });

    it('should handle negative value ranges', () => {
      const params = {
        ...validParams,
        configuration: {
          ...configuration,
          minAllowed: -100,
          maxAllowed: 100,
          threshold: ThresholdValue.create(0, 'delta', -100, 100),
        },
      };

      const metrics = QualityMetrics.create(params);

      metrics.recordMeasurement({
        value: -50,
        commitOid: 'commit1',
      });

      expect(metrics.currentValue?.value).toBe(-50);
    });

    it('should handle exact threshold values', () => {
      const metrics = QualityMetrics.create(validParams);

      // Record value exactly at threshold
      metrics.recordMeasurement({
        value: 80,
        commitOid: 'commit1',
      });

      expect(metrics.isCompliant).toBe(true); // Threshold is inclusive
      expect(metrics.thresholdStatus).toBe('PASSING');
    });
  });
});
