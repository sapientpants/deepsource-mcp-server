import nock from 'nock';
import { jest } from '@jest/globals';
import { DeepSourceClient, ReportType } from '../deepsource';

// Mock logger to verify it's called properly
const mockWarn = jest.fn();
jest.mock('../utils/logging/logger', () => ({
  createLogger: jest.fn(() => ({
    warn: mockWarn,
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('DeepSource Client Coverage Gaps', () => {
  const API_KEY = 'test-api-key';
  let client: DeepSourceClient;

  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
    client = new DeepSourceClient(API_KEY);
  });

  afterAll(() => {
    nock.restore();
  });

  describe('getComplianceReport function', () => {
    it('should handle API errors correctly', async () => {
      // Mock the listProjects call first
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      login: 'testorg',
                      repositories: {
                        edges: [
                          {
                            node: {
                              name: 'test-repo',
                              defaultBranch: 'main',
                              dsn: 'test-project',
                              isPrivate: false,
                              isActivated: true,
                              vcsProvider: 'github',
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

      // Mock the second request to throw an error
      nock('https://api.deepsource.io').post('/graphql/').replyWithError('Network error');

      // Test that the error is properly handled
      await expect(
        client.getComplianceReport('test-project', ReportType.OWASP_TOP_10)
      ).rejects.toThrow();
    });
  });

  describe('getDependencyVulnerabilities function', () => {
    it('should handle empty project list', async () => {
      // Mock empty projects response
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            viewer: {
              accounts: {
                edges: [],
              },
            },
          },
        });

      const result = await client.getDependencyVulnerabilities('nonexistent-project');

      expect(result).toEqual({
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      });
    });
  });
  describe('getQualityMetrics function', () => {
    it('should handle metric not found errors', async () => {
      // Mock the listProjects call first
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            viewer: {
              accounts: {
                edges: [
                  {
                    node: {
                      login: 'testorg',
                      repositories: {
                        edges: [
                          {
                            node: {
                              name: 'test-repo',
                              defaultBranch: 'main',
                              dsn: 'test-project',
                              isPrivate: false,
                              isActivated: true,
                              vcsProvider: 'github',
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

      // Mock the metrics response with no metrics data
      nock('https://api.deepsource.io')
        .post('/graphql/')
        .reply(200, {
          data: {
            repository: {
              // Missing metrics or empty metrics array
            },
          },
        });

      // Test empty metrics response
      const result = await client.getQualityMetrics('test-project', {});
      expect(result).toEqual([]);
    });
  });
});
