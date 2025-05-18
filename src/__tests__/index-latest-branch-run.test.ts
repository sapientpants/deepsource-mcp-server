import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { handleDeepsourceLatestBranchRun } from '../index.js';
import { DeepSourceClient } from '../deepsource.js';
import type { DeepSourceRun } from '../deepsource.js';

describe('handleDeepsourceLatestBranchRun', () => {
  const originalGetLatestRunForBranch = DeepSourceClient.prototype.getLatestRunForBranch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env['DEEPSOURCE_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    DeepSourceClient.prototype.getLatestRunForBranch = originalGetLatestRunForBranch;
  });

  it('should return the latest run for a branch', async () => {
    const mockRun: DeepSourceRun = {
      id: 'run1',
      runUid: 'uuid1',
      commitOid: 'commit1',
      branchName: 'main',
      baseOid: 'base1',
      status: 'SUCCESS',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:01:00Z',
      finishedAt: '2024-01-01T00:02:00Z',
      summary: {
        occurrencesIntroduced: 2,
        occurrencesResolved: 5,
        occurrencesSuppressed: 1,
        occurrenceDistributionByAnalyzer: [{ analyzerShortcode: 'javascript', introduced: 2 }],
        occurrenceDistributionByCategory: [{ category: 'ANTI_PATTERN', introduced: 2 }],
      },
      repository: { name: 'test-repo', id: 'repo1' },
    };

    const mockGetLatestRunForBranch = jest.fn().mockResolvedValue(mockRun);
    DeepSourceClient.prototype.getLatestRunForBranch = mockGetLatestRunForBranch;

    const result = await handleDeepsourceLatestBranchRun({
      projectKey: 'test-project',
      branchName: 'main',
    });

    expect(mockGetLatestRunForBranch).toHaveBeenCalledWith('test-project', 'main');

    const content = JSON.parse(result.content[0].text);
    expect(content.run).toBeDefined();
    expect(content.run.id).toBe('run1');
    expect(content.run.branchName).toBe('main');
    expect(content.analysis.total_issues_introduced).toBe(2);
    expect(content.analysis.total_issues_resolved).toBe(5);
    expect(content.analysis.analyzers_summary).toHaveLength(1);
    expect(content.analysis.categories_summary).toHaveLength(1);
  });

  it('should handle when no run is found for the branch', async () => {
    const mockGetLatestRunForBranch = jest.fn().mockResolvedValue(null);
    DeepSourceClient.prototype.getLatestRunForBranch = mockGetLatestRunForBranch;

    const result = await handleDeepsourceLatestBranchRun({
      projectKey: 'test-project',
      branchName: 'nonexistent-branch',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe(
      "No runs found for branch 'nonexistent-branch' in project 'test-project'"
    );
    expect(content.suggestions).toBeDefined();
    expect(content.suggestions).toContain('Check if the branch name is correct');
  });

  it('should throw error when API key is not set', async () => {
    delete process.env['DEEPSOURCE_API_KEY'];

    await expect(
      handleDeepsourceLatestBranchRun({
        projectKey: 'test-project',
        branchName: 'main',
      })
    ).rejects.toThrow('DEEPSOURCE_API_KEY environment variable is not set');
  });

  it('should handle runs with missing optional fields', async () => {
    const mockRun: DeepSourceRun = {
      id: 'run1',
      runUid: 'uuid1',
      commitOid: 'commit1',
      branchName: 'main',
      baseOid: 'base1',
      status: 'SUCCESS',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:01:00Z',
      finishedAt: '2024-01-01T00:02:00Z',
      summary: {
        occurrencesIntroduced: 0,
        occurrencesResolved: 0,
        occurrencesSuppressed: 0,
        occurrenceDistributionByAnalyzer: undefined,
        occurrenceDistributionByCategory: undefined,
      },
      repository: { name: 'test-repo', id: 'repo1' },
    };

    const mockGetLatestRunForBranch = jest.fn().mockResolvedValue(mockRun);
    DeepSourceClient.prototype.getLatestRunForBranch = mockGetLatestRunForBranch;

    const result = await handleDeepsourceLatestBranchRun({
      projectKey: 'test-project',
      branchName: 'main',
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.analysis.analyzers_summary).toEqual([]);
    expect(content.analysis.categories_summary).toEqual([]);
  });

  it('should handle API errors', async () => {
    const mockGetLatestRunForBranch = jest.fn().mockRejectedValue(new Error('API Error'));
    DeepSourceClient.prototype.getLatestRunForBranch = mockGetLatestRunForBranch;

    await expect(
      handleDeepsourceLatestBranchRun({
        projectKey: 'test-project',
        branchName: 'main',
      })
    ).rejects.toThrow('API Error');
  });
});
