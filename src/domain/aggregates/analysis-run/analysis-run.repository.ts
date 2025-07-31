/**
 * @fileoverview AnalysisRun repository interface
 *
 * This module defines the repository interface for the AnalysisRun aggregate.
 */

import {
  IRepository,
  PaginationOptions,
  PaginatedResult,
} from '../../shared/repository.interface.js';
import { AnalysisRun } from './analysis-run.aggregate.js';
import { RunId, ProjectKey, BranchName, CommitOid } from '../../../types/branded.js';
import { RunStatus } from './analysis-run.types.js';

/**
 * Repository interface for AnalysisRun aggregates
 *
 * Provides methods for persisting and retrieving AnalysisRun aggregates.
 *
 * @example
 * ```typescript
 * class InMemoryAnalysisRunRepository implements IAnalysisRunRepository {
 *   private runs = new Map<RunId, AnalysisRun>();
 *
 *   async findByRunId(id: RunId): Promise<AnalysisRun | null> {
 *     return this.runs.get(id) || null;
 *   }
 *
 *   async findByProject(
 *     projectKey: ProjectKey,
 *     options: PaginationOptions
 *   ): Promise<PaginatedResult<AnalysisRun>> {
 *     const projectRuns = Array.from(this.runs.values())
 *       .filter(run => run.projectKey === projectKey);
 *
 *     // Apply pagination
 *     const start = (options.page - 1) * options.pageSize;
 *     const items = projectRuns.slice(start, start + options.pageSize);
 *
 *     return {
 *       items,
 *       page: options.page,
 *       pageSize: options.pageSize,
 *       totalCount: projectRuns.length,
 *       totalPages: Math.ceil(projectRuns.length / options.pageSize),
 *       hasNextPage: start + options.pageSize < projectRuns.length,
 *       hasPreviousPage: options.page > 1
 *     };
 *   }
 *
 *   async save(run: AnalysisRun): Promise<void> {
 *     this.runs.set(run.runId, run);
 *   }
 * }
 * ```
 */
export interface IAnalysisRunRepository extends IRepository<AnalysisRun, RunId> {
  /**
   * Finds a run by its unique ID
   *
   * @param id - The run ID
   * @returns The run if found, null otherwise
   */
  findByRunId(_id: RunId): Promise<AnalysisRun | null>;

  /**
   * Finds runs for a specific project with pagination
   *
   * @param projectKey - The project key
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  findByProject(
    _projectKey: ProjectKey,
    _options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>>;

  /**
   * Finds the most recent run for a project
   *
   * @param projectKey - The project key
   * @param branch - Optional branch filter
   * @returns The most recent run if found, null otherwise
   */
  findMostRecent(_projectKey: ProjectKey, _branch?: BranchName): Promise<AnalysisRun | null>;

  /**
   * Finds a run by commit OID
   *
   * @param projectKey - The project key
   * @param commitOid - The commit OID
   * @returns The run if found, null otherwise
   */
  findByCommit(_projectKey: ProjectKey, _commitOid: CommitOid): Promise<AnalysisRun | null>;

  /**
   * Finds runs by status
   *
   * @param projectKey - The project key
   * @param status - The run status
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  findByStatus(
    _projectKey: ProjectKey,
    _status: RunStatus,
    _options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>>;

  /**
   * Finds runs within a date range
   *
   * @param projectKey - The project key
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param options - Pagination options
   * @returns Paginated analysis runs
   */
  findByDateRange(
    _projectKey: ProjectKey,
    _startDate: Date,
    _endDate: Date,
    _options: PaginationOptions
  ): Promise<PaginatedResult<AnalysisRun>>;

  /**
   * Counts runs for a project
   *
   * @param projectKey - The project key
   * @returns The total number of runs
   */
  countByProject(_projectKey: ProjectKey): Promise<number>;

  /**
   * Counts runs by status for a project
   *
   * @param projectKey - The project key
   * @param status - The run status
   * @returns The number of runs with the given status
   */
  countByStatus(_projectKey: ProjectKey, _status: RunStatus): Promise<number>;

  /**
   * Checks if a run exists for a commit
   *
   * @param projectKey - The project key
   * @param commitOid - The commit OID
   * @returns True if a run exists, false otherwise
   */
  existsForCommit(_projectKey: ProjectKey, _commitOid: CommitOid): Promise<boolean>;
}
