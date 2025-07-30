/**
 * @fileoverview Tests for AnalysisRunMapper
 */

import { describe, it, expect } from '@jest/globals';
import { AnalysisRunMapper } from '../analysis-run.mapper.js';
import { DeepSourceRun } from '../../../models/runs.js';
import {
  asRunId,
  asCommitOid,
  asBranchName,
  asAnalyzerShortcode,
  asGraphQLNodeId,
} from '../../../types/branded.js';
import { AnalysisRun } from '../../../domain/aggregates/analysis-run/analysis-run.aggregate.js';

describe('AnalysisRunMapper', () => {
  const mockApiRun: DeepSourceRun = {
    id: asGraphQLNodeId('R_kgDOGHqVWg'),
    runUid: asRunId('run-123'),
    commitOid: asCommitOid('abc123def456'),
    branchName: asBranchName('main'),
    baseOid: asCommitOid('def456ghi789'),
    status: 'SUCCESS',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
    finishedAt: '2024-01-15T10:10:00Z',
    summary: {
      occurrencesIntroduced: 10,
      occurrencesResolved: 5,
      occurrencesSuppressed: 2,
      occurrenceDistributionByAnalyzer: [
        {
          analyzerShortcode: asAnalyzerShortcode('python'),
          introduced: 7,
        },
        {
          analyzerShortcode: asAnalyzerShortcode('javascript'),
          introduced: 3,
        },
      ],
      occurrenceDistributionByCategory: [
        {
          category: 'bug_risk',
          introduced: 4,
        },
        {
          category: 'SECURITY',
          introduced: 3,
        },
        {
          category: 'performance',
          introduced: 3,
        },
      ],
    },
    repository: {
      name: 'test-repo',
      id: asGraphQLNodeId('R_repo123'),
    },
  };

  describe('toDomain', () => {
    it('should map API run to domain aggregate', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run).toBeInstanceOf(AnalysisRun);
      expect(run.runId).toBe('run-123');
      expect(run.projectKey).toBe(projectKey);
      expect(run.repositoryId).toBe('R_repo123');
      expect(run.status).toBe('SUCCESS');
    });

    it('should map commit information correctly', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run.commitInfo.oid).toBe('abc123def456');
      expect(run.commitInfo.branch).toBe('main');
      expect(run.commitInfo.baseOid).toBe('def456ghi789');
    });

    it('should map timestamps correctly', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run.timestamps.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(run.timestamps.startedAt).toEqual(new Date('2024-01-15T10:05:00Z'));
      expect(run.timestamps.finishedAt).toEqual(new Date('2024-01-15T10:10:00Z'));
    });

    it('should map issue summary correctly', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run.summary).toBeDefined();
      expect(run.summary.totalIntroduced.count).toBe(10);
      expect(run.summary.totalResolved.count).toBe(5);
      expect(run.summary.totalSuppressed.count).toBe(2);
    });

    it('should map analyzer distributions', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run.summary?.byAnalyzer).toHaveLength(2);
      expect(run.summary?.byAnalyzer[0].analyzerShortcode).toBe('python');
      expect(run.summary?.byAnalyzer[0].introduced.count).toBe(7);
      expect(run.summary?.byAnalyzer[1].analyzerShortcode).toBe('javascript');
      expect(run.summary?.byAnalyzer[1].introduced.count).toBe(3);
    });

    it('should map category distributions with case normalization', () => {
      const projectKey = 'test-project';
      const run = AnalysisRunMapper.toDomain(mockApiRun, projectKey);

      expect(run.summary?.byCategory).toHaveLength(3);
      expect(run.summary?.byCategory[0].category).toBe('BUG_RISK');
      expect(run.summary?.byCategory[0].introduced.count).toBe(4);
      expect(run.summary?.byCategory[1].category).toBe('SECURITY');
      expect(run.summary?.byCategory[1].introduced.count).toBe(3);
      expect(run.summary?.byCategory[2].category).toBe('PERFORMANCE');
      expect(run.summary?.byCategory[2].introduced.count).toBe(3);
    });

    it('should handle API status mapping', () => {
      const testCases = [
        { apiStatus: 'PENDING', expectedStatus: 'PENDING' },
        { apiStatus: 'READY', expectedStatus: 'RUNNING' },
        { apiStatus: 'SUCCESS', expectedStatus: 'SUCCESS' },
        { apiStatus: 'FAILURE', expectedStatus: 'FAILURE' },
        { apiStatus: 'TIMEOUT', expectedStatus: 'TIMEOUT' },
        { apiStatus: 'CANCEL', expectedStatus: 'CANCELLED' },
        { apiStatus: 'SKIPPED', expectedStatus: 'SKIPPED' },
      ];

      for (const { apiStatus, expectedStatus } of testCases) {
        const apiRun = { ...mockApiRun, status: apiStatus as any };
        const run = AnalysisRunMapper.toDomain(apiRun, 'test-project');
        expect(run.status).toBe(expectedStatus);
      }
    });

    it('should handle unknown status by defaulting to FAILURE', () => {
      const apiRun = { ...mockApiRun, status: 'UNKNOWN_STATUS' as any };
      const run = AnalysisRunMapper.toDomain(apiRun, 'test-project');
      expect(run.status).toBe('FAILURE');
    });

    it('should handle PENDING status timestamps', () => {
      const apiRun = { ...mockApiRun, status: 'PENDING', finishedAt: undefined };
      const run = AnalysisRunMapper.toDomain(apiRun, 'test-project');

      expect(run.timestamps.startedAt).toBeUndefined();
      expect(run.timestamps.finishedAt).toBeUndefined();
    });

    it('should handle missing distributions', () => {
      const apiRun = {
        ...mockApiRun,
        summary: {
          occurrencesIntroduced: 10,
          occurrencesResolved: 5,
          occurrencesSuppressed: 2,
        },
      };
      const run = AnalysisRunMapper.toDomain(apiRun, 'test-project');

      expect(run.summary?.byAnalyzer).toEqual([]);
      expect(run.summary?.byCategory).toEqual([]);
    });

    it('should initialize issues as empty array', () => {
      const run = AnalysisRunMapper.toDomain(mockApiRun, 'test-project');
      expect(run.issues).toEqual([]);
    });
  });

  describe('toPersistence', () => {
    it('should map domain aggregate to persistence format', () => {
      const run = AnalysisRun.create({
        runId: asRunId('run-123'),
        projectKey: 'test-project',
        repositoryId: asGraphQLNodeId('R_repo123'),
        commitInfo: {
          oid: asCommitOid('abc123'),
          branch: asBranchName('main'),
          baseOid: asCommitOid('def456'),
        },
      });

      const persistence = AnalysisRunMapper.toPersistence(run);

      expect(persistence.runId).toBe('run-123');
      expect(persistence.projectKey).toBe('test-project');
      expect(persistence.repositoryId).toBe('R_repo123');
      expect(persistence.status).toBe('PENDING');
      expect(persistence.commitInfo.oid).toBe('abc123');
    });
  });

  describe('toDomainList', () => {
    it('should map multiple API runs to domain aggregates', () => {
      const apiRuns = [
        mockApiRun,
        { ...mockApiRun, runUid: asRunId('run-456'), status: 'FAILURE' },
        { ...mockApiRun, runUid: asRunId('run-789'), status: 'READY' },
      ];

      const runs = AnalysisRunMapper.toDomainList(apiRuns, 'test-project');

      expect(runs).toHaveLength(3);
      expect(runs[0].runId).toBe('run-123');
      expect(runs[0].status).toBe('SUCCESS');
      expect(runs[1].runId).toBe('run-456');
      expect(runs[1].status).toBe('FAILURE');
      expect(runs[2].runId).toBe('run-789');
      expect(runs[2].status).toBe('RUNNING');
    });

    it('should handle empty list', () => {
      const runs = AnalysisRunMapper.toDomainList([], 'test-project');
      expect(runs).toEqual([]);
    });
  });
});
