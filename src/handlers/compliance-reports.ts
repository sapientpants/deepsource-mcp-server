import { DeepSourceClient, ReportType, ReportStatus } from '../deepsource.js';

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
 * Fetches and returns compliance reports from a DeepSource project
 * @param params - Parameters for fetching the compliance report, including project key and report type
 * @returns Response containing the compliance report with security issues statistics
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set or if the report type is unsupported
 * @public
 */
export async function handleDeepsourceComplianceReport({
  projectKey,
  reportType,
}: DeepsourceComplianceReportParams) {
  const apiKey = process.env.DEEPSOURCE_API_KEY;
  /* istanbul ignore if */
  if (!apiKey) {
    throw new Error('DEEPSOURCE_API_KEY environment variable is not set');
  }

  const client = new DeepSourceClient(apiKey);
  const report = await client.getComplianceReport(projectKey, reportType);

  if (!report) {
    throw new Error(`Report of type '${reportType}' not found for project '${projectKey}'`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
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
          },
          null,
          2
        ),
      },
    ],
  };
}
