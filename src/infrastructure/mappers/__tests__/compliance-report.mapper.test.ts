/**
 * @fileoverview Tests for ComplianceReportMapper
 */

import { describe, it, expect } from '@jest/globals';
import { ComplianceReportMapper } from '../compliance-report.mapper.js';
import { ComplianceReport as ApiComplianceReport } from '../../../deepsource.js';
import { ReportType } from '../../../types/report-types.js';
import { ComplianceReport } from '../../../domain/aggregates/compliance-report/compliance-report.aggregate.js';
import { IssueCount } from '../../../domain/value-objects/issue-count.js';

describe('ComplianceReportMapper', () => {
  const mockApiReport: ApiComplianceReport = {
    key: ReportType.OWASP_TOP_10,
    title: 'OWASP Top 10',
    currentValue: 85,
    status: 'READY',
    securityIssueStats: [
      {
        key: 'A01',
        title: 'A01: Broken Access Control',
        occurrence: {
          critical: 2,
          major: 5,
          minor: 3,
          total: 11,
        },
      },
      {
        key: 'A02',
        title: 'A02: Cryptographic Failures',
        occurrence: {
          critical: 0,
          major: 1,
          minor: 4,
          total: 7,
        },
      },
      {
        key: 'A03',
        title: 'A03: Injection',
        occurrence: {
          critical: 1,
          major: 0,
          minor: 0,
          total: 1,
        },
      },
    ],
    trends: [],
  };

  describe('toDomain', () => {
    it('should map API compliance report to domain aggregate', () => {
      const projectKey = 'test-project';
      const repositoryId = 'repo-123';

      const report = ComplianceReportMapper.toDomain(mockApiReport, projectKey, repositoryId);

      expect(report).toBeInstanceOf(ComplianceReport);
      expect(report.projectKey).toBe(projectKey);
      expect(report.repositoryId).toBe(repositoryId);
      expect(report.reportType).toBe(ReportType.OWASP_TOP_10);
      expect(report.categories).toHaveLength(3);
    });

    it('should map categories correctly', () => {
      const report = ComplianceReportMapper.toDomain(mockApiReport, 'test-project', 'repo-123');

      const categories = report.categories;
      expect(categories[0].name).toBe('A01: Broken Access Control');
      expect(categories[0].severity).toBe('CRITICAL');
      expect(categories[0].issueCount.count).toBe(11); // 2+5+3+1

      expect(categories[1].name).toBe('A02: Cryptographic Failures');
      expect(categories[1].severity).toBe('MAJOR'); // Highest severity present
      expect(categories[1].issueCount.count).toBe(7); // 0+1+4+2

      expect(categories[2].name).toBe('A03: Injection');
      expect(categories[2].severity).toBe('CRITICAL');
      expect(categories[2].issueCount.count).toBe(1); // 1+0+0+0
    });

    it('should handle empty security issue stats', () => {
      const emptyReport = {
        ...mockApiReport,
        securityIssueStats: [],
      };

      const report = ComplianceReportMapper.toDomain(emptyReport, 'test-project', 'repo-123');

      expect(report.categories).toHaveLength(0);
    });
  });

  describe('mapStatus', () => {
    it('should map API status to domain status', () => {
      expect(ComplianceReportMapper.mapStatus('READY')).toBe('READY');
      expect(ComplianceReportMapper.mapStatus('COMPLETED')).toBe('READY');
      expect(ComplianceReportMapper.mapStatus('GENERATING')).toBe('GENERATING');
      expect(ComplianceReportMapper.mapStatus('PENDING')).toBe('GENERATING');
      expect(ComplianceReportMapper.mapStatus('ERROR')).toBe('ERROR');
      expect(ComplianceReportMapper.mapStatus('FAILED')).toBe('ERROR');
    });

    it('should default to PENDING for unknown status', () => {
      expect(ComplianceReportMapper.mapStatus('UNKNOWN')).toBe('PENDING');
      expect(ComplianceReportMapper.mapStatus(undefined)).toBe('PENDING');
    });
  });

  describe('mapHighestSeverity', () => {
    it('should return CRITICAL when critical issues present', () => {
      const occurrence = { critical: 1, major: 5, minor: 3, total: 9 };
      expect(ComplianceReportMapper.mapHighestSeverity(occurrence)).toBe('CRITICAL');
    });

    it('should return MAJOR when no critical but major issues present', () => {
      const occurrence = { critical: 0, major: 2, minor: 5, total: 7 };
      expect(ComplianceReportMapper.mapHighestSeverity(occurrence)).toBe('MAJOR');
    });

    it('should return MINOR when no critical/major but minor issues present', () => {
      const occurrence = { critical: 0, major: 0, minor: 3, total: 3 };
      expect(ComplianceReportMapper.mapHighestSeverity(occurrence)).toBe('MINOR');
    });

    it('should return INFO when no specific severity issues present', () => {
      const occurrence = { critical: 0, major: 0, minor: 0, total: 2 };
      expect(ComplianceReportMapper.mapHighestSeverity(occurrence)).toBe('INFO');
    });

    it('should return INFO when no issues present', () => {
      const occurrence = { critical: 0, major: 0, minor: 0, total: 0 };
      expect(ComplianceReportMapper.mapHighestSeverity(occurrence)).toBe('INFO');
    });
  });

  describe('toPersistence', () => {
    it('should map domain aggregate to persistence format', () => {
      const report = ComplianceReportMapper.toDomain(mockApiReport, 'test-project', 'repo-123');

      const persistence = ComplianceReportMapper.toPersistence(report);

      expect(persistence.id).toBe(report.id);
      expect(persistence.projectKey).toBe('test-project');
      expect(persistence.repositoryId).toBe('repo-123');
      expect(persistence.reportType).toBe(ReportType.OWASP_TOP_10);
      expect(persistence.categories).toEqual(report.categories);
      expect(persistence.generatedAt).toBeInstanceOf(Date);
      expect(persistence.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('toDomainFromList', () => {
    it('should map multiple API reports to domain aggregates', () => {
      const apiReports = [
        mockApiReport,
        {
          ...mockApiReport,
          key: ReportType.SANS_TOP_25,
          title: 'SANS Top 25',
          securityIssueStats: [
            {
              key: 'CWE-79',
              title: 'Cross-site Scripting',
              occurrence: {
                critical: 1,
                major: 2,
                minor: 1,
                total: 4,
              },
            },
          ],
        },
      ];

      const reports = ComplianceReportMapper.toDomainFromList(
        apiReports,
        'test-project',
        'repo-123'
      );

      expect(reports).toHaveLength(2);
      expect(reports[0].reportType).toBe(ReportType.OWASP_TOP_10);
      expect(reports[1].reportType).toBe(ReportType.SANS_TOP_25);
      expect(reports[1].categories).toHaveLength(1);
    });

    it('should handle empty reports list', () => {
      const reports = ComplianceReportMapper.toDomainFromList([], 'test-project', 'repo-123');
      expect(reports).toEqual([]);
    });
  });

  describe('createCategoryFromStat', () => {
    it('should create a compliance category from security issue stat', () => {
      const stat = {
        key: 'A01',
        title: 'Broken Access Control',
        occurrence: {
          critical: 2,
          major: 3,
          minor: 1,
          total: 6,
        },
      };

      const category = ComplianceReportMapper.createCategoryFromStat(stat, ReportType.OWASP_TOP_10);

      expect(category.name).toBe('Broken Access Control');
      expect(category.description).toBe('OWASP_TOP_10 category: A01');
      expect(category.issueCount.count).toBe(6); // 2+3+1+0
      expect(category.nonCompliant.count).toBe(6);
      expect(category.compliant.count).toBe(0);
      expect(category.severity).toBe('CRITICAL');
    });
  });

  describe('estimateComplianceScore', () => {
    it('should return 100 for empty categories', () => {
      const score = ComplianceReportMapper.estimateComplianceScore([]);
      expect(score).toBe(100);
    });

    it('should calculate score based on severity and issue counts', () => {
      const categories = [
        {
          name: 'Test Category 1',
          description: 'Test',
          compliant: IssueCount.create(0),
          nonCompliant: IssueCount.create(5),
          issueCount: IssueCount.create(5),
          severity: 'CRITICAL' as const,
        },
        {
          name: 'Test Category 2',
          description: 'Test',
          compliant: IssueCount.create(0),
          nonCompliant: IssueCount.create(3),
          issueCount: IssueCount.create(3),
          severity: 'MAJOR' as const,
        },
      ];

      const score = ComplianceReportMapper.estimateComplianceScore(categories);

      // Expected: 100 - (1 * 20 + 1 * 10 + 8 * 2) = 100 - 46 = 54
      expect(score).toBe(54);
    });

    it('should not go below 0', () => {
      const categories = Array(10).fill({
        name: 'Critical Category',
        description: 'Test',
        compliant: IssueCount.create(0),
        nonCompliant: IssueCount.create(10),
        issueCount: IssueCount.create(10),
        severity: 'CRITICAL' as const,
      });

      const score = ComplianceReportMapper.estimateComplianceScore(categories);
      expect(score).toBe(0);
    });

    it('should not go above 100', () => {
      const categories = [
        {
          name: 'Minor Category',
          description: 'Test',
          compliant: IssueCount.create(0),
          nonCompliant: IssueCount.create(1),
          issueCount: IssueCount.create(1),
          severity: 'INFO' as const,
        },
      ];

      const score = ComplianceReportMapper.estimateComplianceScore(categories);
      expect(score).toBe(98); // 100 - 2 = 98
    });
  });
});
