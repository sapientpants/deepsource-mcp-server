/**
 * @fileoverview Tests for metrics client
 * This file adds coverage for the previously untested metrics-client.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MetricsClient } from '../../client/metrics-client.js';

// Mock the base client
jest.mock('../../client/base-client.js', () => ({
  BaseDeepSourceClient: jest.fn().mockImplementation(() => ({
    findProjectByKey: jest.fn(),
    executeGraphQL: jest.fn(),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  })),
}));

describe('MetricsClient', () => {
  let metricsClient: MetricsClient;
  let mockBaseClient: any;

  beforeEach(() => {
    metricsClient = new MetricsClient('test-api-key');
    mockBaseClient = metricsClient as any;
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
                shortcode: 'LCV',
                name: 'Line Coverage',
                description: 'Percentage of lines covered by tests',
                direction: 'UPWARD',
                unit: '%',
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    key: 'AGGREGATE',
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
                    key: 'AGGREGATE',
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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await metricsClient.getQualityMetrics('test-project');

      expect(mockBaseClient.findProjectByKey).toHaveBeenCalledWith('test-project');
      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getQualityMetrics'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].shortcode).toBe('LCV');
      expect(result[0].items[0].latestValue).toBe(85.5);
      expect(result[1].shortcode).toBe('BCV');
      expect(result[1].items[0].latestValue).toBe(92.1);
    });

    it('should return empty array when project not found', async () => {
      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(null);

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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.executeGraphQL = jest.fn().mockRejectedValue(new Error('GraphQL error'));

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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

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
                shortcode: 'LCV',
                name: 'Line Coverage',
                description: 'Percentage of lines covered by tests',
                direction: 'UPWARD',
                unit: '%',
                isReported: true,
                isThresholdEnforced: true,
                items: [
                  {
                    key: 'AGGREGATE',
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

      mockBaseClient.findProjectByKey = jest.fn().mockResolvedValue(mockProject);
      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await metricsClient.getQualityMetrics('test-project', {
        shortcodeIn: ['LCV'],
      });

      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('query getQualityMetrics'),
        expect.objectContaining({
          shortcodeIn: ['LCV'],
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].shortcode).toBe('LCV');
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

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await metricsClient.setMetricThreshold({
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        metricKey: 'AGGREGATE',
        thresholdValue: 80.0,
      });

      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('mutation updateMetricThreshold'),
        expect.objectContaining({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          metricKey: 'AGGREGATE',
          thresholdValue: 80.0,
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle threshold update errors', async () => {
      mockBaseClient.executeGraphQL = jest.fn().mockRejectedValue(new Error('Update failed'));

      await expect(
        metricsClient.setMetricThreshold({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          metricKey: 'AGGREGATE',
          thresholdValue: 80.0,
        })
      ).rejects.toThrow('Update failed');
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        data: null,
      };

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      await expect(
        metricsClient.setMetricThreshold({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          metricKey: 'AGGREGATE',
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

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await metricsClient.updateMetricSetting({
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        isReported: true,
        isThresholdEnforced: false,
      });

      expect(mockBaseClient.executeGraphQL).toHaveBeenCalledWith(
        expect.stringContaining('mutation updateMetricSetting'),
        expect.objectContaining({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          isReported: true,
          isThresholdEnforced: false,
        })
      );

      expect(result.ok).toBe(true);
    });

    it('should handle setting update errors', async () => {
      mockBaseClient.executeGraphQL = jest
        .fn()
        .mockRejectedValue(new Error('Setting update failed'));

      await expect(
        metricsClient.updateMetricSetting({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          isReported: true,
          isThresholdEnforced: false,
        })
      ).rejects.toThrow('Setting update failed');
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        data: null,
      };

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      await expect(
        metricsClient.updateMetricSetting({
          repositoryId: 'repo-123',
          metricShortcode: 'LCV',
          isReported: true,
          isThresholdEnforced: false,
        })
      ).rejects.toThrow('No data received from GraphQL API');
    });
  });

  describe('buildQualityMetricsQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = (metricsClient as any).buildQualityMetricsQuery();

      expect(query).toContain('query getQualityMetrics');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('metrics');
    });
  });

  describe('buildUpdateThresholdMutation', () => {
    it('should build correct GraphQL mutation', () => {
      const mutation = (metricsClient as any).buildUpdateThresholdMutation();

      expect(mutation).toContain('mutation updateMetricThreshold');
      expect(mutation).toContain('$repositoryId: ID!');
      expect(mutation).toContain('$metricShortcode: String!');
      expect(mutation).toContain('$metricKey: String!');
      expect(mutation).toContain('$thresholdValue: Float');
    });
  });

  describe('buildUpdateSettingMutation', () => {
    it('should build correct GraphQL mutation', () => {
      const mutation = (metricsClient as any).buildUpdateSettingMutation();

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
              shortcode: 'LCV',
              name: 'Line Coverage',
              description: 'Percentage of lines covered by tests',
              direction: 'UPWARD',
              unit: '%',
              isReported: true,
              isThresholdEnforced: true,
              items: [
                {
                  key: 'AGGREGATE',
                  value: 85.5,
                  thresholdValue: 80.0,
                  thresholdStatus: 'PASS',
                },
              ],
            },
          ],
        },
      };

      const metrics = (metricsClient as any).extractMetricsFromResponse(mockResponseData);

      expect(metrics).toHaveLength(1);
      expect(metrics[0].shortcode).toBe('LCV');
      expect(metrics[0].name).toBe('Line Coverage');
      expect(metrics[0].items[0].latestValue).toBe(85.5);
      expect(metrics[0].items[0].threshold).toBe(80.0);
    });

    it('should handle missing metrics in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const metrics = (metricsClient as any).extractMetricsFromResponse(mockResponseData);

      expect(metrics).toHaveLength(0);
    });

    it('should handle missing repository in response', () => {
      const mockResponseData = {};

      const metrics = (metricsClient as any).extractMetricsFromResponse(mockResponseData);

      expect(metrics).toHaveLength(0);
    });
  });
});
