/**
 * @fileoverview Projects client with retry capabilities
 * Extends ProjectsClient with automatic retry mechanism
 */

import { BaseDeepSourceClientWithRetry, EnhancedClientConfig } from './base-client-with-retry.js';
import { DeepSourceProject } from '../models/projects.js';
import { VIEWER_PROJECTS_QUERY } from '../utils/graphql/queries.js';
import { ViewerProjectsResponse } from '../types/graphql-responses.js';
import { ProjectsClient } from './projects-client.js';

/**
 * Client for project-related operations with retry support
 */
export class ProjectsClientWithRetry extends BaseDeepSourceClientWithRetry {
  private apiKey: string;

  /**
   * Creates a new ProjectsClientWithRetry instance
   * @param apiKey The DeepSource API key for authentication
   * @param config Optional configuration options
   */
  constructor(apiKey: string, config?: EnhancedClientConfig) {
    super(apiKey, config);
    this.apiKey = apiKey;
    this.logger.debug('ProjectsClientWithRetry initialized');
  }

  /**
   * List all projects for the authenticated user with retry support
   * @returns Array of projects
   */
  async listProjects(): Promise<DeepSourceProject[]> {
    try {
      this.logger.debug('Fetching projects list with retry support');

      const response = await this.executeGraphQL<ViewerProjectsResponse>(VIEWER_PROJECTS_QUERY);

      // Create a temporary ProjectsClient instance to leverage existing parsing logic
      // We need to access the apiKey from constructor
      const tempClient = new ProjectsClient(this.apiKey, {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const viewerData = (tempClient as any).extractViewerData(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = (tempClient as any).extractAccountsFromViewer(viewerData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects = (tempClient as any).processAccountsForRepositories(accounts);

      this.logger.info('Projects fetched successfully with retry', { count: projects.length });
      return projects;
    } catch (error) {
      this.logger.error('Error fetching projects', { error });
      throw error;
    }
  }

  /**
   * Get a specific project by key with retry support
   * @param projectKey The project key
   * @returns The project if found, null otherwise
   */
  async getProject(projectKey: string): Promise<DeepSourceProject | null> {
    try {
      this.logger.debug('Fetching project', { projectKey });

      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (project) {
        this.logger.debug('Project found', { projectKey });
      } else {
        this.logger.debug('Project not found', { projectKey });
      }

      return project ?? null;
    } catch (error) {
      this.logger.error('Error fetching project', { projectKey, error });
      throw error;
    }
  }
}
