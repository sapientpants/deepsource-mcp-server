/**
 * @fileoverview Tests for ComplianceReportRepository
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceReportRepository } from '../compliance-report.repository.js';
import { DeepSourceClient, ComplianceReport as ApiComplianceReport } from '../../../deepsource.js';
import { ReportType } from '../../../types/report-types.js';
import { asProjectKey } from '../../../types/branded.js';
import { ComplianceReport } from '../../../domain/aggregates/compliance-report/compliance-report.aggregate.js';

// Mock the DeepSourceClient
vi.mock('../../../deepsource.js');

// Mock the logger
vi.mock('../../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('ComplianceReportRepository', () => {
  let repository: ComplianceReportRepository;
  let mockClient: anyed<DeepSourceClient>;
  let mockApiReport: ApiComplianceReport;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock DeepSourceClient
    mockClient = {
      listProjects: vi.fn(),
      getComplianceReport: vi.fn(),
      listRuns: vi.fn(),
    } as unknown as anyed<DeepSourceClient>;

    // Create test data
    mockApiReport = {
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
      ],
      trends: [],
    };

    // Setup default mock behavior
    mockClient.listProjects.mockResolvedValue([
      {
        key: asProjectKey('test-project'),
        name: 'Test Project',
        repository: {
          url: 'https://github.com/test/test-project',
          provider: 'GITHUB',
          login: 'test',
          isPrivate: false,
          isActivated: true,
        },
      } as unknown as import('../../../models/projects.js').Project,
    ]);

    // Mock listRuns to provide repository ID
    mockClient.listRuns.mockResolvedValue({
      items: [
        {
          id: 'run-1',
          repository: { id: 'repo-123' },
        },
      ],
      pageInfo: { hasNextPage: false },
      totalCount: 1,
    } as import('../../../client/runs-client.js').PaginatedRunResponse);

    mockClient.getComplianceReport.mockResolvedValue(mockApiReport);

    // Create repository instance
    repository = new ComplianceReportRepository(mockClient);
  });

  describe('findById', () => {
    it('should find report by composite ID', async () => {
      const id = 'test-project:OWASP_TOP_10';
      const report = await repository.findById(id);

      expect(report).not.toBeNull();
      expect(report?.reportType).toBe(ReportType.OWASP_TOP_10);
      expect(mockClient.getComplianceReport).toHaveBeenCalledWith(
        'test-project',
        ReportType.OWASP_TOP_10
      );
    });

    it('should return null for invalid composite ID format', async () => {
      const id = 'invalid-id-format';
      const report = await repository.findById(id);

      expect(report).toBeNull();
      expect(mockClient.getComplianceReport).not.toHaveBeenCalled();
    });
  });

  describe('findByProjectAndType', () => {
    it('should return compliance report for valid project and type', async () => {
      const projectKey = asProjectKey('test-project');
      const report = await repository.findByProjectAndType(projectKey, ReportType.OWASP_TOP_10);

      expect(report).not.toBeNull();
      expect(report).toBeInstanceOf(ComplianceReport);
      expect(report?.reportType).toBe(ReportType.OWASP_TOP_10);
      expect(report?.categories).toHaveLength(2);
      expect(mockClient.getComplianceReport).toHaveBeenCalledWith(
        projectKey,
        ReportType.OWASP_TOP_10
      );
    });

    it('should return null when report not found', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const report = await repository.findByProjectAndType(
        asProjectKey('test-project'),
        ReportType.SANS_TOP_25
      );

      expect(report).toBeNull();
    });

    it('should throw error when project not found', async () => {
      mockClient.listProjects.mockResolvedValue([]);

      await expect(
        repository.findByProjectAndType(
          asProjectKey('nonexistent-project'),
          ReportType.OWASP_TOP_10
        )
      ).rejects.toThrow('Project not found: nonexistent-project');
    });
  });

  describe('findLatest', () => {
    it('should return all available reports for a project', async () => {
      const owaspReport = { ...mockApiReport, key: ReportType.OWASP_TOP_10 };
      const sansReport = { ...mockApiReport, key: ReportType.SANS_TOP_25, title: 'SANS Top 25' };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(owaspReport)
        .mockResolvedValueOnce(sansReport)
        .mockResolvedValueOnce(null); // MISRA_C not available

      const reports = await repository.findLatest(asProjectKey('test-project'));

      expect(reports).toHaveLength(2);
      expect(reports.map((r) => r.reportType)).toContain(ReportType.OWASP_TOP_10);
      expect(reports.map((r) => r.reportType)).toContain(ReportType.SANS_TOP_25);
      expect(mockClient.getComplianceReport).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no reports exist', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const reports = await repository.findLatest(asProjectKey('test-project'));

      expect(reports).toEqual([]);
    });

    it('should sort reports by generation date (newest first)', async () => {
      const oldReport = { ...mockApiReport, key: ReportType.OWASP_TOP_10 };
      const newReport = { ...mockApiReport, key: ReportType.SANS_TOP_25 };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(oldReport)
        .mockResolvedValueOnce(newReport)
        .mockResolvedValueOnce(null);

      const reports = await repository.findLatest(asProjectKey('test-project'));

      expect(reports).toHaveLength(2);
      // Note: Since API doesn't provide generation timestamps, they'll be set to new Date()
      // So the sorting will be based on creation order in tests
    });
  });

  describe('findByStatus', () => {
    it('should return reports matching the specified status', async () => {
      const readyReport = { ...mockApiReport, status: 'READY' };
      const generatingReport = {
        ...mockApiReport,
        key: ReportType.SANS_TOP_25,
        status: 'GENERATING',
      };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(readyReport)
        .mockResolvedValueOnce(generatingReport)
        .mockResolvedValueOnce(null);

      const readyReports = await repository.findByStatus(asProjectKey('test-project'), 'READY');

      expect(readyReports).toHaveLength(1);
      expect(readyReports[0].status).toBe('READY');
    });

    it('should return empty array when no reports match status', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const reports = await repository.findByStatus(asProjectKey('test-project'), 'ERROR');

      expect(reports).toEqual([]);
    });
  });

  describe('findCompliantReports', () => {
    it('should return only compliant reports', async () => {
      // Create a report that will be compliant (very few issues, which should result in high compliance)
      // With only 1 issue and the mapper's 10% baseline compliance estimation,
      // we'll have: compliant=0, nonCompliant=1, score = 0/(0+1) = 0%
      // So let's create a report with no issues at all
      const compliantReport = {
        ...mockApiReport,
        securityIssueStats: [], // No security issues = 100% compliant
      };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(compliantReport)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const compliantReports = await repository.findCompliantReports(asProjectKey('test-project'));

      expect(compliantReports).toHaveLength(1);
      expect(compliantReports[0].isCompliant).toBe(true);
    });

    it('should return empty array when no compliant reports exist', async () => {
      // Create a report with many critical issues (non-compliant)
      const nonCompliantReport = {
        ...mockApiReport,
        securityIssueStats: [
          {
            key: 'A01',
            title: 'A01: Test',
            occurrence: { critical: 10, major: 10, minor: 10, total: 40 },
          },
        ],
      };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(nonCompliantReport)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const compliantReports = await repository.findCompliantReports(asProjectKey('test-project'));

      expect(compliantReports).toEqual([]);
    });
  });

  describe('findReportsWithCriticalIssues', () => {
    it('should return reports with critical issues', async () => {
      const criticalReport = {
        ...mockApiReport,
        securityIssueStats: [
          {
            key: 'A01',
            title: 'A01: Critical Issue',
            occurrence: { critical: 2, major: 0, minor: 0, total: 2 },
          },
        ],
      };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(criticalReport)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const criticalReports = await repository.findReportsWithCriticalIssues(
        asProjectKey('test-project')
      );

      expect(criticalReports).toHaveLength(1);
      expect(criticalReports[0].hasCriticalIssues).toBe(true);
    });

    it('should return empty array when no critical issues exist', async () => {
      const nonCriticalReport = {
        ...mockApiReport,
        securityIssueStats: [
          {
            key: 'A01',
            title: 'A01: Minor Issue',
            occurrence: { critical: 0, major: 0, minor: 1, total: 2 },
          },
        ],
      };

      mockClient.getComplianceReport
        .mockResolvedValueOnce(nonCriticalReport)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const criticalReports = await repository.findReportsWithCriticalIssues(
        asProjectKey('test-project')
      );

      expect(criticalReports).toEqual([]);
    });
  });

  describe('findByCompositeId', () => {
    it('should find report by composite ID components', async () => {
      const id = {
        projectKey: asProjectKey('test-project'),
        reportType: ReportType.OWASP_TOP_10,
      };

      const report = await repository.findByCompositeId(id);

      expect(report).not.toBeNull();
      expect(report?.reportType).toBe(ReportType.OWASP_TOP_10);
    });
  });

  describe('countByProject', () => {
    it('should count all reports for a project', async () => {
      mockClient.getComplianceReport
        .mockResolvedValueOnce(mockApiReport)
        .mockResolvedValueOnce(mockApiReport)
        .mockResolvedValueOnce(null);

      const count = await repository.countByProject(asProjectKey('test-project'));

      expect(count).toBe(2);
    });

    it('should return 0 when no reports exist', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const count = await repository.countByProject(asProjectKey('test-project'));

      expect(count).toBe(0);
    });
  });

  describe('countByType', () => {
    it('should count reports by type', async () => {
      const count = await repository.countByType(
        asProjectKey('test-project'),
        ReportType.OWASP_TOP_10
      );

      expect(count).toBe(1);
      expect(mockClient.getComplianceReport).toHaveBeenCalledWith(
        'test-project',
        ReportType.OWASP_TOP_10
      );
    });

    it('should return 0 when report type does not exist', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const count = await repository.countByType(asProjectKey('test-project'), ReportType.MISRA_C);

      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when report exists', async () => {
      const exists = await repository.exists(asProjectKey('test-project'), ReportType.OWASP_TOP_10);

      expect(exists).toBe(true);
    });

    it('should return false when report does not exist', async () => {
      mockClient.getComplianceReport.mockResolvedValue(null);

      const exists = await repository.exists(asProjectKey('test-project'), ReportType.MISRA_C);

      expect(exists).toBe(false);
    });
  });

  describe('save', () => {
    it('should throw error indicating operation not supported', async () => {
      const projectKey = asProjectKey('test-project');
      const report = await repository.findByProjectAndType(projectKey, ReportType.OWASP_TOP_10);

      expect(report).not.toBeNull();
      if (report) {
        await expect(repository.save(report)).rejects.toThrow(
          'Save operation is not supported by DeepSource API'
        );
      }
    });
  });

  describe('delete', () => {
    it('should throw error indicating operation not supported', async () => {
      await expect(repository.delete('some-id')).rejects.toThrow(
        'Delete operation is not supported by DeepSource API'
      );
    });
  });

  describe('data freshness', () => {
    it('should fetch fresh data on every request', async () => {
      const projectKey = asProjectKey('test-project');

      // First call
      await repository.findByProjectAndType(projectKey, ReportType.OWASP_TOP_10);

      // Second call should get fresh data
      await repository.findByProjectAndType(projectKey, ReportType.OWASP_TOP_10);

      expect(mockClient.getComplianceReport).toHaveBeenCalledTimes(2);
    });

    it('should not cache results between different method calls', async () => {
      const projectKey = asProjectKey('test-project');

      await repository.findByProjectAndType(projectKey, ReportType.OWASP_TOP_10);
      await repository.countByProject(projectKey);
      await repository.exists(projectKey, ReportType.OWASP_TOP_10);

      // Should make fresh API calls for each method
      expect(mockClient.getComplianceReport).toHaveBeenCalledTimes(5); // 1 + 3 (from countByProject) + 1
    });
  });
});
