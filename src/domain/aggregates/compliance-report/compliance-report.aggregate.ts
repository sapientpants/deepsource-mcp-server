/**
 * @fileoverview ComplianceReport aggregate root
 *
 * This module defines the ComplianceReport aggregate which represents security
 * and code quality compliance reports for a project.
 */

import { AggregateRoot } from '../../shared/aggregate-root.js';
import { ProjectKey, GraphQLNodeId } from '../../../types/branded.js';
import { ReportType } from '../../../types/report-types.js';
import { IssueCount } from '../../value-objects/issue-count.js';
import {
  ComplianceReportId,
  ComplianceReportStatus,
  ComplianceCategory,
  ComplianceSummary,
  ComplianceScore,
  SeverityDistribution,
  ReportTrend,
  CreateComplianceReportParams,
  UpdateCategoriesParams,
  UpdateTrendParams,
} from './compliance-report.types.js';

/**
 * ComplianceReport aggregate root
 *
 * Represents compliance reports (OWASP, SANS, MISRA-C) for a project.
 * Tracks compliance categories, issues, and trends over time.
 *
 * @example
 * ```typescript
 * const report = ComplianceReport.create({
 *   projectKey: asProjectKey('my-project'),
 *   repositoryId: asGraphQLNodeId('repo123'),
 *   reportType: ReportType.OWASP_TOP_10,
 *   categories: [
 *     {
 *       name: 'A1: Injection',
 *       compliant: IssueCount.create(45),
 *       nonCompliant: IssueCount.create(5),
 *       issueCount: IssueCount.create(50),
 *       severity: 'CRITICAL'
 *     }
 *   ]
 * });
 *
 * console.log(report.summary.complianceScore.value); // 90
 * console.log(report.isCompliant); // true
 * ```
 */
export class ComplianceReport extends AggregateRoot<string> {
  private _projectKey: ProjectKey;
  private _repositoryId: GraphQLNodeId;
  private _reportType: ReportType;
  private _status: ComplianceReportStatus;
  private _categories: ComplianceCategory[];
  private _summary: ComplianceSummary;
  private _trend: ReportTrend | null;
  private _generatedAt: Date;
  private _lastUpdated: Date;

  private constructor(
    id: string,
    projectKey: ProjectKey,
    repositoryId: GraphQLNodeId,
    reportType: ReportType,
    status: ComplianceReportStatus,
    categories: ComplianceCategory[],
    summary: ComplianceSummary,
    trend: ReportTrend | null,
    generatedAt: Date,
    lastUpdated: Date
  ) {
    super(id);
    this._projectKey = projectKey;
    this._repositoryId = repositoryId;
    this._reportType = reportType;
    this._status = status;
    this._categories = categories;
    this._summary = summary;
    this._trend = trend;
    this._generatedAt = generatedAt;
    this._lastUpdated = lastUpdated;
  }

  /**
   * Creates a new ComplianceReport aggregate
   *
   * @param params - Creation parameters
   * @returns A new ComplianceReport instance
   */
  static create(params: CreateComplianceReportParams): ComplianceReport {
    const { projectKey, repositoryId, reportType, status, categories, trend } = params;

    // Create composite ID
    const id = ComplianceReport.createId({ projectKey, reportType });

    const now = new Date();
    const initialCategories = categories || [];
    const summary = ComplianceReport.calculateSummary(initialCategories);

    const report = new ComplianceReport(
      id,
      projectKey,
      repositoryId,
      reportType,
      status || 'PENDING',
      initialCategories,
      summary,
      trend || null,
      now,
      now
    );

    report.addDomainEvent({
      aggregateId: id,
      eventType: 'ComplianceReportCreated',
      occurredAt: now,
      payload: {
        projectKey,
        reportType,
        complianceScore: summary.complianceScore.value,
      },
    });

    return report;
  }

  /**
   * Creates a composite ID for the aggregate
   */
  private static createId(id: ComplianceReportId): string {
    return `${id.projectKey}:${id.reportType}`;
  }

  /**
   * Calculates summary statistics from categories
   */
  private static calculateSummary(categories: ComplianceCategory[]): ComplianceSummary {
    let totalCompliant = IssueCount.zero();
    let totalNonCompliant = IssueCount.zero();
    let totalIssues = IssueCount.zero();

    const severityDistribution: SeverityDistribution = {
      critical: IssueCount.zero('critical'),
      major: IssueCount.zero('major'),
      minor: IssueCount.zero('minor'),
      info: IssueCount.zero('info'),
    };

    for (const category of categories) {
      totalCompliant = totalCompliant.add(category.compliant);
      totalNonCompliant = totalNonCompliant.add(category.nonCompliant);
      totalIssues = totalIssues.add(category.issueCount);

      // Update severity distribution
      switch (category.severity) {
        case 'CRITICAL':
          severityDistribution.critical = severityDistribution.critical.add(category.nonCompliant);
          break;
        case 'MAJOR':
          severityDistribution.major = severityDistribution.major.add(category.nonCompliant);
          break;
        case 'MINOR':
          severityDistribution.minor = severityDistribution.minor.add(category.nonCompliant);
          break;
        case 'INFO':
          severityDistribution.info = severityDistribution.info.add(category.nonCompliant);
          break;
      }
    }

    // Calculate compliance score
    const total = totalCompliant.count + totalNonCompliant.count;
    const scoreValue = total > 0 ? (totalCompliant.count / total) * 100 : 100;

    const complianceScore: ComplianceScore = {
      value: Math.round(scoreValue * 10) / 10, // Round to 1 decimal
      level: ComplianceReport.getComplianceLevel(scoreValue),
    };

    return {
      totalCompliant,
      totalNonCompliant,
      totalIssues,
      complianceScore,
      severityDistribution,
    };
  }

  /**
   * Determines compliance level based on score
   */
  private static getComplianceLevel(score: number): ComplianceScore['level'] {
    if (score >= 95) return 'EXCELLENT';
    if (score >= 85) return 'GOOD';
    if (score >= 70) return 'FAIR';
    return 'POOR';
  }

  /**
   * Gets the project key
   */
  get projectKey(): ProjectKey {
    return this._projectKey;
  }

  /**
   * Gets the repository ID
   */
  get repositoryId(): GraphQLNodeId {
    return this._repositoryId;
  }

  /**
   * Gets the report type
   */
  get reportType(): ReportType {
    return this._reportType;
  }

  /**
   * Gets the report status
   */
  get status(): ComplianceReportStatus {
    return this._status;
  }

  /**
   * Gets the compliance categories
   */
  get categories(): ReadonlyArray<ComplianceCategory> {
    return [...this._categories];
  }

  /**
   * Gets the summary statistics
   */
  get summary(): Readonly<ComplianceSummary> {
    return {
      ...this._summary,
      severityDistribution: { ...this._summary.severityDistribution },
    };
  }

  /**
   * Gets the trend information
   */
  get trend(): Readonly<ReportTrend> | null {
    return this._trend ? { ...this._trend } : null;
  }

  /**
   * Gets the generation timestamp
   */
  get generatedAt(): Date {
    return this._generatedAt;
  }

  /**
   * Gets the last update timestamp
   */
  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  /**
   * Checks if the report meets compliance standards
   */
  get isCompliant(): boolean {
    return this._summary.complianceScore.value >= 85; // 85% is the default threshold
  }

  /**
   * Checks if the report has critical issues
   */
  get hasCriticalIssues(): boolean {
    return this._summary.severityDistribution.critical.isPositive;
  }

  /**
   * Generates/regenerates the report
   */
  generate(): void {
    if (this._status === 'GENERATING') {
      throw new Error('Report is already being generated');
    }

    this._status = 'GENERATING';
    this._lastUpdated = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ComplianceReportGenerationStarted',
      occurredAt: this._lastUpdated,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Completes report generation
   */
  complete(): void {
    if (this._status !== 'GENERATING') {
      throw new Error('Report must be in GENERATING status to complete');
    }

    this._status = 'READY';
    this._generatedAt = new Date();
    this._lastUpdated = this._generatedAt;

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ComplianceReportCompleted',
      occurredAt: this._lastUpdated,
      payload: {
        complianceScore: this._summary.complianceScore.value,
        hasCriticalIssues: this.hasCriticalIssues,
      },
    });

    this.markAsModified();
  }

  /**
   * Fails report generation
   *
   * @param reason - The reason for failure
   */
  fail(reason: string): void {
    if (this._status !== 'GENERATING') {
      throw new Error('Report must be in GENERATING status to fail');
    }

    this._status = 'ERROR';
    this._lastUpdated = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ComplianceReportFailed',
      occurredAt: this._lastUpdated,
      payload: { reason },
    });

    this.markAsModified();
  }

  /**
   * Updates the report categories
   *
   * @param params - Category update parameters
   */
  updateCategories(params: UpdateCategoriesParams): void {
    const { categories } = params;

    if (categories.length === 0) {
      throw new Error('Report must have at least one category');
    }

    this._categories = categories;
    this._summary = ComplianceReport.calculateSummary(categories);
    this._lastUpdated = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ComplianceReportCategoriesUpdated',
      occurredAt: this._lastUpdated,
      payload: {
        categoryCount: categories.length,
        complianceScore: this._summary.complianceScore.value,
      },
    });

    this.markAsModified();
  }

  /**
   * Updates the report trend
   *
   * @param params - Trend update parameters
   */
  updateTrend(params: UpdateTrendParams): void {
    const { trend } = params;

    this._trend = trend;
    this._lastUpdated = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'ComplianceReportTrendUpdated',
      occurredAt: this._lastUpdated,
      payload: {
        trendDirection: trend.direction,
        changePercentage: trend.changePercentage,
      },
    });

    this.markAsModified();
  }

  /**
   * Compares this report with a previous report
   *
   * @param previous - The previous report to compare with
   * @returns Trend information
   */
  compareWithPrevious(previous: ComplianceReport): ReportTrend {
    if (previous._reportType !== this._reportType) {
      throw new Error('Cannot compare reports of different types');
    }

    const currentScore = this._summary.complianceScore.value;
    const previousScore = previous._summary.complianceScore.value;
    const changePercentage = currentScore - previousScore;

    let direction: ReportTrend['direction'];
    if (Math.abs(changePercentage) < 0.1) {
      direction = 'STABLE';
    } else if (changePercentage > 0) {
      direction = 'IMPROVING';
    } else {
      direction = 'DEGRADING';
    }

    return {
      label: `Compared to previous report`,
      value: currentScore,
      changePercentage,
      direction,
    };
  }

  /**
   * Reconstructs ComplianceReport from persisted data
   *
   * @param data - Persisted report data
   * @returns A reconstructed ComplianceReport instance
   */
  static fromPersistence(data: {
    id: string;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    reportType: ReportType;
    status: ComplianceReportStatus;
    categories: ComplianceCategory[];
    summary: ComplianceSummary;
    trend: ReportTrend | null;
    generatedAt: Date;
    lastUpdated: Date;
  }): ComplianceReport {
    return new ComplianceReport(
      data.id,
      data.projectKey,
      data.repositoryId,
      data.reportType,
      data.status,
      data.categories,
      data.summary,
      data.trend,
      data.generatedAt,
      data.lastUpdated
    );
  }

  /**
   * Converts the report to a persistence-friendly format
   */
  toPersistence(): {
    id: string;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    reportType: ReportType;
    status: ComplianceReportStatus;
    categories: ComplianceCategory[];
    summary: ComplianceSummary;
    trend: ReportTrend | null;
    generatedAt: Date;
    lastUpdated: Date;
  } {
    return {
      id: this._id,
      projectKey: this._projectKey,
      repositoryId: this._repositoryId,
      reportType: this._reportType,
      status: this._status,
      categories: [...this._categories],
      summary: this.summary,
      trend: this._trend,
      generatedAt: this._generatedAt,
      lastUpdated: this._lastUpdated,
    };
  }
}
