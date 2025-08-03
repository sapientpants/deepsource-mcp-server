/**
 * @fileoverview Project aggregate root
 *
 * This module defines the Project aggregate which represents a DeepSource project
 * with its repository information and configuration settings.
 */

import { AggregateRoot } from '../../shared/aggregate-root.js';
import { ProjectKey } from '../../../types/branded.js';
import {
  ProjectRepository,
  ProjectConfiguration,
  ProjectStatus,
  CreateProjectParams,
  UpdateProjectParams,
} from './project.types.js';

/**
 * Project aggregate root
 *
 * Represents a DeepSource project with its repository and configuration.
 * Enforces business rules and maintains consistency within the aggregate boundary.
 *
 * @example
 * ```typescript
 * const project = Project.create({
 *   key: asProjectKey('my-project'),
 *   name: 'My Project',
 *   repository: {
 *     url: 'https://github.com/user/repo',
 *     provider: 'GITHUB',
 *     login: 'user',
 *     isPrivate: false
 *   }
 * });
 *
 * project.activate();
 * project.updateConfiguration({ autoFix: true });
 * ```
 */
export class Project extends AggregateRoot<ProjectKey> {
  private _name: string;
  private _repository: ProjectRepository;
  private _configuration: ProjectConfiguration;
  private _status: ProjectStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: ProjectKey,
    name: string,
    repository: ProjectRepository,
    configuration: ProjectConfiguration,
    status: ProjectStatus,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id);
    this._name = name;
    this._repository = repository;
    this._configuration = configuration;
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Creates a new Project aggregate
   *
   * @param params - Project creation parameters
   * @returns A new Project instance
   * @throws Error if validation fails
   */
  static create(params: CreateProjectParams): Project {
    const { key, name, repository, configuration } = params;

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    // Validate repository URL
    if (!repository.url || !Project.isValidUrl(repository.url)) {
      throw new Error('Invalid repository URL');
    }

    // Create default configuration
    const defaultConfig: ProjectConfiguration = {
      isActivated: false,
      autoFix: false,
      pullRequestIntegration: true,
      issueReporting: true,
    };

    const now = new Date();
    const project = new Project(
      key,
      name.trim(),
      repository,
      { ...defaultConfig, ...configuration },
      'INACTIVE',
      now,
      now
    );

    // Add creation event
    project.addDomainEvent({
      aggregateId: key,
      eventType: 'ProjectCreated',
      occurredAt: now,
      payload: {
        name,
        repositoryUrl: repository.url,
        provider: repository.provider,
      },
    });

    return project;
  }

  /**
   * Validates if a string is a valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      // URL constructor is available in Node.js
      new globalThis.URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the project key
   */
  get key(): ProjectKey {
    return this._id;
  }

  /**
   * Gets the project name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the repository information
   */
  get repository(): Readonly<ProjectRepository> {
    return { ...this._repository };
  }

  /**
   * Gets the configuration settings
   */
  get configuration(): Readonly<ProjectConfiguration> {
    return { ...this._configuration };
  }

  /**
   * Gets the project status
   */
  get status(): ProjectStatus {
    return this._status;
  }

  /**
   * Gets the creation timestamp
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Gets the last update timestamp
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Checks if the project is active
   */
  get isActive(): boolean {
    return this._status === 'ACTIVE' && this._configuration.isActivated;
  }

  /**
   * Activates the project
   *
   * @throws Error if the project is archived
   */
  activate(): void {
    if (this._status === 'ARCHIVED') {
      throw new Error('Cannot activate an archived project');
    }

    if (this._status === 'ACTIVE' && this._configuration.isActivated) {
      return; // Already active
    }

    this._status = 'ACTIVE';
    this._configuration.isActivated = true;
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ProjectActivated',
      occurredAt: this._updatedAt,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Deactivates the project
   */
  deactivate(): void {
    if (this._status === 'INACTIVE' && !this._configuration.isActivated) {
      return; // Already inactive
    }

    this._status = 'INACTIVE';
    this._configuration.isActivated = false;
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ProjectDeactivated',
      occurredAt: this._updatedAt,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Archives the project
   *
   * Archived projects cannot be reactivated and are kept for historical purposes.
   */
  archive(): void {
    if (this._status === 'ARCHIVED') {
      return; // Already archived
    }

    this._status = 'ARCHIVED';
    this._configuration.isActivated = false;
    this._updatedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ProjectArchived',
      occurredAt: this._updatedAt,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Updates the project information
   *
   * @param params - Update parameters
   * @throws Error if the project is archived
   */
  update(params: UpdateProjectParams): void {
    if (this._status === 'ARCHIVED') {
      throw new Error('Cannot update an archived project');
    }

    let hasChanges = false;

    // Update name if provided
    if (params.name !== undefined) {
      const trimmedName = params.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Project name cannot be empty');
      }
      if (trimmedName !== this._name) {
        this._name = trimmedName;
        hasChanges = true;
      }
    }

    // Update repository if provided
    if (params.repository) {
      if (params.repository.url !== undefined) {
        if (!Project.isValidUrl(params.repository.url)) {
          throw new Error('Invalid repository URL');
        }
      }
      this._repository = { ...this._repository, ...params.repository };
      hasChanges = true;
    }

    // Update configuration if provided
    if (params.configuration) {
      this._configuration = { ...this._configuration, ...params.configuration };
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      this.addDomainEvent({
        aggregateId: this._id,
        eventType: 'ProjectUpdated',
        occurredAt: this._updatedAt,
        payload: params as Record<string, unknown>,
      });
      this.markAsModified();
    }
  }

  /**
   * Updates the project configuration
   *
   * @param configuration - Partial configuration to update
   */
  updateConfiguration(configuration: Partial<ProjectConfiguration>): void {
    this.update({ configuration });
  }

  /**
   * Checks if the project can run analysis
   *
   * @returns True if analysis can be run, false otherwise
   */
  canRunAnalysis(): boolean {
    return (
      this._status === 'ACTIVE' &&
      this._configuration.isActivated &&
      this._repository.url.length > 0
    );
  }

  /**
   * Reconstructs a Project from persisted data
   *
   * @param data - Persisted project data
   * @returns A reconstructed Project instance
   */
  static fromPersistence(data: {
    key: ProjectKey;
    name: string;
    repository: ProjectRepository;
    configuration: ProjectConfiguration;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    return new Project(
      data.key,
      data.name,
      data.repository,
      data.configuration,
      data.status,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Converts the project to a persistence-friendly format
   */
  toPersistence(): {
    key: ProjectKey;
    name: string;
    repository: ProjectRepository;
    configuration: ProjectConfiguration;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      key: this._id,
      name: this._name,
      repository: { ...this._repository },
      configuration: { ...this._configuration },
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
