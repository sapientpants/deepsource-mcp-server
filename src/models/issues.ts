/**
 * @fileoverview Issue-related models
 * This module defines interfaces for DeepSource issues and related structures.
 */

import { PaginationParams, PaginatedResponse } from '../utils/pagination/types.js';

/**
 * Represents an issue found by DeepSource analysis
 * @public
 */
export interface DeepSourceIssue {
  /** Unique identifier for the issue */
  id: string;
  /** Title of the issue */
  title: string;
  /** Shortcode identifying the issue type */
  shortcode: string;
  /** Category of the issue (e.g., 'BUG', 'SECURITY', 'PERFORMANCE') */
  category: string;
  /** Severity level of the issue (e.g., 'CRITICAL', 'MAJOR', 'MINOR') */
  severity: string;
  /** Current status of the issue (e.g., 'OPEN', 'FIXED', 'WONTFIX') */
  status: string;
  /** Detailed description of the issue */
  issue_text: string;
  /** File path where the issue was found */
  file_path: string;
  /** Line number in the file where the issue starts */
  line_number: number;
  /** Tags associated with the issue */
  tags: string[];
}

/**
 * Parameters for filtering issues
 * @public
 */
export interface IssueFilterParams extends PaginationParams {
  /** Filter issues by path (file path) */
  path?: string;
  /** Filter issues by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
  /** Filter issues by tags */
  tags?: string[];
}

/**
 * Response containing a list of issues with pagination
 * @public
 */
export type IssuesResponse = PaginatedResponse<DeepSourceIssue>;
