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
import { createLogger, Logger } from '../utils/logging/logger.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { IAnalysisRunRepository } from '../domain/aggregates/analysis-run/analysis-run.repository.js';
import { AnalysisRun } from '../domain/aggregates/analysis-run/analysis-run.aggregate.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';
import { asProjectKey, asRunId, asCommitOid } from '../types/branded.js';

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
 * Extended dependencies interface for run handler
 */
interface RunHandlerDeps {
  analysisRunRepository: IAnalysisRunRepository;
  logger: Logger;
}

/**
 * Creates a run handler with injected dependencies using domain aggregates
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createRunHandlerWithRepo(deps: RunHandlerDeps) {
  return async function handleRun(params: DeepsourceRunParams) {
    try {
      const { projectKey, runIdentifier, isCommitOid = false } = params;
      const projectKeyBranded = asProjectKey(projectKey);

      deps.logger.info('Fetching run from repository', {
        projectKey,
        runIdentifier,
        identifierType: isCommitOid ? 'commitOid' : 'runUid',
      });

      let domainRun: AnalysisRun | null;

      if (isCommitOid) {
        // Search by commit OID
        const commitOidBranded = asCommitOid(runIdentifier);
        domainRun = await deps.analysisRunRepository.findByCommit(
          projectKeyBranded,
          commitOidBranded
        );
      } else {
        // Search by run ID (assuming runIdentifier is the runId)
        const runIdBranded = asRunId(runIdentifier);
        domainRun = await deps.analysisRunRepository.findByRunId(runIdBranded);
      }

      if (!domainRun) {
        deps.logger.error('Run not found', {
          projectKey,
          runIdentifier,
          identifierType: isCommitOid ? 'commitOid' : 'runUid',
        });
        throw new Error(
          `Run with ${isCommitOid ? 'commitOid' : 'runUid'} "${runIdentifier}" not found`
        );
      }

      deps.logger.info('Successfully fetched run', {
        runId: domainRun.runId,
        commitOid: domainRun.commitInfo.oid,
        branchName: domainRun.commitInfo.branch,
        status: domainRun.status,
      });

      const runData = {
        run: {
          id: domainRun.runId,
          runUid: domainRun.runId, // Domain aggregate uses runId as the unique identifier
          commitOid: domainRun.commitInfo.oid,
          branchName: domainRun.commitInfo.branch,
          baseOid: domainRun.commitInfo.baseOid,
          status: domainRun.status,
          createdAt: domainRun.timestamps.createdAt,
          updatedAt: domainRun.timestamps.startedAt || domainRun.timestamps.createdAt,
          finishedAt: domainRun.timestamps.finishedAt,
          summary: {
            occurrencesIntroduced: domainRun.summary.totalIntroduced.count,
            occurrencesResolved: domainRun.summary.totalResolved.count,
            occurrencesSuppressed: domainRun.summary.totalSuppressed.count,
            occurrenceDistributionByAnalyzer: domainRun.summary.byAnalyzer,
            occurrenceDistributionByCategory: domainRun.summary.byCategory,
          },
          repository: {
            name: 'Repository', // Domain aggregate doesn't store repository name directly
            id: domainRun.repositoryId,
          },
        },
        // Provide helpful guidance and related information
        analysis: {
          status_info: getStatusInfo(domainRun.status),
          issue_summary: `This run introduced ${domainRun.summary.totalIntroduced.count} issues, resolved ${domainRun.summary.totalResolved.count} issues, and suppressed ${domainRun.summary.totalSuppressed.count} issues.`,
          analyzers_used: domainRun.summary.byAnalyzer?.map((a) => a.analyzerShortcode) || [],
          issue_categories: domainRun.summary.byCategory?.map((c) => c.category) || [],
        },
        related_tools: {
          issues: 'Use the project_issues tool to get all issues in the project',
          runs: 'Use the runs tool to list all runs for the project',
          recent_issues:
            'Use the recent_run_issues tool to get issues from the most recent run on a branch',
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(runData),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleRun', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deps.logger.debug('Returning error response', { errorMessage });

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: errorMessage,
              details: 'Failed to retrieve run',
            }),
          },
        ],
      };
    }
  };
}

/**
 * Creates a run handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createRunHandler = createBaseHandlerFactory(
  'run',
  async (
    deps: BaseHandlerDeps,
    { projectKey, runIdentifier, isCommitOid = false }: DeepsourceRunParams
  ) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);

    deps.logger.info('Fetching run', {
      projectKey,
      runIdentifier,
      identifierType: isCommitOid ? 'commitOid' : 'runUid',
    });

    const run = await client.getRun(runIdentifier);

    if (!run) {
      deps.logger.error('Run not found', {
        projectKey,
        runIdentifier,
        identifierType: isCommitOid ? 'commitOid' : 'runUid',
      });
      throw new Error(
        `Run with ${isCommitOid ? 'commitOid' : 'runUid'} "${runIdentifier}" not found in project "${projectKey}"`
      );
    }

    deps.logger.info('Successfully fetched run', {
      runUid: run.runUid,
      commitOid: run.commitOid,
      branchName: run.branchName,
      status: run.status,
    });

    const runData = {
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
        runs: 'Use the runs tool to list all runs for the project',
        recent_issues:
          'Use the recent_run_issues tool to get issues from the most recent run on a branch',
      },
    };

    return wrapInApiResponse(runData);
  }
);

/**
 * Fetches and returns information about a specific analysis run using domain aggregates
 * @param params - Parameters for fetching the run, including project key and run identifier
 * @returns A response containing the run data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceRun(params: DeepsourceRunParams): Promise<ApiResponse> {
  const baseDeps = createDefaultHandlerDeps({ logger });
  const apiKey = baseDeps.getApiKey();
  const repositoryFactory = new RepositoryFactory({ apiKey });
  const analysisRunRepository = repositoryFactory.createAnalysisRunRepository();

  const deps: RunHandlerDeps = {
    analysisRunRepository,
    logger,
  };

  const handler = createRunHandlerWithRepo(deps);
  const result = await handler(params);

  // If the domain handler returned an error response, throw an error for backward compatibility
  if (result.isError) {
    const firstContent = result.content[0];
    if (firstContent) {
      const errorData = JSON.parse(firstContent.text);
      throw new Error(errorData.error);
    } else {
      throw new Error('Unknown run error');
    }
  }

  return result;
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
