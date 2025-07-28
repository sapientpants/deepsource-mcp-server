import { DeepSourceClient, ReportType, ReportStatus } from '../deepsource.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';
import { createLogger } from '../utils/logging/logger.js';

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
 * Fetches and returns compliance reports from a DeepSource project
 * @param params - Parameters for fetching the compliance report, including project key and report type
 * @returns Response containing the compliance report with security issues statistics
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the report type is unsupported
 * @public
 */
export async function handleDeepsourceComplianceReport(params: DeepsourceComplianceReportParams) {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createComplianceReportHandler(deps);
  return handler(params);
}
