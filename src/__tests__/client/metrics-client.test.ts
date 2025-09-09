/**
 * @fileoverview Tests for metrics client
 * This file adds coverage for the previously untested metrics-client.ts
 */

import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { MetricsClient } from '../../client/metrics-client.js';
import { MetricShortcode, MetricKey } from '../../types/metrics.js';
import type { MetricsClientTestable } from '../test-types.js';
import { TestableMetricsClient } from '../utils/test-utils.js';

describe('MetricsClient', () => {
  let metricsClient: MetricsClient;
  let mockExecuteGraphQL: MockedFunction<
    (query: string, variables?: Record<string, unknown>) => Promise<unknown>
  >;
  let mockFindProjectByKey: MockedFunction<(projectKey: string) => Promise<unknown | null>>;

  beforeEach(() => {
    metricsClient = new MetricsClient('test-api-key');
    // Access the protected methods through the prototype
    mockExecuteGraphQL = vi.fn();
    mockFindProjectByKey = vi.fn();

    // Replace the methods on the instance
    (metricsClient as unknown as Record<string, unknown>).executeGraphQL = mockExecuteGraphQL;
    (metricsClient as unknown as Record<string, unknown>).findProjectByKey = mockFindProjectByKey;
    (metricsClient as unknown as Record<string, unknown>).logger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };
  });

  describe('getQualityMetrics', () => {
    it('should fetch quality metrics successfully', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            metrics: [
              {
                shortcode: MetricShortcode.LCV,
                name: 'Line Coverage',
                description: 'Percentage of lines covered by tests',
                direction: 'UPWARD',
                unit: '%',
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    key: MetricKey.AGGREGATE,
                    value: 85.5,
                    thresholdValue: 80.0,
                    thresholdStatus: 'PASS',
                  },
                ],
              },
              {
                shortcode: 'BCV',
                name: 'Branch Coverage',
                description: 'Percentage of branches covered by tests',
                direction: 'UPWARD',
                unit: '%',
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    key: MetricKey.AGGREGATE,
                    value: 92.1,
                    thresholdValue: 85.0,
                    thresholdStatus: 'PASS',
                  },
                ],
              },
            ],
          },
        },
      };

      mockFindProjectByKey.mockResolvedValue(mockProject);
      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      const result = await metricsClient.getQualityMetrics('test-project');

      expect(mockFindProjectByKey).toHaveBeenCalledWith('test-project');
      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getQualityMetrics'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.shortcode).toBe(MetricShortcode.LCV);
      expect(result[0]?.items[0]?.latestValue).toBe(85.5);
      expect(result[1]?.shortcode).toBe('BCV');
      expect(result[1]?.items[0]?.latestValue).toBe(92.1);
    });

    it('should return empty array when project not found', async () => {
      mockFindProjectByKey.mockResolvedValue(null);

      const result = await metricsClient.getQualityMetrics('nonexistent-project');

      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      mockFindProjectByKey.mockResolvedValue(mockProject);
      mockExecuteGraphQL.mockRejectedValue(new Error('GraphQL error'));

      await expect(metricsClient.getQualityMetrics('test-project')).rejects.toThrow(
        'GraphQL error'
      );
    });

    it('should handle missing data in response', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: null,
      };

      mockFindProjectByKey.mockResolvedValue(mockProject);
      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      await expect(metricsClient.getQualityMetrics('test-project')).rejects.toThrow(
        'No data received from GraphQL API'
      );
    });

    it('should filter metrics by shortcode when provided', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            metrics: [
              {
                shortcode: MetricShortcode.LCV,
                name: 'Line Coverage',
                description: 'Percentage of lines covered by tests',
                direction: 'UPWARD',
                unit: '%',
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    key: MetricKey.AGGREGATE,
                    value: 85.5,
                    thresholdValue: 80.0,
                    thresholdStatus: 'PASS',
                  },
                ],
              },
            ],
          },
        },
      };

      mockFindProjectByKey.mockResolvedValue(mockProject);
      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      const result = await metricsClient.getQualityMetrics('test-project', {
        shortcodeIn: [MetricShortcode.LCV],
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getQualityMetrics'),
        expect.objectContaining({
          shortcodeIn: [MetricShortcode.LCV],
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.shortcode).toBe(MetricShortcode.LCV);
    });
  });

  describe('setMetricThreshold', () => {
    it('should set metric threshold successfully', async () => {
      const mockResponse = {
        data: {
          updateMetricThreshold: {
            ok: true,
          },
        },
      };

      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      const result = await metricsClient.setMetricThreshold({
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80.0,
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('mutation updateMetricThreshold'),
        expect.objectContaining({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
          thresholdValue: 80.0,
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle threshold update errors', async () => {
      mockExecuteGraphQL.mockRejectedValue(new Error('Update failed'));

      await expect(
        metricsClient.setMetricThreshold({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
          thresholdValue: 80.0,
        })
      ).rejects.toThrow('Update failed');
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        data: null,
      };

      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      await expect(
        metricsClient.setMetricThreshold({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
          thresholdValue: 80.0,
        })
      ).rejects.toThrow('No data received from GraphQL API');
    });
  });

  describe('updateMetricSetting', () => {
    it('should update metric setting successfully', async () => {
      const mockResponse = {
        data: {
          updateMetricSetting: {
            ok: true,
          },
        },
      };

      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      const result = await metricsClient.updateMetricSetting({
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      });

      expect(mockExecuteGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('mutation updateMetricSetting'),
        expect.objectContaining({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          isReported: true,
          isThresholdEnforced: false,
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle setting update errors', async () => {
      mockExecuteGraphQL.mockRejectedValue(new Error('Setting update failed'));

      await expect(
        metricsClient.updateMetricSetting({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          isReported: true,
          isThresholdEnforced: false,
        })
      ).rejects.toThrow('Setting update failed');
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        data: null,
      };

      mockExecuteGraphQL.mockResolvedValue(mockResponse);

      await expect(
        metricsClient.updateMetricSetting({
          repositoryId: 'repo-123',
          metricShortcode: MetricShortcode.LCV,
          isReported: true,
          isThresholdEnforced: false,
        })
      ).rejects.toThrow('No data received from GraphQL API');
    });
  });

  describe('buildQualityMetricsQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableMetricsClient.testBuildQualityMetricsQuery();

      expect(query).toContain('query getQualityMetrics');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('metrics');
    });
  });

  describe('buildUpdateThresholdMutation', () => {
    it('should build correct GraphQL mutation', () => {
      const mutation = TestableMetricsClient.testBuildUpdateThresholdMutation();

      expect(mutation).toContain('mutation updateMetricThreshold');
      expect(mutation).toContain('$repositoryId: ID!');
      expect(mutation).toContain('$metricShortcode: String!');
      expect(mutation).toContain('$metricKey: String!');
      expect(mutation).toContain('$thresholdValue: Float');
    });
  });

  describe('buildUpdateSettingMutation', () => {
    it('should build correct GraphQL mutation', () => {
      const mutation = TestableMetricsClient.testBuildUpdateSettingMutation();

      expect(mutation).toContain('mutation updateMetricSetting');
      expect(mutation).toContain('$repositoryId: ID!');
      expect(mutation).toContain('$metricShortcode: String!');
      expect(mutation).toContain('$isReported: Boolean!');
      expect(mutation).toContain('$isThresholdEnforced: Boolean!');
    });
  });

  describe('extractMetricsFromResponse', () => {
    it('should extract metrics from GraphQL response', () => {
      const mockResponseData = {
        repository: {
          metrics: [
            {
              shortcode: MetricShortcode.LCV,
              name: 'Line Coverage',
              description: 'Percentage of lines covered by tests',
              direction: 'UPWARD',
              unit: '%',
              isReported: true,
              isThresholdEnforced: true,
              items: [
                {
                  key: MetricKey.AGGREGATE,
                  value: 85.5,
                  thresholdValue: 80.0,
                  thresholdStatus: 'PASS',
                },
              ],
            },
          ],
        },
      };

      const metrics = (metricsClient as MetricsClientTestable).extractMetricsFromResponse(
        mockResponseData
      ) as unknown[];

      expect(metrics).toHaveLength(1);
      expect(metrics[0].shortcode).toBe(MetricShortcode.LCV);
      expect(metrics[0].name).toBe('Line Coverage');
      expect(metrics[0].items[0].latestValue).toBe(85.5);
      expect(metrics[0].items[0].threshold).toBe(80.0);
    });

    it('should handle missing metrics in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const metrics = (metricsClient as MetricsClientTestable).extractMetricsFromResponse(
        mockResponseData
      ) as unknown[];

      expect(metrics).toHaveLength(0);
    });

    it('should handle missing repository in response', () => {
      const mockResponseData = {};

      const metrics = (metricsClient as MetricsClientTestable).extractMetricsFromResponse(
        mockResponseData
      ) as unknown[];

      expect(metrics).toHaveLength(0);
    });
  });
});
