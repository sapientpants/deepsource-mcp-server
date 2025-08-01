/**
 * @fileoverview Handlers index
 * This module exports MCP tool handlers.
 */

export * from './projects.js';
export * from './compliance-reports.js';
export * from './quality-metrics.js';
export * from './project-issues.js';
export * from './project-runs.js';
export * from './run.js';
export * from './recent-run-issues.js';
export * from './dependency-vulnerabilities.js';

// Export specific domain-based handlers for clarity
export { createProjectsHandler } from './projects.js';
export {
  createComplianceReportHandlerWithRepo,
  createComplianceReportHandler,
} from './compliance-reports.js';
export {
  createQualityMetricsHandlerWithRepo,
  createQualityMetricsHandler,
  createUpdateMetricThresholdHandler,
  createUpdateMetricSettingHandler,
} from './quality-metrics.js';
export { createProjectIssuesHandler } from './project-issues.js';
export { createProjectRunsHandlerWithRepo, createProjectRunsHandler } from './project-runs.js';
export { createRunHandlerWithRepo, createRunHandler } from './run.js';
export {
  createRecentRunIssuesHandlerWithRepo,
  createRecentRunIssuesHandler,
} from './recent-run-issues.js';
export { createDependencyVulnerabilitiesHandler } from './dependency-vulnerabilities.js';
