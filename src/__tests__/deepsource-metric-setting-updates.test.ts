/**
 * Tests for DeepSource metric setting updates functionality
 * This file focuses on both success paths and error handling in metric setting updates
 */
import { jest, expect } from '@jest/globals';
import nock from 'nock';
import { DeepSourceClient, MetricShortcode, UpdateMetricSettingParams } from '../deepsource.js';
import { ClassifiedError } from '../utils/errors.js';

describe('DeepSourceClient Metric Setting Updates', () => {
  // Test variables
  const API_KEY = 'test-api-key';
  let client: DeepSourceClient;

  // Setup client and mock environment
  beforeEach(() => {
    client = new DeepSourceClient(API_KEY);
    nock.disableNetConnect();
  });

  // Clean up after each test
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
  });

  describe('updateMetricSetting', () => {
    // Test successful metric setting update
    it('should update metric settings successfully', async () => {
      const params: UpdateMetricSettingParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      };

      // Mock the successful response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            updateRepositoryMetricSetting: {
              ok: true,
            },
          },
        });

      const result = await client.updateMetricSetting(params);
      expect(result).toEqual({ ok: true });
    });

    // Test GraphQL error handling
    it('should handle GraphQL errors correctly', async () => {
      const params: UpdateMetricSettingParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      };

      // Mock the GraphQL errors response - THIS WILL TRIGGER LINE 2139
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'Invalid metric shortcode' }, { message: 'Repository not found' }],
        });

      await expect(client.updateMetricSetting(params)).rejects.toThrow(
        'GraphQL Errors: Invalid metric shortcode, Repository not found'
      );
    });

    // Test error in HTTP response
    it('should handle HTTP errors correctly', async () => {
      const params: UpdateMetricSettingParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      };

      // Mock a server error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(500, { message: 'Internal Server Error' });

      await expect(client.updateMetricSetting(params)).rejects.toThrow();

      // Use separate mock for category test to avoid test interference
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(500, { message: 'Internal Server Error' });

      try {
        await client.updateMetricSetting(params);
        // This code should not be reached
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Based on the implementation, HTTP errors are classified as NETWORK
        // The actual categorization depends on how DeepSourceClient.handleHttpStatusError works
        expect((error as ClassifiedError).category).toBeTruthy();
      }
    });

    // Test network error handling
    it('should handle network errors correctly', async () => {
      const params: UpdateMetricSettingParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      };

      // Mock a network error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .replyWithError('Network error: Connection refused');

      await expect(client.updateMetricSetting(params)).rejects.toThrow();

      // Use separate mock for category test to avoid test interference
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .replyWithError('Network error: Connection refused');

      try {
        await client.updateMetricSetting(params);
        // This code should not be reached
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Verify we have a category without specifying exactly which one
        // as it depends on implementation details that might change
        expect((error as ClassifiedError).category).toBeTruthy();
      }
    });

    // Test empty response handling
    it('should handle empty response correctly', async () => {
      const params: UpdateMetricSettingParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        isReported: true,
        isThresholdEnforced: false,
      };

      // Mock an empty response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            updateRepositoryMetricSetting: null,
          },
        });

      const result = await client.updateMetricSetting(params);
      expect(result).toEqual({ ok: false });
    });
  });
});
