/**
 * @fileoverview Run-related models
 * This module defines interfaces for DeepSource analysis runs.
 */

import { DeepSourceIssue } from './issues.js';
import { PaginationParams, PaginatedResponse } from '../utils/pagination/types.js';

/**
 * Distribution of occurrences by analyzer type
 * @public
 */
export interface OccurrenceDistributionByAnalyzer {
  /** Shortcode of the analyzer */
  analyzerShortcode: string;
  /** Number of issues introduced */
  introduced: number;
}

/**
 * Distribution of occurrences by category
 * @public
 */
export interface OccurrenceDistributionByCategory {
  /** Category of the issues */
  category: string;
  /** Number of issues introduced */
  introduced: number;
}

/**
 * Summary of an analysis run, including counts of issues
 * @public
 */
export interface RunSummary {
  /** Number of new issues introduced in this run */
  occurrencesIntroduced: number;
  /** Number of issues resolved in this run */
  occurrencesResolved: number;
  /** Number of issues suppressed in this run */
  occurrencesSuppressed: number;
  /** Distribution of issues by analyzer */
  occurrenceDistributionByAnalyzer?: OccurrenceDistributionByAnalyzer[];
  /** Distribution of issues by category */
  occurrenceDistributionByCategory?: OccurrenceDistributionByCategory[];
}

/**
 * Possible status values for an analysis run
 * Using a type instead of enum to avoid unused enum values linting errors
 * @public
 */
export type AnalysisRunStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'
  | 'CANCEL'
  | 'READY'
  | 'SKIPPED';

/**
 * Represents a DeepSource analysis run
 * @public
 */
export interface DeepSourceRun {
  /** Internal ID of the run */
  id: string;
  /** Unique identifier for the run */
  runUid: string;
  /** Commit hash that this run analyzed */
  commitOid: string;
  /** Branch name for the run */
  branchName: string;
  /** Base commit hash used for comparison */
  baseOid: string;
  /** Current status of the run */
  status: AnalysisRunStatus;
  /** Timestamp when the run was created */
  createdAt: string;
  /** Timestamp when the run was last updated */
  updatedAt: string;
  /** Timestamp when the run was finished (if completed) */
  finishedAt?: string;
  /** Summary of results from the run */
  summary: RunSummary;
  /** Repository information */
  repository: {
    /** Repository name */
    name: string;
    /** Repository ID */
    id: string;
  };
}

/**
 * Parameters for filtering runs
 * @public
 */
export interface RunFilterParams extends PaginationParams {
  /** Filter runs by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
}

/**
 * Response containing a list of runs with pagination
 * @public
 */
export type RunsResponse = PaginatedResponse<DeepSourceRun>;

/**
 * Response structure for recent run issues
 * @public
 */
export interface RecentRunIssuesResponse extends PaginatedResponse<DeepSourceIssue> {
  /** The most recent run for the branch */
  run: DeepSourceRun;
}
