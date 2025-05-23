/**
 * @fileoverview Report-related models for DeepSource integration.
 * @packageDocumentation
 */

import { ReportType, ReportStatus } from '../types/report-types.js';

/**
 * Trend information for reports
 * @public
 */
export interface ReportTrend {
  label?: string;
  value?: number;
  changePercentage?: number;
}

/**
 * Severity distribution of issues
 * @public
 */
export interface SeverityDistribution {
  critical: number;
  major: number;
  minor: number;
  total: number;
}

/**
 * Security issue statistics for compliance reports
 * @public
 */
export interface SecurityIssueStat {
  name: string;
  compliant: number;
  nonCompliant: number;
  issueCount: number;
  description?: string;
}

/**
 * Compliance report structure
 * @public
 */
export interface ComplianceReport {
  type: ReportType;
  status: ReportStatus;
  summary: {
    compliant: number;
    nonCompliant: number;
    totalIssues: number;
  };
  categories: SecurityIssueStat[];
  trend?: ReportTrend;
  generatedAt: string;
}
