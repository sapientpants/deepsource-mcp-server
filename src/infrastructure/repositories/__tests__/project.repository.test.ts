/**
 * @fileoverview Tests for ProjectRepository
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProjectRepository } from '../project.repository.js';
import { ProjectsClient } from '../../../client/projects-client.js';
import { DeepSourceProject } from '../../../models/projects.js';
import { asProjectKey } from '../../../types/branded.js';
import { Project } from '../../../domain/aggregates/project/project.aggregate.js';

// Mock the ProjectsClient
jest.mock('../../../client/projects-client.js');

// Mock the logger
jest.mock('../../../utils/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  let mockProjectsClient: jest.Mocked<ProjectsClient>;
  let mockApiProjects: DeepSourceProject[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock ProjectsClient with mocked methods
    mockProjectsClient = {
      listProjects: jest.fn(),
    } as unknown as jest.Mocked<ProjectsClient>;

    // Create test data
    mockApiProjects = [
      {
        key: asProjectKey('project-1'),
        name: 'Project One',
        repository: {
          url: 'https://github.com/user/project-1',
          provider: 'GITHUB',
          login: 'user',
          isPrivate: false,
          isActivated: true,
        },
      },
      {
        key: asProjectKey('project-2'),
        name: 'Project Two',
        repository: {
          url: 'https://gitlab.com/user/project-2',
          provider: 'GITLAB',
          login: 'user',
          isPrivate: true,
          isActivated: false,
        },
      },
      {
        key: asProjectKey('project-3'),
        name: 'Project Three',
        repository: {
          url: 'https://github.com/org/project-3',
          provider: 'GITHUB',
          login: 'org',
          isPrivate: false,
          isActivated: true,
        },
      },
    ];

    // Setup default mock behavior
    mockProjectsClient.listProjects.mockResolvedValue(mockApiProjects);

    // Create repository instance
    repository = new ProjectRepository(mockProjectsClient);
  });

  describe('findById', () => {
    it('should find project by id', async () => {
      const projectKey = asProjectKey('project-1');
      const project = await repository.findById(projectKey);

      expect(project).not.toBeNull();
      expect(project?.key).toBe(projectKey);
      expect(project?.name).toBe('Project One');
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return null when project not found', async () => {
      const projectKey = asProjectKey('non-existent');
      const project = await repository.findById(projectKey);

      expect(project).toBeNull();
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should propagate client errors', async () => {
      const error = new Error('API Error');
      mockProjectsClient.listProjects.mockRejectedValue(error);

      await expect(repository.findById(asProjectKey('project-1'))).rejects.toThrow('API Error');
    });
  });

  describe('findByKey', () => {
    it('should find project by key', async () => {
      const projectKey = asProjectKey('project-2');
      const project = await repository.findByKey(projectKey);

      expect(project).not.toBeNull();
      expect(project?.key).toBe(projectKey);
      expect(project?.name).toBe('Project Two');
      expect(project?.repository.provider).toBe('GITLAB');
      expect(project?.status).toBe('INACTIVE');
    });

    it('should map activated projects to ACTIVE status', async () => {
      const projectKey = asProjectKey('project-1');
      const project = await repository.findByKey(projectKey);

      expect(project).not.toBeNull();
      expect(project?.status).toBe('ACTIVE');
      expect(project?.configuration.isActivated).toBe(true);
    });

    it('should map non-activated projects to INACTIVE status', async () => {
      const projectKey = asProjectKey('project-2');
      const project = await repository.findByKey(projectKey);

      expect(project).not.toBeNull();
      expect(project?.status).toBe('INACTIVE');
      expect(project?.configuration.isActivated).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const projects = await repository.findAll();

      expect(projects).toHaveLength(3);
      expect(projects[0]).toBeInstanceOf(Project);
      expect(projects.map((p) => p.key)).toEqual([
        asProjectKey('project-1'),
        asProjectKey('project-2'),
        asProjectKey('project-3'),
      ]);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no projects exist', async () => {
      mockProjectsClient.listProjects.mockResolvedValue([]);

      const projects = await repository.findAll();

      expect(projects).toEqual([]);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should propagate client errors', async () => {
      const error = new Error('Network Error');
      mockProjectsClient.listProjects.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow('Network Error');
    });
  });

  describe('findActive', () => {
    it('should return only active projects', async () => {
      const projects = await repository.findActive();

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.key)).toEqual([
        asProjectKey('project-1'),
        asProjectKey('project-3'),
      ]);
      expect(projects.every((p) => p.status === 'ACTIVE')).toBe(true);
    });

    it('should return empty array when no active projects exist', async () => {
      // Mock all projects as inactive
      const inactiveProjects = mockApiProjects.map((p) => ({
        ...p,
        repository: { ...p.repository, isActivated: false },
      }));
      mockProjectsClient.listProjects.mockResolvedValue(inactiveProjects);

      const projects = await repository.findActive();

      expect(projects).toEqual([]);
    });
  });

  describe('findByProvider', () => {
    it('should return projects for specific provider', async () => {
      const projects = await repository.findByProvider('GITHUB');

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.key)).toEqual([
        asProjectKey('project-1'),
        asProjectKey('project-3'),
      ]);
      expect(projects.every((p) => p.repository.provider === 'GITHUB')).toBe(true);
    });

    it('should return empty array for unknown provider', async () => {
      const projects = await repository.findByProvider('BITBUCKET');

      expect(projects).toEqual([]);
    });

    it('should handle GITLAB provider', async () => {
      const projects = await repository.findByProvider('GITLAB');

      expect(projects).toHaveLength(1);
      expect(projects[0].key).toBe(asProjectKey('project-2'));
      expect(projects[0].repository.provider).toBe('GITLAB');
    });
  });

  describe('exists', () => {
    it('should return true when project exists', async () => {
      const exists = await repository.exists(asProjectKey('project-1'));

      expect(exists).toBe(true);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return false when project does not exist', async () => {
      const exists = await repository.exists(asProjectKey('non-existent'));

      expect(exists).toBe(false);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should propagate client errors', async () => {
      const error = new Error('API Error');
      mockProjectsClient.listProjects.mockRejectedValue(error);

      await expect(repository.exists(asProjectKey('project-1'))).rejects.toThrow('API Error');
    });
  });

  describe('count', () => {
    it('should return total project count', async () => {
      const count = await repository.count();

      expect(count).toBe(3);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no projects exist', async () => {
      mockProjectsClient.listProjects.mockResolvedValue([]);

      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  describe('countActive', () => {
    it('should return active project count', async () => {
      const count = await repository.countActive();

      expect(count).toBe(2);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no active projects exist', async () => {
      // Mock all projects as inactive
      const inactiveProjects = mockApiProjects.map((p) => ({
        ...p,
        repository: { ...p.repository, isActivated: false },
      }));
      mockProjectsClient.listProjects.mockResolvedValue(inactiveProjects);

      const count = await repository.countActive();

      expect(count).toBe(0);
    });
  });

  describe('save', () => {
    it('should throw error indicating operation not supported', async () => {
      const project = Project.create({
        key: asProjectKey('new-project'),
        name: 'New Project',
        repository: {
          url: 'https://github.com/user/new-project',
          provider: 'GITHUB',
          login: 'user',
          isPrivate: false,
        },
      });

      await expect(repository.save(project)).rejects.toThrow(
        'Save operation is not supported by DeepSource API'
      );
    });
  });

  describe('delete', () => {
    it('should throw error indicating operation not supported', async () => {
      await expect(repository.delete(asProjectKey('project-1'))).rejects.toThrow(
        'Delete operation is not supported by DeepSource API'
      );
    });
  });

  describe('data freshness', () => {
    it('should fetch fresh data on every request', async () => {
      // First call
      await repository.findByKey(asProjectKey('project-1'));

      // Update mock data
      mockApiProjects[0].name = 'Updated Project One';

      // Second call should get fresh data
      const project = await repository.findByKey(asProjectKey('project-1'));

      expect(project?.name).toBe('Updated Project One');
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(2);
    });

    it('should not cache results between different method calls', async () => {
      await repository.findAll();
      await repository.findActive();
      await repository.findByProvider('GITHUB');
      await repository.count();
      await repository.countActive();

      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(5);
    });
  });
});
