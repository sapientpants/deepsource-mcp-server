/**
 * @fileoverview Projects client for the DeepSource API
 * This module provides functionality for working with DeepSource projects.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceProject } from '../models/projects.js';
import { VIEWER_PROJECTS_QUERY } from '../utils/graphql/queries.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
import { ProjectKey, asProjectKey } from '../types/branded.js';
import { GraphQLResponse, ViewerProjectsResponse } from '../types/graphql-responses.js';

/**
 * Client for interacting with DeepSource projects API
 * @class
 * @extends BaseDeepSourceClient
 * @public
 */
export class ProjectsClient extends BaseDeepSourceClient {
  /**
   * Fetches a list of all accessible DeepSource projects
   * @returns Promise that resolves to an array of DeepSourceProject objects
   * @throws {ClassifiedError} When the API request fails
   * @public
   */
  async listProjects(): Promise<DeepSourceProject[]> {
    try {
      const response = await this.executeGraphQL<ViewerProjectsResponse>(VIEWER_PROJECTS_QUERY);

      const accounts = response.data?.data?.viewer?.accounts?.edges ?? [];
      const allRepos: DeepSourceProject[] = [];

      for (const { node: account } of accounts) {
        const repos = account.repositories?.edges ?? [];
        for (const { node: repo } of repos) {
          if (!repo.dsn) {
            this.logger.debug('Skipping repository due to missing DSN', {
              repositoryName: repo.name ?? 'Unnamed Repository',
              accountLogin: account.login,
            });
            continue;
          }
          allRepos.push({
            key: asProjectKey(repo.dsn),
            name: repo.name ?? 'Unnamed Repository',
            repository: {
              url: repo.dsn,
              provider: repo.vcsProvider ?? 'N/A',
              login: account.login,
              isPrivate: repo.isPrivate ?? false,
              isActivated: repo.isActivated ?? false,
            },
          });
        }
      }

      this.logger.debug('Retrieved projects', { count: allRepos.length });
      return allRepos;
    } catch (error) {
      // Special case handling for NoneType errors, which can be returned
      // when there are no projects available
      if (isErrorWithMessage(error, 'NoneType')) {
        this.logger.info('No projects found (NoneType error returned)');
        return [];
      }
      throw error;
    }
  }

  /**
   * Checks if a project exists
   * @param projectKey The project key to check
   * @returns Promise that resolves to true if the project exists, false otherwise
   * @public
   */
  async projectExists(projectKey: ProjectKey): Promise<boolean> {
    try {
      const projects = await this.listProjects();
      return projects.some((project) => project.key === projectKey);
    } catch (error) {
      this.logger.error(`Error checking if project ${projectKey} exists`, error);
      return false;
    }
  }
}
