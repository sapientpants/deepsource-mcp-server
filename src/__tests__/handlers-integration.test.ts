/**
 * @fileoverview Integration tests for handler functions
 * Tests handler logic without requiring complex HTTP mocking
 */

import { jest } from '@jest/globals';

// Mock the DeepSource client before any imports
const mockClient = {
  getDependencyVulnerabilities: jest.fn(),
  listRuns: jest.fn(),
  getRecentRunIssues: jest.fn(),
  getRun: jest.fn(),
};

jest.unstable_mockModule('../deepsource.js', () => ({
  DeepSourceClient: jest.fn().mockImplementation(() => mockClient),
}));

// Now import the handlers
const { handleDeepsourceDependencyVulnerabilities } = await import(
  '../handlers/dependency-vulnerabilities.js'
);
const { handleDeepsourceProjectRuns } = await import('../handlers/project-runs.js');
const { handleDeepsourceRecentRunIssues } = await import('../handlers/recent-run-issues.js');
const { handleDeepsourceRun } = await import('../handlers/run.js');

describe('Handler Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, DEEPSOURCE_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('dependency-vulnerabilities handler', () => {
    it('should handle successful vulnerability response with complete data', async () => {
      const mockVulnerabilities = {
        items: [
          {
            id: 'vuln-1',
            vulnerability: {
              summary: 'Test vulnerability',
              identifier: 'CVE-2023-1234',
              severity: 'HIGH',
              cvssV3BaseScore: 8.5,
              cvssV2BaseScore: null,
              fixedVersions: ['1.2.3'],
              details: 'Detailed vulnerability description',
              aliases: ['GHSA-1234'],
              referenceUrls: ['https://example.com'],
            },
            package: {
              name: 'test-package',
            },
            packageVersion: {
              version: '1.0.0',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start123',
          endCursor: 'end123',
        },
        totalCount: 5,
      };

      mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilities);

      const result = await handleDeepsourceDependencyVulnerabilities({
        projectKey: 'test-project',
        first: 10,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.vulnerabilities).toHaveLength(1);
      expect(parsedContent.vulnerabilities[0].id).toBe('vuln-1');
      expect(parsedContent.vulnerabilities[0].severity).toBe('HIGH');
      expect(parsedContent.vulnerabilities[0].risk_assessment).toBeDefined();
      expect(parsedContent.pageInfo.hasNextPage).toBe(true);
      expect(parsedContent.totalCount).toBe(5);
    });

    it('should handle vulnerability with minimal data', async () => {
      const mockVulnerabilities = {
        items: [
          {
            id: 'vuln-minimal',
            vulnerability: {
              summary: null,
              identifier: 'CVE-2023-5678',
              severity: 'CRITICAL',
              cvssV3BaseScore: null,
              cvssV2BaseScore: 7.5,
              fixedVersions: [],
              details: null,
              aliases: [],
              referenceUrls: [],
            },
            package: {
              name: 'minimal-package',
            },
            packageVersion: {
              version: '0.5.0',
            },
          },
        ],
        pageInfo: null,
        totalCount: 1,
      };

      mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilities);

      const result = await handleDeepsourceDependencyVulnerabilities({
        projectKey: 'test-project',
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const vuln = parsedContent.vulnerabilities[0];

      expect(vuln.title).toBe('CVE-2023-5678'); // Falls back to identifier
      expect(vuln.cvssScore).toBe(7.5); // Uses V2 score
      expect(vuln.fixedIn).toBeNull();
      expect(vuln.description).toBe(''); // Falls back to empty string
      expect(vuln.risk_assessment.fixed_version_available).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getDependencyVulnerabilities.mockRejectedValue(new Error('API Error'));

      const result = await handleDeepsourceDependencyVulnerabilities({
        projectKey: 'test-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('API Error');
      expect(parsedContent.project_key).toBe('test-project');
    });
  });

  describe('project-runs handler', () => {
    it('should handle successful runs response', async () => {
      const mockRuns = {
        items: [
          {
            id: 'run-graphql-id-1',
            runUid: 'run-uid-123',
            commitOid: 'abc123commit',
            branchName: 'main',
            baseOid: 'base123commit',
            status: 'SUCCESS',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:05:00Z',
            finishedAt: '2023-01-01T00:05:00Z',
            summary: {
              occurrencesIntroduced: 5,
              occurrencesResolved: 2,
              occurrencesSuppressed: 1,
              occurrenceDistributionByAnalyzer: [
                {
                  analyzerShortcode: 'python',
                  introduced: 3,
                },
              ],
              occurrenceDistributionByCategory: [
                {
                  category: 'bug-risk',
                  introduced: 2,
                },
              ],
            },
            repository: {
              name: 'test-repo',
              id: 'repo-graphql-id-1',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 1,
      };

      mockClient.listRuns.mockResolvedValue(mockRuns);

      const result = await handleDeepsourceProjectRuns({
        projectKey: 'test-project',
        analyzerIn: ['python'],
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.runs).toHaveLength(1);
      expect(parsedContent.runs[0].id).toBe('run-graphql-id-1');
      expect(parsedContent.runs[0].status).toBe('SUCCESS');
      expect(parsedContent.totalCount).toBe(1);
      expect(parsedContent.pageInfo.hasNextPage).toBe(false);
    });

    it('should handle runs API errors', async () => {
      mockClient.listRuns.mockRejectedValue(new Error('Runs API Error'));

      const result = await handleDeepsourceProjectRuns({
        projectKey: 'test-project',
      });

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('Runs API Error');
    });
  });

  describe('recent-run-issues handler', () => {
    it('should handle successful recent issues response', async () => {
      const mockRecentIssues = {
        run: {
          id: 'run-graphql-id-1',
          runUid: 'run-uid-123',
          commitOid: 'abc123commit',
          branchName: 'main',
          baseOid: 'base123commit',
          status: 'SUCCESS',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:05:00Z',
          finishedAt: '2023-01-01T00:05:00Z',
          summary: {
            occurrencesIntroduced: 5,
            occurrencesResolved: 2,
            occurrencesSuppressed: 1,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        },
        items: [
          {
            id: 'issue-1',
            title: 'Test issue',
            shortcode: 'PY-E1101',
            category: 'BUG',
            severity: 'MAJOR',
            status: 'OPEN',
            issue_text: 'Instance of class has no attribute',
            file_path: 'src/test.py',
            line_number: 42,
            tags: ['python', 'bug-risk'],
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'start123',
          endCursor: 'end123',
        },
        totalCount: 5,
      };

      mockClient.getRecentRunIssues.mockResolvedValue(mockRecentIssues);

      const result = await handleDeepsourceRecentRunIssues({
        projectKey: 'test-project',
        branchName: 'main',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-graphql-id-1');
      expect(parsedContent.issues).toHaveLength(1);
      expect(parsedContent.issues[0].id).toBe('issue-1');
      expect(parsedContent.issues[0].title).toBe('Test issue');
      expect(parsedContent.totalCount).toBe(5);
      expect(parsedContent.pageInfo.hasNextPage).toBe(true);
    });

    it('should handle case when no recent run is found', async () => {
      const mockRecentIssuesNoRun = {
        run: null,
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      };

      mockClient.getRecentRunIssues.mockResolvedValue(mockRecentIssuesNoRun);

      const result = await handleDeepsourceRecentRunIssues({
        projectKey: 'test-project',
        branchName: 'feature-branch',
      });

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain(
        'No recent analysis run found for branch "feature-branch"'
      );
      expect(parsedContent.project_key).toBe('test-project');
    });

    it('should handle recent issues API errors', async () => {
      mockClient.getRecentRunIssues.mockRejectedValue(new Error('Recent Issues Error'));

      const result = await handleDeepsourceRecentRunIssues({
        projectKey: 'test-project',
        branchName: 'main',
      });

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('Recent Issues Error');
    });
  });

  describe('run handler', () => {
    it('should handle successful run response by runUid', async () => {
      const mockRun = {
        id: 'run-graphql-id-1',
        runUid: 'run-uid-123',
        commitOid: 'abc123commit',
        branchName: 'main',
        baseOid: 'base123commit',
        status: 'SUCCESS',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:05:00Z',
        finishedAt: '2023-01-01T00:05:00Z',
        summary: {
          occurrencesIntroduced: 5,
          occurrencesResolved: 2,
          occurrencesSuppressed: 1,
          occurrenceDistributionByAnalyzer: [
            {
              analyzerShortcode: 'python',
              introduced: 3,
            },
          ],
          occurrenceDistributionByCategory: [
            {
              category: 'bug-risk',
              introduced: 2,
            },
          ],
        },
        repository: {
          name: 'test-repo',
          id: 'repo-graphql-id-1',
        },
      };

      mockClient.getRun.mockResolvedValue(mockRun);

      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'run-uid-123',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-graphql-id-1');
      expect(parsedContent.run.status).toBe('SUCCESS');
      expect(parsedContent.run.runUid).toBe('run-uid-123');
    });

    it('should handle successful run response by commitOid', async () => {
      const mockRun = {
        id: 'run-graphql-id-2',
        runUid: 'run-uid-456',
        commitOid: 'def456commit',
        branchName: 'feature',
        baseOid: 'base456commit',
        status: 'FAILED',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:05:00Z',
        finishedAt: '2023-01-02T00:05:00Z',
        summary: {
          occurrencesIntroduced: 10,
          occurrencesResolved: 0,
          occurrencesSuppressed: 0,
        },
        repository: {
          name: 'test-repo',
          id: 'repo-graphql-id-1',
        },
      };

      mockClient.getRun.mockResolvedValue(mockRun);

      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'def456commit',
        isCommitOid: true,
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.id).toBe('run-graphql-id-2');
      expect(parsedContent.run.status).toBe('FAILED');
      expect(parsedContent.run.commitOid).toBe('def456commit');
    });

    it('should handle case when run is not found', async () => {
      mockClient.getRun.mockResolvedValue(null);

      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'nonexistent-run',
      });

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toContain('Run with runUid "nonexistent-run" not found');
      expect(parsedContent.project_key).toBe('test-project');
    });

    it('should handle different run statuses and include proper analysis info', async () => {
      const testStatuses = ['PENDING', 'FAILURE', 'TIMEOUT', 'CANCEL', 'READY', 'SKIPPED'];

      for (const status of testStatuses) {
        const mockRun = {
          id: `run-${status.toLowerCase()}`,
          runUid: `run-uid-${status.toLowerCase()}`,
          commitOid: 'abc123commit',
          branchName: 'main',
          baseOid: 'base123commit',
          status,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:05:00Z',
          finishedAt: '2023-01-01T00:05:00Z',
          summary: {
            occurrencesIntroduced: 1,
            occurrencesResolved: 0,
            occurrencesSuppressed: 0,
          },
          repository: {
            name: 'test-repo',
            id: 'repo-graphql-id-1',
          },
        };

        mockClient.getRun.mockResolvedValue(mockRun);

        const result = await handleDeepsourceRun({
          projectKey: 'test-project',
          runIdentifier: `run-uid-${status.toLowerCase()}`,
        });

        expect(result.isError).toBeUndefined();
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.run.status).toBe(status);
        expect(parsedContent.analysis.status_info).toBeDefined();
        expect(parsedContent.analysis.status_info).not.toBe('');

        // Verify that the status info contains relevant information
        if (status === 'PENDING') {
          expect(parsedContent.analysis.status_info).toContain('queued');
        } else if (status === 'FAILURE') {
          expect(parsedContent.analysis.status_info).toContain('failed');
        }
      }
    });

    it('should handle unknown run status', async () => {
      const mockRun = {
        id: 'run-unknown',
        runUid: 'run-uid-unknown',
        commitOid: 'abc123commit',
        branchName: 'main',
        baseOid: 'base123commit',
        status: 'UNKNOWN_STATUS',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:05:00Z',
        finishedAt: '2023-01-01T00:05:00Z',
        summary: {
          occurrencesIntroduced: 0,
          occurrencesResolved: 0,
          occurrencesSuppressed: 0,
        },
        repository: {
          name: 'test-repo',
          id: 'repo-graphql-id-1',
        },
      };

      mockClient.getRun.mockResolvedValue(mockRun);

      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'run-uid-unknown',
      });

      expect(result.isError).toBeUndefined();
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.run.status).toBe('UNKNOWN_STATUS');
      expect(parsedContent.analysis.status_info).toBe('Unknown status: UNKNOWN_STATUS');
    });

    it('should handle run API errors', async () => {
      mockClient.getRun.mockRejectedValue(new Error('Run API Error'));

      const result = await handleDeepsourceRun({
        projectKey: 'test-project',
        runIdentifier: 'run-123',
      });

      expect(result.isError).toBe(true);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.error).toBe('Run API Error');
    });
  });
});

// Test helper functions separately
describe('Helper Functions Tests', () => {
  // Import helper functions by importing the module and accessing its internals
  // Since the functions are not exported, we'll test them through the main handler
  it('should test severity level descriptions through vulnerability response', async () => {
    process.env.DEEPSOURCE_API_KEY = 'test-key';

    const testCases = [
      { severity: 'CRITICAL', expected: 'Critical - Requires immediate attention' },
      { severity: 'HIGH', expected: 'High - Should be addressed promptly' },
      { severity: 'MEDIUM', expected: 'Medium - Should be planned for remediation' },
      { severity: 'LOW', expected: 'Low - Fix when possible' },
      { severity: 'UNKNOWN', expected: 'Unknown severity level: UNKNOWN' },
    ];

    for (const { severity, expected } of testCases) {
      const mockVulnerabilities = {
        items: [
          {
            id: 'test-vuln',
            vulnerability: {
              summary: 'Test',
              identifier: 'CVE-2023-TEST',
              severity,
              cvssV3BaseScore: null,
              cvssV2BaseScore: null,
              fixedVersions: [],
              details: null,
              aliases: [],
              referenceUrls: [],
            },
            package: { name: 'test-pkg' },
            packageVersion: { version: '1.0.0' },
          },
        ],
        pageInfo: null,
        totalCount: 1,
      };

      mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilities);

      const result = await handleDeepsourceDependencyVulnerabilities({
        projectKey: 'test-project',
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const riskAssessment = parsedContent.vulnerabilities[0].risk_assessment.severity_level;
      expect(riskAssessment).toContain(expected);
    }
  });

  it('should test CVSS score descriptions through vulnerability response', async () => {
    process.env.DEEPSOURCE_API_KEY = 'test-key';

    const testCases = [
      { score: 9.5, expected: 'Critical (9.5/10)' },
      { score: 8.0, expected: 'High (8/10)' },
      { score: 5.5, expected: 'Medium (5.5/10)' },
      { score: 2.0, expected: 'Low (2/10)' },
      { score: null, expected: 'No CVSS score available' },
    ];

    for (const { score, expected } of testCases) {
      const mockVulnerabilities = {
        items: [
          {
            id: 'test-vuln',
            vulnerability: {
              summary: 'Test',
              identifier: 'CVE-2023-TEST',
              severity: 'HIGH',
              cvssV3BaseScore: score,
              cvssV2BaseScore: null,
              fixedVersions: [],
              details: null,
              aliases: [],
              referenceUrls: [],
            },
            package: { name: 'test-pkg' },
            packageVersion: { version: '1.0.0' },
          },
        ],
        pageInfo: null,
        totalCount: 1,
      };

      mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilities);

      const result = await handleDeepsourceDependencyVulnerabilities({
        projectKey: 'test-project',
      });

      const parsedContent = JSON.parse(result.content[0].text);
      const cvssDescription = parsedContent.vulnerabilities[0].risk_assessment.cvss_description;
      expect(cvssDescription).toContain(expected);
    }
  });

  it('should test remediation advice through vulnerability response', async () => {
    process.env.DEEPSOURCE_API_KEY = 'test-key';

    // Test with fixed version available
    const mockVulnerabilitiesWithFix = {
      items: [
        {
          id: 'test-vuln',
          vulnerability: {
            summary: 'Test',
            identifier: 'CVE-2023-TEST',
            severity: 'HIGH',
            cvssV3BaseScore: 7.5,
            cvssV2BaseScore: null,
            fixedVersions: ['2.0.0'],
            details: null,
            aliases: [],
            referenceUrls: [],
          },
          package: { name: 'vulnerable-pkg' },
          packageVersion: { version: '1.0.0' },
        },
      ],
      pageInfo: null,
      totalCount: 1,
    };

    mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilitiesWithFix);

    const result = await handleDeepsourceDependencyVulnerabilities({
      projectKey: 'test-project',
    });

    const parsedContent = JSON.parse(result.content[0].text);
    const advice = parsedContent.vulnerabilities[0].risk_assessment.remediation_advice;
    expect(advice).toContain('Update vulnerable-pkg to version 2.0.0');

    // Test with no fix available
    const mockVulnerabilitiesNoFix = {
      items: [
        {
          id: 'test-vuln',
          vulnerability: {
            summary: 'Test',
            identifier: 'CVE-2023-TEST',
            severity: 'HIGH',
            cvssV3BaseScore: 7.5,
            cvssV2BaseScore: null,
            fixedVersions: [],
            details: null,
            aliases: [],
            referenceUrls: [],
          },
          package: { name: 'unfixable-pkg' },
          packageVersion: { version: '1.0.0' },
        },
      ],
      pageInfo: null,
      totalCount: 1,
    };

    mockClient.getDependencyVulnerabilities.mockResolvedValue(mockVulnerabilitiesNoFix);

    const result2 = await handleDeepsourceDependencyVulnerabilities({
      projectKey: 'test-project',
    });

    const parsedContent2 = JSON.parse(result2.content[0].text);
    const advice2 = parsedContent2.vulnerabilities[0].risk_assessment.remediation_advice;
    expect(advice2).toContain('Consider replacing unfixable-pkg with a secure alternative');
  });
});
