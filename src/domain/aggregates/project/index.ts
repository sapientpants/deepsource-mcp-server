/**
 * @fileoverview Project aggregate exports
 *
 * This module exports all components of the Project aggregate.
 */

export { Project } from './project.aggregate.js';
export type { IProjectRepository } from './project.repository.js';
export type {
  VcsProvider,
  ProjectStatus,
  ProjectRepository,
  ProjectConfiguration,
  CreateProjectParams,
  UpdateProjectParams,
} from './project.types.js';
