/**
 * @fileoverview Handlers index
 * This module exports MCP tool handlers.
 */

// Export handler functions
export { createProjectsHandler, handleProjects } from './projects.js';
export {
  createComplianceReportHandlerWithRepo,
  createComplianceReportHandler,
  handleDeepsourceComplianceReport,
} from './compliance-reports.js';
export {
  createQualityMetricsHandlerWithRepo,
  createQualityMetricsHandler,
  createUpdateMetricThresholdHandler,
  createUpdateMetricSettingHandler,
  handleDeepsourceQualityMetrics,
  handleDeepsourceUpdateMetricThreshold,
  handleDeepsourceUpdateMetricSetting,
} from './quality-metrics.js';
export { createProjectIssuesHandler, handleDeepsourceProjectIssues } from './project-issues.js';
export {
  createProjectRunsHandlerWithRepo,
  createProjectRunsHandler,
  handleDeepsourceProjectRuns,
} from './project-runs.js';
export { createRunHandlerWithRepo, createRunHandler, handleDeepsourceRun } from './run.js';
export {
  createRecentRunIssuesHandlerWithRepo,
  createRecentRunIssuesHandler,
  handleDeepsourceRecentRunIssues,
} from './recent-run-issues.js';
export {
  createDependencyVulnerabilitiesHandler,
  handleDeepsourceDependencyVulnerabilities,
} from './dependency-vulnerabilities.js';

// Export handler types
export type { ProjectsHandlerDeps } from './projects.js';

// Export handler parameter types
export type { DeepsourceComplianceReportParams } from './compliance-reports.js';
export type {
  DeepsourceQualityMetricsParams,
  DeepsourceUpdateMetricThresholdParams,
  DeepsourceUpdateMetricSettingParams,
} from './quality-metrics.js';
export type { DeepsourceProjectIssuesParams } from './project-issues.js';
export type { DeepsourceProjectRunsParams } from './project-runs.js';
export type { DeepsourceRunParams } from './run.js';
export type { DeepsourceRecentRunIssuesParams } from './recent-run-issues.js';
export type { DeepsourceDependencyVulnerabilitiesParams } from './dependency-vulnerabilities.js';
