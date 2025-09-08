/**
 * @fileoverview Report-related type definitions for DeepSource integration.
 * @packageDocumentation
 */

/**
 * Available report types in DeepSource
 * This enum combines both compliance-specific and general report types
 * and is referenced in API functions like getComplianceReport() and handleDeepsourceComplianceReport().
 * @public
 */

export enum ReportType {
  // Compliance-specific report types
  OWASP_TOP_10 = 'OWASP_TOP_10',
  SANS_TOP_25 = 'SANS_TOP_25',
  MISRA_C = 'MISRA_C',

  // General report types
  CODE_COVERAGE = 'CODE_COVERAGE',
  CODE_HEALTH_TREND = 'CODE_HEALTH_TREND',
  ISSUE_DISTRIBUTION = 'ISSUE_DISTRIBUTION',
  ISSUES_PREVENTED = 'ISSUES_PREVENTED',
  ISSUES_AUTOFIXED = 'ISSUES_AUTOFIXED',
}

/**
 * Report status indicating whether the report is passing, failing, or not applicable
 * This enum is exported as part of the public API for use in MCP tools
 * and is referenced in handleDeepsourceComplianceReport().
 * @public
 */

export enum ReportStatus {
  PASSING = 'PASSING',
  FAILING = 'FAILING',
  NOOP = 'NOOP',
}
