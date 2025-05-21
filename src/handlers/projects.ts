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
  logger.debug('Checking API key', {
    exists: Boolean(apiKey),
    length: apiKey ? apiKey.length : 0,
    prefix: apiKey ? apiKey.substring(0, 5) + '...' : 'N/A',
  });

  if (!apiKey) {
    logger.error('DEEPSOURCE_API_KEY environment variable is not set');
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  try {
    logger.debug('Creating client factory');
    const clientFactory = new DeepSourceClientFactory(apiKey);

    logger.debug('Getting projects client');
    const projectsClient = clientFactory.getProjectsClient();

    logger.info('Fetching projects from client');
    const projects = await projectsClient.listProjects();

    logger.info('Successfully fetched projects', {
      count: projects.length,
      firstFew: projects.slice(0, 3).map((p) => ({ key: p.key, name: p.name })),
    });

    // Map projects to the simplified format expected by the MCP tool
    const projectsList = projects.map((project) => ({
      key: project.key,
      name: project.name,
    }));

    logger.debug('Returning projects list', {
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
    logger.error('Error in handleProjects', {
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack available',
    });

    // Return an error object with details to match test expectations
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.debug('Returning error response', { errorMessage });

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
}
