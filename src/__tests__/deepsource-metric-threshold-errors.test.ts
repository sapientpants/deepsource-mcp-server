/**
 * Tests for DeepSource metric threshold error handling
 * This file focuses on error handling in metric threshold updates
 */
import { jest, expect } from '@jest/globals';
import nock from 'nock';
import { DeepSourceClient, MetricShortcode, UpdateMetricThresholdParams } from '../deepsource.js';
import { ClassifiedError } from '../utils/errors.js';
import { MetricKey } from '../types/metrics.js';

describe('DeepSourceClient Metric Threshold Error Handling', () => {
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

  describe('setMetricThreshold', () => {
    // Test successful metric threshold update
    it('should update metric threshold successfully', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      };

      // Mock the successful response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            setRepositoryMetricThreshold: {
              ok: true,
            },
          },
        });

      const result = await client.setMetricThreshold(params);
      expect(result).toEqual({ ok: true });
    });

    // Test GraphQL error handling - This will specifically test line 2097
    it('should handle GraphQL errors correctly', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      };

      // Mock the GraphQL errors response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          errors: [
            { message: 'Invalid metric shortcode' },
            { message: 'Threshold value out of range' },
          ],
        });

      await expect(client.setMetricThreshold(params)).rejects.toThrow(
        'GraphQL Errors: Invalid metric shortcode, Threshold value out of range'
      );
    });

    // Test null threshold value
    it('should handle null threshold value correctly', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: null,
      };

      // Mock the successful response for removing a threshold
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            setRepositoryMetricThreshold: {
              ok: true,
            },
          },
        });

      const result = await client.setMetricThreshold(params);
      expect(result).toEqual({ ok: true });
    });

    // Test HTTP errors
    it('should handle HTTP errors correctly', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      };

      // Mock a server error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(500, { message: 'Internal Server Error' });

      await expect(client.setMetricThreshold(params)).rejects.toThrow();

      // Use separate mock for additional verification
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(500, { message: 'Internal Server Error' });

      try {
        await client.setMetricThreshold(params);
        // This should not be reached
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Verify error categorization
        expect((error as ClassifiedError).category).toBeTruthy();
      }
    });

    // Test network errors
    it('should handle network errors correctly', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      };

      // Mock a network error
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .replyWithError('Network error: Connection refused');

      await expect(client.setMetricThreshold(params)).rejects.toThrow();

      // Use separate mock for additional verification
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .replyWithError('Network error: Connection refused');

      try {
        await client.setMetricThreshold(params);
        // This should not be reached
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Verify error categorization
        expect((error as ClassifiedError).category).toBeTruthy();
      }
    });

    // Test empty response
    it('should handle empty response correctly', async () => {
      const params: UpdateMetricThresholdParams = {
        projectKey: 'test-project',
        repositoryId: 'repo-123',
        metricShortcode: MetricShortcode.LCV,
        metricKey: MetricKey.AGGREGATE,
        thresholdValue: 80,
      };

      // Mock an empty response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            setRepositoryMetricThreshold: null,
          },
        });

      const result = await client.setMetricThreshold(params);
      expect(result).toEqual({ ok: false });
    });
  });
});
