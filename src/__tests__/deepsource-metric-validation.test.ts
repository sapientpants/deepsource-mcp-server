/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import nock from 'nock';
import { DeepSourceClient, MetricShortcode } from '../deepsource';
import { MetricKey } from '../types/metrics';

describe('DeepSourceClient Metric Validation', () => {
  const API_KEY = 'test-api-key';
  const PROJECT_KEY = 'test-project';

  // Subclass DeepSourceClient to expose private methods for testing
  class TestableDeepSourceClient extends DeepSourceClient {
    async testValidateAndGetMetricInfo(params: any) {
      // @ts-expect-error - accessing private method for testing
      return this.validateAndGetMetricInfo(params);
    }
  }

  let client: TestableDeepSourceClient;

  beforeEach(() => {
    nock.cleanAll();
    client = new TestableDeepSourceClient(API_KEY);
  });

  afterAll(() => {
    nock.restore();
  });

  describe('validateAndGetMetricInfo method', () => {
    it('should return project, metric, and metric item when all are valid (lines 2931, 2934, 2939, 2942, 2946, 2952, 2959)', async () => {
      // Mock the projects response
      const mockProjects = [
        {
          key: PROJECT_KEY,
          name: 'Test Project',
          repository: {
            id: 'repo123',
            login: 'testorg',
            provider: 'github',
          },
        },
      ];

      // Mock the metrics response
      const mockMetrics = [
        {
          shortcode: MetricShortcode.LCV,
          name: 'Line Coverage',
          items: [
            {
              id: 'metric123',
              key: MetricKey.AGGREGATE,
              threshold: 80,
            },
          ],
        },
      ];

      // Mock the listProjects method to return our mock data (line 2931)
      jest.spyOn(client, 'listProjects').mockResolvedValue(mockProjects);

      // Mock the getQualityMetrics method to return our mock data (line 2942)
      jest.spyOn(client, 'getQualityMetrics').mockResolvedValue(mockMetrics);

      // Mock the static validateProjectRepository method (line 2939)
      jest.spyOn(DeepSourceClient, 'validateProjectRepository').mockImplementation(() => {});

      // Call the method under test
      const result = await client.testValidateAndGetMetricInfo({
        projectKey: PROJECT_KEY,
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
      });

      // Verify the result contains the expected data
      expect(result).toEqual({
        project: mockProjects[0],
        metric: mockMetrics[0],
        metricItem: mockMetrics[0].items[0],
      });

      // Verify the method calls
      expect(client.listProjects).toHaveBeenCalled(); // line 2931
      expect(DeepSourceClient.validateProjectRepository).toHaveBeenCalledWith(
        mockProjects[0],
        PROJECT_KEY
      ); // line 2939
      expect(client.getQualityMetrics).toHaveBeenCalledWith(PROJECT_KEY, {
        shortcodeIn: [MetricShortcode.LCV],
      }); // line 2942
    });

    it('should throw error when project is not found (line 2934)', async () => {
      // Mock the listProjects method to return empty array (line 2931)
      jest.spyOn(client, 'listProjects').mockResolvedValue([]);

      // Call the method and expect it to throw
      await expect(
        client.testValidateAndGetMetricInfo({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow(`Project with key ${PROJECT_KEY} not found`);

      // Verify the method call
      expect(client.listProjects).toHaveBeenCalled(); // line 2931
    });

    it('should throw error when metric is not found (line 2946)', async () => {
      // Mock the projects response
      const mockProjects = [
        {
          key: PROJECT_KEY,
          name: 'Test Project',
          repository: {
            id: 'repo123',
            login: 'testorg',
            provider: 'github',
          },
        },
      ];

      // Mock empty metrics response
      const mockMetrics: any[] = [];

      // Mock the listProjects method to return our mock data (line 2931)
      jest.spyOn(client, 'listProjects').mockResolvedValue(mockProjects);

      // Mock the getQualityMetrics method to return empty array (line 2942)
      jest.spyOn(client, 'getQualityMetrics').mockResolvedValue(mockMetrics);

      // Mock the static validateProjectRepository method (line 2939)
      jest.spyOn(DeepSourceClient, 'validateProjectRepository').mockImplementation(() => {});

      // Call the method and expect it to throw
      await expect(
        client.testValidateAndGetMetricInfo({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow(`Metric with shortcode ${MetricShortcode.LCV} not found in project`);

      // Verify the method calls
      expect(client.listProjects).toHaveBeenCalled(); // line 2931
      expect(DeepSourceClient.validateProjectRepository).toHaveBeenCalled(); // line 2939
      expect(client.getQualityMetrics).toHaveBeenCalled(); // line 2942
    });

    it('should throw error when metric item is not found (line 2952)', async () => {
      // Mock the projects response
      const mockProjects = [
        {
          key: PROJECT_KEY,
          name: 'Test Project',
          repository: {
            id: 'repo123',
            login: 'testorg',
            provider: 'github',
          },
        },
      ];

      // Mock metrics response with no items for the specific key
      const mockMetrics = [
        {
          shortcode: MetricShortcode.LCV,
          name: 'Line Coverage',
          items: [
            {
              id: 'metric123',
              key: 'DIFFERENT_KEY', // Different from what we're looking for
              threshold: 80,
            },
          ],
        },
      ];

      // Mock the listProjects method to return our mock data (line 2931)
      jest.spyOn(client, 'listProjects').mockResolvedValue(mockProjects);

      // Mock the getQualityMetrics method to return our mock data (line 2942)
      jest.spyOn(client, 'getQualityMetrics').mockResolvedValue(mockMetrics);

      // Mock the static validateProjectRepository method (line 2939)
      jest.spyOn(DeepSourceClient, 'validateProjectRepository').mockImplementation(() => {});

      // Call the method and expect it to throw
      await expect(
        client.testValidateAndGetMetricInfo({
          projectKey: PROJECT_KEY,
          metricShortcode: MetricShortcode.LCV,
          metricKey: MetricKey.AGGREGATE,
        })
      ).rejects.toThrow(
        `Metric item with key ${MetricKey.AGGREGATE} not found in metric ${MetricShortcode.LCV}`
      );

      // Verify the method calls
      expect(client.listProjects).toHaveBeenCalled(); // line 2931
      expect(DeepSourceClient.validateProjectRepository).toHaveBeenCalled(); // line 2939
      expect(client.getQualityMetrics).toHaveBeenCalled(); // line 2942
    });
  });
});
