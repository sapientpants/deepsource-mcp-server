/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { asProjectKey } from '../../types/branded';
import type { IQualityMetricsRepository } from '../../domain/aggregates/quality-metrics/quality-metrics.repository';
import type { QualityMetrics } from '../../domain/aggregates/quality-metrics/quality-metrics.aggregate';
import type { Logger } from '../../utils/logging/logger';

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock modules before importing the implementation
jest.unstable_mockModule('../../utils/logging/logger', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

// Mock the repository and factory
const mockFindByProject = jest.fn();
const mockQualityMetricsRepository = {
  findByProject: mockFindByProject,
} as unknown as IQualityMetricsRepository;

const mockCreateQualityMetricsRepository = jest.fn(() => mockQualityMetricsRepository);
const mockRepositoryFactory = jest.fn(() => ({
  createQualityMetricsRepository: mockCreateQualityMetricsRepository,
}));

jest.unstable_mockModule('../../infrastructure/factories/repository.factory', () => ({
  RepositoryFactory: mockRepositoryFactory,
}));

// Import the modules under test AFTER mocking
const { handleDeepsourceQualityMetrics, createQualityMetricsHandlerWithRepo } = await import(
  '../../handlers/quality-metrics'
);

describe('Quality Metrics Handler', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('createQualityMetricsHandlerWithRepo', () => {
    it('should create a handler that uses injected dependencies', async () => {
      // Mock domain quality metrics
      const projectKey = asProjectKey('test-project');
      const mockMetrics = [
        {
          id: 'test-project:AGGREGATE:LCV',
          projectKey,
          repositoryId: 'repo123',
          configuration: {
            name: 'Line Coverage',
            shortcode: 'LCV',
            description: 'Percentage of lines covered by tests',
            positiveDirection: 'UPWARD',
            unit: '%',
            minValueAllowed: 0,
            maxValueAllowed: 100,
            isReported: true,
            isThresholdEnforced: true,
            metricKey: 'AGGREGATE',
            threshold: {
              value: 80,
              description: 'Minimum line coverage threshold',
            },
          },
          currentValue: {
            value: 85.5,
            displayValue: '85.5%',
            unit: '%',
            measuredAt: new Date(),
          },
          thresholdStatus: 'PASSING',
          isCompliant: true,
        } as QualityMetrics,
      ];

      // Set up the mock to return the metrics
      mockFindByProject.mockResolvedValue(mockMetrics);

      const handler = createQualityMetricsHandlerWithRepo({
        qualityMetricsRepository: mockQualityMetricsRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({ projectKey: 'test-project' });

      // Verify repository was used
      expect(mockFindByProject).toHaveBeenCalledWith(projectKey);

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.metrics).toHaveLength(1);
      expect(parsedContent.metrics[0].name).toBe('Line Coverage');
      expect(parsedContent.metrics[0].shortcode).toBe('LCV');
      expect(parsedContent.metrics[0].items[0].latestValue).toBe(85.5);
      expect(parsedContent.metrics[0].items[0].threshold).toBe(80);
    });

    it('should filter metrics by shortcode when specified', async () => {
      // Mock domain quality metrics with multiple shortcodes
      const projectKey = asProjectKey('test-project');
      const mockMetrics = [
        {
          id: 'test-project:AGGREGATE:LCV',
          projectKey,
          repositoryId: 'repo123',
          configuration: {
            name: 'Line Coverage',
            shortcode: 'LCV',
            description: 'Percentage of lines covered by tests',
            positiveDirection: 'UPWARD',
            unit: '%',
            minValueAllowed: 0,
            maxValueAllowed: 100,
            isReported: true,
            isThresholdEnforced: true,
            metricKey: 'AGGREGATE',
            threshold: {
              value: 80,
              description: 'Minimum line coverage threshold',
            },
          },
          currentValue: {
            value: 85.5,
            displayValue: '85.5%',
            unit: '%',
            measuredAt: new Date(),
          },
          thresholdStatus: 'PASSING',
          isCompliant: true,
        } as QualityMetrics,
        {
          id: 'test-project:AGGREGATE:BCV',
          projectKey,
          repositoryId: 'repo123',
          configuration: {
            name: 'Branch Coverage',
            shortcode: 'BCV',
            description: 'Percentage of branches covered by tests',
            positiveDirection: 'UPWARD',
            unit: '%',
            minValueAllowed: 0,
            maxValueAllowed: 100,
            isReported: true,
            isThresholdEnforced: false,
            metricKey: 'AGGREGATE',
            threshold: null,
          },
          currentValue: {
            value: 75.0,
            displayValue: '75.0%',
            unit: '%',
            measuredAt: new Date(),
          },
          thresholdStatus: 'NOT_SET',
          isCompliant: true,
        } as QualityMetrics,
      ];

      // Set up the mock to return the metrics
      mockFindByProject.mockResolvedValue(mockMetrics);

      const handler = createQualityMetricsHandlerWithRepo({
        qualityMetricsRepository: mockQualityMetricsRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler with shortcode filter
      const result = await handler({
        projectKey: 'test-project',
        shortcodeIn: ['LCV'],
      });

      // Verify repository was used
      expect(mockFindByProject).toHaveBeenCalledWith(projectKey);

      // Verify only LCV metric is returned
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.metrics).toHaveLength(1);
      expect(parsedContent.metrics[0].shortcode).toBe('LCV');
    });

    it('should handle errors using injected logger', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProject.mockRejectedValue(testError);

      const handler = createQualityMetricsHandlerWithRepo({
        qualityMetricsRepository: mockQualityMetricsRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({ projectKey: 'test-project' });

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in handleQualityMetrics',
        expect.any(Object)
      );

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Repository connection failed',
        details: 'Failed to retrieve quality metrics',
      });
    });
  });

  describe('handleDeepsourceQualityMetrics', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(handleDeepsourceQualityMetrics({ projectKey: 'test-project' })).rejects.toThrow(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );
    });

    it('should return quality metrics successfully', async () => {
      // Mock domain quality metrics
      const projectKey = asProjectKey('test-project');
      const mockMetrics = [
        {
          id: 'test-project:AGGREGATE:LCV',
          projectKey,
          repositoryId: 'repo123',
          configuration: {
            name: 'Line Coverage',
            shortcode: 'LCV',
            description: 'Percentage of lines covered by tests',
            positiveDirection: 'UPWARD',
            unit: '%',
            minValueAllowed: 0,
            maxValueAllowed: 100,
            isReported: true,
            isThresholdEnforced: true,
            metricKey: 'AGGREGATE',
            threshold: {
              value: 80,
              description: 'Minimum line coverage threshold',
            },
          },
          currentValue: {
            value: 85.5,
            displayValue: '85.5%',
            unit: '%',
            measuredAt: new Date(),
          },
          thresholdStatus: 'PASSING',
          isCompliant: true,
        } as QualityMetrics,
      ];

      // Set up the mock to return the metrics
      mockFindByProject.mockResolvedValue(mockMetrics);

      // Call the handler
      const result = await handleDeepsourceQualityMetrics({ projectKey: 'test-project' });

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createQualityMetricsRepository was called
      expect(mockCreateQualityMetricsRepository).toHaveBeenCalled();

      // Verify findByProject was called
      expect(mockFindByProject).toHaveBeenCalledWith(projectKey);

      // Verify logging behavior - check that key operations were logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching quality metrics from repository',
        expect.any(Object)
      );

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.metrics).toHaveLength(1);
      expect(parsedContent.metrics[0].name).toBe('Line Coverage');
      expect(parsedContent.metrics[0].shortcode).toBe('LCV');
      expect(parsedContent.metrics[0].items[0].latestValue).toBe(85.5);
    });

    it('should handle empty metrics list', async () => {
      // Set up the mock to return an empty array
      mockFindByProject.mockResolvedValue([]);

      // Call the handler
      const result = await handleDeepsourceQualityMetrics({ projectKey: 'test-project' });

      // Verify that the factory and repository methods were called
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(mockCreateQualityMetricsRepository).toHaveBeenCalled();
      expect(mockFindByProject).toHaveBeenCalled();

      // Verify logging behavior
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching quality metrics from repository',
        expect.any(Object)
      );

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);

      // Parse and verify the content is an empty array
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.metrics).toEqual([]);
    });

    it('should throw error when repository fails', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProject.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(handleDeepsourceQualityMetrics({ projectKey: 'test-project' })).rejects.toThrow(
        'Repository connection failed'
      );
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindByProject.mockRejectedValue('Just a string error');

      // Call the handler and expect it to throw
      await expect(handleDeepsourceQualityMetrics({ projectKey: 'test-project' })).rejects.toThrow(
        'Unknown error'
      );
    });
  });
});
