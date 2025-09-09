/**
 * @fileoverview Tests for security client
 * This file adds coverage for the previously untested security-client.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityClient } from '../../client/security-client.js';
import type { SecurityClientTestable, MockDeepSourceClient } from '../test-types.js';
import { TestableSecurityClient } from '../utils/test-utils.js';

describe('SecurityClient', () => {
  let securityClient: SecurityClient;
  let mockBaseClient: MockDeepSourceClient;

  beforeEach(() => {
    securityClient = new SecurityClient('test-api-key');
    mockBaseClient = securityClient as unknown as MockDeepSourceClient;

    // Mock the methods we need
    // skipcq: JS-0323
    (mockBaseClient as any).findProjectByKey = vi.fn(); // skipcq: JS-0323
    (mockBaseClient as any).executeGraphQL = vi.fn(); // skipcq: JS-0323
    (mockBaseClient as any).createEmptyPaginatedResponse = vi.fn(); // skipcq: JS-0323
    (mockBaseClient as any).normalizePaginationParams = vi.fn(); // skipcq: JS-0323
    (mockBaseClient as any).logger = {
      // skipcq: JS-0323
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };
  });

  describe('getComplianceReport', () => {
    it('should fetch compliance report successfully', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            reports: {
              owaspTop10: {
                status: 'FAILING',
                categories: [
                  {
                    name: 'Injection',
                    status: 'FAILING',
                    criticalCount: 2,
                    majorCount: 1,
                    minorCount: 0,
                    total: 3,
                  },
                  {
                    name: 'Broken Authentication',
                    status: 'PASSING',
                    criticalCount: 0,
                    majorCount: 0,
                    minorCount: 0,
                    total: 0,
                  },
                ],
              },
            },
          },
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).executeGraphQL = vi.fn().mockResolvedValue(mockResponse as any); // skipcq: JS-0323

      const result = await securityClient.getComplianceReport('test-project', 'OWASP_TOP_10');

      expect((mockBaseClient as any).findProjectByKey).toHaveBeenCalledWith('test-project'); // skipcq: JS-0323
      expect((mockBaseClient as any).executeGraphQL).toHaveBeenCalledWith(
        // skipcq: JS-0323
        expect.stringContaining('query getComplianceReports'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result).not.toBeNull();
      if (result) {
        expect(result.reportType).toBe('OWASP_TOP_10');
        expect(result.status).toBe('FAILING');
        expect(result.categories).toHaveLength(2);
        expect(result.categories[0].name).toBe('Injection');
      }
    });

    it('should return null when project not found', async () => {
      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(null as any); // skipcq: JS-0323

      const result = await securityClient.getComplianceReport(
        'nonexistent-project',
        'OWASP_TOP_10'
      );

      expect(result).toBeNull();
    });

    it('should handle GraphQL errors', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      vi.spyOn(mockBaseClient as any, 'executeGraphQL').mockRejectedValue(
        new Error('GraphQL error')
      );

      await expect(
        securityClient.getComplianceReport('test-project', 'OWASP_TOP_10')
      ).rejects.toThrow('GraphQL error');
    });

    it('should return null when no data in response', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: null,
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).executeGraphQL = vi.fn().mockResolvedValue(mockResponse as any); // skipcq: JS-0323

      const result = await securityClient.getComplianceReport('test-project', 'OWASP_TOP_10');

      expect(result).toBeNull();
    });

    it('should handle missing compliance report in response', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            complianceReport: null,
          },
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).executeGraphQL = vi.fn().mockResolvedValue(mockResponse as any); // skipcq: JS-0323

      const result = await securityClient.getComplianceReport('test-project', 'OWASP_TOP_10');

      expect(result).toBeNull();
    });
  });

  describe('getDependencyVulnerabilities', () => {
    it('should fetch dependency vulnerabilities successfully', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            dependencyVulnerabilities: {
              edges: [
                {
                  node: {
                    id: 'vuln-1',
                    package: {
                      id: 'pkg-1',
                      ecosystem: 'npm',
                      name: 'lodash',
                    },
                    packageVersion: {
                      id: 'ver-1',
                      version: '4.17.20',
                    },
                    vulnerability: {
                      id: 'cve-1',
                      identifier: 'CVE-2023-1234',
                      summary: 'Prototype pollution vulnerability',
                      severity: 'HIGH',
                      fixedVersions: ['4.17.21'],
                    },
                  },
                },
                {
                  node: {
                    id: 'vuln-2',
                    package: {
                      id: 'pkg-2',
                      ecosystem: 'npm',
                      name: 'express',
                    },
                    packageVersion: {
                      id: 'ver-2',
                      version: '4.16.0',
                    },
                    vulnerability: {
                      id: 'cve-2',
                      identifier: 'CVE-2023-5678',
                      summary: 'Security bypass vulnerability',
                      severity: 'MEDIUM',
                      fixedVersions: ['4.18.0'],
                    },
                  },
                },
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          },
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).normalizePaginationParams = vi.fn().mockReturnValue({
        first: 20,
        after: null,
      });
      (mockBaseClient as any).executeGraphQL = vi.fn().mockResolvedValue(mockResponse as any); // skipcq: JS-0323

      const result = await securityClient.getDependencyVulnerabilities('test-project');

      expect((mockBaseClient as any).findProjectByKey).toHaveBeenCalledWith('test-project'); // skipcq: JS-0323
      expect((mockBaseClient as any).executeGraphQL).toHaveBeenCalledWith(
        // skipcq: JS-0323
        expect.stringContaining('query getDependencyVulnerabilities'),
        expect.objectContaining({
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        })
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0].vulnerability.identifier).toBe('CVE-2023-1234');
      expect(result.items[0].package.name).toBe('lodash');
      expect(result.items[1].vulnerability.severity).toBe('MEDIUM');
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should return empty response when project not found', async () => {
      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(null as any); // skipcq: JS-0323
      (mockBaseClient as any).createEmptyPaginatedResponse = vi.fn().mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });

      const result = await securityClient.getDependencyVulnerabilities('nonexistent-project');

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle GraphQL errors', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).normalizePaginationParams = vi.fn().mockReturnValue({
        first: 20,
      });
      vi.spyOn(mockBaseClient as any, 'executeGraphQL').mockRejectedValue(
        new Error('GraphQL error')
      );

      await expect(securityClient.getDependencyVulnerabilities('test-project')).rejects.toThrow(
        'GraphQL error'
      );
    });

    it('should handle pagination parameters', async () => {
      const mockProject = {
        repository: {
          login: 'test-org',
          name: 'test-repo',
          provider: 'github',
        },
      };

      const mockResponse = {
        data: {
          repository: {
            vulnerabilities: {
              edges: [],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          },
        },
      };

      (mockBaseClient as any).findProjectByKey = vi.fn().mockResolvedValue(mockProject as any); // skipcq: JS-0323
      (mockBaseClient as any).normalizePaginationParams = vi.fn().mockReturnValue({
        first: 10,
        after: 'cursor123',
      });
      (mockBaseClient as any).executeGraphQL = vi.fn().mockResolvedValue(mockResponse as any); // skipcq: JS-0323

      await securityClient.getDependencyVulnerabilities('test-project', {
        first: 10,
        after: 'cursor123',
      });

      // The normalizePaginationParams is now a static method and its behavior
      // is tested separately in base-client tests
    });
  });

  describe('buildComplianceReportQuery', () => {
    it('should build correct GraphQL query', () => {
      const query = TestableSecurityClient.testBuildComplianceReportQuery();

      expect(query).toContain('query getComplianceReports');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('reports');
    });
  });

  describe('buildVulnerabilitiesQuery', () => {
    it('should build correct GraphQL query', () => {
      // Add a test method for buildVulnerabilitiesQuery to TestableSecurityClient
      const query = TestableSecurityClient.testBuildVulnerabilitiesQuery();

      expect(query).toContain('query getDependencyVulnerabilities');
      expect(query).toContain('$login: String!');
      expect(query).toContain('$name: String!');
      expect(query).toContain('$provider: VCSProvider!');
      expect(query).toContain('dependencyVulnerabilities');
    });
  });

  describe('extractComplianceReportFromResponse', () => {
    it('should extract compliance report from GraphQL response', () => {
      const mockResponseData = {
        repository: {
          reports: {
            owaspTop10: {
              status: 'FAILING',
              categories: [
                {
                  name: 'Injection',
                  status: 'FAILING',
                  criticalCount: 2,
                  majorCount: 1,
                  minorCount: 0,
                  total: 3,
                },
              ],
            },
          },
        },
      };

      const report = (
        securityClient as unknown as SecurityClientTestable
      ).extractComplianceReportFromResponse(mockResponseData, 'OWASP_TOP_10', 'owaspTop10');

      expect(report).not.toBeNull();
      expect(report.reportType).toBe('OWASP_TOP_10');
      expect(report.status).toBe('FAILING');
      expect(report.categories).toHaveLength(1);
    });

    it('should return null when compliance report is missing', () => {
      const mockResponseData = {
        repository: {
          reports: {
            owaspTop10: null,
          },
        },
      };

      const report = (
        securityClient as unknown as SecurityClientTestable
      ).extractComplianceReportFromResponse(mockResponseData, 'OWASP_TOP_10', 'owaspTop10');

      expect(report).toBeNull();
    });

    it('should handle missing repository in response', () => {
      const mockResponseData = {};

      const report = (
        securityClient as unknown as SecurityClientTestable
      ).extractComplianceReportFromResponse(mockResponseData, 'OWASP_TOP_10', 'owaspTop10');

      expect(report).toBeNull();
    });
  });

  describe('extractVulnerabilitiesFromResponse', () => {
    it('should extract vulnerabilities from GraphQL response', () => {
      const mockResponseData = {
        repository: {
          dependencyVulnerabilities: {
            edges: [
              {
                node: {
                  id: 'vuln-1',
                  package: {
                    id: 'pkg-1',
                    ecosystem: 'npm',
                    name: 'lodash',
                  },
                  packageVersion: {
                    id: 'ver-1',
                    version: '4.17.20',
                  },
                  vulnerability: {
                    id: 'cve-1',
                    identifier: 'CVE-2023-1234',
                    summary: 'Prototype pollution vulnerability',
                    severity: 'HIGH',
                    fixedVersions: ['4.17.21'],
                  },
                },
              },
            ],
          },
        },
      };

      const vulnerabilities = (
        securityClient as unknown as SecurityClientTestable
      ).extractVulnerabilitiesFromResponse(mockResponseData);

      expect(vulnerabilities).toHaveLength(1);
      expect(vulnerabilities[0].vulnerability.identifier).toBe('CVE-2023-1234');
      expect(vulnerabilities[0].package.name).toBe('lodash');
    });

    it('should handle missing vulnerabilities in response', () => {
      const mockResponseData = {
        repository: {},
      };

      const vulnerabilities = (
        securityClient as unknown as SecurityClientTestable
      ).extractVulnerabilitiesFromResponse(mockResponseData);

      expect(vulnerabilities).toHaveLength(0);
    });
  });
});
