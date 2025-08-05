/**
 * @fileoverview Security client for the DeepSource API
 * This module provides functionality for working with DeepSource security features.
 */

import { BaseDeepSourceClient } from './base-client.js';
import { VulnerabilityOccurrence, VulnerabilitySeverity } from '../models/security.js';
import { PaginatedResponse, PaginationParams } from '../utils/pagination/types.js';
import { isErrorWithMessage } from '../utils/errors/handlers.js';
import { ReportType } from '../deepsource.js';

/**
 * Compliance report data structure
 * @public
 */
export interface ComplianceReport {
  reportType: ReportType;
  status: 'PASSING' | 'FAILING' | 'NOOP';
  title: string;
  description: string;
  severityDistribution: {
    critical: number;
    major: number;
    minor: number;
    total: number;
  };
  trend?: {
    label?: string;
    value?: number;
    changePercentage?: number;
  };
  categories: Array<{
    name: string;
    status: 'PASSING' | 'FAILING' | 'NOOP';
    issueCount: number;
    description?: string;
  }>;
  complianceScore: number;
  lastUpdated: string;
}

/**
 * Client for interacting with DeepSource security API
 * @class
 * @extends BaseDeepSourceClient
 * @public
 */
export class SecurityClient extends BaseDeepSourceClient {
  /**
   * Fetches dependency vulnerabilities from a DeepSource project
   * @param projectKey The project key to fetch vulnerabilities for
   * @param params Optional pagination parameters
   * @returns Promise that resolves to a paginated list of vulnerability occurrences
   * @throws {ClassifiedError} When the API request fails
   * @public
   */
  async getDependencyVulnerabilities(
    projectKey: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<VulnerabilityOccurrence>> {
    try {
      this.logger.info('Fetching dependency vulnerabilities from DeepSource API', {
        projectKey,
      });

      const project = await this.findProjectByKey(projectKey);
      if (!project) {
        return BaseDeepSourceClient.createEmptyPaginatedResponse<VulnerabilityOccurrence>();
      }

      const normalizedParams = BaseDeepSourceClient.normalizePaginationParams(params);
      const query = SecurityClient.buildVulnerabilitiesQuery();

      const response = await this.executeGraphQL(query, {
        login: project.repository.login,
        name: project.repository.name,
        provider: project.repository.provider,
        ...normalizedParams,
      });

      if (!response.data) {
        throw new Error('No data received from GraphQL API');
      }

      const vulnerabilities = this.extractVulnerabilitiesFromResponse(response.data);

      this.logger.info('Successfully fetched dependency vulnerabilities', {
        count: vulnerabilities.length,
      });

      return {
        items: vulnerabilities,
        pageInfo: {
          hasNextPage: false, // Simplified for now
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: vulnerabilities.length,
      };
    } catch (error) {
      return this.handleVulnerabilitiesError(error);
    }
  }

  /**
   * Fetches a compliance report for a specific report type
   * @param projectKey The project key
   * @param reportType The type of compliance report
   * @returns Promise that resolves to compliance report if available, null otherwise
   * @public
   */
  async getComplianceReport(
    projectKey: string,
    reportType: ReportType
  ): Promise<ComplianceReport | null> {
    try {
      this.logger.info('Fetching compliance report from DeepSource API', {
        projectKey,
        reportType,
      });

      // Validate report type
      if (
        reportType !== ReportType.OWASP_TOP_10 &&
        reportType !== ReportType.SANS_TOP_25 &&
        reportType !== ReportType.MISRA_C
      ) {
        throw new Error(`Unsupported report type: ${reportType}`);
      }

      const project = await this.findProjectByKey(projectKey);
      if (!project) {
        return null;
      }

      const query = SecurityClient.buildComplianceReportQuery();
      const fieldName = SecurityClient.getReportFieldName(reportType);

      const response = await this.executeGraphQL(query, {
        login: project.repository.login,
        name: project.repository.name,
        provider: project.repository.provider,
      });

      if (!response.data) {
        return null;
      }

      const reportData = this.extractComplianceReportFromResponse(
        response.data,
        reportType,
        fieldName
      );

      if (reportData) {
        this.logger.info('Successfully fetched compliance report', {
          reportType,
          status: reportData.status,
        });
      }

      return reportData;
    } catch (error) {
      if (isErrorWithMessage(error, 'NoneType') || isErrorWithMessage(error, 'not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Builds GraphQL query for dependency vulnerabilities
   * @private
   */
  private static buildVulnerabilitiesQuery(): string {
    return `
      query getDependencyVulnerabilities(
        $login: String!
        $name: String!
        $provider: VCSProvider!
        $first: Int
        $after: String
      ) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          dependencyVulnerabilities(first: $first, after: $after) {
            edges {
              node {
                id
                package {
                  id
                  ecosystem
                  name
                }
                packageVersion {
                  id
                  version
                }
                vulnerability {
                  id
                  identifier
                  summary
                  details
                  severity
                  cvssV3BaseScore
                  cvssV2BaseScore
                  fixedVersions
                  aliases
                  referenceUrls
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      }
    `;
  }

  /**
   * Builds GraphQL query for compliance reports
   * @private
   */
  private static buildComplianceReportQuery(): string {
    return `
      query getComplianceReports(
        $login: String!
        $name: String!
        $provider: VCSProvider!
      ) {
        repository(login: $login, name: $name, vcsProvider: $provider) {
          name
          id
          reports {
            owaspTop10 {
              status
              categories {
                name
                status
                criticalCount: count(severity: CRITICAL)
                majorCount: count(severity: MAJOR)
                minorCount: count(severity: MINOR)
                total: count
              }
            }
            sansTop25 {
              status
              categories {
                name
                status
                criticalCount: count(severity: CRITICAL)
                majorCount: count(severity: MAJOR)
                minorCount: count(severity: MINOR)
                total: count
              }
            }
            misraC {
              status
              categories {
                name
                status
                criticalCount: count(severity: CRITICAL)
                majorCount: count(severity: MAJOR)
                minorCount: count(severity: MINOR)
                total: count
              }
            }
          }
        }
      }
    `;
  }

  /**
   * Extracts vulnerabilities from GraphQL response
   * @private
   */
  private extractVulnerabilitiesFromResponse(responseData: unknown): VulnerabilityOccurrence[] {
    const vulnerabilities: VulnerabilityOccurrence[] = [];

    try {
      const repository = (responseData as Record<string, unknown>)?.repository as Record<
        string,
        unknown
      >;
      const depVulns = repository?.dependencyVulnerabilities as Record<string, unknown>;
      const vulnEdges = (depVulns?.edges ?? []) as Array<Record<string, unknown>>;

      for (const edge of vulnEdges) {
        const node = edge.node as Record<string, unknown>;
        if (SecurityClient.isValidVulnerabilityNode(node)) {
          vulnerabilities.push(SecurityClient.mapVulnerabilityOccurrence(node));
        }
      }
    } catch (error) {
      this.logger.error('Error extracting vulnerabilities from response', { error });
    }

    return vulnerabilities;
  }

  /**
   * Validates if a vulnerability node has required structure
   * @private
   */
  private static isValidVulnerabilityNode(node: unknown): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    const record = node as Record<string, unknown>;

    return Boolean(record.id && record.package && record.packageVersion && record.vulnerability);
  }

  /**
   * Maps a vulnerability node to VulnerabilityOccurrence
   * @private
   */
  private static mapVulnerabilityOccurrence(
    node: Record<string, unknown>
  ): VulnerabilityOccurrence {
    const packageInfo = (node.package as Record<string, unknown>) || {};
    const packageVersion = (node.packageVersion as Record<string, unknown>) || {};
    const vulnerability = (node.vulnerability as Record<string, unknown>) || {};

    return {
      id: String(node.id ?? ''),
      package: {
        id: String(packageInfo.id ?? ''),
        ecosystem: String(packageInfo.ecosystem ?? ''),
        name: String(packageInfo.name ?? ''),
      },
      packageVersion: {
        id: String(packageVersion.id ?? ''),
        version: String(packageVersion.version ?? ''),
      },
      vulnerability: {
        id: String(vulnerability.id ?? ''),
        identifier: String(vulnerability.identifier ?? ''),
        aliases: Array.isArray(vulnerability.aliases) ? (vulnerability.aliases as string[]) : [],
        summary: String(vulnerability.summary ?? ''),
        details: String(vulnerability.details ?? ''),
        publishedAt: String(vulnerability.publishedAt ?? new Date().toISOString()),
        updatedAt: String(vulnerability.updatedAt ?? new Date().toISOString()),
        severity: String(vulnerability.severity ?? 'NONE') as VulnerabilitySeverity,
        cvssV3BaseScore: vulnerability.cvssV3BaseScore
          ? Number(vulnerability.cvssV3BaseScore)
          : undefined,
        cvssV2BaseScore: vulnerability.cvssV2BaseScore
          ? Number(vulnerability.cvssV2BaseScore)
          : undefined,
        introducedVersions: Array.isArray(vulnerability.introducedVersions)
          ? (vulnerability.introducedVersions as string[])
          : [],
        fixedVersions: Array.isArray(vulnerability.fixedVersions)
          ? (vulnerability.fixedVersions as string[])
          : [],
        referenceUrls: Array.isArray(vulnerability.referenceUrls)
          ? (vulnerability.referenceUrls as string[])
          : [],
      },
      reachability: 'UNKNOWN' as const,
      fixability: 'UNFIXABLE' as const,
    };
  }

  /**
   * Extracts compliance report from GraphQL response
   * @private
   */
  private extractComplianceReportFromResponse(
    responseData: unknown,
    reportType: ReportType,
    fieldName: string
  ): ComplianceReport | null {
    try {
      const repository = (responseData as Record<string, unknown>)?.repository as Record<
        string,
        unknown
      >;
      const reports = repository?.reports as Record<string, unknown>;
      const reportData = reports?.[fieldName] as Record<string, unknown>;

      if (!reportData) {
        return null;
      }

      const categories = (reportData.categories ?? []) as Array<Record<string, unknown>>;
      const status = String(reportData.status ?? 'NOOP') as 'PASSING' | 'FAILING' | 'NOOP';

      // Calculate severity distribution
      let totalCritical = 0;
      let totalMajor = 0;
      let totalMinor = 0;
      let totalIssues = 0;

      const processedCategories = categories.map((category) => {
        const criticalCount = Number(category.criticalCount ?? 0);
        const majorCount = Number(category.majorCount ?? 0);
        const minorCount = Number(category.minorCount ?? 0);
        const total = Number(category.total ?? 0);

        totalCritical += criticalCount;
        totalMajor += majorCount;
        totalMinor += minorCount;
        totalIssues += total;

        return {
          name: String(category.name ?? ''),
          status: String(category.status ?? 'NOOP') as 'PASSING' | 'FAILING' | 'NOOP',
          issueCount: total,
          description: `${criticalCount} critical, ${majorCount} major, ${minorCount} minor issues`,
        };
      });

      // Calculate compliance score (0-100)
      const complianceScore =
        totalIssues === 0
          ? 100
          : Math.max(0, 100 - (totalCritical * 10 + totalMajor * 5 + totalMinor));

      return {
        reportType,
        status,
        title: SecurityClient.getReportTitle(reportType),
        description: `${reportType.replace(/_/g, ' ')} compliance analysis`,
        severityDistribution: {
          critical: totalCritical,
          major: totalMajor,
          minor: totalMinor,
          total: totalIssues,
        },
        categories: processedCategories,
        complianceScore: Math.round(complianceScore),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error extracting compliance report from response', { error });
      return null;
    }
  }

  /**
   * Gets the GraphQL field name for a report type
   * @private
   */
  private static getReportFieldName(reportType: ReportType): string {
    switch (reportType) {
      case ReportType.OWASP_TOP_10:
        return 'owaspTop10';
      case ReportType.SANS_TOP_25:
        return 'sansTop25';
      case ReportType.MISRA_C:
        return 'misraC';
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  /**
   * Gets the human-readable title for a report type
   * @private
   */
  private static getReportTitle(reportType: ReportType): string {
    switch (reportType) {
      case ReportType.OWASP_TOP_10:
        return 'OWASP Top 10';
      case ReportType.SANS_TOP_25:
        return 'SANS Top 25';
      case ReportType.MISRA_C:
        return 'MISRA C';
      default:
        return reportType.replace(/_/g, ' ');
    }
  }

  /**
   * Handles errors during vulnerabilities fetching
   * @private
   */
  private handleVulnerabilitiesError(error: unknown): PaginatedResponse<VulnerabilityOccurrence> {
    this.logger.error('Error in getDependencyVulnerabilities', {
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (isErrorWithMessage(error, 'NoneType')) {
      return {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };
    }

    throw error;
  }
}
