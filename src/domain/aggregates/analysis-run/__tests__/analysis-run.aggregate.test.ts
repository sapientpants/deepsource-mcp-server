/**
 * @fileoverview Tests for AnalysisRun aggregate
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AnalysisRun } from '../analysis-run.aggregate.js';
import type {
  CreateAnalysisRunParams,
  IssueOccurrence,
  RunSummary,
  CommitInfo,
  RunTimestamps,
  RunStatus,
} from '../analysis-run.types.js';
import type {
  RunId,
  ProjectKey,
  GraphQLNodeId,
  CommitOid,
  BranchName,
  AnalyzerShortcode,
} from '../../../../types/branded.js';
import { IssueCount } from '../../../value-objects/issue-count.js';

describe('AnalysisRun Aggregate', () => {
  let validParams: CreateAnalysisRunParams;
  let runId: RunId;
  let projectKey: ProjectKey;
  let repositoryId: GraphQLNodeId;
  let commitInfo: CommitInfo;

  beforeEach(() => {
    runId = 'run-123' as RunId;
    projectKey = 'test-project' as ProjectKey;
    repositoryId = 'repo-456' as GraphQLNodeId;
    commitInfo = {
      oid: 'abc123' as CommitOid,
      branch: 'main' as BranchName,
      baseOid: 'def456' as CommitOid,
      message: 'Test commit',
      author: 'Test Author',
      authoredAt: new Date('2024-01-01'),
    };

    validParams = {
      runId,
      projectKey,
      repositoryId,
      commitInfo,
    };
  });

  const createTestIssue = (id: string): IssueOccurrence => ({
    id,
    issueCode: 'TEST001',
    analyzerShortcode: 'test-analyzer' as AnalyzerShortcode,
    category: 'BUG_RISK',
    severity: 'MAJOR',
    message: 'Test issue',
    path: '/test/file.ts',
    line: 10,
    column: 5,
  });

  describe('create', () => {
    it('should create an analysis run with valid parameters', () => {
      const run = AnalysisRun.create(validParams);

      expect(run.runId).toBe(runId);
      expect(run.projectKey).toBe(projectKey);
      expect(run.repositoryId).toBe(repositoryId);
      expect(run.commitInfo).toEqual(commitInfo);
      expect(run.status).toBe('PENDING');
      expect(run.issues).toHaveLength(0);
      expect(run.domainEvents).toHaveLength(1);
      expect(run.domainEvents[0].eventType).toBe('AnalysisRunCreated');
    });

    it('should create empty summary', () => {
      const run = AnalysisRun.create(validParams);
      const summary = run.summary;

      expect(summary.totalIntroduced.count).toBe(0);
      expect(summary.totalResolved.count).toBe(0);
      expect(summary.totalSuppressed.count).toBe(0);
      expect(summary.byAnalyzer).toHaveLength(0);
      expect(summary.byCategory).toHaveLength(0);
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const run = AnalysisRun.create(validParams);
      const after = new Date();

      const timestamps = run.timestamps;
      expect(timestamps.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamps.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(timestamps.startedAt).toBeUndefined();
      expect(timestamps.finishedAt).toBeUndefined();
    });

    it('should create run without optional commit info', () => {
      const minimalCommitInfo: CommitInfo = {
        oid: 'abc123' as CommitOid,
        branch: 'main' as BranchName,
        baseOid: 'def456' as CommitOid,
      };

      const params = {
        ...validParams,
        commitInfo: minimalCommitInfo,
      };

      const run = AnalysisRun.create(params);
      expect(run.commitInfo.message).toBeUndefined();
      expect(run.commitInfo.author).toBeUndefined();
      expect(run.commitInfo.authoredAt).toBeUndefined();
    });

    it('should emit AnalysisRunCreated event with correct payload', () => {
      const run = AnalysisRun.create(validParams);

      const events = run.domainEvents;
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('AnalysisRunCreated');
      expect(event.aggregateId).toBe(runId);
      expect(event.payload).toEqual({
        projectKey,
        commitOid: commitInfo.oid,
        branch: commitInfo.branch,
      });
    });
  });

  describe('fromPersistence', () => {
    it('should recreate run from persistence without events', () => {
      const issues = [createTestIssue('issue-1'), createTestIssue('issue-2')];

      const summary: RunSummary = {
        totalIntroduced: IssueCount.create(2),
        totalResolved: IssueCount.create(0),
        totalSuppressed: IssueCount.create(0),
        byAnalyzer: [
          {
            analyzerShortcode: 'test-analyzer' as AnalyzerShortcode,
            introduced: IssueCount.create(2),
            resolved: IssueCount.create(0),
            suppressed: IssueCount.create(0),
          },
        ],
        byCategory: [
          {
            category: 'BUG_RISK',
            introduced: IssueCount.create(2),
            resolved: IssueCount.create(0),
            suppressed: IssueCount.create(0),
          },
        ],
      };

      const timestamps: RunTimestamps = {
        createdAt: new Date('2024-01-01'),
        startedAt: new Date('2024-01-01T00:01:00Z'),
        finishedAt: new Date('2024-01-01T00:05:00Z'),
      };

      const persistenceData = {
        runId,
        projectKey,
        repositoryId,
        commitInfo,
        status: 'SUCCESS' as const,
        timestamps,
        issues,
        summary,
      };

      const run = AnalysisRun.fromPersistence(persistenceData);

      expect(run.runId).toBe(runId);
      expect(run.projectKey).toBe(projectKey);
      expect(run.status).toBe('SUCCESS');
      expect(run.issues).toHaveLength(2);
      expect(run.domainEvents).toHaveLength(0); // No events when loading
      expect(run.timestamps).toEqual(timestamps);
      expect(run.summary.totalIntroduced.count).toBe(2);
    });
  });

  describe('status transitions', () => {
    describe('start', () => {
      it('should transition from PENDING to RUNNING', () => {
        const run = AnalysisRun.create(validParams);
        run.clearEvents();

        const beforeStart = run.timestamps.startedAt;
        expect(beforeStart).toBeUndefined();

        run.start();

        expect(run.status).toBe('RUNNING');
        expect(run.timestamps.startedAt).toBeDefined();
        expect(run.domainEvents).toHaveLength(2); // AnalysisRunStarted + AggregateModified
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunStarted');
      });

      it('should throw error when starting from invalid status', () => {
        const run = AnalysisRun.create(validParams);
        run.start();

        // Try to start again
        expect(() => run.start()).toThrow('Invalid status transition from RUNNING to RUNNING');
      });
    });

    describe('complete', () => {
      it('should transition from RUNNING to SUCCESS', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        run.complete();

        expect(run.status).toBe('SUCCESS');
        expect(run.timestamps.finishedAt).toBeDefined();
        expect(run.isFinished).toBe(true);
        expect(run.canModify).toBe(false);
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunCompleted');
        expect(run.domainEvents[0].payload).toMatchObject({
          summary: expect.objectContaining({
            totalIntroduced: expect.any(Object),
            totalResolved: expect.any(Object),
            totalSuppressed: expect.any(Object),
          }),
        });
      });

      it('should throw error when completing from invalid status', () => {
        const run = AnalysisRun.create(validParams);

        // Try to complete without starting
        expect(() => run.complete()).toThrow('Invalid status transition from PENDING to SUCCESS');
      });
    });

    describe('fail', () => {
      it('should transition from RUNNING to FAILURE with reason', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        const reason = 'Analysis engine crashed';
        run.fail(reason);

        expect(run.status).toBe('FAILURE');
        expect(run.timestamps.finishedAt).toBeDefined();
        expect(run.isFinished).toBe(true);
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunFailed');
        expect(run.domainEvents[0].payload).toEqual({ reason });
      });
    });

    describe('timeout', () => {
      it('should transition from RUNNING to TIMEOUT', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        run.timeout();

        expect(run.status).toBe('TIMEOUT');
        expect(run.timestamps.finishedAt).toBeDefined();
        expect(run.isFinished).toBe(true);
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunTimedOut');
      });
    });

    describe('cancel', () => {
      it('should transition from PENDING to CANCELLED', () => {
        const run = AnalysisRun.create(validParams);
        run.clearEvents();

        const reason = 'User requested cancellation';
        run.cancel(reason);

        expect(run.status).toBe('CANCELLED');
        expect(run.timestamps.finishedAt).toBeDefined();
        expect(run.isFinished).toBe(true);
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunCancelled');
        expect(run.domainEvents[0].payload).toEqual({ reason });
      });

      it('should transition from RUNNING to CANCELLED', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        const reason = 'Timeout exceeded';
        run.cancel(reason);

        expect(run.status).toBe('CANCELLED');
      });
    });

    describe('skip', () => {
      it('should transition from PENDING to SKIPPED', () => {
        const run = AnalysisRun.create(validParams);
        run.clearEvents();

        const reason = 'No changes detected';
        run.skip(reason);

        expect(run.status).toBe('SKIPPED');
        expect(run.timestamps.finishedAt).toBeDefined();
        expect(run.isFinished).toBe(true);
        expect(run.domainEvents[0].eventType).toBe('AnalysisRunSkipped');
        expect(run.domainEvents[0].payload).toEqual({ reason });
      });
    });
  });

  describe('issue management', () => {
    describe('addIssue', () => {
      it('should add issue to running run', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        const issue = createTestIssue('issue-1');
        run.addIssue(issue);

        expect(run.issues).toHaveLength(1);
        expect(run.issues[0]).toEqual(issue);
        expect(run.domainEvents[0].eventType).toBe('IssueAdded');
        expect(run.domainEvents[0].payload).toEqual({
          issueId: issue.id,
          issueCode: issue.issueCode,
        });
      });

      it('should update summary when adding issues', () => {
        const run = AnalysisRun.create(validParams);
        run.start();

        const issue1 = createTestIssue('issue-1');
        const issue2 = {
          ...createTestIssue('issue-2'),
          analyzerShortcode: 'another-analyzer' as AnalyzerShortcode,
          category: 'SECURITY' as const,
        };

        run.addIssue(issue1);
        run.addIssue(issue2);

        const summary = run.summary;
        expect(summary.totalIntroduced.count).toBe(2);
        expect(summary.byAnalyzer).toHaveLength(2);
        expect(summary.byCategory).toHaveLength(2);

        const testAnalyzerDist = summary.byAnalyzer.find(
          (d) => d.analyzerShortcode === 'test-analyzer'
        );
        expect(testAnalyzerDist?.introduced.count).toBe(1);

        const securityDist = summary.byCategory.find((d) => d.category === 'SECURITY');
        expect(securityDist?.introduced.count).toBe(1);
      });

      it('should not add duplicate issues', () => {
        const run = AnalysisRun.create(validParams);
        run.start();

        const issue = createTestIssue('issue-1');
        run.addIssue(issue);
        run.clearEvents();

        // Try to add the same issue again
        run.addIssue(issue);

        expect(run.issues).toHaveLength(1);
        expect(run.domainEvents).toHaveLength(0); // No event for duplicate
      });

      it('should throw error when adding issue to finished run', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.complete();

        const issue = createTestIssue('issue-1');
        expect(() => run.addIssue(issue)).toThrow('Cannot add issues to a finished run');
      });
    });

    describe('removeIssue', () => {
      it('should remove existing issue', () => {
        const run = AnalysisRun.create(validParams);
        run.start();

        const issue = createTestIssue('issue-1');
        run.addIssue(issue);
        run.clearEvents();

        run.removeIssue(issue.id);

        expect(run.issues).toHaveLength(0);
        expect(run.domainEvents[0].eventType).toBe('IssueRemoved');
        expect(run.domainEvents[0].payload).toEqual({ issueId: issue.id });
      });

      it('should update summary when removing issues', () => {
        const run = AnalysisRun.create(validParams);
        run.start();

        const issue1 = createTestIssue('issue-1');
        const issue2 = createTestIssue('issue-2');
        run.addIssue(issue1);
        run.addIssue(issue2);

        run.removeIssue(issue1.id);

        const summary = run.summary;
        expect(summary.totalIntroduced.count).toBe(1);
      });

      it('should not emit event when removing non-existent issue', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.clearEvents();

        run.removeIssue('non-existent');

        expect(run.domainEvents).toHaveLength(0);
      });

      it('should throw error when removing issue from finished run', () => {
        const run = AnalysisRun.create(validParams);
        run.start();
        run.complete();

        expect(() => run.removeIssue('any-id')).toThrow('Cannot remove issues from a finished run');
      });
    });
  });

  describe('isFinished and canModify', () => {
    it('should identify finished statuses correctly', () => {
      const testCases = [
        { status: 'PENDING', isFinished: false, canModify: true },
        { status: 'RUNNING', isFinished: false, canModify: true },
        { status: 'SUCCESS', isFinished: true, canModify: false },
        { status: 'FAILURE', isFinished: true, canModify: false },
        { status: 'TIMEOUT', isFinished: true, canModify: false },
        { status: 'CANCELLED', isFinished: true, canModify: false },
        { status: 'SKIPPED', isFinished: true, canModify: false },
      ];

      testCases.forEach((testCase) => {
        const persistenceData = {
          runId,
          projectKey,
          repositoryId,
          commitInfo,
          status: testCase.status as RunStatus,
          timestamps: { createdAt: new Date() },
          issues: [],
          summary: {
            totalIntroduced: IssueCount.create(0),
            totalResolved: IssueCount.create(0),
            totalSuppressed: IssueCount.create(0),
            byAnalyzer: [],
            byCategory: [],
          },
        };

        const run = AnalysisRun.fromPersistence(persistenceData);
        expect(run.isFinished).toBe(testCase.isFinished);
        expect(run.canModify).toBe(testCase.canModify);
      });
    });
  });

  describe('toPersistence', () => {
    it('should convert to persistence format', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const issue = createTestIssue('issue-1');
      run.addIssue(issue);

      const persistence = run.toPersistence();

      expect(persistence).toEqual({
        runId,
        projectKey,
        repositoryId,
        commitInfo,
        status: 'RUNNING',
        timestamps: expect.objectContaining({
          createdAt: expect.any(Date),
          startedAt: expect.any(Date),
        }),
        issues: [issue],
        summary: expect.objectContaining({
          totalIntroduced: expect.objectContaining({ count: 1 }),
          byAnalyzer: expect.arrayContaining([
            expect.objectContaining({ analyzerShortcode: 'test-analyzer' }),
          ]),
          byCategory: expect.arrayContaining([expect.objectContaining({ category: 'BUG_RISK' })]),
        }),
      });
    });

    it('should preserve all data through persistence round-trip', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const issue1 = createTestIssue('issue-1');
      const issue2 = createTestIssue('issue-2');
      run.addIssue(issue1);
      run.addIssue(issue2);
      run.complete();

      const persistence = run.toPersistence();
      const reconstructed = AnalysisRun.fromPersistence(persistence);

      expect(reconstructed.runId).toBe(run.runId);
      expect(reconstructed.status).toBe(run.status);
      expect(reconstructed.issues).toHaveLength(2);
      expect(reconstructed.summary.totalIntroduced.count).toBe(2);
      expect(reconstructed.timestamps).toEqual(run.timestamps);
    });
  });

  describe('getters', () => {
    it('should return immutable commit info', () => {
      const run = AnalysisRun.create(validParams);
      const info = run.commitInfo;

      // Verify it's a copy
      expect(info).not.toBe(commitInfo);
      expect(info).toEqual(commitInfo);
    });

    it('should return immutable timestamps', () => {
      const run = AnalysisRun.create(validParams);
      const timestamps1 = run.timestamps;
      const timestamps2 = run.timestamps;

      // Should return new object each time
      expect(timestamps1).not.toBe(timestamps2);
      expect(timestamps1).toEqual(timestamps2);
    });

    it('should return issues as array', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const issue1 = createTestIssue('issue-1');
      const issue2 = createTestIssue('issue-2');
      run.addIssue(issue1);
      run.addIssue(issue2);

      const issues = run.issues;
      expect(Array.isArray(issues)).toBe(true);
      expect(issues).toHaveLength(2);
      expect(issues).toContainEqual(issue1);
      expect(issues).toContainEqual(issue2);
    });

    it('should return immutable summary', () => {
      const run = AnalysisRun.create(validParams);
      const summary = run.summary;

      // Verify arrays are copies
      const originalAnalyzerLength = summary.byAnalyzer.length;
      summary.byAnalyzer.push({
        analyzerShortcode: 'test' as AnalyzerShortcode,
        introduced: IssueCount.create(0),
        resolved: IssueCount.create(0),
        suppressed: IssueCount.create(0),
      });
      expect(run.summary.byAnalyzer).toHaveLength(originalAnalyzerLength);
    });
  });

  describe('domain events', () => {
    it('should accumulate multiple events', () => {
      const run = AnalysisRun.create(validParams);
      run.clearEvents();

      run.start();
      run.addIssue(createTestIssue('issue-1'));
      run.complete();

      // Each operation emits 2 events (operation + AggregateModified)
      expect(run.domainEvents).toHaveLength(6);

      const eventTypes = run.domainEvents.map((e) => e.eventType);
      expect(eventTypes).toEqual([
        'AnalysisRunStarted',
        'AggregateModified',
        'IssueAdded',
        'AggregateModified',
        'AnalysisRunCompleted',
        'AggregateModified',
      ]);
    });

    it('should clear events when requested', () => {
      const run = AnalysisRun.create(validParams);

      expect(run.domainEvents).toHaveLength(1);

      run.clearEvents();

      expect(run.domainEvents).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty issues correctly', () => {
      const run = AnalysisRun.create(validParams);
      run.start();
      run.complete();

      const summary = run.summary;
      expect(summary.totalIntroduced.count).toBe(0);
      expect(summary.byAnalyzer).toHaveLength(0);
      expect(summary.byCategory).toHaveLength(0);
    });

    it('should handle multiple issues from same analyzer', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const analyzer = 'test-analyzer' as AnalyzerShortcode;
      run.addIssue({ ...createTestIssue('issue-1'), analyzerShortcode: analyzer });
      run.addIssue({ ...createTestIssue('issue-2'), analyzerShortcode: analyzer });
      run.addIssue({ ...createTestIssue('issue-3'), analyzerShortcode: analyzer });

      const summary = run.summary;
      const analyzerDist = summary.byAnalyzer.find((d) => d.analyzerShortcode === analyzer);
      expect(analyzerDist?.introduced.count).toBe(3);
    });

    it('should handle multiple issues from same category', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const category = 'SECURITY' as const;
      run.addIssue({ ...createTestIssue('issue-1'), category });
      run.addIssue({ ...createTestIssue('issue-2'), category });

      const summary = run.summary;
      const categoryDist = summary.byCategory.find((d) => d.category === category);
      expect(categoryDist?.introduced.count).toBe(2);
    });

    it('should handle all issue categories', () => {
      const run = AnalysisRun.create(validParams);
      run.start();

      const categories = [
        'BUG_RISK',
        'SECURITY',
        'STYLE',
        'PERFORMANCE',
        'DOCUMENTATION',
        'COVERAGE',
        'COMPLEXITY',
      ] as const;

      categories.forEach((category, index) => {
        run.addIssue({ ...createTestIssue(`issue-${index}`), category });
      });

      const summary = run.summary;
      expect(summary.byCategory).toHaveLength(7);
      expect(summary.totalIntroduced.count).toBe(7);
    });
  });
});
