/**
 * @fileoverview AnalysisRun aggregate root
 *
 * This module defines the AnalysisRun aggregate which represents a code analysis
 * run with its issues and summary statistics.
 */

import { AggregateRoot } from '../../shared/aggregate-root.js';
import { RunId, ProjectKey, GraphQLNodeId } from '../../../types/branded.js';
import { IssueCount } from '../../value-objects/issue-count.js';
import {
  RunStatus,
  CommitInfo,
  RunTimestamps,
  IssueOccurrence,
  RunSummary,
  CreateAnalysisRunParams,
  VALID_STATUS_TRANSITIONS,
  AnalyzerDistribution,
  CategoryDistribution,
} from './analysis-run.types.js';

/**
 * AnalysisRun aggregate root
 *
 * Represents a single analysis run on a repository commit.
 * Tracks the status, issues found, and summary statistics.
 *
 * @example
 * ```typescript
 * const run = AnalysisRun.create({
 *   runId: asRunId('550e8400-e29b-41d4-a716-446655440000'),
 *   projectKey: asProjectKey('my-project'),
 *   repositoryId: asGraphQLNodeId('repo123'),
 *   commitInfo: {
 *     oid: asCommitOid('abc123'),
 *     branch: asBranchName('main'),
 *     baseOid: asCommitOid('def456')
 *   }
 * });
 *
 * run.start();
 * run.addIssue(issueOccurrence);
 * run.complete();
 * ```
 */
export class AnalysisRun extends AggregateRoot<RunId> {
  private _projectKey: ProjectKey;
  private _repositoryId: GraphQLNodeId;
  private _commitInfo: CommitInfo;
  private _status: RunStatus;
  private _timestamps: RunTimestamps;
  private _issues: Map<string, IssueOccurrence>;
  private _summary: RunSummary;

  private constructor(
    id: RunId,
    projectKey: ProjectKey,
    repositoryId: GraphQLNodeId,
    commitInfo: CommitInfo,
    status: RunStatus,
    timestamps: RunTimestamps,
    issues: Map<string, IssueOccurrence>,
    summary: RunSummary
  ) {
    super(id);
    this._projectKey = projectKey;
    this._repositoryId = repositoryId;
    this._commitInfo = commitInfo;
    this._status = status;
    this._timestamps = timestamps;
    this._issues = issues;
    this._summary = summary;
  }

  /**
   * Creates a new AnalysisRun aggregate
   *
   * @param params - Creation parameters
   * @returns A new AnalysisRun instance
   */
  static create(params: CreateAnalysisRunParams): AnalysisRun {
    const { runId, projectKey, repositoryId, commitInfo } = params;

    const now = new Date();
    const timestamps: RunTimestamps = {
      createdAt: now,
    };

    const emptySummary: RunSummary = {
      totalIntroduced: IssueCount.zero(),
      totalResolved: IssueCount.zero(),
      totalSuppressed: IssueCount.zero(),
      byAnalyzer: [],
      byCategory: [],
    };

    const run = new AnalysisRun(
      runId,
      projectKey,
      repositoryId,
      commitInfo,
      'PENDING',
      timestamps,
      new Map(),
      emptySummary
    );

    run.addDomainEvent({
      aggregateId: runId,
      eventType: 'AnalysisRunCreated',
      occurredAt: now,
      payload: {
        projectKey,
        commitOid: commitInfo.oid,
        branch: commitInfo.branch,
      },
    });

    return run;
  }

  /**
   * Gets the run ID
   */
  get runId(): RunId {
    return this._id;
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
   * Gets the commit information
   */
  get commitInfo(): Readonly<CommitInfo> {
    return { ...this._commitInfo };
  }

  /**
   * Gets the current status
   */
  get status(): RunStatus {
    return this._status;
  }

  /**
   * Gets the timestamps
   */
  get timestamps(): Readonly<RunTimestamps> {
    return { ...this._timestamps };
  }

  /**
   * Gets the issues found
   */
  get issues(): ReadonlyArray<IssueOccurrence> {
    return Array.from(this._issues.values());
  }

  /**
   * Gets the run summary
   */
  get summary(): Readonly<RunSummary> {
    return {
      ...this._summary,
      byAnalyzer: [...this._summary.byAnalyzer],
      byCategory: [...this._summary.byCategory],
    };
  }

  /**
   * Checks if the run is finished
   */
  get isFinished(): boolean {
    return ['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED', 'SKIPPED'].includes(this._status);
  }

  /**
   * Checks if the run can be modified
   */
  get canModify(): boolean {
    return !this.isFinished;
  }

  /**
   * Starts the analysis run
   *
   * @throws Error if the status transition is invalid
   */
  start(): void {
    this.transitionTo('RUNNING');
    this._timestamps.startedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunStarted',
      occurredAt: this._timestamps.startedAt,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Completes the analysis run successfully
   *
   * @throws Error if the status transition is invalid
   */
  complete(): void {
    this.transitionTo('SUCCESS');
    this._timestamps.finishedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunCompleted',
      occurredAt: this._timestamps.finishedAt,
      payload: {
        summary: this.summary,
      },
    });

    this.markAsModified();
  }

  /**
   * Fails the analysis run
   *
   * @param reason - The reason for failure
   * @throws Error if the status transition is invalid
   */
  fail(reason: string): void {
    this.transitionTo('FAILURE');
    this._timestamps.finishedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunFailed',
      occurredAt: this._timestamps.finishedAt,
      payload: { reason },
    });

    this.markAsModified();
  }

  /**
   * Times out the analysis run
   *
   * @throws Error if the status transition is invalid
   */
  timeout(): void {
    this.transitionTo('TIMEOUT');
    this._timestamps.finishedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunTimedOut',
      occurredAt: this._timestamps.finishedAt,
      payload: {},
    });

    this.markAsModified();
  }

  /**
   * Cancels the analysis run
   *
   * @param reason - The reason for cancellation
   * @throws Error if the status transition is invalid
   */
  cancel(reason: string): void {
    this.transitionTo('CANCELLED');
    this._timestamps.finishedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunCancelled',
      occurredAt: this._timestamps.finishedAt,
      payload: { reason },
    });

    this.markAsModified();
  }

  /**
   * Skips the analysis run
   *
   * @param reason - The reason for skipping
   * @throws Error if the status transition is invalid
   */
  skip(reason: string): void {
    this.transitionTo('SKIPPED');
    this._timestamps.finishedAt = new Date();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'AnalysisRunSkipped',
      occurredAt: this._timestamps.finishedAt,
      payload: { reason },
    });

    this.markAsModified();
  }

  /**
   * Adds an issue to the run
   *
   * @param issue - The issue occurrence to add
   * @throws Error if the run is finished
   */
  addIssue(issue: IssueOccurrence): void {
    if (!this.canModify) {
      throw new Error('Cannot add issues to a finished run');
    }

    if (this._issues.has(issue.id)) {
      return; // Issue already exists
    }

    this._issues.set(issue.id, issue);
    this.updateSummary();

    this.addDomainEvent({
      aggregateId: this._id,
      eventType: 'IssueAdded',
      occurredAt: new Date(),
      payload: { issueId: issue.id, issueCode: issue.issueCode },
    });

    this.markAsModified();
  }

  /**
   * Removes an issue from the run
   *
   * @param issueId - The ID of the issue to remove
   * @throws Error if the run is finished
   */
  removeIssue(issueId: string): void {
    if (!this.canModify) {
      throw new Error('Cannot remove issues from a finished run');
    }

    if (this._issues.delete(issueId)) {
      this.updateSummary();

      this.addDomainEvent({
        aggregateId: this._id,
        eventType: 'IssueRemoved',
        occurredAt: new Date(),
        payload: { issueId },
      });

      this.markAsModified();
    }
  }

  /**
   * Transitions to a new status
   *
   * @param newStatus - The target status
   * @throws Error if the transition is invalid
   */
  private transitionTo(newStatus: RunStatus): void {
    const validTransitions = VALID_STATUS_TRANSITIONS[this._status];

    if (!validTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }

    this._status = newStatus;
  }

  /**
   * Updates the summary based on current issues
   */
  private updateSummary(): void {
    // Reset counts
    const analyzerMap = new Map<string, AnalyzerDistribution>();
    const categoryMap = new Map<string, CategoryDistribution>();

    // Count issues by analyzer and category
    for (const issue of this._issues.values()) {
      // Update analyzer distribution
      let analyzerDist = analyzerMap.get(issue.analyzerShortcode);
      if (!analyzerDist) {
        analyzerDist = {
          analyzerShortcode: issue.analyzerShortcode,
          introduced: IssueCount.zero(),
          resolved: IssueCount.zero(),
          suppressed: IssueCount.zero(),
        };
        analyzerMap.set(issue.analyzerShortcode, analyzerDist);
      }
      analyzerDist.introduced = analyzerDist.introduced.increment();

      // Update category distribution
      let categoryDist = categoryMap.get(issue.category);
      if (!categoryDist) {
        categoryDist = {
          category: issue.category,
          introduced: IssueCount.zero(),
          resolved: IssueCount.zero(),
          suppressed: IssueCount.zero(),
        };
        categoryMap.set(issue.category, categoryDist);
      }
      categoryDist.introduced = categoryDist.introduced.increment();
    }

    // Update summary
    this._summary = {
      totalIntroduced: IssueCount.create(this._issues.size),
      totalResolved: IssueCount.zero(), // Resolution tracking not yet implemented
      totalSuppressed: IssueCount.zero(), // Suppression tracking not yet implemented
      byAnalyzer: Array.from(analyzerMap.values()),
      byCategory: Array.from(categoryMap.values()),
    };
  }

  /**
   * Reconstructs an AnalysisRun from persisted data
   *
   * @param data - Persisted run data
   * @returns A reconstructed AnalysisRun instance
   */
  static fromPersistence(data: {
    runId: RunId;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    commitInfo: CommitInfo;
    status: RunStatus;
    timestamps: RunTimestamps;
    issues: IssueOccurrence[];
    summary: RunSummary;
  }): AnalysisRun {
    const issueMap = new Map(data.issues.map((issue) => [issue.id, issue]));

    return new AnalysisRun(
      data.runId,
      data.projectKey,
      data.repositoryId,
      data.commitInfo,
      data.status,
      data.timestamps,
      issueMap,
      data.summary
    );
  }

  /**
   * Converts the run to a persistence-friendly format
   */
  toPersistence(): {
    runId: RunId;
    projectKey: ProjectKey;
    repositoryId: GraphQLNodeId;
    commitInfo: CommitInfo;
    status: RunStatus;
    timestamps: RunTimestamps;
    issues: IssueOccurrence[];
    summary: RunSummary;
  } {
    return {
      runId: this._id,
      projectKey: this._projectKey,
      repositoryId: this._repositoryId,
      commitInfo: { ...this._commitInfo },
      status: this._status,
      timestamps: { ...this._timestamps },
      issues: Array.from(this._issues.values()),
      summary: this.summary,
    };
  }
}
