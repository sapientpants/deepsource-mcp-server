/**
 * @fileoverview Projects handler for the DeepSource MCP server
 * This module provides MCP tool handlers for DeepSource projects.
 */

import { DeepSourceClientFactory } from '../client/factory.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';

// Logger for the projects handler
const logger = createLogger('ProjectsHandler');

/**
 * Fetches and returns a list of all available DeepSource projects
 * @returns A response containing the list of projects with their keys and names
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleProjects(): Promise<ApiResponse> {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  if (!apiKey) {
    logger.error('DEEPSOURCE_API_KEY environment variable is not set');
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  try {
    logger.debug('Creating client factory');
    const clientFactory = new DeepSourceClientFactory(apiKey);

    logger.debug('Getting projects client');
    const projectsClient = clientFactory.getProjectsClient();

    logger.debug('Fetching projects');
    const projects = await projectsClient.listProjects();

    logger.info('Successfully fetched projects', { count: projects.length });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            projects.map((project) => ({
              key: project.key,
              name: project.name,
            }))
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Error in handleProjects', error);

    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            details: 'Failed to retrieve projects',
          }),
        },
      ],
    };
  }
}
