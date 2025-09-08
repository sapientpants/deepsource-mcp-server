import nock from 'nock';
import { vi } from 'vitest';
import { DeepSourceClient, ReportType } from '../deepsource';
import { handleDeepsourceComplianceReport } from '../handlers';

describe('DeepSource Compliance Reports', () => {
  const API_KEY = 'test-api-key';
  const API_URL = 'https://api.deepsource.io';
  const PROJECT_KEY = 'test-project-key';
  const LOGIN = 'test-login';
  const NAME = 'test-repo';
  const PROVIDER = 'GITHUB';

  let client: DeepSourceClient;

  beforeEach(() => {
    // Create a fresh client instance
    client = new DeepSourceClient(API_KEY);

    // Clean up any existing nock interceptors
    nock.cleanAll();

    // Mock the environment variable
    process.env.DEEPSOURCE_API_KEY = API_KEY;

    // Mock the listProjects request
    nock(API_URL)
      .post('/graphql/')
      .reply(200, {
        data: {
          viewer: {
            accounts: {
              edges: [
                {
                  node: {
                    login: LOGIN,
                    repositories: {
                      edges: [
                        {
                          node: {
                            name: NAME,
                            dsn: PROJECT_KEY,
                            vcsProvider: PROVIDER,
                            isPrivate: false,
                            isActivated: true,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env.DEEPSOURCE_API_KEY;
  });

  describe('getComplianceReport', () => {
    it('should fetch OWASP Top 10 compliance report', async () => {
      // Mock the report request
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              name: NAME,
              id: 'repo-id',
              reports: {
                owaspTop10: {
                  key: 'OWASP_TOP_10',
                  title: 'OWASP Top 10',
                  currentValue: 85,
                  status: 'FAILING',
                  securityIssueStats: [
                    {
                      key: 'A1',
                      title: 'Injection',
                      occurrence: {
                        critical: 2,
                        major: 3,
                        minor: 1,
                        total: 6,
                      },
                    },
                    {
                      key: 'A2',
                      title: 'Broken Authentication',
                      occurrence: {
                        critical: 1,
                        major: 1,
                        minor: 2,
                        total: 4,
                      },
                    },
                  ],
                  trends: [
                    {
                      label: 'Issues',
                      value: 10,
                      changePercentage: -5.2,
                    },
                  ],
                },
              },
            },
          },
        });

      // Call the method
      const report = await client.getComplianceReport(PROJECT_KEY, ReportType.OWASP_TOP_10);

      // Assertions
      expect(report).not.toBeNull();
      if (report) {
        expect(report.key).toBe(ReportType.OWASP_TOP_10);
        expect(report.title).toBe('OWASP Top 10');
        expect(report.currentValue).toBe(85);
        expect(report.status).toBe('FAILING');
        expect(report.securityIssueStats.length).toBe(2);
        expect(report.securityIssueStats[0].key).toBe('A1');
        expect(report.securityIssueStats[0].occurrence.critical).toBe(2);
        expect(report.securityIssueStats[0].occurrence.total).toBe(6);
        expect(report.trends?.length).toBe(1);
        expect(report.trends?.[0].changePercentage).toBe(-5.2);
      }
    });

    it('should return null if project not found', async () => {
      // Mock the report request with a project not found response
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: null,
          },
        });

      // Call the method
      const report = await client.getComplianceReport(
        'non-existent-project',
        ReportType.OWASP_TOP_10
      );

      // Assert
      expect(report).toBeNull();
    });

    it('should throw an error for an invalid report type', async () => {
      // Call the method with an invalid report type
      await expect(
        client.getComplianceReport(PROJECT_KEY, 'INVALID_TYPE' as ReportType)
      ).rejects.toThrow(/Invalid report type/);
    });

    it('should handle GraphQL errors', async () => {
      // Mock the report request with errors
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          errors: [{ message: 'Test GraphQL error' }],
        });

      // Call the method and expect it to throw
      await expect(
        client.getComplianceReport(PROJECT_KEY, ReportType.OWASP_TOP_10)
      ).rejects.toThrow(/GraphQL Errors/);
    });

    it('should return null when error contains NoneType (line 2655)', async () => {
      // Create a custom client that will be used for testing
      const customClient = new DeepSourceClient(API_KEY);

      // Mock the validateProjectKey method to do nothing (avoid needing to mock listProjects)
      // We're specifically testing the error handling in the getComplianceReport method,
      // so we bypass this validation step
      // @ts-expect-error - accessing private method
      vi.spyOn(DeepSourceClient, 'validateProjectKey').mockImplementation(() => {
        // Intentionally empty - validation is not relevant to this error handling test
      });

      // Mock the client's post method to throw a NoneType error
      vi.spyOn(customClient['client'], 'post').mockImplementation(() => {
        throw new Error('NoneType object has no attribute get');
      });

      // Call the actual getComplianceReport method, which should invoke the catch block with line 2655
      const result = await customClient.getComplianceReport(PROJECT_KEY, ReportType.OWASP_TOP_10);

      // Assert the expected behavior
      expect(result).toBeNull();
    });

    it('should return null when error contains not found message (line 2655)', async () => {
      // Create a custom client that will be used for testing
      const customClient = new DeepSourceClient(API_KEY);

      // Mock the validateProjectKey method to do nothing (avoid needing to mock listProjects)
      // We're specifically testing the error handling in the getComplianceReport method,
      // so we bypass this validation step
      // @ts-expect-error - accessing private method
      vi.spyOn(DeepSourceClient, 'validateProjectKey').mockImplementation(() => {
        // Intentionally empty - validation is not relevant to this error handling test
      });

      // Mock the client's post method to throw a not found error
      vi.spyOn(customClient['client'], 'post').mockImplementation(() => {
        throw new Error('Repository not found in database');
      });

      // Call the actual getComplianceReport method, which should invoke the catch block with line 2655
      const result = await customClient.getComplianceReport(PROJECT_KEY, ReportType.SANS_TOP_25);

      // Assert the expected behavior
      expect(result).toBeNull();
    });
  });

  describe('handleDeepsourceComplianceReport', () => {
    it.skip('should return formatted report with analysis', async () => {
      // Mock the report request
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              name: NAME,
              id: 'repo-id',
              reports: {
                sansTop25: {
                  key: 'SANS_TOP_25',
                  title: 'SANS Top 25',
                  currentValue: 92,
                  status: 'PASSING',
                  securityIssueStats: [
                    {
                      key: 'S1',
                      title: 'Buffer Overflow',
                      occurrence: {
                        critical: 0,
                        major: 1,
                        minor: 2,
                        total: 3,
                      },
                    },
                  ],
                  trends: [
                    {
                      label: 'Issues',
                      value: 3,
                      changePercentage: -15.0,
                    },
                  ],
                },
              },
            },
          },
        });

      // Call the handler
      const result = await handleDeepsourceComplianceReport({
        projectKey: PROJECT_KEY,
        reportType: ReportType.SANS_TOP_25,
      });

      // Parse the response
      const response = JSON.parse(result.content[0].text);

      // Assertions
      expect(response.key).toBe(ReportType.SANS_TOP_25);
      expect(response.title).toBe('SANS Top 25');
      expect(response.status).toBe('PASSING');
      expect(response.securityIssueStats.length).toBe(1);

      // Verify analysis was included
      expect(response.analysis).toBeDefined();
      expect(response.analysis.critical_issues).toBe(0);
      expect(response.analysis.major_issues).toBe(1);
      expect(response.analysis.minor_issues).toBe(2);
      expect(response.analysis.total_issues).toBe(3);

      // Verify recommendations
      expect(response.recommendations).toBeDefined();
      expect(response.recommendations.actions).toContain('Continue monitoring security compliance');
      expect(response.recommendations.resources[0]).toContain('SANS Top 25');
    });

    it('should throw error when API key is not set', async () => {
      // Remove the API key
      delete process.env.DEEPSOURCE_API_KEY;

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: PROJECT_KEY,
          reportType: ReportType.MISRA_C,
        })
      ).rejects.toThrow('Configuration error: DeepSource API key is required but not configured');
    });

    it.skip('should throw error when report is not found', async () => {
      // Mock the report request with a null report
      nock(API_URL)
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              reports: {
                misraC: null,
              },
            },
          },
        });

      // Call the handler and expect it to throw
      await expect(
        handleDeepsourceComplianceReport({
          projectKey: PROJECT_KEY,
          reportType: ReportType.MISRA_C,
        })
      ).rejects.toThrow(/Report of type.*not found/);
    });
  });
});
