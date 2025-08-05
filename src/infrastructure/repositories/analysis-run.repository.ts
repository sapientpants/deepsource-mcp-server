/**
 * @fileoverview AnalysisRun repository implementation
 *
 * Concrete implementation of IAnalysisRunRepository using DeepSource API.
 */

import { IAnalysisRunRepository } from '../../domain/aggregates/analysis-run/analysis-run.repository.js';
import { AnalysisRun } from '../../domain/aggregates/analysis-run/analysis-run.aggregate.js';
import {
  RunId,
  ProjectKey,
  BranchName,
  CommitOid,
  asRunId,
  asBranchName,
  asCommitOid,
  asGraphQLNodeId,
} from '../../types/branded.js';
import { RunStatus } from '../../domain/aggregates/analysis-run/analysis-run.types.js';
import { PaginationOptions, PaginatedResult } from '../../domain/shared/repository.interface.js';
import { DeepSourceClient } from '../../deepsource.js';
import { AnalysisRunMapper } from '../mappers/analysis-run.mapper.js';
import { createLogger } from '../../utils/logging/logger.js';
import { DeepSourceRun, AnalysisRunStatus, RunSummary } from '../../models/runs.js';

const logger = createLogger('AnalysisRunRepository');

/**
 * Converts client run response to model DeepSourceRun
 * The client returns plain strings but the model expects branded types
 */
function convertClientRunToModelRun(clientRun: {
  id: string;
  runUid: string;
  commitOid: string;
  branchName: string;
  baseOid: string;
  status: AnalysisRunStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  summary: RunSummary;
  repository: {
    id: string;
    name: string;
  };
}): DeepSourceRun {
  return {
    ...clientRun,
    id: asGraphQLNodeId(clientRun.id),
    runUid: asRunId(clientRun.runUid),
    commitOid: asCommitOid(clientRun.commitOid),
    branchName: asBranchName(clientRun.branchName),
    baseOid: asCommitOid(clientRun.baseOid),
    repository: {
      ...clientRun.repository,
      id: asGraphQLNodeId(clientRun.repository.id),
    },
  };
}

/**
 * Concrete implementation of IAnalysisRunRepository using DeepSource API
 *
 * This repository provides access to AnalysisRun aggregates by fetching data
 * from the DeepSource API and mapping it to domain models.
 *
 * Note: The DeepSource API doesn't support querying individual runs by ID,
 * so some methods need to fetch and filter runs locally. This ensures fresh
 * data retrieval on every request as per requirements.
 */
export class AnalysisRunRepository implements IAnalysisRunRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly client: DeepSourceClient) {
    // client is stored for use in methods
  }

  /**
   * Finds a run by its unique identifier
   *
   * Note: DeepSource API doesn't support direct run lookup by ID,
   * so this method is not efficiently implementable.
   *
   * @param id - The run ID
   * @returns The run if found, null otherwise
   */
  async findById(id: RunId): Promise<AnalysisRun | null> {
    return this.findByRunId(id);
  }

  /**
   * Finds a run by its unique ID
   *
   * Note: Since the API doesn't support direct lookup, this searches
   * through all projects to find the run.
   *
   * @param id - The run ID
   * @returns The run if found, null otherwise
   */
  async findByRunId(id: RunId): Promise<AnalysisRun | null> {
    try {
      logger.debug('Finding run by ID', { runId: id });

      // We need to search through all projects since we don't know which project the run belongs to
      const projects = await this.client.listProjects();

      for (const project of projects) {
        const projectKey = project.key;
        let cursor: string | undefined;
        let hasNextPage = true;

        while (hasNextPage) {
          const response = await this.client.listRuns(projectKey, {
            first: 50,
            after: cursor,
          });

          const run = response.items.find((r) => r.runUid === id);
          if (run) {
            const modelRun = convertClientRunToModelRun(run);
            const analysisRun = AnalysisRunMapper.toDomain(modelRun, projectKey);
            logger.debug('Run found', { runId: id, projectKey });
            return analysisRun;
          }

          hasNextPage = response.pageInfo.hasNextPage;
          cursor = response.pageInfo.endCursor;
        }
      }

      logger.debug('Run not found', { runId: id });
      return null;
    } catch (error) {
      logger.error('Error finding run by ID', { runId: id, error });
      throw error;
    }
  }

  /**
   * Finds runs for a specific project with pagination
   *
   * @param projectKey - The project key
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  async findByProject(
    projectKey: ProjectKey,
    options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>> {
    try {
      logger.debug('Finding runs by project', { projectKey, options });

      // Calculate cursor for pagination
      const first = options.pageSize;
      const skip = (options.page - 1) * options.pageSize;

      // Fetch runs from API
      const response = await this.client.listRuns(projectKey, {
        first: skip + first, // Fetch enough to skip to the desired page
      });

      // Skip to the desired page
      const items = response.items.slice(skip, skip + first);
      const modelRuns = items.map(convertClientRunToModelRun);
      const runs = AnalysisRunMapper.toDomainList(modelRuns, projectKey);

      // Calculate total pages based on a reasonable estimate
      // Since we don't have total count from API, we estimate based on hasNextPage
      const hasMoreItems = response.items.length > skip + first || response.pageInfo.hasNextPage;
      const estimatedTotal = hasMoreItems
        ? (options.page + 1) * options.pageSize + 1
        : response.items.length;
      const totalPages = Math.ceil(estimatedTotal / options.pageSize);

      const result: PaginatedResult<AnalysisRun> = {
        items: runs,
        page: options.page,
        pageSize: options.pageSize,
        totalCount: estimatedTotal,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPreviousPage: options.page > 1,
      };

      logger.debug('Runs found', { projectKey, count: runs.length });
      return result;
    } catch (error) {
      logger.error('Error finding runs by project', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds the most recent run for a project
   *
   * @param projectKey - The project key
   * @param branch - Optional branch filter
   * @returns The most recent run if found, null otherwise
   */
  async findMostRecent(projectKey: ProjectKey, branch?: BranchName): Promise<AnalysisRun | null> {
    try {
      logger.debug('Finding most recent run', { projectKey, branch });

      // Find the most recent run by fetching runs and filtering
      let mostRecentRun: DeepSourceRun | null = null;
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 50,
          after: cursor,
        });

        // Filter by branch if specified
        const runsToCheck = branch
          ? response.items.filter((r) => r.branchName === branch)
          : response.items;

        // Find the most recent run
        for (const run of runsToCheck) {
          if (!mostRecentRun || new Date(run.createdAt) > new Date(mostRecentRun.createdAt)) {
            mostRecentRun = convertClientRunToModelRun(run);
          }
        }

        // If we found a run and no branch filter, we can stop
        // (runs are returned in descending order by createdAt)
        if (mostRecentRun && !branch) {
          break;
        }

        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      if (!mostRecentRun) {
        logger.debug('No recent run found', { projectKey, branch });
        return null;
      }

      const analysisRun = AnalysisRunMapper.toDomain(mostRecentRun, projectKey);
      logger.debug('Most recent run found', {
        projectKey,
        branch,
        runId: analysisRun.runId,
      });

      return analysisRun;
    } catch (error) {
      logger.error('Error finding most recent run', { projectKey, branch, error });
      throw error;
    }
  }

  /**
   * Finds a run by commit OID
   *
   * @param projectKey - The project key
   * @param commitOid - The commit OID
   * @returns The run if found, null otherwise
   */
  async findByCommit(projectKey: ProjectKey, commitOid: CommitOid): Promise<AnalysisRun | null> {
    try {
      logger.debug('Finding run by commit', { projectKey, commitOid });

      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 50,
          after: cursor,
        });

        const run = response.items.find((r) => r.commitOid === commitOid);
        if (run) {
          const modelRun = convertClientRunToModelRun(run);
          const analysisRun = AnalysisRunMapper.toDomain(modelRun, projectKey);
          logger.debug('Run found for commit', { projectKey, commitOid, runId: run.runUid });
          return analysisRun;
        }

        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      logger.debug('No run found for commit', { projectKey, commitOid });
      return null;
    } catch (error) {
      logger.error('Error finding run by commit', { projectKey, commitOid, error });
      throw error;
    }
  }

  /**
   * Finds runs by status
   *
   * @param projectKey - The project key
   * @param status - The run status
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  async findByStatus(
    projectKey: ProjectKey,
    status: RunStatus,
    options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>> {
    try {
      logger.debug('Finding runs by status', { projectKey, status, options });

      // Fetch all runs and filter by status
      // This is inefficient but necessary since API doesn't support status filtering
      const allRuns: DeepSourceRun[] = [];
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 100,
          after: cursor,
        });

        const modelRuns = response.items.map(convertClientRunToModelRun);
        allRuns.push(...modelRuns);
        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      // Map and filter by status
      const mappedRuns = AnalysisRunMapper.toDomainList(allRuns, projectKey);
      const filteredRuns = mappedRuns.filter((run) => run.status === status);

      // Apply pagination
      const start = (options.page - 1) * options.pageSize;
      const paginatedRuns = filteredRuns.slice(start, start + options.pageSize);

      const result: PaginatedResult<AnalysisRun> = {
        items: paginatedRuns,
        page: options.page,
        pageSize: options.pageSize,
        totalCount: filteredRuns.length,
        totalPages: Math.ceil(filteredRuns.length / options.pageSize),
        hasNextPage: start + options.pageSize < filteredRuns.length,
        hasPreviousPage: options.page > 1,
      };

      logger.debug('Runs found by status', {
        projectKey,
        status,
        count: paginatedRuns.length,
        totalCount: filteredRuns.length,
      });

      return result;
    } catch (error) {
      logger.error('Error finding runs by status', { projectKey, status, error });
      throw error;
    }
  }

  /**
   * Finds runs within a date range
   *
   * @param projectKey - The project key
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  async findByDateRange(
    projectKey: ProjectKey,
    startDate: Date,
    endDate: Date,
    options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>> {
    try {
      logger.debug('Finding runs by date range', {
        projectKey,
        startDate,
        endDate,
        options,
      });

      // Fetch all runs and filter by date range
      const allRuns: DeepSourceRun[] = [];
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 100,
          after: cursor,
        });

        // Filter runs by date range
        const runsInRange = response.items.filter((run) => {
          const runDate = new Date(run.createdAt);
          return runDate >= startDate && runDate <= endDate;
        });

        const modelRuns = runsInRange.map(convertClientRunToModelRun);
        allRuns.push(...modelRuns);

        // If we found runs outside the range, we can stop
        if (response.items.length > 0) {
          const oldestRun = response.items[response.items.length - 1];
          if (new Date(oldestRun.createdAt) < startDate) {
            break;
          }
        }

        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      // Map to domain models
      const mappedRuns = AnalysisRunMapper.toDomainList(allRuns, projectKey);

      // Apply pagination
      const start = (options.page - 1) * options.pageSize;
      const paginatedRuns = mappedRuns.slice(start, start + options.pageSize);

      const result: PaginatedResult<AnalysisRun> = {
        items: paginatedRuns,
        page: options.page,
        pageSize: options.pageSize,
        totalCount: mappedRuns.length,
        totalPages: Math.ceil(mappedRuns.length / options.pageSize),
        hasNextPage: start + options.pageSize < mappedRuns.length,
        hasPreviousPage: options.page > 1,
      };

      logger.debug('Runs found in date range', {
        projectKey,
        count: paginatedRuns.length,
        totalCount: mappedRuns.length,
      });

      return result;
    } catch (error) {
      logger.error('Error finding runs by date range', {
        projectKey,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }

  /**
   * Counts runs for a project
   *
   * @param projectKey - The project key
   * @returns The total number of runs
   */
  async countByProject(projectKey: ProjectKey): Promise<number> {
    try {
      logger.debug('Counting runs for project', { projectKey });

      // Count all runs
      let count = 0;
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 100,
          after: cursor,
        });

        count += response.items.length;
        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      logger.debug('Run count for project', { projectKey, count });
      return count;
    } catch (error) {
      logger.error('Error counting runs for project', { projectKey, error });
      throw error;
    }
  }

  /**
   * Counts runs by status for a project
   *
   * @param projectKey - The project key
   * @param status - The run status
   * @returns The number of runs with the given status
   */
  async countByStatus(projectKey: ProjectKey, status: RunStatus): Promise<number> {
    try {
      logger.debug('Counting runs by status', { projectKey, status });

      // Fetch all runs and count by status
      let count = 0;
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.client.listRuns(projectKey, {
          first: 100,
          after: cursor,
        });

        // Map and count matching status
        const modelRuns = response.items.map(convertClientRunToModelRun);
        const mappedRuns = AnalysisRunMapper.toDomainList(modelRuns, projectKey);
        count += mappedRuns.filter((run) => run.status === status).length;

        hasNextPage = response.pageInfo.hasNextPage;
        cursor = response.pageInfo.endCursor;
      }

      logger.debug('Run count by status', { projectKey, status, count });
      return count;
    } catch (error) {
      logger.error('Error counting runs by status', { projectKey, status, error });
      throw error;
    }
  }

  /**
   * Checks if a run exists for a commit
   *
   * @param projectKey - The project key
   * @param commitOid - The commit OID
   * @returns True if a run exists, false otherwise
   */
  async existsForCommit(projectKey: ProjectKey, commitOid: CommitOid): Promise<boolean> {
    try {
      logger.debug('Checking if run exists for commit', { projectKey, commitOid });

      const run = await this.findByCommit(projectKey, commitOid);
      const exists = run !== null;

      logger.debug('Run existence check for commit', { projectKey, commitOid, exists });
      return exists;
    } catch (error) {
      logger.error('Error checking run existence for commit', { projectKey, commitOid, error });
      throw error;
    }
  }

  /**
   * Saves an analysis run
   *
   * Note: The DeepSource API doesn't support creating/updating runs
   * through the GraphQL API. This method is implemented to satisfy the
   * interface but will throw an error indicating the operation is not supported.
   *
   * @param run - The run to save
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async save(run: AnalysisRun): Promise<void> {
    logger.warn('Attempted to save run', {
      runId: run.runId,
      projectKey: run.projectKey,
    });

    throw new Error(
      'Save operation is not supported by DeepSource API. ' +
        'Analysis runs are created automatically when code is pushed to the repository.'
    );
  }

  /**
   * Deletes an analysis run
   *
   * Note: The DeepSource API doesn't support deleting runs
   * through the GraphQL API. This method is implemented to satisfy the
   * interface but will throw an error indicating the operation is not supported.
   *
   * @param id - The run ID to delete
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async delete(id: RunId): Promise<void> {
    logger.warn('Attempted to delete run', { runId: id });

    throw new Error(
      'Delete operation is not supported by DeepSource API. ' +
        'Analysis runs cannot be deleted through the API.'
    );
  }
}
