/**
 * @vitest-environment node
 */

import { vi } from 'vitest';
import { asProjectKey } from '../../types/branded';
import type { IComplianceReportRepository } from '../../domain/aggregates/compliance-report/compliance-report.repository';
import type { ComplianceReport } from '../../domain/aggregates/compliance-report/compliance-report.aggregate';
import type { Logger } from '../../utils/logging/logger';
import { ReportType } from '../../deepsource';

// Mock modules before importing the implementation
vi.mock('../../utils/logging/logger', () => {
  const mockLogger = {
    debug: globalThis.vi.fn(),
    info: globalThis.vi.fn(),
    warn: globalThis.vi.fn(),
    error: globalThis.vi.fn(),
  };
  return {
    createLogger: globalThis.vi.fn(() => mockLogger),
    __mockLogger: mockLogger, // Export for test access
  };
});

// Mock the repository and factory
vi.mock('../../infrastructure/factories/repository.factory', () => {
  const mockFindByProjectAndType = globalThis.vi.fn();
  const mockComplianceReportRepository = {
    findByProjectAndType: mockFindByProjectAndType,
  } as unknown as IComplianceReportRepository;

  const mockCreateComplianceReportRepository = globalThis.vi.fn(
    () => mockComplianceReportRepository
  );
  const mockRepositoryFactory = globalThis.vi.fn(() => ({
    createComplianceReportRepository: mockCreateComplianceReportRepository,
  }));

  return {
    RepositoryFactory: mockRepositoryFactory,
    // Export mocks for access in tests
    __mockFindByProjectAndType: mockFindByProjectAndType,
    __mockComplianceReportRepository: mockComplianceReportRepository,
    __mockCreateComplianceReportRepository: mockCreateComplianceReportRepository,
    __mockRepositoryFactory: mockRepositoryFactory,
  };
});

// Import the modules under test AFTER mocking
const { handleDeepsourceComplianceReport, createComplianceReportHandlerWithRepo } = await import(
  '../../handlers/compliance-reports'
);

// Get mocked functions
const mockRepositoryFactoryModule = await import(
  '../../infrastructure/factories/repository.factory'
);
const mockFindByProjectAndType = (mockRepositoryFactoryModule as any).__mockFindByProjectAndType;
const mockComplianceReportRepository = (mockRepositoryFactoryModule as any) // skipcq: JS-0323
  .__mockComplianceReportRepository;
const mockCreateComplianceReportRepository = (mockRepositoryFactoryModule as any) // skipcq: JS-0323
  .__mockCreateComplianceReportRepository;
const mockRepositoryFactory = (mockRepositoryFactoryModule as any).__mockRepositoryFactory;

// Get mocked logger
const mockLoggerModule = await import('../../utils/logging/logger');
const mockLogger = (mockLoggerModule as any).__mockLogger;

describe('Compliance Reports Handler', () => {
  // Environment backup
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup environment
    originalEnv = { ...process.env };
    process.env.DEEPSOURCE_API_KEY = 'test-api-key';

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('createComplianceReportHandlerWithRepo', () => {
    it('should create a handler that uses injected dependencies', async () => {
      // Mock domain compliance report
      const projectKey = asProjectKey('test-project');
      const mockReport = {
        projectKey,
        reportType: ReportType.OWASP_TOP_10,
        status: 'READY' as const,
        categories: [
          {
            name: 'A01:2021 - Broken Access Control',
            nonCompliant: { count: 1 },
            issueCount: { count: 2 },
            severity: 'MAJOR' as const,
          },
          {
            name: 'A02:2021 - Cryptographic Failures',
            nonCompliant: { count: 0 },
            issueCount: { count: 0 },
            severity: 'CRITICAL' as const,
          },
        ],
        summary: {
          complianceScore: { value: 85 },
          severityDistribution: {
            critical: { count: 0 },
            major: { count: 1 },
            info: { count: 1 },
          },
          totalIssues: { count: 2 },
        },
        trend: {
          label: 'Last 30 days',
          value: 85,
          changePercentage: 5,
          direction: 'IMPROVING' as const,
        },
        generatedAt: new Date(),
      } as ComplianceReport;

      // Set up the mock to return the report
      mockFindByProjectAndType.mockResolvedValue(mockReport);

      const handler = createComplianceReportHandlerWithRepo({
        complianceReportRepository: mockComplianceReportRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        reportType: ReportType.OWASP_TOP_10,
      });

      // Verify repository was used
      expect(mockFindByProjectAndType).toHaveBeenCalledWith(projectKey, ReportType.OWASP_TOP_10);

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.title).toBe('OWASP_TOP_10 Compliance Report');
      expect(parsedContent.status).toBe('PASSING');
      expect(parsedContent.currentValue).toBe(85);
      expect(parsedContent.securityIssueStats).toHaveLength(2);
      expect(parsedContent.securityIssueStats[0].occurrence.total).toBe(2);
      expect(parsedContent.analysis.total_issues).toBe(2);
      expect(parsedContent.recommendations.actions).toContain(
        'Continue monitoring security compliance'
      );
    });

    it('should handle FAILING status with appropriate recommendations', async () => {
      // Mock domain compliance report with failing status
      const projectKey = asProjectKey('test-project');
      const mockReport = {
        projectKey,
        reportType: ReportType.SANS_TOP_25,
        status: 'ERROR' as const,
        categories: [
          {
            name: 'CWE-79 - Cross-site Scripting',
            nonCompliant: { count: 5 },
            issueCount: { count: 5 },
            severity: 'CRITICAL' as const,
          },
        ],
        summary: {
          complianceScore: { value: 45 },
          severityDistribution: {
            critical: { count: 2 },
            major: { count: 2 },
            info: { count: 1 },
          },
          totalIssues: { count: 5 },
        },
        trend: null,
        generatedAt: new Date(),
      } as ComplianceReport;

      // Set up the mock to return the report
      mockFindByProjectAndType.mockResolvedValue(mockReport);

      const handler = createComplianceReportHandlerWithRepo({
        complianceReportRepository: mockComplianceReportRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        reportType: ReportType.SANS_TOP_25,
      });

      // Verify the response
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.status).toBe('FAILING');
      expect(parsedContent.analysis.critical_issues).toBe(2);
      expect(parsedContent.analysis.major_issues).toBe(2);
      expect(parsedContent.analysis.minor_issues).toBe(1);
      expect(parsedContent.recommendations.actions).toContain('Fix critical security issues first');
      expect(parsedContent.recommendations.resources[0]).toContain('SANS Top 25');
    });

    it('should handle missing report', async () => {
      // Set up the mock to return null (report not found)
      mockFindByProjectAndType.mockResolvedValue(null);

      const handler = createComplianceReportHandlerWithRepo({
        complianceReportRepository: mockComplianceReportRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        reportType: ReportType.MISRA_C,
      });

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain("Report of type 'MISRA_C' not found");
      expect(parsedContent.details).toBe('Failed to retrieve compliance report');
    });

    it('should handle errors using injected logger', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProjectAndType.mockRejectedValue(testError);

      const handler = createComplianceReportHandlerWithRepo({
        complianceReportRepository: mockComplianceReportRepository,
        logger: mockLogger as unknown as Logger,
      });

      // Call the handler
      const result = await handler({
        projectKey: 'test-project',
        reportType: ReportType.OWASP_TOP_10,
      });

      // Verify error was logged using injected logger
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in handleComplianceReport',
        expect.any(Object)
      );

      // Verify error response
      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toEqual({
        error: 'Repository connection failed',
        details: 'Failed to retrieve compliance report',
      });
    });
  });

  describe('handleDeepsourceComplianceReport', () => {
    it('should throw an error if DEEPSOURCE_API_KEY is not set', async () => {
      // Unset API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: 'test-project',
          reportType: ReportType.OWASP_TOP_10,
        })
      ).rejects.toThrow('Configuration error: DeepSource API key is required but not configured');
    });

    it('should return compliance report successfully', async () => {
      // Mock domain compliance report
      const projectKey = asProjectKey('test-project');
      const mockReport = {
        projectKey,
        reportType: ReportType.OWASP_TOP_10,
        status: 'READY' as const,
        categories: [
          {
            name: 'A01:2021 - Broken Access Control',
            nonCompliant: { count: 0 },
            issueCount: { count: 0 },
            severity: 'CRITICAL' as const,
          },
        ],
        summary: {
          complianceScore: { value: 92 },
          severityDistribution: {
            critical: { count: 0 },
            major: { count: 0 },
            info: { count: 0 },
          },
          totalIssues: { count: 0 },
        },
        trend: null,
        generatedAt: new Date(),
      } as ComplianceReport;

      // Set up the mock to return the report
      mockFindByProjectAndType.mockResolvedValue(mockReport);

      // Call the handler
      const result = await handleDeepsourceComplianceReport({
        projectKey: 'test-project',
        reportType: ReportType.OWASP_TOP_10,
      });

      // Verify factory was created with the API key
      expect(mockRepositoryFactory).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

      // Verify createComplianceReportRepository was called
      expect(mockCreateComplianceReportRepository).toHaveBeenCalled();

      // Verify findByProjectAndType was called
      expect(mockFindByProjectAndType).toHaveBeenCalledWith(projectKey, ReportType.OWASP_TOP_10);

      // Verify logging behavior - check that key operations were logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching compliance report from repository',
        expect.any(Object)
      );

      // Verify the response structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Parse and verify the content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.title).toBe('OWASP_TOP_10 Compliance Report');
      expect(parsedContent.status).toBe('PASSING');
      expect(parsedContent.currentValue).toBe(92);
    });

    it('should throw error when repository fails', async () => {
      // Set up the mock to throw an error
      const testError = new Error('Repository connection failed');
      mockFindByProjectAndType.mockRejectedValue(testError);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: 'test-project',
          reportType: ReportType.OWASP_TOP_10,
        })
      ).rejects.toThrow('Repository connection failed');
    });

    it('should throw error when report not found', async () => {
      // Set up the mock to return null
      mockFindByProjectAndType.mockResolvedValue(null);

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: 'test-project',
          reportType: ReportType.MISRA_C,
        })
      ).rejects.toThrow("Report of type 'MISRA_C' not found for project 'test-project'");
    });

    it('should handle non-Error type exceptions', async () => {
      // Set up the mock to throw a non-Error value
      mockFindByProjectAndType.mockRejectedValue('Just a string error');

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: 'test-project',
          reportType: ReportType.OWASP_TOP_10,
        })
      ).rejects.toThrow('Unknown error');
    });
  });
});
