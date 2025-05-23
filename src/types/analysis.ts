/**
 * @fileoverview Analysis-related type definitions for DeepSource integration.
 * @packageDocumentation
 */

/**
 * Analysis run status types
 * @public
 */
export type AnalysisRunStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'ANALYZING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'CANCELLED'
  | 'TIMEOUT';
