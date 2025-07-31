import { DeepSourceClient, ReportType, ReportStatus } from '../deepsource.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { createLogger, Logger } from '../utils/logging/logger.js';
import { IComplianceReportRepository } from '../domain/aggregates/compliance-report/compliance-report.repository.js';
import { RepositoryFactory } from '../infrastructure/factories/repository.factory.js';
import { asProjectKey } from '../types/branded.js';

// Logger for the compliance reports handler
const logger = createLogger('ComplianceReportsHandler');

/**
 * Interface for parameters for getting a compliance report
 * @public
 */
export interface DeepsourceComplianceReportParams {
  /** DeepSource project key to identify the project */
  projectKey: string;
  /** Type of compliance report to fetch */
  reportType: ReportType;
}

/**
 * Extended dependencies interface for compliance report handler
 */
interface ComplianceReportHandlerDeps {
  complianceReportRepository: IComplianceReportRepository;
  logger: Logger;
}

/**
 * Creates a compliance report handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler function
 */
export function createComplianceReportHandlerWithRepo(deps: ComplianceReportHandlerDeps) {
  return async function handleComplianceReport(params: DeepsourceComplianceReportParams) {
    try {
      const { projectKey, reportType } = params;
      const projectKeyBranded = asProjectKey(projectKey);
      deps.logger.info('Fetching compliance report from repository', { projectKey, reportType });

      // Get the compliance report from repository
      const domainReport = await deps.complianceReportRepository.findByProjectAndType(
        projectKeyBranded,
        reportType
      );

      if (!domainReport) {
        throw new Error(`Report of type '${reportType}' not found for project '${projectKey}'`);
      }

      deps.logger.info('Successfully fetched compliance report', {
        projectKey,
        reportType,
        status: domainReport.status,
      });

      const reportData = {
        key: domainReport.projectKey + ':' + domainReport.reportType,
        title: `${domainReport.reportType} Compliance Report`,
        currentValue: domainReport.summary.complianceScore.value,
        status:
          domainReport.status === 'READY'
            ? 'PASSING'
            : domainReport.status === 'ERROR'
              ? 'FAILING'
              : 'NOT_APPLICABLE',
        securityIssueStats: domainReport.categories.map((category) => ({
          key: category.name,
          title: category.name,
          occurrence: {
            critical: category.severity === 'CRITICAL' ? category.nonCompliant.count : 0,
            major: category.severity === 'MAJOR' ? category.nonCompliant.count : 0,
            minor: category.severity === 'INFO' ? category.nonCompliant.count : 0,
            total: category.issueCount.count,
          },
        })),
        trends: domainReport.trend ? [domainReport.trend] : [],
        // Include helpful analysis of the report
        analysis: {
          summary: `This report shows compliance with ${domainReport.reportType} security standards.`,
          status_explanation:
            domainReport.status === 'READY'
              ? 'Your project is currently meeting all required security standards.'
              : domainReport.status === 'ERROR'
                ? 'Your project has security issues that need to be addressed to meet compliance standards.'
                : 'This report is not applicable to your project.',
          critical_issues: domainReport.summary.severityDistribution.critical.count,
          major_issues: domainReport.summary.severityDistribution.major.count,
          minor_issues: domainReport.summary.severityDistribution.info.count,
          total_issues: domainReport.summary.totalIssues.count,
        },
        // Include recommendations based on the report
        recommendations: {
          actions:
            domainReport.status === 'ERROR'
              ? [
                  'Fix critical security issues first',
                  'Use project_issues to view specific issues',
                  'Implement security best practices for your codebase',
                ]
              : ['Continue monitoring security compliance', 'Run regular security scans'],
          resources: [
            reportType === ReportType.OWASP_TOP_10
              ? 'OWASP Top 10: https://owasp.org/www-project-top-ten/'
              : reportType === ReportType.SANS_TOP_25
                ? 'SANS Top 25: https://www.sans.org/top25-software-errors/'
                : reportType === ReportType.MISRA_C
                  ? 'MISRA-C: https://www.misra.org.uk/'
                  : 'Security best practices for your project',
          ],
        },
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(reportData),
          },
        ],
      };
    } catch (error) {
      deps.logger.error('Error in handleComplianceReport', {
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack available',
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deps.logger.debug('Returning error response', { errorMessage });

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: errorMessage,
              details: 'Failed to retrieve compliance report',
            }),
          },
        ],
      };
    }
  };
}

// Keep the old handler for backward compatibility with the base handler pattern
/**
 * Creates a compliance report handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createComplianceReportHandler = createBaseHandlerFactory(
  'compliance_report',
  async (deps: BaseHandlerDeps, { projectKey, reportType }: DeepsourceComplianceReportParams) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);
    deps.logger.info('Fetching compliance report', { projectKey, reportType });

    const report = await client.getComplianceReport(projectKey, reportType);

    if (!report) {
      throw new Error(`Report of type '${reportType}' not found for project '${projectKey}'`);
    }

    deps.logger.info('Successfully fetched compliance report', {
      projectKey,
      reportType,
      status: report.status,
    });

    const reportData = {
      key: report.key,
      title: report.title,
      currentValue: report.currentValue,
      status: report.status,
      securityIssueStats: report.securityIssueStats.map((stat) => ({
        key: stat.key,
        title: stat.title,
        occurrence: {
          critical: stat.occurrence.critical,
          major: stat.occurrence.major,
          minor: stat.occurrence.minor,
          total: stat.occurrence.total,
        },
      })),
      trends: report.trends,
      // Include helpful analysis of the report
      analysis: {
        summary: `This report shows compliance with ${report.title} security standards.`,
        status_explanation:
          report.status === ReportStatus.PASSING
            ? 'Your project is currently meeting all required security standards.'
            : report.status === ReportStatus.FAILING
              ? 'Your project has security issues that need to be addressed to meet compliance standards.'
              : 'This report is not applicable to your project.',
        critical_issues: report.securityIssueStats.reduce(
          (total, stat) => total + (stat.occurrence.critical || 0),
          0
        ),
        major_issues: report.securityIssueStats.reduce(
          (total, stat) => total + (stat.occurrence.major || 0),
          0
        ),
        minor_issues: report.securityIssueStats.reduce(
          (total, stat) => total + (stat.occurrence.minor || 0),
          0
        ),
        total_issues: report.securityIssueStats.reduce(
          (total, stat) => total + (stat.occurrence.total || 0),
          0
        ),
      },
      // Include recommendations based on the report
      recommendations: {
        actions:
          report.status === ReportStatus.FAILING
            ? [
                'Fix critical security issues first',
                'Use project_issues to view specific issues',
                'Implement security best practices for your codebase',
              ]
            : ['Continue monitoring security compliance', 'Run regular security scans'],
        resources: [
          reportType === ReportType.OWASP_TOP_10
            ? 'OWASP Top 10: https://owasp.org/www-project-top-ten/'
            : reportType === ReportType.SANS_TOP_25
              ? 'SANS Top 25: https://www.sans.org/top25-software-errors/'
              : reportType === ReportType.MISRA_C
                ? 'MISRA-C: https://www.misra.org.uk/'
                : 'Security best practices for your project',
        ],
      },
    };

    return wrapInApiResponse(reportData);
  }
);

/**
 * Fetches and returns compliance reports from a DeepSource project using domain aggregates
 * @param params - Parameters for fetching the compliance report, including project key and report type
 * @returns Response containing the compliance report with security issues statistics
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the report type is unsupported or if API call fails
 * @public
 */
export async function handleDeepsourceComplianceReport(params: DeepsourceComplianceReportParams) {
  const baseDeps = createDefaultHandlerDeps({ logger });
  const apiKey = baseDeps.getApiKey();
  const repositoryFactory = new RepositoryFactory({ apiKey });
  const complianceReportRepository = repositoryFactory.createComplianceReportRepository();

  const deps: ComplianceReportHandlerDeps = {
    complianceReportRepository,
    logger,
  };

  const handler = createComplianceReportHandlerWithRepo(deps);
  const result = await handler(params);

  // If the domain handler returned an error response, throw an error for backward compatibility
  if (result.isError) {
    const errorData = JSON.parse(result.content[0].text);
    throw new Error(errorData.error);
  }

  return result;
}
