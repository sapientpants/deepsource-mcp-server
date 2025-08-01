/**
 * @fileoverview Tests for ProjectMapper
 */

import { describe, it, expect } from '@jest/globals';
import { ProjectMapper } from '../project.mapper.js';
import { DeepSourceProject } from '../../../models/projects.js';
import { asProjectKey } from '../../../types/branded.js';
import { Project } from '../../../domain/aggregates/project/project.aggregate.js';

describe('ProjectMapper', () => {
  describe('toDomain', () => {
    it('should map API project to domain aggregate', () => {
      const apiProject: DeepSourceProject = {
        key: asProjectKey('test-project'),
        name: 'Test Project',
        repository: {
          url: 'https://github.com/user/test-project',
          provider: 'GITHUB',
          login: 'user',
          isPrivate: false,
          isActivated: true,
        },
      };

      const domainProject = ProjectMapper.toDomain(apiProject);

      expect(domainProject).toBeInstanceOf(Project);
      expect(domainProject.key).toBe(apiProject.key);
      expect(domainProject.name).toBe(apiProject.name);
      expect(domainProject.repository.url).toBe(apiProject.repository.url);
      expect(domainProject.repository.provider).toBe(apiProject.repository.provider);
      expect(domainProject.repository.login).toBe(apiProject.repository.login);
      expect(domainProject.repository.isPrivate).toBe(apiProject.repository.isPrivate);
      expect(domainProject.status).toBe('ACTIVE');
      expect(domainProject.configuration.isActivated).toBe(true);
    });

    it('should map non-activated project to INACTIVE status', () => {
      const apiProject: DeepSourceProject = {
        key: asProjectKey('inactive-project'),
        name: 'Inactive Project',
        repository: {
          url: 'https://gitlab.com/user/inactive-project',
          provider: 'GITLAB',
          login: 'user',
          isPrivate: true,
          isActivated: false,
        },
      };

      const domainProject = ProjectMapper.toDomain(apiProject);

      expect(domainProject.status).toBe('INACTIVE');
      expect(domainProject.configuration.isActivated).toBe(false);
    });

    it('should set default configuration values', () => {
      const apiProject: DeepSourceProject = {
        key: asProjectKey('default-config-project'),
        name: 'Default Config Project',
        repository: {
          url: 'https://github.com/org/project',
          provider: 'GITHUB',
          login: 'org',
          isPrivate: false,
          isActivated: true,
        },
      };

      const domainProject = ProjectMapper.toDomain(apiProject);

      // Check default configuration values
      expect(domainProject.configuration.autoFix).toBe(false);
      expect(domainProject.configuration.pullRequestIntegration).toBe(true);
      expect(domainProject.configuration.issueReporting).toBe(true);
    });

    it('should handle private repositories', () => {
      const apiProject: DeepSourceProject = {
        key: asProjectKey('private-project'),
        name: 'Private Project',
        repository: {
          url: 'https://github.com/user/private-project',
          provider: 'GITHUB',
          login: 'user',
          isPrivate: true,
          isActivated: true,
        },
      };

      const domainProject = ProjectMapper.toDomain(apiProject);

      expect(domainProject.repository.isPrivate).toBe(true);
    });
  });

  describe('toPersistence', () => {
    it('should map domain aggregate to persistence format', () => {
      const project = Project.create({
        key: asProjectKey('test-project'),
        name: 'Test Project',
        repository: {
          url: 'https://github.com/user/test-project',
          provider: 'GITHUB',
          login: 'user',
          isPrivate: false,
        },
        configuration: {
          isActivated: true,
          autoFix: true,
          pullRequestIntegration: false,
          issueReporting: true,
        },
      });

      const persistence = ProjectMapper.toPersistence(project);

      expect(persistence.key).toBe(project.key);
      expect(persistence.name).toBe(project.name);
      expect(persistence.repository).toEqual(project.repository);
      expect(persistence.configuration).toEqual(project.configuration);
      expect(persistence.status).toBe(project.status);
      expect(persistence.createdAt).toBeInstanceOf(Date);
      expect(persistence.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomainList', () => {
    it('should map multiple API projects to domain aggregates', () => {
      const apiProjects: DeepSourceProject[] = [
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
      ];

      const domainProjects = ProjectMapper.toDomainList(apiProjects);

      expect(domainProjects).toHaveLength(2);
      expect(domainProjects[0]).toBeInstanceOf(Project);
      expect(domainProjects[1]).toBeInstanceOf(Project);
      expect(domainProjects[0].key).toBe(asProjectKey('project-1'));
      expect(domainProjects[1].key).toBe(asProjectKey('project-2'));
      expect(domainProjects[0].status).toBe('ACTIVE');
      expect(domainProjects[1].status).toBe('INACTIVE');
    });

    it('should handle empty array', () => {
      const domainProjects = ProjectMapper.toDomainList([]);

      expect(domainProjects).toEqual([]);
    });
  });
});
