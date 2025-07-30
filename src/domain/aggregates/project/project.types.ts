/**
 * @fileoverview Types for the Project aggregate
 *
 * This module defines the types and interfaces used by the Project aggregate.
 */

import { ProjectKey } from '../../../types/branded.js';

/**
 * Version control system providers
 */
export type VcsProvider = 'GITHUB' | 'GITLAB' | 'BITBUCKET' | 'OTHER';

/**
 * Project status
 */
export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

/**
 * Project repository information
 */
export interface ProjectRepository {
  url: string;
  provider: VcsProvider;
  login: string;
  isPrivate: boolean;
}

/**
 * Project configuration settings
 */
export interface ProjectConfiguration {
  isActivated: boolean;
  autoFix: boolean;
  pullRequestIntegration: boolean;
  issueReporting: boolean;
}

/**
 * Project creation parameters
 */
export interface CreateProjectParams {
  key: ProjectKey;
  name: string;
  repository: ProjectRepository;
  configuration?: Partial<ProjectConfiguration>;
}

/**
 * Project update parameters
 */
export interface UpdateProjectParams {
  name?: string;
  repository?: Partial<ProjectRepository>;
  configuration?: Partial<ProjectConfiguration>;
}
