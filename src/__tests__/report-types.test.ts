/**
 * @fileoverview Tests for report types
 */

import { ReportType, ReportStatus } from '../types/report-types.js';

describe('Report Types', () => {
  describe('ReportType enum', () => {
    it('should have correct compliance-specific report types', () => {
      expect(ReportType.OWASP_TOP_10).toBe('OWASP_TOP_10');
      expect(ReportType.SANS_TOP_25).toBe('SANS_TOP_25');
      expect(ReportType.MISRA_C).toBe('MISRA_C');
    });

    it('should have correct general report types', () => {
      expect(ReportType.CODE_COVERAGE).toBe('CODE_COVERAGE');
      expect(ReportType.CODE_HEALTH_TREND).toBe('CODE_HEALTH_TREND');
      expect(ReportType.ISSUE_DISTRIBUTION).toBe('ISSUE_DISTRIBUTION');
      expect(ReportType.ISSUES_PREVENTED).toBe('ISSUES_PREVENTED');
      expect(ReportType.ISSUES_AUTOFIXED).toBe('ISSUES_AUTOFIXED');
    });

    it('should have all expected report types', () => {
      const allReportTypes = Object.values(ReportType);
      expect(allReportTypes).toHaveLength(8);
      expect(allReportTypes).toContain('OWASP_TOP_10');
      expect(allReportTypes).toContain('SANS_TOP_25');
      expect(allReportTypes).toContain('MISRA_C');
      expect(allReportTypes).toContain('CODE_COVERAGE');
      expect(allReportTypes).toContain('CODE_HEALTH_TREND');
      expect(allReportTypes).toContain('ISSUE_DISTRIBUTION');
      expect(allReportTypes).toContain('ISSUES_PREVENTED');
      expect(allReportTypes).toContain('ISSUES_AUTOFIXED');
    });

    it('should be usable in type guards', () => {
      const isValidReportType = (value: string): value is ReportType => {
        return Object.values(ReportType).includes(value as ReportType);
      };

      expect(isValidReportType('OWASP_TOP_10')).toBe(true);
      expect(isValidReportType('CODE_COVERAGE')).toBe(true);
      expect(isValidReportType('INVALID_TYPE')).toBe(false);
    });
  });

  describe('ReportStatus enum', () => {
    it('should have correct status values', () => {
      expect(ReportStatus.PASSING).toBe('PASSING');
      expect(ReportStatus.FAILING).toBe('FAILING');
      expect(ReportStatus.NOOP).toBe('NOOP');
    });

    it('should have all expected statuses', () => {
      const allStatuses = Object.values(ReportStatus);
      expect(allStatuses).toHaveLength(3);
      expect(allStatuses).toContain('PASSING');
      expect(allStatuses).toContain('FAILING');
      expect(allStatuses).toContain('NOOP');
    });

    it('should be usable in switch statements', () => {
      const getStatusMessage = (status: ReportStatus): string => {
        switch (status) {
          case ReportStatus.PASSING:
            return 'All checks passed';
          case ReportStatus.FAILING:
            return 'Some checks failed';
          case ReportStatus.NOOP:
            return 'Not applicable';
          default:
            return 'Unknown status';
        }
      };

      expect(getStatusMessage(ReportStatus.PASSING)).toBe('All checks passed');
      expect(getStatusMessage(ReportStatus.FAILING)).toBe('Some checks failed');
      expect(getStatusMessage(ReportStatus.NOOP)).toBe('Not applicable');
    });
  });

  describe('Integration tests', () => {
    it('should be able to use both enums together', () => {
      interface ComplianceReport {
        type: ReportType;
        status: ReportStatus;
      }

      const report: ComplianceReport = {
        type: ReportType.OWASP_TOP_10,
        status: ReportStatus.PASSING,
      };

      expect(report.type).toBe('OWASP_TOP_10');
      expect(report.status).toBe('PASSING');
    });

    it('should support enum iteration for building UI options', () => {
      // Simulate building dropdown options from enums
      const reportTypeOptions = Object.entries(ReportType).map(([key, value]) => ({
        label: key.replace(/_/g, ' '),
        value,
      }));

      expect(reportTypeOptions.length).toBe(8);
      expect(reportTypeOptions[0]).toEqual({
        label: 'OWASP TOP 10',
        value: 'OWASP_TOP_10',
      });
    });
  });
});
