/**
 * @fileoverview ComplianceReport aggregate exports
 *
 * This module exports all components of the ComplianceReport aggregate.
 */

export { ComplianceReport } from './compliance-report.aggregate.js';
export type { IComplianceReportRepository } from './compliance-report.repository.js';
export type {
  ComplianceReportStatus,
  ComplianceSeverity,
  ComplianceScore,
  ComplianceCategory,
  SeverityDistribution,
  ReportTrend,
  ComplianceSummary,
  CreateComplianceReportParams,
  UpdateCategoriesParams,
  UpdateTrendParams,
  ComplianceReportId,
} from './compliance-report.types.js';
