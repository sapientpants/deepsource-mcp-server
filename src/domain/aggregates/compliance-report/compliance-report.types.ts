/**
 * @fileoverview Types for the ComplianceReport aggregate
 *
 * This module defines the types and interfaces used by the ComplianceReport aggregate.
 */

import { ProjectKey, GraphQLNodeId } from '../../../types/branded.js';
import { ReportType } from '../../../types/report-types.js';
import { IssueCount } from '../../value-objects/issue-count.js';

/**
 * Report generation status
 */
export type ComplianceReportStatus =
  | 'PENDING'
  | 'GENERATING'
  | 'READY'
  | 'ERROR'
  | 'PASSING'
  | 'FAILING'
  | 'NOT_APPLICABLE'
  | 'UNKNOWN';

/**
 * Severity levels for compliance issues
 */
export type ComplianceSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

/**
 * Compliance score represented as a percentage
 */
export interface ComplianceScore {
  value: number; // 0-100
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

/**
 * A single compliance category with statistics
 */
export interface ComplianceCategory {
  name: string;
  description?: string;
  compliant: IssueCount;
  nonCompliant: IssueCount;
  issueCount: IssueCount;
  severity: ComplianceSeverity;
}

/**
 * Distribution of issues by severity
 */
export interface SeverityDistribution {
  critical: IssueCount;
  major: IssueCount;
  minor: IssueCount;
  info: IssueCount;
}

/**
 * Trend information for the report
 */
export interface ReportTrend {
  label: string;
  value: number;
  changePercentage: number;
  direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
}

/**
 * Summary statistics for the compliance report
 */
export interface ComplianceSummary {
  totalCompliant: IssueCount;
  totalNonCompliant: IssueCount;
  totalIssues: IssueCount;
  complianceScore: ComplianceScore;
  severityDistribution: SeverityDistribution;
}

/**
 * Parameters for creating a new ComplianceReport
 */
export interface CreateComplianceReportParams {
  projectKey: ProjectKey;
  repositoryId: GraphQLNodeId;
  reportType: ReportType;
  status?: ComplianceReportStatus;
  categories?: ComplianceCategory[];
  trend?: ReportTrend;
}

/**
 * Parameters for updating report categories
 */
export interface UpdateCategoriesParams {
  categories: ComplianceCategory[];
}

/**
 * Parameters for updating report trend
 */
export interface UpdateTrendParams {
  trend: ReportTrend;
}

/**
 * Composite key for ComplianceReport aggregate
 */
export interface ComplianceReportId {
  projectKey: ProjectKey;
  reportType: ReportType;
}
