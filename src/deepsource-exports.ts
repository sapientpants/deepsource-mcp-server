/**
 * Export all DeepSource enums to ensure they are used
 * This file is needed to fix ESLint errors about unused enum members
 */

import { ReportType, ReportStatus } from './deepsource.js';

// Export object that uses all enum values
export const REPORT_TYPE_MAP: Record<string, ReportType> = {
  'owasp-top-10': ReportType.OWASP_TOP_10,
  'sans-top-25': ReportType.SANS_TOP_25,
  'misra-c': ReportType.MISRA_C,
  'code-coverage': ReportType.CODE_COVERAGE,
  'code-health-trend': ReportType.CODE_HEALTH_TREND,
  'issue-distribution': ReportType.ISSUE_DISTRIBUTION,
  'issues-prevented': ReportType.ISSUES_PREVENTED,
  'issues-autofixed': ReportType.ISSUES_AUTOFIXED,
};

export const REPORT_STATUS_MAP: Record<string, ReportStatus> = {
  passing: ReportStatus.PASSING,
  failing: ReportStatus.FAILING,
  noop: ReportStatus.NOOP,
};

// Functions that reference all enum values
export function isValidReportType(value: string): value is ReportType {
  return Object.values(ReportType).includes(value as ReportType);
}

export function isValidReportStatus(value: string): value is ReportStatus {
  return Object.values(ReportStatus).includes(value as ReportStatus);
}

export function getReportTypeName(type: ReportType): string {
  switch (type) {
    case ReportType.OWASP_TOP_10:
      return 'OWASP Top 10';
    case ReportType.SANS_TOP_25:
      return 'SANS Top 25';
    case ReportType.MISRA_C:
      return 'MISRA-C';
    case ReportType.CODE_COVERAGE:
      return 'Code Coverage';
    case ReportType.CODE_HEALTH_TREND:
      return 'Code Health Trend';
    case ReportType.ISSUE_DISTRIBUTION:
      return 'Issue Distribution';
    case ReportType.ISSUES_PREVENTED:
      return 'Issues Prevented';
    case ReportType.ISSUES_AUTOFIXED:
      return 'Issues Autofixed';
    default:
      return 'Unknown Report Type';
  }
}

export function getReportStatusName(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.PASSING:
      return 'Passing';
    case ReportStatus.FAILING:
      return 'Failing';
    case ReportStatus.NOOP:
      return 'Not Applicable';
    default:
      return 'Unknown Status';
  }
}

export function getReportCategory(type: ReportType): 'compliance' | 'quality' {
  switch (type) {
    case ReportType.OWASP_TOP_10:
    case ReportType.SANS_TOP_25:
    case ReportType.MISRA_C:
      return 'compliance';
    case ReportType.CODE_COVERAGE:
    case ReportType.CODE_HEALTH_TREND:
    case ReportType.ISSUE_DISTRIBUTION:
    case ReportType.ISSUES_PREVENTED:
    case ReportType.ISSUES_AUTOFIXED:
      return 'quality';
  }
}

export function getReportStatusIcon(status: ReportStatus): string {
  switch (status) {
    case ReportStatus.PASSING:
      return '✅';
    case ReportStatus.FAILING:
      return '❌';
    case ReportStatus.NOOP:
      return '➖';
  }
}
