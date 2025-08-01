/**
 * @fileoverview Tests for QualityMetricsMapper
 */

import { describe, it, expect } from '@jest/globals';
import { QualityMetricsMapper } from '../quality-metrics.mapper.js';
import { RepositoryMetric, MetricShortcode, MetricDirection, MetricThresholdStatus } from '../../../models/metrics.js';
import { QualityMetrics } from '../../../domain/aggregates/quality-metrics/quality-metrics.aggregate.js';

describe('QualityMetricsMapper', () => {
  const mockApiMetric: RepositoryMetric = {
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
        id: 'item-1',
        key: 'AGGREGATE',
        threshold: 80,
        latestValue: 85.5,
        latestValueDisplay: '85.5%',
        thresholdStatus: MetricThresholdStatus.PASSING,
      },
      {
        id: 'item-2',
        key: 'PYTHON',
        threshold: 75,
        latestValue: 70,
        latestValueDisplay: '70%',
        thresholdStatus: MetricThresholdStatus.FAILING,
      },
    ],
  };

  describe('toDomainList', () => {
    it('should map API metric with multiple items to multiple domain aggregates', () => {
      const projectKey = 'test-project';
      const repositoryId = 'repo-123';

      const metrics = QualityMetricsMapper.toDomainList(mockApiMetric, projectKey, repositoryId);

      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toBeInstanceOf(QualityMetrics);
      expect(metrics[1]).toBeInstanceOf(QualityMetrics);
      expect(metrics[0].configuration.metricKey).toBe('AGGREGATE');
      expect(metrics[1].configuration.metricKey).toBe('PYTHON');
    });

    it('should handle empty items array', () => {
      const emptyMetric = { ...mockApiMetric, items: [] };
      const metrics = QualityMetricsMapper.toDomainList(emptyMetric, 'test-project', 'repo-123');

      expect(metrics).toEqual([]);
    });
  });

  describe('toDomain', () => {
    it('should map API metric item to domain aggregate', () => {
      const projectKey = 'test-project';
      const repositoryId = 'repo-123';
      const item = mockApiMetric.items[0];

      const metrics = QualityMetricsMapper.toDomain(mockApiMetric, item, projectKey, repositoryId);

      expect(metrics).toBeInstanceOf(QualityMetrics);
      expect(metrics.projectKey).toBe(projectKey);
      expect(metrics.repositoryId).toBe(repositoryId);
      expect(metrics.configuration.name).toBe('Line Coverage');
      expect(metrics.configuration.shortcode).toBe(MetricShortcode.LCV);
      expect(metrics.configuration.metricKey).toBe('AGGREGATE');
    });

    it('should map threshold correctly', () => {
      const item = mockApiMetric.items[0];
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        item,
        'test-project',
        'repo-123'
      );

      expect(metrics.configuration.threshold).not.toBeNull();
      expect(metrics.configuration.threshold?.value).toBe(80);
    });

    it('should handle null threshold', () => {
      const itemNoThreshold = { ...mockApiMetric.items[0], threshold: null };
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        itemNoThreshold,
        'test-project',
        'repo-123'
      );

      expect(metrics.configuration.threshold).toBeNull();
    });

    it('should map current value correctly', () => {
      const item = mockApiMetric.items[0];
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        item,
        'test-project',
        'repo-123'
      );

      expect(metrics.currentValue).not.toBeNull();
      expect(metrics.currentValue?.value).toBe(85.5);
      expect(metrics.currentValue?.unit).toBe('%');
    });

    it('should handle null latest value', () => {
      const itemNoValue = { ...mockApiMetric.items[0], latestValue: null };
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        itemNoValue,
        'test-project',
        'repo-123'
      );

      expect(metrics.currentValue).toBeNull();
    });

    it('should map configuration properties correctly', () => {
      const item = mockApiMetric.items[0];
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        item,
        'test-project',
        'repo-123'
      );

      expect(metrics.configuration.unit).toBe('%');
      expect(metrics.configuration.minAllowed).toBe(0);
      expect(metrics.configuration.maxAllowed).toBe(100);
      expect(metrics.configuration.positiveDirection).toBe('UPWARD');
      expect(metrics.configuration.isReported).toBe(true);
      expect(metrics.configuration.isThresholdEnforced).toBe(true);
    });
  });

  describe('mapThresholdStatus', () => {
    it('should map API status to domain status', () => {
      expect(QualityMetricsMapper.mapThresholdStatus('PASSING')).toBe('PASSING');
      expect(QualityMetricsMapper.mapThresholdStatus('FAILING')).toBe('FAILING');
      expect(QualityMetricsMapper.mapThresholdStatus('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should default to UNKNOWN for unmapped status', () => {
      expect(QualityMetricsMapper.mapThresholdStatus('INVALID')).toBe('UNKNOWN');
    });
  });

  describe('toPersistence', () => {
    it('should map domain aggregate to persistence format', () => {
      const item = mockApiMetric.items[0];
      const metrics = QualityMetricsMapper.toDomain(
        mockApiMetric,
        item,
        'test-project',
        'repo-123'
      );

      const persistence = QualityMetricsMapper.toPersistence(metrics);

      expect(persistence.id).toBe(metrics.id);
      expect(persistence.projectKey).toBe('test-project');
      expect(persistence.repositoryId).toBe('repo-123');
      expect(persistence.configuration).toEqual(metrics.configuration);
      expect(persistence.currentValue).toEqual(metrics.currentValue);
    });
  });

  describe('createHistoryEntry', () => {
    it('should create a history entry with threshold', () => {
      const entry = QualityMetricsMapper.createHistoryEntry(
        85.5,
        80,
        'commit-123',
        new Date('2024-01-15T10:00:00Z'),
        '%'
      );

      expect(entry.value.value).toBe(85.5);
      expect(entry.value.unit).toBe('%');
      expect(entry.threshold?.value).toBe(80);
      expect(entry.thresholdStatus).toBe('PASSING');
      expect(entry.commitOid).toBe('commit-123');
      expect(entry.recordedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should create a history entry without threshold', () => {
      const entry = QualityMetricsMapper.createHistoryEntry(
        85.5,
        null,
        'commit-123',
        new Date('2024-01-15T10:00:00Z'),
        '%'
      );

      expect(entry.threshold).toBeNull();
      expect(entry.thresholdStatus).toBe('UNKNOWN');
    });

    it('should determine failing status when value is below threshold', () => {
      const entry = QualityMetricsMapper.createHistoryEntry(
        75,
        80,
        'commit-123',
        new Date('2024-01-15T10:00:00Z'),
        '%'
      );

      expect(entry.thresholdStatus).toBe('FAILING');
    });
  });

  describe('toDomainFromList', () => {
    it('should map multiple API metrics to domain aggregates', () => {
      const apiMetrics = [
        mockApiMetric,
        {
          ...mockApiMetric,
          shortcode: MetricShortcode.BCV,
          name: 'Branch Coverage',
          items: [
            {
              id: 'item-3',
              key: 'AGGREGATE',
              threshold: 70,
              latestValue: 75,
              latestValueDisplay: '75%',
              thresholdStatus: MetricThresholdStatus.PASSING,
            },
          ],
        },
      ];

      const metrics = QualityMetricsMapper.toDomainFromList(apiMetrics, 'test-project', 'repo-123');

      expect(metrics).toHaveLength(3); // 2 from first metric, 1 from second
      expect(metrics[0].configuration.shortcode).toBe(MetricShortcode.LCV);
      expect(metrics[2].configuration.shortcode).toBe(MetricShortcode.BCV);
    });

    it('should handle empty metrics list', () => {
      const metrics = QualityMetricsMapper.toDomainFromList([], 'test-project', 'repo-123');
      expect(metrics).toEqual([]);
    });
  });
});
