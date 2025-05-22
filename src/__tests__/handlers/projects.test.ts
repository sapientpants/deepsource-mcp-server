/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { ProjectKey } from '../../types/branded';
import type { DeepSourceProject } from '../../models/projects';

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

// Mock the client factory and projects client
const mockListProjects = jest.fn();
const mockGetProjectsClient = jest.fn(() => ({
  listProjects: mockListProjects,
}));
const mockFactory = jest.fn(() => ({
  getProjectsClient: mockGetProjectsClient,
}));

jest.unstable_mockModule('../../client/factory', () => ({
  DeepSourceClientFactory: mockFactory,
}));

// Import the modules under test AFTER mocking
const { handleProjects } = await import('../../handlers/projects');

describe('Projects Handler', () => {
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

  describe('handleProjects', () => {
    it('should return an error response if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler
      const result = await handleProjects();

      // Verify it returns an error response
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );
    });

    it('should return a list of projects successfully', async () => {
      // Mock projects data
      const mockProjects: DeepSourceProject[] = [
        {
          key: 'proj1' as ProjectKey,
          name: 'Project One',
          repository: {
            url: 'https://github.com/org/repo1',
            provider: 'GITHUB',
            login: 'org',
            isPrivate: false,
            isActivated: true,
          },
        },
        {
          key: 'proj2' as ProjectKey,
          name: 'Project Two',
          repository: {
            url: 'https://github.com/org/repo2',
            provider: 'GITHUB',
            login: 'org',
            isPrivate: true,
            isActivated: true,
          },
        },
      ];

      // Set up the mock to return the projects
      mockListProjects.mockResolvedValue(mockProjects);

      // Call the handler
      const result = await handleProjects();

      // Verify factory was created with the API key
      expect(mockFactory).toHaveBeenCalledWith('test-api-key');

      // Verify getProjectsClient was called
      expect(mockGetProjectsClient).toHaveBeenCalled();

      // Verify listProjects was called
      expect(mockListProjects).toHaveBeenCalled();

      // Verify logging behavior - only check the critical log messages
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating client factory');
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting projects client');
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching projects from client');

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([
        { key: 'proj1', name: 'Project One' },
        { key: 'proj2', name: 'Project Two' },
      ]);
    });

    it('should handle empty projects list', async () => {
      // Set up the mock to return an empty array
      mockListProjects.mockResolvedValue([]);

      // Call the handler
      const result = await handleProjects();

      // Verify that the factory and client methods were called
      expect(mockFactory).toHaveBeenCalledWith('test-api-key');
      expect(mockGetProjectsClient).toHaveBeenCalled();
      expect(mockListProjects).toHaveBeenCalled();

      // Verify logging behavior - only check for key log messages
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching projects from client');

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);

      // Parse and verify the content is an empty array
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([]);
    });

    it('should handle errors from the projects client', async () => {
      // Set up the mock to throw an error
      const testError = new Error('API connection failed');
      mockListProjects.mockRejectedValue(testError);

      // Call the handler
      const result = await handleProjects();

      // Verify error was logged - we only check that it was called, but don't verify the exact format
      // as we've enhanced the error logging format
      expect(mockLogger.error).toHaveBeenCalled();

      // Verify the error response structure
      expect(result).toHaveProperty('isError', true);
      expect(result.content).toHaveLength(1);

      // Parse and verify the error content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'API connection failed',
        details: 'Failed to retrieve projects',
      });
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockListProjects.mockRejectedValue('Just a string error');

      // Call the handler
      const result = await handleProjects();

      // Verify error was logged - don't verify the exact format
      // as we've enhanced the error logging with more details
      expect(mockLogger.error).toHaveBeenCalled();

      // Verify the error response structure
      expect(result).toHaveProperty('isError', true);
      expect(result.content).toHaveLength(1);

      // Parse and verify the error content uses a generic message for non-Error objects
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Unknown error',
        details: 'Failed to retrieve projects',
      });
    });
  });
});
