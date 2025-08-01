/**
 * @fileoverview ComplianceReport mapper
 *
 * Maps between DeepSource API models and domain ComplianceReport aggregates.
 */

import { ComplianceReport } from '../../domain/aggregates/compliance-report/compliance-report.aggregate.js';
import { ComplianceReport as ApiComplianceReport } from '../../deepsource.js';
import {
  CreateComplianceReportParams,
  ComplianceCategory,
  ComplianceReportStatus,
} from '../../domain/aggregates/compliance-report/compliance-report.types.js';
import { asProjectKey, asGraphQLNodeId } from '../../types/branded.js';
import { IssueCount } from '../../domain/value-objects/issue-count.js';
import { ReportType } from '../../types/report-types.js';

/**
 * Maps the highest severity from occurrence distribution
 *
 * @param occurrence - The severity distribution
 * @returns The highest severity present
 */
function mapHighestSeverity(
  occurrence: ApiComplianceReport['securityIssueStats'][0]['occurrence']
): 'CRITICAL' | 'MAJOR' | 'MINOR' {
  if (occurrence.critical > 0) return 'CRITICAL';
  if (occurrence.major > 0) return 'MAJOR';
  return 'MINOR';
}

/**
 * Maps the API report status to domain status
 *
 * @param apiStatus - The API status
 * @returns The domain report status
 */
function mapReportStatus(apiStatus?: string): ComplianceReportStatus {
  const statusMap: Record<string, ComplianceReportStatus> = {
    PASSING: 'PASSING',
    FAILING: 'FAILING',
    READY: 'PASSING', // READY means the report is generated and passing
    NOOP: 'NOT_APPLICABLE',
  };

  return statusMap[apiStatus || ''] || 'UNKNOWN';
}
/**
 * Maps a DeepSource API compliance report to domain ComplianceReport aggregate
 *
 * @param apiReport - The API compliance report model
 * @param projectKey - The project key
 * @param repositoryId - The repository GraphQL ID
 * @returns The domain ComplianceReport aggregate
 */
export function mapComplianceReportToDomain(
  apiReport: ApiComplianceReport,
  projectKey: string,
  repositoryId: string
): ComplianceReport {
    const categories: ComplianceCategory[] = apiReport.securityIssueStats.map((stat) => {
      // API provides total directly, but we can also calculate it for verification
      const totalIssues =
        stat.occurrence.total ||
        stat.occurrence.critical + stat.occurrence.major + stat.occurrence.minor;

      // Simple approach: treat all detected issues as non-compliant
      // In a real implementation, this would depend on business rules about what constitutes compliance
      return {
        name: stat.title,
        description: `Security category: ${stat.key}`,
        compliant: IssueCount.create(0), // API doesn't provide compliant count directly
        nonCompliant: IssueCount.create(totalIssues),
        issueCount: IssueCount.create(totalIssues),
        severity: mapHighestSeverity(stat.occurrence),
      };
    });

    const params: CreateComplianceReportParams = {
      projectKey: asProjectKey(projectKey),
      repositoryId: asGraphQLNodeId(repositoryId),
      reportType: apiReport.key,
      status: mapReportStatus(apiReport.status),
      categories,
    };

    return ComplianceReport.create(params);
  }

/**
 * Maps a domain ComplianceReport aggregate to persistence format
 *
 * @param report - The domain ComplianceReport aggregate
 * @returns The persistence model
 */
export function mapComplianceReportToPersistence(report: ComplianceReport): {
  id: string;
  projectKey: string;
  repositoryId: string;
  reportType: ReportType;
  status: ComplianceReportStatus;
  categories: ComplianceCategory[];
  generatedAt: Date;
  lastUpdated: Date;
} {
  const persistence = report.toPersistence();
  return {
    ...persistence,
    projectKey: persistence.projectKey as string,
    repositoryId: persistence.repositoryId as string,
  };
}


/**
 * Creates a category from API security issue stat
 *
 * @param stat - The API security issue statistic
 * @param reportType - The report type for context
 * @returns A compliance category
 */
export function createCategoryFromStat(
  stat: {
    key: string;
    title: string;
    occurrence: { critical: number; major: number; minor: number; total: number };
  },
  reportType: ReportType
): ComplianceCategory {
  // API provides total directly, but we can also calculate it for verification
  const totalIssues =
    stat.occurrence.total ||
    stat.occurrence.critical + stat.occurrence.major + stat.occurrence.minor;

  return {
    name: stat.title,
    description: `${reportType} category: ${stat.key}`,
    compliant: IssueCount.create(0), // We don't have compliant count from API
    nonCompliant: IssueCount.create(totalIssues),
    issueCount: IssueCount.create(totalIssues),
    severity: mapHighestSeverity(stat.occurrence),
  };
}

/**
 * Estimates compliance score based on issue counts
 * This is a simplified calculation since the API doesn't provide the exact score
 *
 * @param categories - The compliance categories
 * @returns Estimated compliance score (0-100)
 */
export function estimateComplianceScore(categories: ComplianceCategory[]): number {
  if (categories.length === 0) return 100;

  const totalIssues = categories.reduce((sum, cat) => sum + cat.issueCount.count, 0);
  const criticalIssues = categories.filter((cat) => cat.severity === 'CRITICAL').length;
  const majorIssues = categories.filter((cat) => cat.severity === 'MAJOR').length;

  // Simple scoring: penalize critical and major issues more heavily
  const penalty = criticalIssues * 20 + majorIssues * 10 + totalIssues * 2;
  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Maps multiple API compliance reports to domain aggregates
 *
 * @param apiReports - Array of API compliance reports
 * @param projectKey - The project key
 * @param repositoryId - The repository GraphQL ID
 * @returns Array of domain ComplianceReport aggregates
 */
export function mapComplianceReportsFromList(
  apiReports: ApiComplianceReport[],
  projectKey: string,
  repositoryId: string
): ComplianceReport[] {
  return apiReports.map((report) => mapComplianceReportToDomain(report, projectKey, repositoryId));
}

// For backward compatibility, export a namespace with the old static methods
export const ComplianceReportMapper = {
  toDomain: mapComplianceReportToDomain,
  mapStatus: mapReportStatus,
  mapHighestSeverity,
  toPersistence: mapComplianceReportToPersistence,
  toDomainFromList: mapComplianceReportsFromList,
  createCategoryFromStat,
  estimateComplianceScore,
};
