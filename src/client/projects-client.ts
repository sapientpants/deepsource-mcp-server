/**
 * @fileoverview Projects client for the DeepSource API
 * This module provides functionality for working with DeepSource projects.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceProject } from '../models/projects.js';
import { VIEWER_PROJECTS_QUERY } from '../utils/graphql/queries.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
import { ProjectKey, asProjectKey } from '../types/branded.js';
import { ViewerProjectsResponse } from '../types/graphql-responses.js';

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
      this.logger.info('Fetching projects from DeepSource API');
      const response = await this.executeGraphQL<ViewerProjectsResponse>(VIEWER_PROJECTS_QUERY);

      this.logger.debug('Raw GraphQL response received:', response);

      const accounts = response.data?.data?.viewer?.accounts?.edges ?? [];
      this.logger.debug('Accounts found:', {
        accountsCount: accounts.length,
        accountsData: accounts.map((a) => ({ login: a.node.login })),
      });

      const allRepos: DeepSourceProject[] = [];

      for (const { node: account } of accounts) {
        const repos = account.repositories?.edges ?? [];
        this.logger.debug('Repositories for account:', {
          accountLogin: account.login,
          reposCount: repos.length,
          reposData: repos.map((r) => ({
            name: r.node.name,
            dsn: r.node.dsn,
            isActivated: r.node.isActivated,
          })),
        });

        for (const { node: repo } of repos) {
          if (!repo.dsn) {
            this.logger.warn('Skipping repository due to missing DSN', {
              repositoryName: repo.name ?? 'Unnamed Repository',
              accountLogin: account.login,
            });
            continue;
          }

          this.logger.debug('Processing repository:', {
            name: repo.name,
            dsn: repo.dsn,
            vcsProvider: repo.vcsProvider,
            isActivated: repo.isActivated,
          });

          const projectKey = asProjectKey(repo.dsn);
          this.logger.debug('Created branded ProjectKey:', {
            original: repo.dsn,
            branded: projectKey,
          });

          allRepos.push({
            key: projectKey,
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

      this.logger.info('Retrieved projects', {
        count: allRepos.length,
        projects: allRepos.map((p) => ({ key: p.key, name: p.name })),
      });
      return allRepos;
    } catch (error) {
      // Log the full error details
      this.logger.error('Error in listProjects', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
      });

      // Special case handling for NoneType errors, which can be returned
      // when there are no projects available
      if (isErrorWithMessage(error, 'NoneType')) {
        this.logger.info('No projects found (NoneType error returned)');
        return [];
      }

      this.logger.error('Throwing error from listProjects');
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
