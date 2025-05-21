/**
 * @fileoverview Projects client for the DeepSource API
 * This module provides functionality for working with DeepSource projects.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceProject } from '../models/projects.js';
import { VIEWER_PROJECTS_QUERY } from '../utils/graphql/queries.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
import { ProjectKey, asProjectKey } from '../types/branded.js';
import {
  GraphQLEdge,
  GraphQLAccountNode,
  GraphQLRepositoryNode,
} from '../types/graphql-responses.js';
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

      this.logger.debug('Raw GraphQL response received:', response.data);

      // Extract the data directly from the response structure
      const responseData = response.data;
      const viewerData = responseData?.data?.viewer;

      // Log the response structure to troubleshoot issues
      this.logger.debug('Response structure check:', {
        hasData: Boolean(responseData),
        hasViewerData: Boolean(viewerData),
        hasAccounts: Boolean(viewerData?.accounts),
        hasAccountEdges: Boolean(viewerData?.accounts?.edges),
        accountEdgesType: typeof viewerData?.accounts?.edges,
        accountEdgesIsArray: Array.isArray(viewerData?.accounts?.edges),
        accountEdgesLength: Array.isArray(viewerData?.accounts?.edges)
          ? viewerData?.accounts?.edges.length
          : 'Not an array',
      });

      const accounts = viewerData?.accounts?.edges ?? [];
      this.logger.debug('Accounts found:', {
        accountsCount: accounts.length,
        accountsData: accounts.map((a: GraphQLEdge<GraphQLAccountNode>) => ({
          login: a?.node?.login,
          hasRepositories: Boolean(a?.node?.repositories?.edges),
          repositoriesCount: a?.node?.repositories?.edges?.length ?? 0,
        })),
      });

      const allRepos: DeepSourceProject[] = [];

      for (const accountEdge of accounts) {
        if (!accountEdge?.node) continue;

        const account = accountEdge.node;
        const repos = account.repositories?.edges ?? [];

        this.logger.debug('Repositories for account:', {
          accountLogin: account.login,
          reposCount: repos.length,
          reposData: repos.map((r: GraphQLEdge<GraphQLRepositoryNode>) => ({
            name: r?.node?.name,
            dsn: r?.node?.dsn,
            isActivated: r?.node?.isActivated,
          })),
        });

        for (const repoEdge of repos) {
          if (!repoEdge?.node) continue;

          const repo = repoEdge.node;

          // Log repository object structure to diagnose the issue
          this.logger.debug('Repository object structure:', {
            repoObjectType: typeof repo,
            hasName: Boolean(repo?.name),
            hasDsn: Boolean(repo?.dsn),
            dsnValue: repo?.dsn,
            dsnType: typeof repo?.dsn,
            repoKeys: Object.keys(repo || {}),
          });

          if (!repo || !repo.dsn) {
            this.logger.warn('Skipping repository due to missing DSN', {
              repositoryName: repo?.name ?? 'Unnamed Repository',
              accountLogin: account?.login,
              repo: repo ? 'exists' : 'is null',
            });
            continue;
          }

          this.logger.debug('Processing repository:', {
            name: repo.name,
            dsn: repo.dsn,
            vcsProvider: repo.vcsProvider,
            isActivated: repo.isActivated,
          });

          try {
            // Convert DSN string to project key
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
                login: account?.login,
                isPrivate: repo.isPrivate ?? false,
                isActivated: repo.isActivated ?? false,
              },
            });
          } catch (error) {
            // Handle any error during project key conversion or object creation
            this.logger.error('Error processing repository', {
              error: error instanceof Error ? error.message : String(error),
              repositoryName: repo.name ?? 'Unnamed Repository',
              repositoryDsn: repo.dsn,
              accountLogin: account?.login,
            });
          }
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

      // Check error response for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: unknown };
        this.logger.debug('Response error object details:', {
          hasResponse: Boolean(responseError.response),
          responseType: typeof responseError.response,
          responseData:
            responseError.response && typeof responseError.response === 'object'
              ? 'data' in responseError.response
                ? (responseError.response as { data?: unknown }).data
                : 'No data property'
              : 'Not an object',
        });
      }

      // Special case handling for NoneType errors, which can be returned
      // when there are no projects available
      if (isErrorWithMessage(error, 'NoneType')) {
        this.logger.info('No projects found (NoneType error returned)');
        return [];
      }

      // Special case for GraphQL errors that might indicate empty results
      if (error instanceof Error && error.message.includes('GraphQL Errors')) {
        this.logger.warn('GraphQL error occurred, returning empty projects list', {
          error: error.message,
        });
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
