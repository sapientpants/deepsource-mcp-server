/**
 * @fileoverview AnalysisRun aggregate exports
 *
 * This module exports all components of the AnalysisRun aggregate.
 */

export { AnalysisRun } from './analysis-run.aggregate.js';
export type { IAnalysisRunRepository } from './analysis-run.repository.js';
export { VALID_STATUS_TRANSITIONS } from './analysis-run.types.js';
export type {
  RunStatus,
  IssueCategory,
  IssueSeverity,
  CommitInfo,
  RunTimestamps,
  IssueOccurrence,
  AnalyzerDistribution,
  CategoryDistribution,
  RunSummary,
  CreateAnalysisRunParams,
  UpdateAnalysisRunParams,
} from './analysis-run.types.js';
