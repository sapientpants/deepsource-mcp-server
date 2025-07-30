/**
 * @fileoverview Projects handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource projects using domain aggregates.
 */

import { IProjectRepository } from '../domain/aggregates/project/project.repository.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';
import { ApiResponse } from '../models/common.js';
import { createLogger, Logger } from '../utils/logging/logger.js';
import { getApiKey } from '../config/index.js';

// Logger for the projects handler
const logger = createLogger('ProjectsHandler');

/**
 * Dependencies interface for the projects handler
 */
export interface ProjectsHandlerDeps {
  projectRepository: IProjectRepository;
  logger: Logger;
}

/**
 * Creates a projects handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createProjectsHandler(deps: ProjectsHandlerDeps) {
  return async function handleProjects(): Promise<ApiResponse> {
    try {
      deps.logger.info('Fetching projects from repository');
      const projects = await deps.projectRepository.findAll();

      deps.logger.info('Successfully fetched projects', {
        count: projects.length,
        firstFew: projects.slice(0, 3).map((p) => ({ key: p.key, name: p.name })),
      });

      // Map domain projects to the simplified format expected by the MCP tool
      const projectsList = projects.map((project) => ({
        key: project.key,
        name: project.name,
      }));

      deps.logger.debug('Returning projects list', {
        projectCount: projectsList.length,
        projectsJson:
          JSON.stringify(projectsList).substring(0, 100) +
          (JSON.stringify(projectsList).length > 100 ? '...' : ''),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(projectsList),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleProjects', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      // Return an error object with details to match test expectations
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deps.logger.debug('Returning error response', { errorMessage });

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: errorMessage,
              details: 'Failed to retrieve projects',
            }),
          },
        ],
      };
    }
  };
}

/**
 * Fetches and returns a list of all available DeepSource projects using domain aggregates
 * @returns A response containing the list of projects with their keys and names
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleProjects(): Promise<ApiResponse> {
  const apiKey = getApiKey();
  const repositoryFactory = new RepositoryFactory({ apiKey });
  const projectRepository = repositoryFactory.createProjectRepository();

  const handler = createProjectsHandler({
    projectRepository,
    logger,
  });

  return handler();
}
