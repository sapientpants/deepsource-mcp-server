/**
 * @fileoverview Project repository interface
 *
 * This module defines the repository interface for the Project aggregate.
 */

import { IRepository } from '../../shared/repository.interface.js';
import { Project } from './project.aggregate.js';
import { ProjectKey } from '../../../types/branded.js';

/**
 * Repository interface for Project aggregates
 *
 * Provides methods for persisting and retrieving Project aggregates.
 *
 * @example
 * ```typescript
 * class InMemoryProjectRepository implements IProjectRepository {
 *   private projects = new Map<ProjectKey, Project>();
 *
 *   async findByKey(key: ProjectKey): Promise<Project | null> {
 *     return this.projects.get(key) || null;
 *   }
 *
 *   async findAll(): Promise<Project[]> {
 *     return Array.from(this.projects.values());
 *   }
 *
 *   async save(project: Project): Promise<void> {
 *     this.projects.set(project.key, project);
 *   }
 *
 *   async delete(key: ProjectKey): Promise<void> {
 *     this.projects.delete(key);
 *   }
 * }
 * ```
 */
export interface IProjectRepository extends IRepository<Project, ProjectKey> {
  /**
   * Finds a project by its unique key
   *
   * @param key - The project key
   * @returns The project if found, null otherwise
   */
  findByKey(_key: ProjectKey): Promise<Project | null>;

  /**
   * Finds all projects
   *
   * @returns All projects in the repository
   */
  findAll(): Promise<Project[]>;

  /**
   * Finds all active projects
   *
   * @returns All projects with ACTIVE status
   */
  findActive(): Promise<Project[]>;

  /**
   * Finds projects by repository provider
   *
   * @param provider - The VCS provider (e.g., 'GITHUB', 'GITLAB')
   * @returns Projects using the specified provider
   */
  findByProvider(_provider: string): Promise<Project[]>;

  /**
   * Checks if a project exists with the given key
   *
   * @param key - The project key to check
   * @returns True if the project exists, false otherwise
   */
  exists(_key: ProjectKey): Promise<boolean>;

  /**
   * Counts the total number of projects
   *
   * @returns The total project count
   */
  count(): Promise<number>;

  /**
   * Counts the number of active projects
   *
   * @returns The active project count
   */
  countActive(): Promise<number>;
}
