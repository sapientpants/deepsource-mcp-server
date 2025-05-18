/**
 * Tests for DeepSource report utility methods
 * Focuses on testing the internal utility methods related to report processing
 */
import { ReportType } from '../deepsource.js';
import { getPrivateMethod } from './test-utils/private-method-access.js';

describe('DeepSource Report Utility Methods', () => {
  // Helper function to create typed empty objects for tests
  const createEmptyObject = (): Record<string, never> => ({}) as Record<string, never>;

  describe('extractReportData', () => {
    // Access the private static method using our utility
    // Define a more specific return type for the report data
    interface ReportDataStructure {
      key: string;
      title: string;
      securityIssueStats: Array<Record<string, unknown>>;
    }
    type ReportData = ReportDataStructure | null;

    const extractReportData =
      getPrivateMethod<(response: unknown, reportType: ReportType) => ReportData>(
        'extractReportData'
      );

    it('should return null for null response', () => {
      const result = extractReportData(null, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null for non-object response', () => {
      const result = extractReportData('string-response', ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when data property is missing', () => {
      const response = { notData: createEmptyObject() };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when data property is not an object', () => {
      const response = { data: 'string-data' };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when GraphQL data is missing', () => {
      const response = { data: createEmptyObject() };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when GraphQL data is not an object', () => {
      const response = { data: { data: 'string-data' } };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when repository is missing', () => {
      const response = { data: { data: createEmptyObject() } };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when repository is not an object', () => {
      const response = { data: { data: { repository: 'string-repository' } } };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when reports is missing', () => {
      const response = { data: { data: { repository: createEmptyObject() } } };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when reports is not an object', () => {
      const response = { data: { data: { repository: { reports: 'string-reports' } } } };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when report data is missing', () => {
      const response = {
        data: {
          data: {
            repository: {
              reports: createEmptyObject(),
            },
          },
        },
      };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should return null when report data is not an object', () => {
      const response = {
        data: {
          data: {
            repository: {
              reports: {
                owaspTop10: 'string-report',
              },
            },
          },
        },
      };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toBeNull();
    });

    it('should successfully extract OWASP_TOP_10 report data', () => {
      const reportData = {
        key: 'OWASP_TOP_10',
        title: 'OWASP Top 10',
        securityIssueStats: [],
      };
      const response = {
        data: {
          data: {
            repository: {
              reports: {
                owaspTop10: reportData,
              },
            },
          },
        },
      };
      const result = extractReportData(response, ReportType.OWASP_TOP_10);
      expect(result).toEqual(reportData);
    });

    it('should successfully extract SANS_TOP_25 report data', () => {
      const reportData = {
        key: 'SANS_TOP_25',
        title: 'SANS Top 25',
        securityIssueStats: [],
      };
      const response = {
        data: {
          data: {
            repository: {
              reports: {
                sansTop25: reportData,
              },
            },
          },
        },
      };
      const result = extractReportData(response, ReportType.SANS_TOP_25);
      expect(result).toEqual(reportData);
    });
  });

  describe('getReportField', () => {
    // Access the private static method using our utility
    // Define a specific type for the report field getter function
    interface ReportFieldGetterFn {
      (reportType: ReportType): string;
    }
    type ReportFieldGetter = ReportFieldGetterFn;

    const getReportField = getPrivateMethod<ReportFieldGetter>('getReportField');

    it('should return correct field name for OWASP_TOP_10', () => {
      const fieldName = getReportField(ReportType.OWASP_TOP_10);
      expect(fieldName).toBe('owaspTop10');
    });

    it('should return correct field name for SANS_TOP_25', () => {
      const fieldName = getReportField(ReportType.SANS_TOP_25);
      expect(fieldName).toBe('sansTop25');
    });

    it('should return correct field name for MISRA_C', () => {
      const fieldName = getReportField(ReportType.MISRA_C);
      expect(fieldName).toBe('misraC');
    });

    it('should return correct field name for CODE_COVERAGE', () => {
      const fieldName = getReportField(ReportType.CODE_COVERAGE);
      expect(fieldName).toBe('codeCoverage');
    });

    it('should return correct field name for CODE_HEALTH_TREND', () => {
      const fieldName = getReportField(ReportType.CODE_HEALTH_TREND);
      expect(fieldName).toBe('codeHealthTrend');
    });

    it('should return correct field name for ISSUE_DISTRIBUTION', () => {
      const fieldName = getReportField(ReportType.ISSUE_DISTRIBUTION);
      expect(fieldName).toBe('issueDistribution');
    });

    it('should return correct field name for ISSUES_PREVENTED', () => {
      const fieldName = getReportField(ReportType.ISSUES_PREVENTED);
      expect(fieldName).toBe('issuesPrevented');
    });

    it('should return correct field name for ISSUES_AUTOFIXED', () => {
      const fieldName = getReportField(ReportType.ISSUES_AUTOFIXED);
      expect(fieldName).toBe('issuesAutofixed');
    });

    it('should throw for an invalid report type', () => {
      expect(() => getReportField('INVALID_TYPE' as ReportType)).toThrow('Unsupported report type');
    });
  });

  describe('getTitleForReportType', () => {
    // Access the private static method using our utility
    // Define a specific type for the report title getter function
    interface ReportTitleGetterFn {
      (reportType: ReportType): string;
    }
    type ReportTitleGetter = ReportTitleGetterFn;

    const getTitleForReportType = getPrivateMethod<ReportTitleGetter>('getTitleForReportType');

    it('should return correct title for OWASP_TOP_10', () => {
      const title = getTitleForReportType(ReportType.OWASP_TOP_10);
      expect(title).toBe('OWASP Top 10');
    });

    it('should return correct title for SANS_TOP_25', () => {
      const title = getTitleForReportType(ReportType.SANS_TOP_25);
      expect(title).toBe('SANS Top 25');
    });

    it('should return correct title for MISRA_C', () => {
      const title = getTitleForReportType(ReportType.MISRA_C);
      expect(title).toBe('MISRA-C');
    });

    it('should return correct title for CODE_COVERAGE', () => {
      const title = getTitleForReportType(ReportType.CODE_COVERAGE);
      expect(title).toBe('Code Coverage');
    });

    it('should return correct title for CODE_HEALTH_TREND', () => {
      const title = getTitleForReportType(ReportType.CODE_HEALTH_TREND);
      expect(title).toBe('Code Health Trend');
    });

    it('should return correct title for ISSUE_DISTRIBUTION', () => {
      const title = getTitleForReportType(ReportType.ISSUE_DISTRIBUTION);
      expect(title).toBe('Issue Distribution');
    });

    it('should return correct title for ISSUES_PREVENTED', () => {
      const title = getTitleForReportType(ReportType.ISSUES_PREVENTED);
      expect(title).toBe('Issues Prevented');
    });

    it('should return correct title for ISSUES_AUTOFIXED', () => {
      const title = getTitleForReportType(ReportType.ISSUES_AUTOFIXED);
      expect(title).toBe('Issues Autofixed');
    });

    it('should return "Unknown Report" for an invalid report type', () => {
      const title = getTitleForReportType('INVALID_TYPE' as ReportType);
      expect(title).toBe('Unknown Report');
    });
  });
});
