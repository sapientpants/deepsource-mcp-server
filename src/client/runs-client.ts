/**
 * @fileoverview Runs client for the DeepSource API
 * This module provides functionality for working with DeepSource analysis runs.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { DeepSourceRun, RunFilterParams, AnalysisRunStatus } from '../models/runs.js';
import { DeepSourceIssue } from '../models/issues.js';
import { PaginatedResponse } from '../utils/pagination/types.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
import {
  BranchName,
  asGraphQLNodeId,
  asRunId,
  asCommitOid,
  asBranchName,
} from '../types/branded.js';

/**
 * Response type for recent run issues query
 * @public
 */
export interface RecentRunIssuesResponse {
  run: DeepSourceRun | null;
  items: DeepSourceIssue[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  totalCount: number;
}

/**
 * Client for interacting with DeepSource runs API
 * @class
 * @extends BaseDeepSourceClient
 * @public
 */
export class RunsClient extends BaseDeepSourceClient {
  /**
   * Fetches analysis runs from a DeepSource project with optional filtering
   * @param projectKey The project key to fetch runs for
   * @param params Optional filter parameters
   * @returns Promise that resolves to a paginated list of runs
   * @throws {ClassifiedError} When the API request fails
   * @public
   */
  async listRuns(
    projectKey: string,
    params: RunFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceRun>> {
    try {
      this.logger.info('Fetching runs from DeepSource API', {
        projectKey,
        hasFilters: Object.keys(params).length > 0,
      });

      const project = await this.findProjectByKey(projectKey);
      if (!project) {
        return this.createEmptyPaginatedResponse<DeepSourceRun>();
      }

      const normalizedParams = this.normalizePaginationParams(params);
      const query = this.buildRunsQuery();

      const response = await this.executeGraphQL(query, {
        login: project.repository.login,
        name: project.repository.name,
        provider: project.repository.provider,
        ...normalizedParams,
      });

      if (!response.data) {
        throw new Error('No data received from GraphQL API');
      }

      const runs = this.extractRunsFromResponse(response.data);

      this.logger.info('Successfully fetched runs', {
        count: runs.length,
        totalCount: runs.length, // Note: Would need cursor-based pagination for accurate total
      });

      return {
        items: runs,
        pageInfo: {
          hasNextPage: false, // Simplified for now
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: runs.length,
      };
    } catch (error) {
      return this.handleRunsError(error);
    }
  }

  /**
   * Fetches a specific run by identifier (runUid or commitOid)
   * @param runIdentifier The run UID or commit OID
   * @returns Promise that resolves to the run if found, null otherwise
   * @public
   */
  async getRun(runIdentifier: string): Promise<DeepSourceRun | null> {
    try {
      this.logger.info('Fetching specific run', { runIdentifier });

      // Determine if the identifier is a UUID or a commit hash
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        runIdentifier
      );
      const query = isUuid ? this.buildRunByUidQuery() : this.buildRunByCommitQuery();

      const response = await this.executeGraphQL(query, {
        [isUuid ? 'runUid' : 'commitOid']: runIdentifier,
      });

      if (!response.data) {
        return null;
      }

      const run = this.extractSingleRunFromResponse(response.data);

      if (!run) {
        return null;
      }

      this.logger.info('Successfully fetched run', {
        runUid: run.runUid,
        status: run.status,
      });

      return run;
    } catch (error) {
      if (isErrorWithMessage(error, 'NoneType') || isErrorWithMessage(error, 'not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Finds the most recent run for a specific branch
   * @param projectKey The project key
   * @param branchName The branch name to search for
   * @returns Promise that resolves to the most recent run if found, null otherwise
   * @public
   */
  async findMostRecentRunForBranch(
    projectKey: string,
    branchName: string
  ): Promise<DeepSourceRun | null> {
    try {
      this.logger.info('Finding most recent run for branch', { projectKey, branchName });

      let mostRecentRun: DeepSourceRun | null = null;
      let hasNextPage = true;
      let after: string | undefined = undefined;

      // Paginate through runs to find the most recent for the specific branch
      while (hasNextPage) {
        const runs = await this.listRuns(projectKey, {
          first: 50,
          after,
        });

        for (const run of runs.items) {
          if (run.branchName === branchName) {
            // If this is the first matching run or it's more recent than our current most recent
            if (!mostRecentRun || new Date(run.createdAt) > new Date(mostRecentRun.createdAt)) {
              mostRecentRun = run;
            }
          }
        }

        hasNextPage = runs.pageInfo.hasNextPage;
        after = runs.pageInfo.endCursor || undefined;
      }

      if (!mostRecentRun) {
        this.logger.error(`No runs found for branch '${branchName}' in project '${projectKey}'`);
        throw new Error(`No runs found for branch '${branchName}' in project '${projectKey}'`);
      }

      this.logger.info('Found most recent run for branch', {
        runUid: mostRecentRun.runUid,
        branchName: mostRecentRun.branchName,
        createdAt: mostRecentRun.createdAt,
      });

      return mostRecentRun;
    } catch (error) {
      this.logger.error('Error finding most recent run for branch', {
        projectKey,
        branchName,
        error,
      });
      throw error;
    }
  }

  /**
   * Fetches issues from the most recent run on a specific branch
   * @param projectKey The project key
   * @param branchName The branch name
   * @returns Promise that resolves to recent run issues response
   * @public
   */
  async getRecentRunIssues(
    projectKey: string,
    branchName: BranchName
  ): Promise<RecentRunIssuesResponse> {
    try {
      this.logger.info('Fetching recent run issues', { projectKey, branchName });

      // First find the most recent run for the branch
      const mostRecentRun = await this.findMostRecentRunForBranch(projectKey, branchName);

      if (!mostRecentRun) {
        return {
          run: null,
          items: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
          totalCount: 0,
        };
      }

      // For now, return empty issues - would need to implement run-specific issue fetching
      // This would require additional GraphQL queries to get checks and occurrences for the specific run
      return {
        run: mostRecentRun,
        items: [], // Run-specific issue fetching not yet implemented
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      };
    } catch (error) {
      this.logger.error('Error fetching recent run issues', {
        projectKey,
        branchName,
        error,
      });
      throw error;
    }
  }

  /**
   * Builds the GraphQL query for fetching runs
   * @private
   */
  private buildRunsQuery(): string {
    return `
      query getRepositoryRuns(
        $login: String!
        $name: String!
        $provider: VCSProvider!
        $first: Int
        $after: String
      ) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          runs(first: $first, after: $after) {
            edges {
              node {
                id
                runUid
                commitOid
                branchName
                baseOid
                status
                createdAt
                updatedAt
                finishedAt
                summary {
                  occurrencesIntroduced
                  occurrencesResolved
                  occurrencesSuppressed
                }
                repository {
                  name
                  id
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      }
    `;
  }

  /**
   * Builds GraphQL query for fetching a run by UID
   * @private
   */
  private buildRunByUidQuery(): string {
    return `
      query getRunByUid($runUid: UUID!) {
        run(runUid: $runUid) {
          id
          runUid
          commitOid
          branchName
          baseOid
          status
          createdAt
          updatedAt
          finishedAt
          summary {
            occurrencesIntroduced
            occurrencesResolved
            occurrencesSuppressed
          }
          repository {
            name
            id
          }
        }
      }
    `;
  }

  /**
   * Builds GraphQL query for fetching a run by commit OID
   * @private
   */
  private buildRunByCommitQuery(): string {
    return `
      query getRunByCommit($commitOid: String!) {
        runByCommit(commitOid: $commitOid) {
          id
          runUid
          commitOid
          branchName
          baseOid
          status
          createdAt
          updatedAt
          finishedAt
          summary {
            occurrencesIntroduced
            occurrencesResolved
            occurrencesSuppressed
          }
          repository {
            name
            id
          }
        }
      }
    `;
  }

  /**
   * Extracts runs from GraphQL response
   * @private
   */
  private extractRunsFromResponse(responseData: unknown): DeepSourceRun[] {
    const runs: DeepSourceRun[] = [];

    try {
      const repository = (responseData as Record<string, unknown>)?.repository as Record<
        string,
        unknown
      >;
      const repositoryRuns = repository?.runs as Record<string, unknown>;
      const repoRuns = (repositoryRuns?.edges ?? []) as Array<Record<string, unknown>>;

      for (const { node: run } of repoRuns) {
        const runNode = run as Record<string, unknown>;
        runs.push(this.mapRunNode(runNode));
      }
    } catch (error) {
      this.logger.error('Error extracting runs from response', { error });
    }

    return runs;
  }

  /**
   * Extracts a single run from GraphQL response
   * @private
   */
  private extractSingleRunFromResponse(responseData: unknown): DeepSourceRun | null {
    try {
      const data = responseData as Record<string, unknown>;
      const runNode = data?.run || data?.runByCommit;

      if (!runNode || typeof runNode !== 'object') {
        return null;
      }

      return this.mapRunNode(runNode as Record<string, unknown>);
    } catch (error) {
      this.logger.error('Error extracting single run from response', { error });
      return null;
    }
  }

  /**
   * Maps a run node from GraphQL to DeepSourceRun
   * @private
   */
  private mapRunNode(runNode: Record<string, unknown>): DeepSourceRun {
    const summary = (runNode.summary as Record<string, unknown>) || {};
    const repository = (runNode.repository as Record<string, unknown>) || {};

    return {
      id: asGraphQLNodeId(String(runNode.id ?? '')),
      runUid: asRunId(String(runNode.runUid ?? '')),
      commitOid: asCommitOid(String(runNode.commitOid ?? '')),
      branchName: asBranchName(String(runNode.branchName ?? '')),
      baseOid: asCommitOid(String(runNode.baseOid ?? '')),
      status: String(runNode.status ?? 'UNKNOWN') as AnalysisRunStatus,
      createdAt: String(runNode.createdAt ?? ''),
      updatedAt: String(runNode.updatedAt ?? ''),
      finishedAt: String(runNode.finishedAt ?? ''),
      summary: {
        occurrencesIntroduced: Number(summary.occurrencesIntroduced ?? 0),
        occurrencesResolved: Number(summary.occurrencesResolved ?? 0),
        occurrencesSuppressed: Number(summary.occurrencesSuppressed ?? 0),
      },
      repository: {
        name: String(repository.name ?? ''),
        id: asGraphQLNodeId(String(repository.id ?? '')),
      },
    };
  }

  /**
   * Handles errors during runs fetching
   * @private
   */
  private handleRunsError(error: unknown): PaginatedResponse<DeepSourceRun> {
    this.logger.error('Error in listRuns', {
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Handle special case where no runs exist
    if (isErrorWithMessage(error, 'NoneType')) {
      return {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };
    }

    throw error;
  }
}
