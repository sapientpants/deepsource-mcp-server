/**
 * @fileoverview Tests for QualityMetricsRepository
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityMetricsRepository } from '../quality-metrics.repository.js';
import { DeepSourceClient } from '../../../deepsource.js';
import {
  RepositoryMetric,
  MetricShortcode,
  MetricDirection,
  MetricThresholdStatus,
  MetricKey,
} from '../../../models/metrics.js';
import { asProjectKey } from '../../../types/branded.js';
import { QualityMetrics } from '../../../domain/aggregates/quality-metrics/quality-metrics.aggregate.js';
import { DeepSourceProject } from '../../../models/projects.js';

// Mock the DeepSourceClient
vi.mock('../../../deepsource.js');

// Mock the logger
vi.mock('../../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('QualityMetricsRepository', () => {
  let repository: QualityMetricsRepository;
  let mockClient: anyed<DeepSourceClient>;
  let mockApiMetrics: RepositoryMetric[];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock DeepSourceClient
    mockClient = {
      listProjects: vi.fn(),
      getQualityMetrics: vi.fn(),
      setMetricThreshold: vi.fn(),
      updateMetricSetting: vi.fn(),
      listRuns: vi.fn(),
    } as unknown as anyed<DeepSourceClient>;

    // Create test data
    mockApiMetrics = [
      {
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
            id: 'lcv-aggregate',
            key: 'AGGREGATE',
            threshold: 80,
            latestValue: 85.5,
            latestValueDisplay: '85.5%',
            thresholdStatus: MetricThresholdStatus.PASSING,
          },
          {
            id: 'lcv-python',
            key: 'PYTHON',
            threshold: 75,
            latestValue: 70,
            latestValueDisplay: '70%',
            thresholdStatus: MetricThresholdStatus.FAILING,
          },
        ],
      },
      {
        name: 'Branch Coverage',
        shortcode: MetricShortcode.BCV,
        description: 'Percentage of branches covered by tests',
        positiveDirection: MetricDirection.UPWARD,
        unit: '%',
        minValueAllowed: 0,
        maxValueAllowed: 100,
        isReported: true,
        isThresholdEnforced: false,
        items: [
          {
            id: 'bcv-aggregate',
            key: 'AGGREGATE',
            threshold: 70,
            latestValue: 75,
            latestValueDisplay: '75%',
            thresholdStatus: MetricThresholdStatus.PASSING,
          },
        ],
      },
    ];

    // Setup default mock behavior
    mockClient.listProjects.mockResolvedValue([
      {
        key: asProjectKey('test-project'),
        name: 'Test Project',
        repository: {
          url: 'https://github.com/test/test-project',
          provider: 'GITHUB',
          login: 'test',
          isPrivate: false,
          isActivated: true,
        },
      } as DeepSourceProject,
    ]);

    // Mock listRuns to provide repository ID
    mockClient.listRuns.mockResolvedValue({
      items: [
        {
          id: 'run-1',
          repository: { id: 'repo-123' },
        },
      ],
      pageInfo: { hasNextPage: false },
      totalCount: 1,
    } as {
      items: Array<{ id: string; repository: { id: string } }>;
      pageInfo: { hasNextPage: boolean };
      totalCount: number;
    });
    mockClient.getQualityMetrics.mockResolvedValue(mockApiMetrics);

    // Create repository instance
    repository = new QualityMetricsRepository(mockClient);
  });

  describe('findById', () => {
    it('should find metrics by composite ID', async () => {
      const id = 'test-project:AGGREGATE:LCV';
      const metrics = await repository.findById(id);

      expect(metrics).not.toBeNull();
      expect(metrics?.configuration.shortcode).toBe(MetricShortcode.LCV);
      expect(metrics?.configuration.metricKey).toBe('AGGREGATE');
      expect(mockClient.getQualityMetrics).toHaveBeenCalledWith('test-project', {
        shortcodeIn: [MetricShortcode.LCV],
      });
    });

    it('should return null for invalid composite ID format', async () => {
      const id = 'invalid-id-format';
      const metrics = await repository.findById(id);

      expect(metrics).toBeNull();
      expect(mockClient.getQualityMetrics).not.toHaveBeenCalled();
    });
  });

  describe('findByProject', () => {
    it('should return all metrics for a project', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProject(projectKey);

      expect(metrics).toHaveLength(3); // 2 from LCV, 1 from BCV
      expect(metrics[0]).toBeInstanceOf(QualityMetrics);
      expect(metrics.map((m) => m.configuration.shortcode)).toContain(MetricShortcode.LCV);
      expect(metrics.map((m) => m.configuration.shortcode)).toContain(MetricShortcode.BCV);
      expect(mockClient.getQualityMetrics).toHaveBeenCalledWith(projectKey);
    });

    it('should return empty array when no metrics exist', async () => {
      mockClient.getQualityMetrics.mockResolvedValue([]);

      const metrics = await repository.findByProject(asProjectKey('test-project'));

      expect(metrics).toEqual([]);
    });

    it('should throw error when project not found', async () => {
      mockClient.listProjects.mockResolvedValue([]);

      await expect(repository.findByProject(asProjectKey('test-project'))).rejects.toThrow(
        'Project not found: test-project'
      );
    });
  });

  describe('findByProjectAndMetric', () => {
    it('should find specific metric by shortcode and key', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(
        projectKey,
        MetricShortcode.LCV,
        'PYTHON'
      );

      expect(metrics).not.toBeNull();
      expect(metrics?.configuration.shortcode).toBe(MetricShortcode.LCV);
      expect(metrics?.configuration.metricKey).toBe('PYTHON');
      expect(metrics?.currentValue?.value).toBe(70);
      expect(metrics?.thresholdStatus).toBe('FAILING');
    });

    it('should return first item when no metric key specified', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(projectKey, MetricShortcode.LCV);

      expect(metrics).not.toBeNull();
      expect(metrics?.configuration.metricKey).toBe('AGGREGATE');
    });

    it('should return null when metric not found', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(projectKey, MetricShortcode.DDP);

      expect(metrics).toBeNull();
    });

    it('should return null when metric key not found', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(
        projectKey,
        MetricShortcode.LCV,
        'JAVASCRIPT'
      );

      expect(metrics).toBeNull();
    });

    it('should return null when metric has no items', async () => {
      mockClient.getQualityMetrics.mockResolvedValue([
        {
          ...mockApiMetrics[0],
          items: [],
        },
      ]);

      const metrics = await repository.findByProjectAndMetric(
        asProjectKey('test-project'),
        MetricShortcode.LCV
      );

      expect(metrics).toBeNull();
    });
  });

  describe('findFailingMetrics', () => {
    it('should return only failing metrics', async () => {
      const projectKey = asProjectKey('test-project');
      const failingMetrics = await repository.findFailingMetrics(projectKey);

      expect(failingMetrics).toHaveLength(1);
      expect(failingMetrics[0].configuration.shortcode).toBe(MetricShortcode.LCV);
      expect(failingMetrics[0].configuration.metricKey).toBe('PYTHON');
      expect(failingMetrics[0].thresholdStatus).toBe('FAILING');
    });

    it('should return empty array when no failing metrics', async () => {
      // Mock all metrics as passing by ensuring values are above thresholds
      const passingMetrics = mockApiMetrics.map((metric) => ({
        ...metric,
        items: metric.items.map((item) => ({
          ...item,
          latestValue: item.threshold ? item.threshold + 5 : 85, // Ensure value > threshold
          thresholdStatus: 'PASSING' as const,
        })),
      }));
      mockClient.getQualityMetrics.mockResolvedValue(passingMetrics);

      const failingMetrics = await repository.findFailingMetrics(asProjectKey('test-project'));

      expect(failingMetrics).toEqual([]);
    });
  });

  describe('findReportedMetrics', () => {
    it('should return only reported metrics', async () => {
      const projectKey = asProjectKey('test-project');
      const reportedMetrics = await repository.findReportedMetrics(projectKey);

      expect(reportedMetrics).toHaveLength(3); // All test metrics are reported
      expect(reportedMetrics.every((m) => m.configuration.isReported)).toBe(true);
    });

    it('should filter out non-reported metrics', async () => {
      // Mock some metrics as not reported
      mockClient.getQualityMetrics.mockResolvedValue([
        mockApiMetrics[0], // Reported
        { ...mockApiMetrics[1], isReported: false }, // Not reported
      ]);

      const reportedMetrics = await repository.findReportedMetrics(asProjectKey('test-project'));

      expect(reportedMetrics).toHaveLength(2); // Only LCV items
    });
  });

  describe('findByCompositeId', () => {
    it('should find metrics by composite ID components', async () => {
      const id = {
        projectKey: asProjectKey('test-project'),
        metricKey: MetricKey.AGGREGATE,
        shortcode: MetricShortcode.BCV,
      };

      const metrics = await repository.findByCompositeId(id);

      expect(metrics).not.toBeNull();
      expect(metrics?.configuration.shortcode).toBe(MetricShortcode.BCV);
      expect(metrics?.configuration.metricKey).toBe('AGGREGATE');
    });
  });

  describe('countByProject', () => {
    it('should count all metrics for a project', async () => {
      const count = await repository.countByProject(asProjectKey('test-project'));

      expect(count).toBe(3);
    });

    it('should return 0 when no metrics exist', async () => {
      mockClient.getQualityMetrics.mockResolvedValue([]);

      const count = await repository.countByProject(asProjectKey('test-project'));

      expect(count).toBe(0);
    });
  });

  describe('countFailingByProject', () => {
    it('should count failing metrics for a project', async () => {
      const count = await repository.countFailingByProject(asProjectKey('test-project'));

      expect(count).toBe(1);
    });
  });

  describe('exists', () => {
    it('should return true when metric exists', async () => {
      const exists = await repository.exists(asProjectKey('test-project'), MetricShortcode.LCV);

      expect(exists).toBe(true);
    });

    it('should return false when metric does not exist', async () => {
      const exists = await repository.exists(asProjectKey('test-project'), MetricShortcode.DDP);

      expect(exists).toBe(false);
    });
  });

  describe('save', () => {
    it('should update threshold and settings', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(projectKey, MetricShortcode.LCV);

      expect(metrics).not.toBeNull();
      if (!metrics) return;

      mockClient.setMetricThreshold.mockResolvedValue({ ok: true });
      mockClient.updateMetricSetting.mockResolvedValue({ ok: true });

      await repository.save(metrics);

      expect(mockClient.setMetricThreshold).toHaveBeenCalledWith({
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      });

      expect(mockClient.updateMetricSetting).toHaveBeenCalledWith({
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: true,
      });
    });

    it('should handle null threshold', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(projectKey, MetricShortcode.LCV);

      expect(metrics).not.toBeNull();
      if (!metrics) return;

      metrics.updateThreshold(null);

      await repository.save(metrics);

      expect(mockClient.setMetricThreshold).toHaveBeenCalledWith(
        expect.objectContaining({
          thresholdValue: null,
        })
      );
    });

    it('should propagate errors from client', async () => {
      const projectKey = asProjectKey('test-project');
      const metrics = await repository.findByProjectAndMetric(projectKey, MetricShortcode.LCV);

      expect(metrics).not.toBeNull();
      if (!metrics) return;

      mockClient.setMetricThreshold.mockRejectedValue(new Error('API Error'));

      await expect(repository.save(metrics)).rejects.toThrow('API Error');
    });
  });

  describe('delete', () => {
    it('should throw error indicating operation not supported', async () => {
      await expect(repository.delete('some-id')).rejects.toThrow(
        'Delete operation is not supported by DeepSource API'
      );
    });
  });

  describe('data freshness', () => {
    it('should fetch fresh data on every request', async () => {
      const projectKey = asProjectKey('test-project');

      // First call
      await repository.findByProject(projectKey);

      // Update mock data
      if (mockApiMetrics[0]?.items?.[0]) {
        mockApiMetrics[0].items[0].latestValue = 90;
      }

      // Second call should get fresh data
      const metrics = await repository.findByProject(projectKey);

      expect(mockClient.getQualityMetrics).toHaveBeenCalledTimes(2);
      expect(metrics[0]?.currentValue?.value).toBe(90);
    });

    it('should not cache results between different method calls', async () => {
      const projectKey = asProjectKey('test-project');

      await repository.findByProject(projectKey);
      await repository.findByProjectAndMetric(projectKey, MetricShortcode.LCV);
      await repository.countByProject(projectKey);
      await repository.findFailingMetrics(projectKey);

      expect(mockClient.getQualityMetrics).toHaveBeenCalledTimes(4);
    });
  });
});
