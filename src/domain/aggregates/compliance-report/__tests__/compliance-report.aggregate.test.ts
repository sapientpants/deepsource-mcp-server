/**
 * @fileoverview Tests for ComplianceReport aggregate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceReport } from '../compliance-report.aggregate.js';
import type {
  CreateComplianceReportParams,
  ComplianceCategory,
  UpdateCategoriesParams,
  UpdateTrendParams,
  ReportTrend,
  ComplianceSummary,
} from '../compliance-report.types.js';
import type { ProjectKey, GraphQLNodeId } from '../../../../types/branded.js';
import { ReportType } from '../../../../types/report-types.js';
import { IssueCount } from '../../../value-objects/issue-count.js';

describe('ComplianceReport Aggregate', () => {
  let validParams: CreateComplianceReportParams;
  let projectKey: ProjectKey;
  let repositoryId: GraphQLNodeId;
  let categories: ComplianceCategory[];

  beforeEach(() => {
    projectKey = 'test-project' as ProjectKey;
    repositoryId = 'repo-456' as GraphQLNodeId;
    categories = [
      {
        name: 'A1: Injection',
        description: 'Injection flaws such as SQL, NoSQL, OS, and LDAP injection',
        compliant: IssueCount.create(45),
        nonCompliant: IssueCount.create(5),
        issueCount: IssueCount.create(50),
        severity: 'CRITICAL',
      },
      {
        name: 'A2: Broken Authentication',
        description: 'Application functions related to authentication and session management',
        compliant: IssueCount.create(30),
        nonCompliant: IssueCount.create(2),
        issueCount: IssueCount.create(32),
        severity: 'MAJOR',
      },
    ];

    validParams = {
      projectKey,
      repositoryId,
      reportType: ReportType.OWASP_TOP_10,
      categories,
    };
  });

  describe('create', () => {
    it('should create compliance report with valid parameters', () => {
      const report = ComplianceReport.create(validParams);

      expect(report.projectKey).toBe(projectKey);
      expect(report.repositoryId).toBe(repositoryId);
      expect(report.reportType).toBe(ReportType.OWASP_TOP_10);
      expect(report.status).toBe('PENDING');
      expect(report.categories).toHaveLength(2);
      expect(report.domainEvents).toHaveLength(1);
      expect(report.domainEvents[0].eventType).toBe('ComplianceReportCreated');
    });

    it('should create composite ID from project key and report type', () => {
      const report = ComplianceReport.create(validParams);

      expect(report.id).toBe(`${projectKey}:${ReportType.OWASP_TOP_10}`);
    });

    it('should calculate summary from categories', () => {
      const report = ComplianceReport.create(validParams);
      const summary = report.summary;

      expect(summary.totalCompliant.count).toBe(75); // 45 + 30
      expect(summary.totalNonCompliant.count).toBe(7); // 5 + 2
      expect(summary.totalIssues.count).toBe(82); // 50 + 32
      expect(summary.complianceScore.value).toBeCloseTo(91.5, 1); // 75/(75+7) * 100
      expect(summary.complianceScore.level).toBe('GOOD');
    });

    it('should calculate severity distribution', () => {
      const report = ComplianceReport.create(validParams);
      const distribution = report.summary.severityDistribution;

      expect(distribution.critical.count).toBe(5); // From A1
      expect(distribution.major.count).toBe(2); // From A2
      expect(distribution.minor.count).toBe(0);
      expect(distribution.info.count).toBe(0);
    });

    it('should create report without categories', () => {
      const params = {
        ...validParams,
        categories: undefined,
      };

      const report = ComplianceReport.create(params);

      expect(report.categories).toHaveLength(0);
      expect(report.summary.totalCompliant.count).toBe(0);
      expect(report.summary.complianceScore.value).toBe(100); // No issues = 100% compliant
    });

    it('should create report with custom status', () => {
      const params = {
        ...validParams,
        status: 'READY' as const,
      };

      const report = ComplianceReport.create(params);

      expect(report.status).toBe('READY');
    });

    it('should create report with trend', () => {
      const trend: ReportTrend = {
        label: 'Previous report',
        value: 85,
        changePercentage: 5,
        direction: 'IMPROVING',
      };

      const params = {
        ...validParams,
        trend,
      };

      const report = ComplianceReport.create(params);

      expect(report.trend).toEqual(trend);
    });

    it('should emit ComplianceReportCreated event with correct payload', () => {
      const report = ComplianceReport.create(validParams);

      const event = report.domainEvents[0];
      expect(event.eventType).toBe('ComplianceReportCreated');
      expect(event.payload).toEqual({
        projectKey,
        reportType: ReportType.OWASP_TOP_10,
        complianceScore: expect.any(Number),
      });
    });

    it('should set generatedAt and lastUpdated timestamps', () => {
      const before = new Date();
      const report = ComplianceReport.create(validParams);
      const after = new Date();

      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(report.lastUpdated).toEqual(report.generatedAt);
    });
  });

  describe('fromPersistence', () => {
    it('should recreate report from persistence without events', () => {
      const summary: ComplianceSummary = {
        totalCompliant: IssueCount.create(75),
        totalNonCompliant: IssueCount.create(7),
        totalIssues: IssueCount.create(82),
        complianceScore: { value: 91.5, level: 'GOOD' },
        severityDistribution: {
          critical: IssueCount.create(5, 'critical'),
          major: IssueCount.create(2, 'major'),
          minor: IssueCount.zero('minor'),
          info: IssueCount.zero('info'),
        },
      };

      const trend: ReportTrend = {
        label: 'Previous report',
        value: 85,
        changePercentage: 6.5,
        direction: 'IMPROVING',
      };

      const persistenceData = {
        id: `${projectKey}:${ReportType.OWASP_TOP_10}`,
        projectKey,
        repositoryId,
        reportType: ReportType.OWASP_TOP_10,
        status: 'READY' as const,
        categories,
        summary,
        trend,
        generatedAt: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-02'),
      };

      const report = ComplianceReport.fromPersistence(persistenceData);

      expect(report.projectKey).toBe(projectKey);
      expect(report.status).toBe('READY');
      expect(report.categories).toEqual(categories);
      expect(report.domainEvents).toHaveLength(0); // No events when loading
      expect(report.generatedAt).toEqual(persistenceData.generatedAt);
      expect(report.lastUpdated).toEqual(persistenceData.lastUpdated);
    });
  });

  describe('status management', () => {
    describe('generate', () => {
      it('should transition from PENDING to GENERATING', () => {
        const report = ComplianceReport.create(validParams);
        report.clearEvents();

        report.generate();

        expect(report.status).toBe('GENERATING');
        expect(report.domainEvents).toHaveLength(2); // ComplianceReportGenerationStarted + AggregateModified
        expect(report.domainEvents[0].eventType).toBe('ComplianceReportGenerationStarted');
      });

      it('should transition from READY to GENERATING for regeneration', () => {
        const params = {
          ...validParams,
          status: 'READY' as const,
        };

        const report = ComplianceReport.create(params);
        report.clearEvents();

        report.generate();

        expect(report.status).toBe('GENERATING');
      });

      it('should throw error when already generating', () => {
        const params = {
          ...validParams,
          status: 'GENERATING' as const,
        };

        const report = ComplianceReport.create(params);

        expect(() => report.generate()).toThrow('Report is already being generated');
      });

      it('should update lastUpdated timestamp', async () => {
        const report = ComplianceReport.create(validParams);
        const originalLastUpdated = report.lastUpdated;

        await new Promise((resolve) => setTimeout(resolve, 10));

        report.generate();

        expect(report.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
      });
    });

    describe('complete', () => {
      it('should transition from GENERATING to READY', () => {
        const params = {
          ...validParams,
          status: 'GENERATING' as const,
        };

        const report = ComplianceReport.create(params);
        report.clearEvents();

        report.complete();

        expect(report.status).toBe('READY');
        expect(report.domainEvents[0].eventType).toBe('ComplianceReportCompleted');
        expect(report.domainEvents[0].payload).toEqual({
          complianceScore: expect.any(Number),
          hasCriticalIssues: true, // We have critical issues in A1
        });
      });

      it('should update generatedAt timestamp', async () => {
        const params = {
          ...validParams,
          status: 'GENERATING' as const,
        };

        const report = ComplianceReport.create(params);
        const originalGeneratedAt = report.generatedAt;

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        report.complete();

        expect(report.generatedAt.getTime()).toBeGreaterThan(originalGeneratedAt.getTime());
        expect(report.lastUpdated).toEqual(report.generatedAt);
      });

      it('should throw error when not in GENERATING status', () => {
        const report = ComplianceReport.create(validParams);

        expect(() => report.complete()).toThrow('Report must be in GENERATING status to complete');
      });
    });

    describe('fail', () => {
      it('should transition from GENERATING to ERROR with reason', () => {
        const params = {
          ...validParams,
          status: 'GENERATING' as const,
        };

        const report = ComplianceReport.create(params);
        report.clearEvents();

        const reason = 'API connection failed';
        report.fail(reason);

        expect(report.status).toBe('ERROR');
        expect(report.domainEvents[0].eventType).toBe('ComplianceReportFailed');
        expect(report.domainEvents[0].payload).toEqual({ reason });
      });

      it('should throw error when not in GENERATING status', () => {
        const report = ComplianceReport.create(validParams);

        expect(() => report.fail('reason')).toThrow('Report must be in GENERATING status to fail');
      });
    });
  });

  describe('category management', () => {
    describe('updateCategories', () => {
      it('should update categories and recalculate summary', () => {
        const report = ComplianceReport.create(validParams);
        report.clearEvents();

        const newCategories: ComplianceCategory[] = [
          {
            name: 'A3: Sensitive Data Exposure',
            compliant: IssueCount.create(100),
            nonCompliant: IssueCount.zero(),
            issueCount: IssueCount.create(100),
            severity: 'MAJOR',
          },
        ];

        const params: UpdateCategoriesParams = { categories: newCategories };
        report.updateCategories(params);

        expect(report.categories).toEqual(newCategories);
        expect(report.summary.totalCompliant.count).toBe(100);
        expect(report.summary.totalNonCompliant.count).toBe(0);
        expect(report.summary.complianceScore.value).toBe(100);
        expect(report.domainEvents[0].eventType).toBe('ComplianceReportCategoriesUpdated');
      });

      it('should throw error for empty categories', () => {
        const report = ComplianceReport.create(validParams);

        expect(() => report.updateCategories({ categories: [] })).toThrow(
          'Report must have at least one category'
        );
      });

      it('should update severity distribution correctly', () => {
        const report = ComplianceReport.create(validParams);

        const newCategories: ComplianceCategory[] = [
          {
            name: 'Minor Issue',
            compliant: IssueCount.create(50),
            nonCompliant: IssueCount.create(10),
            issueCount: IssueCount.create(60),
            severity: 'MINOR',
          },
          {
            name: 'Info Issue',
            compliant: IssueCount.create(80),
            nonCompliant: IssueCount.create(5),
            issueCount: IssueCount.create(85),
            severity: 'INFO',
          },
        ];

        report.updateCategories({ categories: newCategories });

        const distribution = report.summary.severityDistribution;
        expect(distribution.critical.count).toBe(0);
        expect(distribution.major.count).toBe(0);
        expect(distribution.minor.count).toBe(10);
        expect(distribution.info.count).toBe(5);
      });

      it('should update lastUpdated timestamp', async () => {
        const report = ComplianceReport.create(validParams);
        const originalLastUpdated = report.lastUpdated;

        await new Promise((resolve) => setTimeout(resolve, 10));

        report.updateCategories({ categories });

        expect(report.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
      });
    });
  });

  describe('trend management', () => {
    describe('updateTrend', () => {
      it('should update trend information', () => {
        const report = ComplianceReport.create(validParams);
        report.clearEvents();

        const trend: ReportTrend = {
          label: 'Last week',
          value: 92,
          changePercentage: 0.5,
          direction: 'IMPROVING',
        };

        const params: UpdateTrendParams = { trend };
        report.updateTrend(params);

        expect(report.trend).toEqual(trend);
        expect(report.domainEvents[0].eventType).toBe('ComplianceReportTrendUpdated');
        expect(report.domainEvents[0].payload).toEqual({
          trendDirection: 'IMPROVING',
          changePercentage: 0.5,
        });
      });

      it('should update lastUpdated timestamp', async () => {
        const report = ComplianceReport.create(validParams);
        const originalLastUpdated = report.lastUpdated;

        await new Promise((resolve) => setTimeout(resolve, 10));

        const trend: ReportTrend = {
          label: 'Test',
          value: 90,
          changePercentage: -1.5,
          direction: 'DEGRADING',
        };

        report.updateTrend({ trend });

        expect(report.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
      });
    });

    describe('compareWithPrevious', () => {
      it('should compare with previous report', () => {
        const currentReport = ComplianceReport.create(validParams);

        const previousCategories: ComplianceCategory[] = [
          {
            name: 'A1: Injection',
            compliant: IssueCount.create(40),
            nonCompliant: IssueCount.create(10),
            issueCount: IssueCount.create(50),
            severity: 'CRITICAL',
          },
        ];

        const previousReport = ComplianceReport.create({
          ...validParams,
          categories: previousCategories,
        });

        const trend = currentReport.compareWithPrevious(previousReport);

        expect(trend.label).toBe('Compared to previous report');
        expect(trend.value).toBeCloseTo(91.5, 1); // Current score
        expect(trend.changePercentage).toBeCloseTo(11.5, 1); // 91.5 - 80
        expect(trend.direction).toBe('IMPROVING');
      });

      it('should detect degrading trend', () => {
        const currentCategories: ComplianceCategory[] = [
          {
            name: 'A1: Injection',
            compliant: IssueCount.create(30),
            nonCompliant: IssueCount.create(20),
            issueCount: IssueCount.create(50),
            severity: 'CRITICAL',
          },
        ];

        const currentReport = ComplianceReport.create({
          ...validParams,
          categories: currentCategories,
        });

        const previousReport = ComplianceReport.create(validParams);

        const trend = currentReport.compareWithPrevious(previousReport);

        expect(trend.changePercentage).toBeLessThan(0);
        expect(trend.direction).toBe('DEGRADING');
      });

      it('should detect stable trend', () => {
        const currentReport = ComplianceReport.create(validParams);
        const previousReport = ComplianceReport.create(validParams);

        const trend = currentReport.compareWithPrevious(previousReport);

        expect(Math.abs(trend.changePercentage)).toBeLessThan(0.1);
        expect(trend.direction).toBe('STABLE');
      });

      it('should throw error when comparing different report types', () => {
        const currentReport = ComplianceReport.create(validParams);

        const previousReport = ComplianceReport.create({
          ...validParams,
          reportType: ReportType.SANS_TOP_25,
        });

        expect(() => currentReport.compareWithPrevious(previousReport)).toThrow(
          'Cannot compare reports of different types'
        );
      });
    });
  });

  describe('compliance evaluation', () => {
    it('should be compliant with score >= 85%', () => {
      const report = ComplianceReport.create(validParams);

      expect(report.summary.complianceScore.value).toBeGreaterThan(85);
      expect(report.isCompliant).toBe(true);
    });

    it('should not be compliant with score < 85%', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Poor Category',
          compliant: IssueCount.create(10),
          nonCompliant: IssueCount.create(90),
          issueCount: IssueCount.create(100),
          severity: 'CRITICAL',
        },
      ];

      const report = ComplianceReport.create({
        ...validParams,
        categories,
      });

      expect(report.summary.complianceScore.value).toBeLessThan(85);
      expect(report.isCompliant).toBe(false);
    });

    it('should detect critical issues', () => {
      const report = ComplianceReport.create(validParams);

      expect(report.hasCriticalIssues).toBe(true); // A1 has critical issues
    });

    it('should not have critical issues when none exist', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Minor Category',
          compliant: IssueCount.create(50),
          nonCompliant: IssueCount.create(5),
          issueCount: IssueCount.create(55),
          severity: 'MINOR',
        },
      ];

      const report = ComplianceReport.create({
        ...validParams,
        categories,
      });

      expect(report.hasCriticalIssues).toBe(false);
    });
  });

  describe('compliance level calculation', () => {
    const testCases = [
      { compliant: 100, nonCompliant: 0, level: 'EXCELLENT' },
      { compliant: 95, nonCompliant: 5, level: 'EXCELLENT' },
      { compliant: 949, nonCompliant: 51, level: 'GOOD' }, // 94.9%
      { compliant: 85, nonCompliant: 15, level: 'GOOD' },
      { compliant: 849, nonCompliant: 151, level: 'FAIR' }, // 84.9%
      { compliant: 70, nonCompliant: 30, level: 'FAIR' },
      { compliant: 699, nonCompliant: 301, level: 'POOR' }, // 69.9%
      { compliant: 0, nonCompliant: 100, level: 'POOR' },
    ];

    testCases.forEach(({ compliant, nonCompliant, level }) => {
      const score =
        compliant + nonCompliant > 0
          ? Math.round((compliant / (compliant + nonCompliant)) * 1000) / 10
          : 0;

      it(`should calculate ${level} for score ${score}`, () => {
        const categories: ComplianceCategory[] = [
          {
            name: 'Test Category',
            compliant: IssueCount.create(compliant),
            nonCompliant: IssueCount.create(nonCompliant),
            issueCount: IssueCount.create(compliant + nonCompliant),
            severity: 'MAJOR',
          },
        ];

        const report = ComplianceReport.create({
          ...validParams,
          categories,
        });

        expect(report.summary.complianceScore.level).toBe(level);
      });
    });
  });

  describe('getters', () => {
    it('should return immutable categories', () => {
      const report = ComplianceReport.create(validParams);
      const cats = report.categories;

      // Verify it's a copy
      expect(cats).not.toBe(categories);
      expect(cats).toEqual(categories);
    });

    it('should return immutable summary', () => {
      const report = ComplianceReport.create(validParams);
      const summary = report.summary;

      // Verify nested objects are copies
      const originalCritical = summary.severityDistribution.critical;
      summary.severityDistribution.critical = IssueCount.create(999);
      expect(report.summary.severityDistribution.critical).toEqual(originalCritical);
    });

    it('should return immutable trend', () => {
      const trend: ReportTrend = {
        label: 'Test',
        value: 85,
        changePercentage: 5,
        direction: 'IMPROVING',
      };

      const report = ComplianceReport.create({
        ...validParams,
        trend,
      });

      const retrievedTrend = report.trend;
      expect(retrievedTrend).not.toBe(trend);
      expect(retrievedTrend).toEqual(trend);
    });

    it('should return null trend when not set', () => {
      const report = ComplianceReport.create(validParams);

      expect(report.trend).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('should convert to persistence format', () => {
      const trend: ReportTrend = {
        label: 'Previous',
        value: 88,
        changePercentage: 3.5,
        direction: 'IMPROVING',
      };

      const report = ComplianceReport.create({
        ...validParams,
        trend,
      });

      const persistence = report.toPersistence();

      expect(persistence).toEqual({
        id: `${projectKey}:${ReportType.OWASP_TOP_10}`,
        projectKey,
        repositoryId,
        reportType: ReportType.OWASP_TOP_10,
        status: 'PENDING',
        categories: expect.any(Array),
        summary: expect.objectContaining({
          complianceScore: expect.objectContaining({ value: expect.any(Number) }),
        }),
        trend,
        generatedAt: expect.any(Date),
        lastUpdated: expect.any(Date),
      });
    });

    it('should preserve all data through persistence round-trip', () => {
      const report = ComplianceReport.create(validParams);

      report.generate();
      report.complete();
      report.updateTrend({
        trend: {
          label: 'Test',
          value: 92,
          changePercentage: 0.5,
          direction: 'STABLE',
        },
      });

      const persistence = report.toPersistence();
      const reconstructed = ComplianceReport.fromPersistence(persistence);

      expect(reconstructed.projectKey).toBe(report.projectKey);
      expect(reconstructed.status).toBe(report.status);
      expect(reconstructed.categories).toEqual(report.categories);
      expect(reconstructed.summary).toEqual(report.summary);
      expect(reconstructed.trend).toEqual(report.trend);
      expect(reconstructed.generatedAt).toEqual(report.generatedAt);
      expect(reconstructed.lastUpdated).toEqual(report.lastUpdated);
    });
  });

  describe('domain events', () => {
    it('should accumulate multiple events', () => {
      const report = ComplianceReport.create(validParams);
      report.clearEvents();

      report.generate();
      report.complete();
      report.updateTrend({
        trend: {
          label: 'New trend',
          value: 93,
          changePercentage: 1.5,
          direction: 'IMPROVING',
        },
      });

      // Each operation emits 2 events (operation + AggregateModified)
      expect(report.domainEvents).toHaveLength(6);

      const eventTypes = report.domainEvents.map((e) => e.eventType);
      expect(eventTypes).toEqual([
        'ComplianceReportGenerationStarted',
        'AggregateModified',
        'ComplianceReportCompleted',
        'AggregateModified',
        'ComplianceReportTrendUpdated',
        'AggregateModified',
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle all report types', () => {
      const reportTypes = [ReportType.OWASP_TOP_10, ReportType.SANS_TOP_25, ReportType.MISRA_C];

      reportTypes.forEach((reportType) => {
        const params = {
          ...validParams,
          reportType,
        };

        const report = ComplianceReport.create(params);
        expect(report.reportType).toBe(reportType);
        expect(report.id).toBe(`${projectKey}:${reportType}`);
      });
    });

    it('should handle empty categories with 100% compliance', () => {
      const report = ComplianceReport.create({
        ...validParams,
        categories: [],
      });

      expect(report.summary.complianceScore.value).toBe(100);
      expect(report.summary.complianceScore.level).toBe('EXCELLENT');
      expect(report.isCompliant).toBe(true);
    });

    it('should handle all severity levels', () => {
      const severities = ['CRITICAL', 'MAJOR', 'MINOR', 'INFO'] as const;

      const categories = severities.map((severity, index) => ({
        name: `Category ${index}`,
        compliant: IssueCount.create(10),
        nonCompliant: IssueCount.create(5),
        issueCount: IssueCount.create(15),
        severity,
      }));

      const report = ComplianceReport.create({
        ...validParams,
        categories,
      });

      const distribution = report.summary.severityDistribution;
      expect(distribution.critical.count).toBe(5);
      expect(distribution.major.count).toBe(5);
      expect(distribution.minor.count).toBe(5);
      expect(distribution.info.count).toBe(5);
    });

    it('should round compliance score to 1 decimal place', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Test',
          compliant: IssueCount.create(333),
          nonCompliant: IssueCount.create(100),
          issueCount: IssueCount.create(433),
          severity: 'MAJOR',
        },
      ];

      const report = ComplianceReport.create({
        ...validParams,
        categories,
      });

      // 333/(333+100) * 100 = 76.9053... should round to 76.9
      expect(report.summary.complianceScore.value).toBe(76.9);
    });
  });
});
