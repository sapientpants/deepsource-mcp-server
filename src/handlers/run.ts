/**
 * @fileoverview Run handler for the DeepSource MCP server
 * This module provides MCP tool handlers for fetching a specific DeepSource analysis run.
 */

import {
  DeepSourceClient,
  OccurrenceDistributionByAnalyzer,
  OccurrenceDistributionByCategory,
} from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { createLogger } from '../utils/logging/logger.js';

// Logger for the run handler
const logger = createLogger('RunHandler');

/**
 * Interface for parameters for fetching a specific run
 * @public
 */
export interface DeepsourceRunParams {
  /** DeepSource project key to fetch the run from */
  projectKey: string;
  /** The run identifier (runUid or commitOid) */
  runIdentifier: string;
  /** Flag to indicate whether the runIdentifier is a commitOid (default: false) */
  isCommitOid?: boolean;
}

/**
 * Fetches and returns information about a specific analysis run
 * @param params - Parameters for fetching the run, including project key and run identifier
 * @returns A response containing the run data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceRun({
  projectKey,
  runIdentifier,
  isCommitOid = false,
}: DeepsourceRunParams): Promise<ApiResponse> {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  logger.debug('Checking API key', {
    exists: Boolean(apiKey),
    length: apiKey ? apiKey.length : 0,
    prefix: apiKey ? `${apiKey.substring(0, 5)}...` : 'N/A',
  });

  if (!apiKey) {
    logger.error('DEEPSOURCE_API_KEY environment variable is not set');
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  try {
    logger.debug('Creating DeepSource client');
    const client = new DeepSourceClient(apiKey);

    logger.info('Fetching run', {
      projectKey,
      runIdentifier,
      identifierType: isCommitOid ? 'commitOid' : 'runUid',
    });

    const run = await client.getRun(runIdentifier);

    if (!run) {
      logger.error('Run not found', {
        projectKey,
        runIdentifier,
        identifierType: isCommitOid ? 'commitOid' : 'runUid',
      });
      throw new Error(
        `Run with ${isCommitOid ? 'commitOid' : 'runUid'} "${runIdentifier}" not found in project "${projectKey}"`
      );
    }

    logger.info('Successfully fetched run', {
      runUid: run.runUid,
      commitOid: run.commitOid,
      branchName: run.branchName,
      status: run.status,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              run: {
                id: run.id,
                runUid: run.runUid,
                commitOid: run.commitOid,
                branchName: run.branchName,
                baseOid: run.baseOid,
                status: run.status,
                createdAt: run.createdAt,
                updatedAt: run.updatedAt,
                finishedAt: run.finishedAt,
                summary: {
                  occurrencesIntroduced: run.summary.occurrencesIntroduced,
                  occurrencesResolved: run.summary.occurrencesResolved,
                  occurrencesSuppressed: run.summary.occurrencesSuppressed,
                  occurrenceDistributionByAnalyzer: run.summary.occurrenceDistributionByAnalyzer,
                  occurrenceDistributionByCategory: run.summary.occurrenceDistributionByCategory,
                },
                repository: {
                  name: run.repository.name,
                  id: run.repository.id,
                },
              },
              // Provide helpful guidance and related information
              analysis: {
                status_info: getStatusInfo(run.status),
                issue_summary: `This run introduced ${run.summary.occurrencesIntroduced} issues, resolved ${run.summary.occurrencesResolved} issues, and suppressed ${run.summary.occurrencesSuppressed} issues.`,
                analyzers_used:
                  run.summary.occurrenceDistributionByAnalyzer?.map(
                    (a: OccurrenceDistributionByAnalyzer) => a.analyzerShortcode
                  ) || [],
                issue_categories:
                  run.summary.occurrenceDistributionByCategory?.map(
                    (c: OccurrenceDistributionByCategory) => c.category
                  ) || [],
              },
              related_tools: {
                issues: 'Use the project_issues tool to get all issues in the project',
                runs: 'Use the project_runs tool to list all runs for the project',
                recent_issues:
                  'Use the recent_run_issues tool to get issues from the most recent run on a branch',
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error('Error in handleDeepsourceRun', {
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack available',
    });

    // Return an error object with details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.debug('Returning error response', { errorMessage });

    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: errorMessage,
            details: 'Failed to retrieve run',
            project_key: projectKey,
            run_identifier: runIdentifier,
            identifier_type: isCommitOid ? 'commitOid' : 'runUid',
          }),
        },
      ],
    };
  }
}

/**
 * Helper function to get human-readable status information
 * @param status The run status
 * @returns Information about the status
 * @private
 */
function getStatusInfo(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'The run is currently queued and waiting to be processed.';
    case 'SUCCESS':
      return 'The run completed successfully with all analyzers.';
    case 'FAILURE':
      return 'The run failed due to an error during analysis.';
    case 'TIMEOUT':
      return 'The run exceeded the maximum allowed time and was terminated.';
    case 'CANCEL':
      return 'The run was manually cancelled.';
    case 'READY':
      return 'The run is ready to be processed but not yet started.';
    case 'SKIPPED':
      return 'The run was skipped, possibly due to no code changes detected.';
    default:
      return `Unknown status: ${status}`;
  }
}
