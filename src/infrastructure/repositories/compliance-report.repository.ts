/**
 * @fileoverview ComplianceReport repository implementation
 *
 * Concrete implementation of IComplianceReportRepository using DeepSource API.
 */

import { IComplianceReportRepository } from '../../domain/aggregates/compliance-report/compliance-report.repository.js';
import { ComplianceReport } from '../../domain/aggregates/compliance-report/compliance-report.aggregate.js';
import { ProjectKey } from '../../types/branded.js';
import { ReportType } from '../../types/report-types.js';
import {
  ComplianceReportStatus,
  ComplianceReportId,
} from '../../domain/aggregates/compliance-report/compliance-report.types.js';
import { DeepSourceClient } from '../../deepsource.js';
import { ComplianceReportMapper } from '../mappers/compliance-report.mapper.js';
import { createLogger } from '../../utils/logging/logger.js';
import { BaseDeepSourceClient } from '../../client/base-client.js';
import type { AxiosInstance } from 'axios';

const logger = createLogger('ComplianceReportRepository');

/**
 * Concrete implementation of IComplianceReportRepository using DeepSource API
 *
 * This repository provides access to ComplianceReport aggregates by fetching data
 * from the DeepSource API and mapping it to domain models.
 *
 * Note: The DeepSource API provides compliance reports for specific types
 * (OWASP_TOP_10, SANS_TOP_25, MISRA_C). This repository ensures fresh data
 * retrieval on every request as per requirements.
 */
export class ComplianceReportRepository implements IComplianceReportRepository {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly client: DeepSourceClient) {
    // client is stored for use in methods
  }

  /**
   * Helper method to get repository ID for a project
   *
   * @param projectKey - The project key
   * @returns The repository GraphQL ID
   */
  private async getRepositoryId(projectKey: ProjectKey): Promise<string> {
    const projects = await this.client.listProjects();
    const project = projects.find((p) => p.key === projectKey);
    if (!project) {
      throw new Error(`Project not found: ${projectKey}`);
    }

    // Get repository ID from runs query (similar to QualityMetricsRepository)
    try {
      const runs = await this.client.listRuns(projectKey, { first: 1 });
      if (runs.items.length > 0 && runs.items[0].repository?.id) {
        return runs.items[0].repository.id;
      }

      // Fallback: Direct repository query
      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            id
          }
        }
      `;

      // Access protected client member via type assertion
      const clientWithAxios = this.client as unknown as BaseDeepSourceClient & {
        client: AxiosInstance;
      };
      const response = await clientWithAxios.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
        },
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const repositoryId = response.data.data?.repository?.id;
      if (!repositoryId) {
        throw new Error(`Repository ID not found for project: ${projectKey}`);
      }

      return repositoryId;
    } catch (error) {
      logger.error('Error fetching repository ID', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds a report by composite ID
   *
   * @param id - The composite ID (projectKey:reportType)
   * @returns The report if found, null otherwise
   */
  async findById(id: string): Promise<ComplianceReport | null> {
    try {
      logger.debug('Finding compliance report by composite ID', { id });

      // Parse composite ID
      const parts = id.split(':');
      if (parts.length !== 2) {
        logger.error('Invalid composite ID format', { id });
        return null;
      }

      const [projectKey, reportType] = parts;
      return this.findByProjectAndType(projectKey as ProjectKey, reportType as ReportType);
    } catch (error) {
      logger.error('Error finding compliance report by ID', { id, error });
      throw error;
    }
  }

  /**
   * Finds a report by project and type
   *
   * @param projectKey - The project key
   * @param reportType - The report type
   * @returns The report if found, null otherwise
   */
  async findByProjectAndType(
    projectKey: ProjectKey,
    reportType: ReportType
  ): Promise<ComplianceReport | null> {
    try {
      logger.debug('Finding compliance report by project and type', {
        projectKey,
        reportType,
      });

      const repositoryId = await this.getRepositoryId(projectKey);
      const apiReport = await this.client.getComplianceReport(projectKey, reportType);

      if (!apiReport) {
        logger.debug('Compliance report not found', { projectKey, reportType });
        return null;
      }

      const domainReport = ComplianceReportMapper.toDomain(apiReport, projectKey, repositoryId);

      logger.debug('Compliance report found and mapped', {
        projectKey,
        reportType,
        id: domainReport.id,
      });

      return domainReport;
    } catch (error) {
      logger.error('Error finding compliance report by project and type', {
        projectKey,
        reportType,
        error,
      });
      throw error;
    }
  }

  /**
   * Finds the latest reports for a project
   *
   * @param projectKey - The project key
   * @returns All reports for the project, sorted by generation date (newest first)
   */
  async findLatest(projectKey: ProjectKey): Promise<ComplianceReport[]> {
    try {
      logger.debug('Finding latest compliance reports for project', { projectKey });

      const repositoryId = await this.getRepositoryId(projectKey);
      const reportTypes = [ReportType.OWASP_TOP_10, ReportType.SANS_TOP_25, ReportType.MISRA_C];
      const reports: ComplianceReport[] = [];

      // Fetch all available report types
      for (const reportType of reportTypes) {
        try {
          const apiReport = await this.client.getComplianceReport(projectKey, reportType);
          if (apiReport) {
            const domainReport = ComplianceReportMapper.toDomain(
              apiReport,
              projectKey,
              repositoryId
            );
            reports.push(domainReport);
          }
        } catch (error) {
          // Log but don't fail - some report types may not be available
          logger.debug('Report type not available', { projectKey, reportType, error });
        }
      }

      // Sort by generation date (newest first)
      reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

      logger.debug('Latest compliance reports found', {
        projectKey,
        count: reports.length,
      });

      return reports;
    } catch (error) {
      logger.error('Error finding latest compliance reports', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds reports by status
   *
   * @param projectKey - The project key
   * @param status - The report status
   * @returns Reports matching the status
   */
  async findByStatus(
    projectKey: ProjectKey,
    status: ComplianceReportStatus
  ): Promise<ComplianceReport[]> {
    try {
      logger.debug('Finding compliance reports by status', { projectKey, status });

      const allReports = await this.findLatest(projectKey);
      const statusReports = allReports.filter((report) => report.status === status);

      logger.debug('Status-filtered compliance reports found', {
        projectKey,
        status,
        count: statusReports.length,
      });

      return statusReports;
    } catch (error) {
      logger.error('Error finding reports by status', { projectKey, status, error });
      throw error;
    }
  }

  /**
   * Finds all compliant reports for a project
   *
   * @param projectKey - The project key
   * @returns Reports with compliance score >= 85%
   */
  async findCompliantReports(projectKey: ProjectKey): Promise<ComplianceReport[]> {
    try {
      logger.debug('Finding compliant reports for project', { projectKey });

      const allReports = await this.findLatest(projectKey);
      const compliantReports = allReports.filter((report) => report.isCompliant);

      logger.debug('Compliant reports found', {
        projectKey,
        count: compliantReports.length,
      });

      return compliantReports;
    } catch (error) {
      logger.error('Error finding compliant reports', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds reports with critical issues
   *
   * @param projectKey - The project key
   * @returns Reports that have critical severity issues
   */
  async findReportsWithCriticalIssues(projectKey: ProjectKey): Promise<ComplianceReport[]> {
    try {
      logger.debug('Finding reports with critical issues for project', { projectKey });

      const allReports = await this.findLatest(projectKey);
      const criticalReports = allReports.filter((report) => report.hasCriticalIssues);

      logger.debug('Reports with critical issues found', {
        projectKey,
        count: criticalReports.length,
      });

      return criticalReports;
    } catch (error) {
      logger.error('Error finding reports with critical issues', { projectKey, error });
      throw error;
    }
  }

  /**
   * Finds a report by composite ID components
   *
   * @param id - The composite ID components
   * @returns The report if found, null otherwise
   */
  async findByCompositeId(id: ComplianceReportId): Promise<ComplianceReport | null> {
    try {
      logger.debug('Finding compliance report by composite ID components', { id });

      return this.findByProjectAndType(id.projectKey, id.reportType);
    } catch (error) {
      logger.error('Error finding report by composite ID', { id, error });
      throw error;
    }
  }

  /**
   * Counts total reports for a project
   *
   * @param projectKey - The project key
   * @returns The total number of reports
   */
  async countByProject(projectKey: ProjectKey): Promise<number> {
    try {
      logger.debug('Counting compliance reports for project', { projectKey });

      const reports = await this.findLatest(projectKey);
      const count = reports.length;

      logger.debug('Compliance report count for project', { projectKey, count });
      return count;
    } catch (error) {
      logger.error('Error counting reports', { projectKey, error });
      throw error;
    }
  }

  /**
   * Counts reports by type for a project
   *
   * @param projectKey - The project key
   * @param reportType - The report type
   * @returns The number of reports of the given type
   */
  async countByType(projectKey: ProjectKey, reportType: ReportType): Promise<number> {
    try {
      logger.debug('Counting compliance reports by type', { projectKey, reportType });

      const report = await this.findByProjectAndType(projectKey, reportType);
      const count = report ? 1 : 0;

      logger.debug('Report count by type', { projectKey, reportType, count });
      return count;
    } catch (error) {
      logger.error('Error counting reports by type', { projectKey, reportType, error });
      throw error;
    }
  }

  /**
   * Checks if a report exists for a project and type
   *
   * @param projectKey - The project key
   * @param reportType - The report type
   * @returns True if a report exists, false otherwise
   */
  async exists(projectKey: ProjectKey, reportType: ReportType): Promise<boolean> {
    try {
      logger.debug('Checking if compliance report exists', { projectKey, reportType });

      const report = await this.findByProjectAndType(projectKey, reportType);
      const exists = report !== null;

      logger.debug('Compliance report existence check', { projectKey, reportType, exists });
      return exists;
    } catch (error) {
      logger.error('Error checking report existence', { projectKey, reportType, error });
      throw error;
    }
  }

  /**
   * Saves compliance report
   *
   * Note: The DeepSource API doesn't support creating or updating compliance reports.
   * Reports are generated automatically based on repository analysis.
   *
   * @param report - The report to save
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async save(report: ComplianceReport): Promise<void> {
    logger.warn('Attempted to save compliance report', { id: report.id });

    throw new Error(
      'Save operation is not supported by DeepSource API. ' +
        'Compliance reports are generated automatically based on repository analysis.'
    );
  }

  /**
   * Deletes compliance report
   *
   * Note: The DeepSource API doesn't support deleting compliance reports.
   * Reports are managed automatically based on repository configuration.
   *
   * @param id - The report ID to delete
   * @throws Error indicating the operation is not supported
   */
  // skipcq: JS-0105 - Repository method required by interface contract
  async delete(id: string): Promise<void> {
    logger.warn('Attempted to delete compliance report', { id });

    throw new Error(
      'Delete operation is not supported by DeepSource API. ' +
        'Compliance reports are managed automatically based on repository configuration.'
    );
  }
}
