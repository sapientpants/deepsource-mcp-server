/**
 * @fileoverview ComplianceReport repository interface
 *
 * This module defines the repository interface for the ComplianceReport aggregate.
 */

import { IRepository } from '../../shared/repository.interface.js';
import { ComplianceReport } from './compliance-report.aggregate.js';
import { ProjectKey } from '../../../types/branded.js';
import { ReportType } from '../../../types/report-types.js';
import { ComplianceReportStatus } from './compliance-report.types.js';
import { ComplianceReportId } from './compliance-report.types.js';

/**
 * Repository interface for ComplianceReport aggregates
 *
 * Provides methods for persisting and retrieving ComplianceReport aggregates.
 *
 * @example
 * ```typescript
 * class InMemoryComplianceReportRepository implements IComplianceReportRepository {
 *   private reports = new Map<string, ComplianceReport>();
 *
 *   async findById(id: string): Promise<ComplianceReport | null> {
 *     return this.reports.get(id) || null;
 *   }
 *
 *   async findByProjectAndType(
 *     projectKey: ProjectKey,
 *     reportType: ReportType
 *   ): Promise<ComplianceReport | null> {
 *     const id = `${projectKey}:${reportType}`;
 *     return this.reports.get(id) || null;
 *   }
 *
 *   async findLatest(projectKey: ProjectKey): Promise<ComplianceReport[]> {
 *     return Array.from(this.reports.values())
 *       .filter(r => r.projectKey === projectKey)
 *       .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
 *   }
 *
 *   async save(report: ComplianceReport): Promise<void> {
 *     this.reports.set(report.id, report);
 *   }
 * }
 * ```
 */
export interface IComplianceReportRepository extends IRepository<ComplianceReport, string> {
  /**
   * Finds a report by its composite ID
   *
   * @param _id - The composite ID (projectKey:reportType)
   * @returns The report if found, null otherwise
   */
  findById(_id: string): Promise<ComplianceReport | null>;

  /**
   * Finds a report by project and type
   *
   * @param _projectKey - The project key
   * @param _reportType - The report type
   * @returns The report if found, null otherwise
   */
  findByProjectAndType(
    _projectKey: ProjectKey,
    _reportType: ReportType
  ): Promise<ComplianceReport | null>;

  /**
   * Finds the latest reports for a project
   *
   * @param _projectKey - The project key
   * @returns All reports for the project, sorted by generation date (newest first)
   */
  findLatest(_projectKey: ProjectKey): Promise<ComplianceReport[]>;

  /**
   * Finds reports by status
   *
   * @param _projectKey - The project key
   * @param _status - The report status
   * @returns Reports matching the status
   */
  findByStatus(
    _projectKey: ProjectKey,
    _status: ComplianceReportStatus
  ): Promise<ComplianceReport[]>;

  /**
   * Finds all compliant reports for a project
   *
   * @param _projectKey - The project key
   * @returns Reports with compliance score >= 85%
   */
  findCompliantReports(_projectKey: ProjectKey): Promise<ComplianceReport[]>;

  /**
   * Finds reports with critical issues
   *
   * @param _projectKey - The project key
   * @returns Reports that have critical severity issues
   */
  findReportsWithCriticalIssues(_projectKey: ProjectKey): Promise<ComplianceReport[]>;

  /**
   * Finds a report by composite ID components
   *
   * @param _id - The composite ID components
   * @returns The report if found, null otherwise
   */
  findByCompositeId(_id: ComplianceReportId): Promise<ComplianceReport | null>;

  /**
   * Counts total reports for a project
   *
   * @param _projectKey - The project key
   * @returns The total number of reports
   */
  countByProject(_projectKey: ProjectKey): Promise<number>;

  /**
   * Counts reports by type for a project
   *
   * @param _projectKey - The project key
   * @param _reportType - The report type
   * @returns The number of reports of the given type
   */
  countByType(_projectKey: ProjectKey, _reportType: ReportType): Promise<number>;

  /**
   * Checks if a report exists for a project and type
   *
   * @param _projectKey - The project key
   * @param _reportType - The report type
   * @returns True if a report exists, false otherwise
   */
  exists(_projectKey: ProjectKey, _reportType: ReportType): Promise<boolean>;
}
