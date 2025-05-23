/**
 * @fileoverview Analysis-related models for DeepSource integration.
 * @packageDocumentation
 */

import { AnalysisRunStatus } from '../types/analysis.js';

/**
 * DeepSource project information
 * @public
 */
export interface DeepSourceProject {
  id: string;
  name: string;
  key: string;
  defaultBranch: string;
  dsn: string;
  isPrivate: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DeepSource issue representation
 * @public
 */
export interface DeepSourceIssue {
  id: string;
  title: string;
  category: string;
  analyzer: string;
  severity: string;
  occurrences: Array<{
    path: string;
    beginLine: number;
    beginColumn: number;
    endLine: number;
    endColumn: number;
  }>;
}

/**
 * Occurrence distribution by analyzer
 * @public
 */
export interface OccurrenceDistributionByAnalyzer {
  analyzerShortcode: string;
  count: number;
}

/**
 * Occurrence distribution by category
 * @public
 */
export interface OccurrenceDistributionByCategory {
  category: string;
  count: number;
}

/**
 * Run summary statistics
 * @public
 */
export interface RunSummary {
  issuesIntroduced: number;
  issuesResolved: number;
  issuesPrevented: number;
  issuesFixed: number;
  totalIssues: number;
  occurrencesIntroduced: number;
  occurrencesResolved: number;
  occurrencesPrevented: number;
  occurrencesFixed: number;
}

/**
 * DeepSource analysis run
 * @public
 */
export interface DeepSourceRun {
  runUid: string;
  commitOid: string;
  status: AnalysisRunStatus;
  summary: RunSummary;
  createdAt: string;
  analyzers: string[];
  branchName?: string;
  checks?: Array<{
    analyzer: string;
    status: string;
    issues: {
      introduced: number;
      resolved: number;
      prevented: number;
      fixed: number;
      total: number;
    };
  }>;
  commitMessage?: string;
  author?: {
    name: string;
    email: string;
  };
}
