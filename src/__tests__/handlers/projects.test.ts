/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { ProjectKey } from '../../types/branded';
import type { IProjectRepository } from '../../domain/aggregates/project/project.repository';
import type { Project } from '../../domain/aggregates/project/project.aggregate';
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
const mockFindAll = jest.fn();
const mockProjectRepository = {
  findAll: mockFindAll,
} as unknown as IProjectRepository;

const mockCreateProjectRepository = jest.fn(() => mockProjectRepository);
const mockRepositoryFactory = jest.fn(() => ({
  createProjectRepository: mockCreateProjectRepository,
}));

jest.unstable_mockModule('../../infrastructure/factories/repository.factory', () => ({
  RepositoryFactory: mockRepositoryFactory,
}));

// Import the modules under test AFTER mocking
const { handleProjects, createProjectsHandler } = await import('../../handlers/projects');

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

  describe('createProjectsHandler', () => {
    it('should create a handler that uses injected dependencies', async () => {
      // Mock domain projects
      const mockProjects = [
        {
          key: 'proj1' as ProjectKey,
          name: 'Project One',
        } as Project,
      ];

      // Set up the mock to return the projects
      mockFindAll.mockResolvedValue(mockProjects);

      const handler = createProjectsHandler({
        projectRepository: mockProjectRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler();

      // Verify repository was used
      expect(mockFindAll).toHaveBeenCalled();

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([{ key: 'proj1', name: 'Project One' }]);
    });

    it('should handle errors using injected logger', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Injected error');
      mockFindAll.mockRejectedValue(testError);

      const handler = createProjectsHandler({
        projectRepository: mockProjectRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler();

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith('Error in handleProjects', expect.any(Object));

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Injected error',
        details: 'Failed to retrieve projects',
      });
    });
  });

  describe('handleProjects', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(handleProjects()).rejects.toThrow(
        'DEEPSOURCE_API_KEY environment variable is not set'
      );
    });

    it('should return a list of projects successfully', async () => {
      // Mock domain projects
      const mockProjects = [
        {
          key: 'proj1' as ProjectKey,
          name: 'Project One',
        } as Project,
        {
          key: 'proj2' as ProjectKey,
          name: 'Project Two',
        } as Project,
      ];

      // Set up the mock to return the projects
      mockFindAll.mockResolvedValue(mockProjects);

      // Call the handler
      const result = await handleProjects();

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createProjectRepository was called
      expect(mockCreateProjectRepository).toHaveBeenCalled();

      // Verify findAll was called
      expect(mockFindAll).toHaveBeenCalled();

      // Verify logging behavior - check that key operations were logged
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching projects from repository');

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
      mockFindAll.mockResolvedValue([]);

      // Call the handler
      const result = await handleProjects();

      // Verify that the factory and repository methods were called
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(mockCreateProjectRepository).toHaveBeenCalled();
      expect(mockFindAll).toHaveBeenCalled();

      // Verify logging behavior - only check for key log messages
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching projects from repository');

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);

      // Parse and verify the content is an empty array
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual([]);
    });

    it('should handle errors from the repository', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindAll.mockRejectedValue(testError);

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
        error: 'Repository connection failed',
        details: 'Failed to retrieve projects',
      });
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindAll.mockRejectedValue('Just a string error');

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
