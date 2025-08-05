/**
 * @fileoverview Project repository implementation
 *
 * Concrete implementation of IProjectRepository using DeepSource API.
 */

import { IProjectRepository } from '../../domain/aggregates/project/project.repository.js';
import { Project } from '../../domain/aggregates/project/project.aggregate.js';
import { ProjectKey } from '../../types/branded.js';
import { ProjectsClient } from '../../client/projects-client.js';
import { ProjectMapper } from '../mappers/project.mapper.js';
import { createLogger } from '../../utils/logging/logger.js';

const logger = createLogger('ProjectRepository');

/**
 * Concrete implementation of IProjectRepository using DeepSource API
 *
 * This repository provides access to Project aggregates by fetching data
 * from the DeepSource API and mapping it to domain models.
 *
 * Note: Since the DeepSource API doesn't support individual project queries
 * or persistence operations, some methods fetch all projects and filter locally.
 * This ensures fresh data retrieval on every request as per requirements.
 */
export class ProjectRepository implements IProjectRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly projectsClient: ProjectsClient) {
    // projectsClient is stored for use in methods
  }

  /**
   * Finds a project by its unique identifier
   *
   * @param id - The project key
   * @returns The project if found, null otherwise
   */
  async findById(id: ProjectKey): Promise<Project | null> {
    return this.findByKey(id);
  }

  /**
   * Finds a project by its unique key
   *
   * @param key - The project key
   * @returns The project if found, null otherwise
   */
  async findByKey(key: ProjectKey): Promise<Project | null> {
    try {
      logger.debug('Finding project by key', { key });

      // Fetch all projects and find the one with matching key
      const apiProjects = await this.projectsClient.listProjects();
      const matchingProject = apiProjects.find((p) => p.key === key);

      if (!matchingProject) {
        logger.debug('Project not found', { key });
        return null;
      }

      const project = ProjectMapper.toDomain(matchingProject);
      logger.debug('Project found and mapped', { key, name: project.name });

      return project;
    } catch (error) {
      logger.error('Error finding project by key', { key, error });
      throw error;
    }
  }

  /**
   * Finds all projects
   *
   * @returns All projects in the repository
   */
  async findAll(): Promise<Project[]> {
    try {
      logger.debug('Finding all projects');

      const apiProjects = await this.projectsClient.listProjects();
      const projects = ProjectMapper.toDomainList(apiProjects);

      logger.debug('Projects found', { count: projects.length });

      return projects;
    } catch (error) {
      logger.error('Error finding all projects', { error });
      throw error;
    }
  }

  /**
   * Finds all active projects
   *
   * @returns All projects with ACTIVE status
   */
  async findActive(): Promise<Project[]> {
    try {
      logger.debug('Finding active projects');

      const allProjects = await this.findAll();
      const activeProjects = allProjects.filter((p) => p.status === 'ACTIVE');

      logger.debug('Active projects found', { count: activeProjects.length });

      return activeProjects;
    } catch (error) {
      logger.error('Error finding active projects', { error });
      throw error;
    }
  }

  /**
   * Finds projects by repository provider
   *
   * @param provider - The VCS provider (e.g., 'GITHUB', 'GITLAB')
   * @returns Projects using the specified provider
   */
  async findByProvider(provider: string): Promise<Project[]> {
    try {
      logger.debug('Finding projects by provider', { provider });

      const allProjects = await this.findAll();
      const providerProjects = allProjects.filter((p) => p.repository.provider === provider);

      logger.debug('Projects found for provider', {
        provider,
        count: providerProjects.length,
      });

      return providerProjects;
    } catch (error) {
      logger.error('Error finding projects by provider', { provider, error });
      throw error;
    }
  }

  /**
   * Checks if a project exists with the given key
   *
   * @param key - The project key to check
   * @returns True if the project exists, false otherwise
   */
  async exists(key: ProjectKey): Promise<boolean> {
    try {
      logger.debug('Checking if project exists', { key });

      const project = await this.findByKey(key);
      const exists = project !== null;

      logger.debug('Project existence check', { key, exists });

      return exists;
    } catch (error) {
      logger.error('Error checking project existence', { key, error });
      throw error;
    }
  }

  /**
   * Counts the total number of projects
   *
   * @returns The total project count
   */
  async count(): Promise<number> {
    try {
      logger.debug('Counting all projects');

      const projects = await this.findAll();
      const count = projects.length;

      logger.debug('Total project count', { count });

      return count;
    } catch (error) {
      logger.error('Error counting projects', { error });
      throw error;
    }
  }

  /**
   * Counts the number of active projects
   *
   * @returns The active project count
   */
  async countActive(): Promise<number> {
    try {
      logger.debug('Counting active projects');

      const activeProjects = await this.findActive();
      const count = activeProjects.length;

      logger.debug('Active project count', { count });

      return count;
    } catch (error) {
      logger.error('Error counting active projects', { error });
      throw error;
    }
  }

  /**
   * Saves a project
   *
   * Note: The DeepSource API doesn't support creating/updating projects
   * through the GraphQL API. This method is implemented to satisfy the
   * interface but will throw an error indicating the operation is not supported.
   *
   * @param project - The project to save
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async save(project: Project): Promise<void> {
    logger.warn('Attempted to save project', {
      key: project.key,
      name: project.name,
    });

    throw new Error(
      'Save operation is not supported by DeepSource API. ' +
        'Projects must be created and managed through the DeepSource UI.'
    );
  }

  /**
   * Deletes a project
   *
   * Note: The DeepSource API doesn't support deleting projects
   * through the GraphQL API. This method is implemented to satisfy the
   * interface but will throw an error indicating the operation is not supported.
   *
   * @param key - The project key to delete
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async delete(key: ProjectKey): Promise<void> {
    logger.warn('Attempted to delete project', { key });

    throw new Error(
      'Delete operation is not supported by DeepSource API. ' +
        'Projects must be deleted through the DeepSource UI.'
    );
  }
}
