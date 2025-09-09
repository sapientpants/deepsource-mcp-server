/**
 * @fileoverview Tests for Project aggregate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Project } from '../project.aggregate.js';
import type {
  CreateProjectParams,
  UpdateProjectParams,
  ProjectRepository,
  ProjectConfiguration,
} from '../project.types.js';
import type { ProjectKey } from '../../../../types/branded.js';

describe('Project Aggregate', () => {
  let validParams: CreateProjectParams;
  let projectKey: ProjectKey;

  beforeEach(() => {
    projectKey = 'test-project' as ProjectKey;

    validParams = {
      key: projectKey,
      name: 'Test Project',
      repository: {
        url: 'https://github.com/test/repo',
        provider: 'GITHUB',
        login: 'testuser',
        isPrivate: false,
      },
      configuration: {
        isActivated: true,
        autoFix: true,
        pullRequestIntegration: true,
        issueReporting: true,
      },
    };
  });

  describe('create', () => {
    it('should create a project with valid parameters', () => {
      const project = Project.create(validParams);

      expect(project.key).toBe(projectKey);
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('INACTIVE'); // Default status
      expect(project.repository.url).toBe('https://github.com/test/repo');
      expect(project.configuration.isActivated).toBe(true);
      expect(project.domainEvents).toHaveLength(1);
      expect(project.domainEvents[0].eventType).toBe('ProjectCreated');
    });

    it('should create a project with minimal parameters', () => {
      const minimalParams: CreateProjectParams = {
        key: projectKey,
        name: 'Minimal Project',
        repository: {
          url: 'https://github.com/test/minimal',
          provider: 'GITHUB',
          login: 'testuser',
          isPrivate: false,
        },
      };

      const project = Project.create(minimalParams);

      expect(project.status).toBe('INACTIVE');
      expect(project.configuration.isActivated).toBe(false); // Default
      expect(project.configuration.autoFix).toBe(false); // Default
      expect(project.configuration.pullRequestIntegration).toBe(true); // Default
      expect(project.configuration.issueReporting).toBe(true); // Default
    });

    it('should trim project name', () => {
      const params = {
        ...validParams,
        name: '  Test Project  ',
      };

      const project = Project.create(params);

      expect(project.name).toBe('Test Project');
    });

    it('should throw error for empty name', () => {
      const params = {
        ...validParams,
        name: '',
      };

      expect(() => Project.create(params)).toThrow('Project name cannot be empty');
    });

    it('should throw error for whitespace-only name', () => {
      const params = {
        ...validParams,
        name: '   ',
      };

      expect(() => Project.create(params)).toThrow('Project name cannot be empty');
    });

    it('should throw error for invalid repository URL', () => {
      const params = {
        ...validParams,
        repository: {
          ...validParams.repository,
          url: 'not-a-url',
        },
      };

      expect(() => Project.create(params)).toThrow('Invalid repository URL');
    });

    it('should throw error for empty repository URL', () => {
      const params = {
        ...validParams,
        repository: {
          ...validParams.repository,
          url: '',
        },
      };

      expect(() => Project.create(params)).toThrow('Invalid repository URL');
    });

    it('should emit ProjectCreated event with correct payload', () => {
      const project = Project.create(validParams);

      const events = project.domainEvents;
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ProjectCreated');
      expect(event.aggregateId).toBe(projectKey);
      expect(event.payload).toEqual({
        name: 'Test Project',
        repositoryUrl: 'https://github.com/test/repo',
        provider: 'GITHUB',
      });
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const before = new Date();
      const project = Project.create(validParams);
      const after = new Date();

      expect(project.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(project.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(project.updatedAt).toEqual(project.createdAt);
    });
  });

  describe('fromPersistence', () => {
    it('should recreate project from persistence without events', () => {
      const persistenceData = {
        key: projectKey,
        name: 'Test Project',
        repository: validParams.repository,
        configuration: {
          isActivated: true,
          autoFix: true,
          pullRequestIntegration: false,
          issueReporting: true,
        },
        status: 'ACTIVE' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const project = Project.fromPersistence(persistenceData);

      expect(project.key).toBe(projectKey);
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('ACTIVE');
      expect(project.domainEvents).toHaveLength(0); // No events when loading
      expect(project.createdAt).toEqual(persistenceData.createdAt);
      expect(project.updatedAt).toEqual(persistenceData.updatedAt);
    });
  });

  describe('activate', () => {
    it('should activate an inactive project', async () => {
      const project = Project.create(validParams);
      project.clearEvents(); // Clear creation event

      const beforeUpdate = project.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      project.activate();

      expect(project.status).toBe('ACTIVE');
      expect(project.configuration.isActivated).toBe(true);
      expect(project.isActive).toBe(true);
      expect(project.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());

      // Should emit two events: ProjectActivated and AggregateModified
      expect(project.domainEvents).toHaveLength(2);
      expect(project.domainEvents[0].eventType).toBe('ProjectActivated');
      expect(project.domainEvents[1].eventType).toBe('AggregateModified');
    });

    it('should throw error when activating an archived project', () => {
      const persistenceData = {
        ...validParams,
        status: 'ARCHIVED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      expect(() => project.activate()).toThrow('Cannot activate an archived project');
    });

    it('should not emit events when already active', () => {
      const persistenceData = {
        ...validParams,
        status: 'ACTIVE' as const,
        configuration: {
          ...validParams.configuration,
          isActivated: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      project.activate(); // Already active

      expect(project.domainEvents).toHaveLength(0);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active project', () => {
      const persistenceData = {
        ...validParams,
        status: 'ACTIVE' as const,
        configuration: {
          isActivated: true,
          autoFix: false,
          pullRequestIntegration: true,
          issueReporting: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      project.deactivate();

      expect(project.status).toBe('INACTIVE');
      expect(project.configuration.isActivated).toBe(false);
      expect(project.isActive).toBe(false);

      // Should emit two events: ProjectDeactivated and AggregateModified
      expect(project.domainEvents).toHaveLength(2);
      expect(project.domainEvents[0].eventType).toBe('ProjectDeactivated');
      expect(project.domainEvents[1].eventType).toBe('AggregateModified');
    });

    it('should not emit events when already inactive', () => {
      // Create a project that is truly inactive (both status and configuration)
      const inactiveParams = {
        ...validParams,
        configuration: {
          ...validParams.configuration,
          isActivated: false,
        },
      };
      const project = Project.create(inactiveParams);
      project.clearEvents();

      project.deactivate(); // Already fully inactive

      expect(project.domainEvents).toHaveLength(0);
    });
  });

  describe('archive', () => {
    it('should archive an active project', () => {
      const persistenceData = {
        ...validParams,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      project.archive();

      expect(project.status).toBe('ARCHIVED');
      expect(project.configuration.isActivated).toBe(false);

      // Should emit two events: ProjectArchived and AggregateModified
      expect(project.domainEvents).toHaveLength(2);
      expect(project.domainEvents[0].eventType).toBe('ProjectArchived');
      expect(project.domainEvents[1].eventType).toBe('AggregateModified');
    });

    it('should archive an inactive project', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      project.archive();

      expect(project.status).toBe('ARCHIVED');
      expect(project.domainEvents).toHaveLength(2);
    });

    it('should not emit events when already archived', () => {
      const persistenceData = {
        ...validParams,
        status: 'ARCHIVED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      project.archive(); // Already archived

      expect(project.domainEvents).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update project name', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      project.update({ name: 'Updated Project Name' });

      expect(project.name).toBe('Updated Project Name');

      // Should emit two events: ProjectUpdated and AggregateModified
      expect(project.domainEvents).toHaveLength(2);
      expect(project.domainEvents[0].eventType).toBe('ProjectUpdated');
      expect(project.domainEvents[0].payload).toEqual({
        name: 'Updated Project Name',
      });
    });

    it('should update repository information', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      const repositoryUpdate: Partial<ProjectRepository> = {
        provider: 'GITLAB',
        isPrivate: true,
      };

      project.update({ repository: repositoryUpdate });

      expect(project.repository.provider).toBe('GITLAB');
      expect(project.repository.isPrivate).toBe(true);
      // URL and login should remain unchanged
      expect(project.repository.url).toBe('https://github.com/test/repo');
      expect(project.repository.login).toBe('testuser');
    });

    it('should update configuration', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      const configUpdate: Partial<ProjectConfiguration> = {
        autoFix: false,
        pullRequestIntegration: false,
      };

      project.update({ configuration: configUpdate });

      expect(project.configuration.autoFix).toBe(false);
      expect(project.configuration.pullRequestIntegration).toBe(false);
      // Other settings should remain unchanged
      expect(project.configuration.isActivated).toBe(true);
      expect(project.configuration.issueReporting).toBe(true);
    });

    it('should update multiple fields at once', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      const updateParams: UpdateProjectParams = {
        name: 'New Name',
        repository: { isPrivate: true },
        configuration: { autoFix: false },
      };

      project.update(updateParams);

      expect(project.name).toBe('New Name');
      expect(project.repository.isPrivate).toBe(true);
      expect(project.configuration.autoFix).toBe(false);

      const event = project.domainEvents[0];
      expect(event.payload).toEqual({
        name: 'New Name',
        repository: { isPrivate: true },
        configuration: { autoFix: false },
      });
    });

    it('should update timestamp', async () => {
      const project = Project.create(validParams);
      const originalUpdatedAt = project.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      project.update({ name: 'New Name' });

      expect(project.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('isActive', () => {
    it('should return true only when status is ACTIVE and isActivated is true', () => {
      const project = Project.create(validParams);

      // Initially inactive
      expect(project.isActive).toBe(false);

      // Activate
      project.activate();
      expect(project.isActive).toBe(true);

      // Deactivate
      project.deactivate();
      expect(project.isActive).toBe(false);
    });

    it('should return false for archived projects regardless of configuration', () => {
      const persistenceData = {
        ...validParams,
        status: 'ARCHIVED' as const,
        configuration: {
          isActivated: true,
          autoFix: false,
          pullRequestIntegration: true,
          issueReporting: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const project = Project.fromPersistence(persistenceData);

      expect(project.isActive).toBe(false);
    });
  });

  describe('canRunAnalysis', () => {
    it('should return true for active projects', () => {
      const project = Project.create(validParams);
      project.activate();

      expect(project.canRunAnalysis()).toBe(true);
    });

    it('should return false for inactive projects', () => {
      const project = Project.create(validParams);

      expect(project.canRunAnalysis()).toBe(false);
    });

    it('should return false for archived projects', () => {
      const project = Project.create(validParams);
      project.archive();

      expect(project.canRunAnalysis()).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should convert to persistence format', () => {
      const project = Project.create(validParams);

      const persistence = project.toPersistence();

      expect(persistence).toEqual({
        key: projectKey,
        name: 'Test Project',
        repository: validParams.repository,
        configuration: {
          isActivated: true,
          autoFix: true,
          pullRequestIntegration: true,
          issueReporting: true,
        },
        status: 'INACTIVE',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    });

    it('should include all current state after modifications', () => {
      const project = Project.create(validParams);

      // Make some changes
      project.update({ name: 'Modified Name' });
      project.activate();

      const persistence = project.toPersistence();

      expect(persistence.name).toBe('Modified Name');
      expect(persistence.status).toBe('ACTIVE');
      expect(persistence.configuration.isActivated).toBe(true);
    });
  });

  describe('domain events', () => {
    it('should accumulate multiple events', () => {
      const project = Project.create(validParams);
      project.clearEvents();

      project.update({ name: 'New Name' });
      project.activate();
      project.archive();

      // Each operation emits 2 events (operation + AggregateModified)
      expect(project.domainEvents).toHaveLength(6);

      const eventTypes = project.domainEvents.map((e) => e.eventType);
      expect(eventTypes).toEqual([
        'ProjectUpdated',
        'AggregateModified',
        'ProjectActivated',
        'AggregateModified',
        'ProjectArchived',
        'AggregateModified',
      ]);
    });

    it('should clear events when requested', () => {
      const project = Project.create(validParams);

      expect(project.domainEvents).toHaveLength(1);

      project.clearEvents();

      expect(project.domainEvents).toHaveLength(0);
    });
  });
});
