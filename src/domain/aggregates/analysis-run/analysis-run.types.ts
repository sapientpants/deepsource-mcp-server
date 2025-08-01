/**
 * @fileoverview Types for the AnalysisRun aggregate
 *
 * This module defines the types and interfaces used by the AnalysisRun aggregate.
 */

import {
  RunId,
  ProjectKey,
  CommitOid,
  BranchName,
  AnalyzerShortcode,
  GraphQLNodeId,
} from '../../../types/branded.js';
import { IssueCount } from '../../value-objects/issue-count.js';

/**
 * Analysis run status with valid state transitions
 */
export type RunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'SKIPPED';

/**
 * Issue category types
 */
export type IssueCategory =
  | 'BUG_RISK'
  | 'SECURITY'
  | 'STYLE'
  | 'PERFORMANCE'
  | 'DOCUMENTATION'
  | 'COVERAGE'
  | 'COMPLEXITY'
  | 'ANTI_PATTERN'
  | 'TYPE_CHECK'
  | 'OTHER';

/**
 * Issue severity levels
 */
export type IssueSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

/**
 * Commit information for the analysis run
 */
export interface CommitInfo {
  oid: CommitOid;
  branch: BranchName;
  baseOid: CommitOid;
  message?: string;
  author?: string;
  authoredAt?: Date;
}

/**
 * Run timestamps
 */
export interface RunTimestamps {
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

/**
 * Issue occurrence in an analysis run
 */
export interface IssueOccurrence {
  id: string;
  issueCode: string;
  analyzerShortcode: AnalyzerShortcode;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  path: string;
  line?: number;
  column?: number;
}

/**
 * Distribution of issues by analyzer
 */
export interface AnalyzerDistribution {
  analyzerShortcode: AnalyzerShortcode;
  introduced: IssueCount;
  resolved: IssueCount;
  suppressed: IssueCount;
}

/**
 * Distribution of issues by category
 */
export interface CategoryDistribution {
  category: IssueCategory;
  introduced: IssueCount;
  resolved: IssueCount;
  suppressed: IssueCount;
}

/**
 * Summary of the analysis run
 */
export interface RunSummary {
  totalIntroduced: IssueCount;
  totalResolved: IssueCount;
  totalSuppressed: IssueCount;
  byAnalyzer: AnalyzerDistribution[];
  byCategory: CategoryDistribution[];
}

/**
 * Parameters for creating a new analysis run
 */
export interface CreateAnalysisRunParams {
  runId: RunId;
  projectKey: ProjectKey;
  repositoryId: GraphQLNodeId;
  commitInfo: CommitInfo;
}

/**
 * Parameters for updating an analysis run
 */
export interface UpdateAnalysisRunParams {
  status?: RunStatus;
  summary?: Partial<RunSummary>;
  issues?: IssueOccurrence[];
}

/**
 * Valid status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  PENDING: ['RUNNING', 'CANCELLED', 'SKIPPED'],
  RUNNING: ['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED'],
  SUCCESS: [],
  FAILURE: [],
  TIMEOUT: [],
  CANCELLED: [],
  SKIPPED: [],
};
