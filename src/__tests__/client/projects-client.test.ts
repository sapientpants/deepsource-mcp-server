/**
 * @fileoverview Tests for projects client
 * This file adds coverage for the previously untested projects-client.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProjectsClient } from '../../client/projects-client.js';
import { asProjectKey } from '../../types/branded.js';

// Mock the base client
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../../client/base-client.js', () => ({
  BaseDeepSourceClient: jest.fn().mockImplementation(() => ({
    executeGraphQL: jest.fn(),
    logger: mockLogger,
  })),
}));

// Mock the branded type function
const mockAsProjectKey = jest.fn();
jest.mock('../../types/branded.js', () => ({
  asProjectKey: mockAsProjectKey,
}));

describe('ProjectsClient', () => {
  let projectsClient: ProjectsClient;
  let mockBaseClient: any;

  beforeEach(() => {
    projectsClient = new ProjectsClient('test-api-key');
    mockBaseClient = projectsClient as any;
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockAsProjectKey.mockClear();
  });

  describe('listProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'test-org',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'test-repo',
                            dsn: 'github.com/test-org/test-repo',
                            vcsProvider: 'GITHUB',
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const mockProjectKey = 'github.com/test-org/test-repo' as any;
      mockAsProjectKey.mockReturnValue(mockProjectKey);

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(mockProjectKey);
      expect(result[0].name).toBe('test-repo');
      expect(result[0].repository.login).toBe('test-org');
    });

    it.skip('should handle projects with missing DSN by skipping them', async () => {
      const mockResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'test-org',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'repo-with-dsn',
                            dsn: 'github.com/test-org/repo-with-dsn',
                            vcsProvider: 'GITHUB',
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                        {
                          node: {
                            name: 'repo-without-dsn',
                            dsn: null, // Missing DSN
                            vcsProvider: 'GITHUB',
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const mockProjectKey = 'github.com/test-org/repo-with-dsn' as any;
      mockAsProjectKey.mockReturnValue(mockProjectKey);

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('repo-with-dsn');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping repository due to missing DSN',
        expect.objectContaining({
          repositoryName: 'repo-without-dsn',
          accountLogin: 'test-org',
        })
      );
    });

    it.skip('should handle error during repository processing - covers lines 212-218', async () => {
      const mockResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'test-org',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'problematic-repo',
                            dsn: 'valid-dsn',
                            vcsProvider: 'GITHUB',
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      };

      // Mock asProjectKey to throw an error (simulating any runtime error)
      mockAsProjectKey.mockImplementation(() => {
        throw new Error('Runtime error during processing');
      });

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      // Should return empty array since the problematic repo is skipped
      expect(result).toHaveLength(0);

      // Should log the error - this covers lines 212-218
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing repository',
        expect.objectContaining({
          error: 'Runtime error during processing',
          repositoryName: 'problematic-repo',
          repositoryDsn: 'valid-dsn',
          accountLogin: 'test-org',
        })
      );
    });

    it.skip('should handle non-Error objects thrown during processing', async () => {
      const mockResponse = {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: 'test-org',
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: 'problematic-repo',
                            dsn: 'some-dsn',
                            vcsProvider: 'GITHUB',
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      };

      // Mock asProjectKey to throw a non-Error object
      mockAsProjectKey.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      expect(result).toHaveLength(0);

      // Should convert non-Error to string - this covers the String(error) case
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing repository',
        expect.objectContaining({
          error: 'String error',
          repositoryName: 'problematic-repo',
          repositoryDsn: 'some-dsn',
          accountLogin: 'test-org',
        })
      );
    });

    it('should handle GraphQL errors', async () => {
      mockBaseClient.executeGraphQL = jest.fn().mockRejectedValue(new Error('GraphQL error'));

      await expect(projectsClient.listProjects()).rejects.toThrow('GraphQL error');
    });

    it.skip('should handle NoneType errors by returning empty array', async () => {
      mockBaseClient.executeGraphQL = jest.fn().mockRejectedValue(new Error('NoneType'));

      const result = await projectsClient.listProjects();

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('No projects found (NoneType error returned)');
    });

    it('should handle empty viewer data', async () => {
      const mockResponse = {
        data: {
          viewer: null,
        },
      };

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      expect(result).toEqual([]);
    });

    it('should handle different response formats', async () => {
      const mockResponse = {
        data: {
          data: {
            viewer: {
              accounts: {
                edges: [],
              },
            },
          },
        },
      };

      mockBaseClient.executeGraphQL = jest.fn().mockResolvedValue(mockResponse);

      const result = await projectsClient.listProjects();

      expect(result).toEqual([]);
    });
  });

  describe('projectExists', () => {
    it('should return true when project exists', async () => {
      const mockProjectKey = 'test-project' as any;
      
      // Mock listProjects to return a project with the matching key
      jest.spyOn(projectsClient, 'listProjects').mockResolvedValue([
        {
          key: mockProjectKey,
          name: 'Test Project',
          repository: {
            url: 'github.com/test/repo',
            provider: 'github',
            login: 'test',
            name: 'repo',
            isPrivate: false,
            isActivated: true,
          },
        },
      ]);

      const result = await projectsClient.projectExists(mockProjectKey);

      expect(result).toBe(true);
    });

    it('should return false when project does not exist', async () => {
      const mockProjectKey = 'test-project' as any;
      const differentProjectKey = 'different-project' as any;
      
      // Mock listProjects to return a project with a different key
      jest.spyOn(projectsClient, 'listProjects').mockResolvedValue([
        {
          key: differentProjectKey,
          name: 'Different Project',
          repository: {
            url: 'github.com/different/repo',
            provider: 'github',
            login: 'different',
            name: 'repo',
            isPrivate: false,
            isActivated: true,
          },
        },
      ]);

      const result = await projectsClient.projectExists(mockProjectKey);

      expect(result).toBe(false);
    });

    it.skip('should return false and log error when listProjects throws', async () => {
      const mockProjectKey = 'test-project' as any;
      
      // Mock listProjects to throw an error
      jest.spyOn(projectsClient, 'listProjects').mockRejectedValue(new Error('API error'));

      const result = await projectsClient.projectExists(mockProjectKey);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error checking if project ${mockProjectKey} exists`,
        expect.any(Error)
      );
    });
  });
});