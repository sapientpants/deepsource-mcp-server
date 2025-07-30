/**
 * @fileoverview Project mapper
 *
 * Maps between DeepSource API models and domain Project aggregates.
 */

import { Project } from '../../domain/aggregates/project/project.aggregate.js';
import { DeepSourceProject } from '../../models/projects.js';
import {
  ProjectRepository,
  ProjectStatus,
  VcsProvider,
  ProjectConfiguration,
} from '../../domain/aggregates/project/project.types.js';

/**
 * Maps between API models and domain models for Projects
 */
export class ProjectMapper {
  /**
   * Maps a DeepSource API project to a domain Project aggregate
   *
   * @param apiProject - The API project model
   * @returns The domain Project aggregate
   */
  static toDomain(apiProject: DeepSourceProject): Project {
    const repository: ProjectRepository = {
      url: apiProject.repository.url,
      provider: apiProject.repository.provider as VcsProvider,
      login: apiProject.repository.login,
      isPrivate: apiProject.repository.isPrivate,
    };

    // Determine status based on activation
    const status: ProjectStatus = apiProject.repository.isActivated ? 'ACTIVE' : 'INACTIVE';

    return Project.fromPersistence({
      key: apiProject.key,
      name: apiProject.name,
      repository,
      configuration: {
        isActivated: apiProject.repository.isActivated,
        autoFix: false, // Default, as not provided by API
        pullRequestIntegration: true, // Default, as not provided by API
        issueReporting: true, // Default, as not provided by API
      },
      status,
      createdAt: new Date(), // Not provided by API, use current date
      updatedAt: new Date(), // Not provided by API, use current date
    });
  }

  /**
   * Maps a domain Project aggregate to persistence format
   *
   * @param project - The domain Project aggregate
   * @returns The persistence model
   */
  static toPersistence(project: Project): {
    key: string;
    name: string;
    repository: ProjectRepository;
    configuration: ProjectConfiguration;
    status: ProjectStatus;
    createdAt: Date;
    updatedAt: Date;
  } {
    return project.toPersistence();
  }

  /**
   * Maps multiple API projects to domain aggregates
   *
   * @param apiProjects - Array of API project models
   * @returns Array of domain Project aggregates
   */
  static toDomainList(apiProjects: DeepSourceProject[]): Project[] {
    return apiProjects.map((project) => ProjectMapper.toDomain(project));
  }
}
