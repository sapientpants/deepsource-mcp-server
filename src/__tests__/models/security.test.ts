/**
 * @jest-environment node
 */

import {
  ReportType,
  ReportStatus,
  ReportTrend,
  SeverityDistribution,
  SecurityIssueStat,
  ComplianceReport,
  VulnerabilitySeverity,
  PackageVersionType,
  VulnerabilityReachability,
  VulnerabilityFixability,
  Package,
  PackageVersion,
  Vulnerability,
  VulnerabilityOccurrence,
  DependencyVulnerabilitiesParams,
  VulnerabilitiesResponse,
} from '../../models/security';

describe('Security Models', () => {
  describe('Enum Types', () => {
    describe('ReportType', () => {
      it('should define the correct report types', () => {
        // Compliance-specific report types
        expect(ReportType.OWASP_TOP_10).toBe('OWASP_TOP_10');
        expect(ReportType.SANS_TOP_25).toBe('SANS_TOP_25');
        expect(ReportType.MISRA_C).toBe('MISRA_C');

        // General report types
        expect(ReportType.CODE_COVERAGE).toBe('CODE_COVERAGE');
        expect(ReportType.CODE_HEALTH_TREND).toBe('CODE_HEALTH_TREND');
        expect(ReportType.ISSUE_DISTRIBUTION).toBe('ISSUE_DISTRIBUTION');
        expect(ReportType.ISSUES_PREVENTED).toBe('ISSUES_PREVENTED');
        expect(ReportType.ISSUES_AUTOFIXED).toBe('ISSUES_AUTOFIXED');
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(ReportType).length).toBe(8);
      });
    });

    describe('ReportStatus', () => {
      it('should define the correct report statuses', () => {
        expect(ReportStatus.PASSING).toBe('PASSING');
        expect(ReportStatus.FAILING).toBe('FAILING');
        expect(ReportStatus.NOOP).toBe('NOOP');
      });

      it('should have the correct number of values', () => {
        expect(Object.keys(ReportStatus).length).toBe(3);
      });
    });
  });

  describe('Type Definitions', () => {
    describe('VulnerabilitySeverity', () => {
      it('should allow valid severity levels', () => {
        const severities: VulnerabilitySeverity[] = [
          'NONE',
          'LOW',
          'MEDIUM',
          'HIGH',
          'CRITICAL',
        ];

        severities.forEach((severity) => {
          expect(typeof severity).toBe('string');
        });
      });
    });

    describe('PackageVersionType', () => {
      it('should allow valid version types', () => {
        const versionTypes: PackageVersionType[] = ['SEMVER', 'ECOSYSTEM', 'GIT'];

        versionTypes.forEach((type) => {
          expect(typeof type).toBe('string');
        });
      });
    });

    describe('VulnerabilityReachability', () => {
      it('should allow valid reachability types', () => {
        const reachabilityTypes: VulnerabilityReachability[] = [
          'REACHABLE',
          'UNREACHABLE',
          'UNKNOWN',
        ];

        reachabilityTypes.forEach((type) => {
          expect(typeof type).toBe('string');
        });
      });
    });

    describe('VulnerabilityFixability', () => {
      it('should allow valid fixability types', () => {
        const fixabilityTypes: VulnerabilityFixability[] = [
          'ERROR',
          'UNFIXABLE',
          'GENERATING_FIX',
          'POSSIBLY_FIXABLE',
          'MANUALLY_FIXABLE',
          'AUTO_FIXABLE',
        ];

        fixabilityTypes.forEach((type) => {
          expect(typeof type).toBe('string');
        });
      });
    });
  });

  describe('Interface Type Checking', () => {
    describe('ReportTrend', () => {
      it('should validate a report trend with all fields', () => {
        const trend: ReportTrend = {
          label: 'Last 30 days',
          value: 85.5,
          changePercentage: 3.2,
        };

        expect(trend.label).toBe('Last 30 days');
        expect(trend.value).toBe(85.5);
        expect(trend.changePercentage).toBe(3.2);
      });

      it('should allow optional fields to be undefined', () => {
        const trend: ReportTrend = {};

        expect(trend.label).toBeUndefined();
        expect(trend.value).toBeUndefined();
        expect(trend.changePercentage).toBeUndefined();
      });
    });

    describe('SeverityDistribution', () => {
      it('should validate a severity distribution', () => {
        const distribution: SeverityDistribution = {
          critical: 5,
          major: 15,
          minor: 30,
          total: 50,
        };

        expect(distribution.critical).toBe(5);
        expect(distribution.major).toBe(15);
        expect(distribution.minor).toBe(30);
        expect(distribution.total).toBe(50);
      });
    });

    describe('SecurityIssueStat', () => {
      it('should validate a security issue stat', () => {
        const stat: SecurityIssueStat = {
          key: 'A1:2017',
          title: 'Injection',
          occurrence: {
            critical: 2,
            major: 5,
            minor: 10,
            total: 17,
          },
        };

        expect(stat.key).toBe('A1:2017');
        expect(stat.title).toBe('Injection');
        expect(stat.occurrence.total).toBe(17);
      });
    });

    describe('ComplianceReport', () => {
      it('should validate a complete compliance report', () => {
        const report: ComplianceReport = {
          key: ReportType.OWASP_TOP_10,
          title: 'OWASP Top 10',
          currentValue: 85.5,
          status: ReportStatus.PASSING,
          securityIssueStats: [
            {
              key: 'A1:2017',
              title: 'Injection',
              occurrence: {
                critical: 0,
                major: 0,
                minor: 0,
                total: 0,
              },
            },
            {
              key: 'A2:2017',
              title: 'Broken Authentication',
              occurrence: {
                critical: 1,
                major: 2,
                minor: 0,
                total: 3,
              },
            },
          ],
          trends: [
            {
              label: 'Last 30 days',
              value: 82.3,
              changePercentage: 3.2,
            },
          ],
        };

        expect(report.key).toBe(ReportType.OWASP_TOP_10);
        expect(report.title).toBe('OWASP Top 10');
        expect(report.currentValue).toBe(85.5);
        expect(report.status).toBe(ReportStatus.PASSING);
        expect(report.securityIssueStats.length).toBe(2);
        expect(report.securityIssueStats[1].key).toBe('A2:2017');
        expect(report.trends![0].changePercentage).toBe(3.2);
      });

      it('should allow optional fields to be undefined', () => {
        const report: ComplianceReport = {
          key: ReportType.SANS_TOP_25,
          title: 'SANS Top 25',
          securityIssueStats: [],
        };

        expect(report.currentValue).toBeUndefined();
        expect(report.status).toBeUndefined();
        expect(report.trends).toBeUndefined();
      });
    });

    describe('Package', () => {
      it('should validate a complete package', () => {
        const pkg: Package = {
          id: 'pkg_123',
          ecosystem: 'NPM',
          name: 'lodash',
          purl: 'pkg:npm/lodash@4.17.21',
        };

        expect(pkg.id).toBe('pkg_123');
        expect(pkg.ecosystem).toBe('NPM');
        expect(pkg.name).toBe('lodash');
        expect(pkg.purl).toBe('pkg:npm/lodash@4.17.21');
      });

      it('should allow optional fields to be undefined', () => {
        const pkg: Package = {
          id: 'pkg_123',
          ecosystem: 'NPM',
          name: 'lodash',
        };

        expect(pkg.purl).toBeUndefined();
      });
    });

    describe('PackageVersion', () => {
      it('should validate a complete package version', () => {
        const version: PackageVersion = {
          id: 'ver_123',
          version: '4.17.21',
          versionType: 'SEMVER',
        };

        expect(version.id).toBe('ver_123');
        expect(version.version).toBe('4.17.21');
        expect(version.versionType).toBe('SEMVER');
      });

      it('should allow optional fields to be undefined', () => {
        const version: PackageVersion = {
          id: 'ver_123',
          version: '4.17.21',
        };

        expect(version.versionType).toBeUndefined();
      });
    });

    describe('Vulnerability', () => {
      it('should validate a complete vulnerability', () => {
        const vulnerability: Vulnerability = {
          id: 'vuln_123',
          identifier: 'CVE-2022-1234',
          aliases: ['GHSA-abcd-efgh-ijkl'],
          summary: 'Prototype pollution vulnerability',
          details: 'A detailed description of the vulnerability...',
          publishedAt: '2022-05-15T10:30:00Z',
          updatedAt: '2022-06-01T14:45:00Z',
          withdrawnAt: undefined,
          severity: 'HIGH',
          cvssV2Vector: 'AV:N/AC:L/Au:N/C:P/I:P/A:P',
          cvssV2BaseScore: 7.5,
          cvssV2Severity: 'HIGH',
          cvssV3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          cvssV3BaseScore: 9.8,
          cvssV3Severity: 'CRITICAL',
          cvssV4Vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H',
          cvssV4BaseScore: 10.0,
          cvssV4Severity: 'CRITICAL',
          epssScore: 0.85,
          epssPercentile: 0.95,
          introducedVersions: ['4.0.0'],
          fixedVersions: ['4.17.21'],
          referenceUrls: ['https://nvd.nist.gov/vuln/detail/CVE-2022-1234'],
        };

        expect(vulnerability.id).toBe('vuln_123');
        expect(vulnerability.identifier).toBe('CVE-2022-1234');
        expect(vulnerability.aliases).toContain('GHSA-abcd-efgh-ijkl');
        expect(vulnerability.severity).toBe('HIGH');
        expect(vulnerability.cvssV3BaseScore).toBe(9.8);
        expect(vulnerability.cvssV3Severity).toBe('CRITICAL');
        expect(vulnerability.epssScore).toBe(0.85);
        expect(vulnerability.introducedVersions).toContain('4.0.0');
        expect(vulnerability.fixedVersions).toContain('4.17.21');
      });

      it('should allow optional fields to be undefined', () => {
        const vulnerability: Vulnerability = {
          id: 'vuln_123',
          identifier: 'CVE-2022-1234',
          aliases: [],
          publishedAt: '2022-05-15T10:30:00Z',
          updatedAt: '2022-06-01T14:45:00Z',
          severity: 'HIGH',
          introducedVersions: [],
          fixedVersions: [],
          referenceUrls: [],
        };

        expect(vulnerability.summary).toBeUndefined();
        expect(vulnerability.details).toBeUndefined();
        expect(vulnerability.withdrawnAt).toBeUndefined();
        expect(vulnerability.cvssV2Vector).toBeUndefined();
        expect(vulnerability.cvssV2BaseScore).toBeUndefined();
        expect(vulnerability.cvssV2Severity).toBeUndefined();
        expect(vulnerability.cvssV3Vector).toBeUndefined();
        expect(vulnerability.cvssV3BaseScore).toBeUndefined();
        expect(vulnerability.cvssV3Severity).toBeUndefined();
        expect(vulnerability.cvssV4Vector).toBeUndefined();
        expect(vulnerability.cvssV4BaseScore).toBeUndefined();
        expect(vulnerability.cvssV4Severity).toBeUndefined();
        expect(vulnerability.epssScore).toBeUndefined();
        expect(vulnerability.epssPercentile).toBeUndefined();
      });
    });

    describe('VulnerabilityOccurrence', () => {
      it('should validate a complete vulnerability occurrence', () => {
        const occurrence: VulnerabilityOccurrence = {
          id: 'occ_123',
          package: {
            id: 'pkg_123',
            ecosystem: 'NPM',
            name: 'lodash',
            purl: 'pkg:npm/lodash',
          },
          packageVersion: {
            id: 'ver_123',
            version: '4.17.20',
            versionType: 'SEMVER',
          },
          vulnerability: {
            id: 'vuln_123',
            identifier: 'CVE-2022-1234',
            aliases: ['GHSA-abcd-efgh-ijkl'],
            publishedAt: '2022-05-15T10:30:00Z',
            updatedAt: '2022-06-01T14:45:00Z',
            severity: 'HIGH',
            introducedVersions: ['4.0.0'],
            fixedVersions: ['4.17.21'],
            referenceUrls: [],
          },
          reachability: 'REACHABLE',
          fixability: 'AUTO_FIXABLE',
        };

        expect(occurrence.id).toBe('occ_123');
        expect(occurrence.package.name).toBe('lodash');
        expect(occurrence.packageVersion.version).toBe('4.17.20');
        expect(occurrence.vulnerability.identifier).toBe('CVE-2022-1234');
        expect(occurrence.reachability).toBe('REACHABLE');
        expect(occurrence.fixability).toBe('AUTO_FIXABLE');
      });
    });

    describe('DependencyVulnerabilitiesParams', () => {
      it('should validate dependency vulnerabilities params', () => {
        const params: DependencyVulnerabilitiesParams = {
          projectKey: 'project_123',
          first: 10,
          after: 'cursor123',
        };

        expect(params.projectKey).toBe('project_123');
        expect(params.first).toBe(10);
        expect(params.after).toBe('cursor123');
      });
    });

    describe('VulnerabilitiesResponse', () => {
      it('should validate vulnerabilities response structure', () => {
        const response: VulnerabilitiesResponse = {
          edges: [
            {
              node: {
                id: 'occ_123',
                package: {
                  id: 'pkg_123',
                  ecosystem: 'NPM',
                  name: 'lodash',
                  purl: 'pkg:npm/lodash',
                },
                packageVersion: {
                  id: 'ver_123',
                  version: '4.17.20',
                  versionType: 'SEMVER',
                },
                vulnerability: {
                  id: 'vuln_123',
                  identifier: 'CVE-2022-1234',
                  aliases: [],
                  publishedAt: '2022-05-15T10:30:00Z',
                  updatedAt: '2022-06-01T14:45:00Z',
                  severity: 'HIGH',
                  introducedVersions: [],
                  fixedVersions: [],
                  referenceUrls: [],
                },
                reachability: 'REACHABLE',
                fixability: 'AUTO_FIXABLE',
              },
              cursor: 'cursor123',
            },
          ],
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: 'cursor123',
            endCursor: 'cursor123',
          },
          totalCount: 1,
        };

        expect(response.edges.length).toBe(1);
        expect(response.edges[0].node.id).toBe('occ_123');
        expect(response.edges[0].node.package.name).toBe('lodash');
        expect(response.pageInfo.hasNextPage).toBe(true);
        expect(response.totalCount).toBe(1);
      });

      it('should validate empty response', () => {
        const response: VulnerabilitiesResponse = {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        };

        expect(response.edges.length).toBe(0);
        expect(response.totalCount).toBe(0);
      });
    });
  });

  // Test JSON serialization and deserialization
  describe('JSON Serialization & Deserialization', () => {
    it('should correctly serialize and deserialize vulnerability object', () => {
      const original: Vulnerability = {
        id: 'vuln_123',
        identifier: 'CVE-2022-1234',
        aliases: ['GHSA-abcd-efgh-ijkl'],
        summary: 'Prototype pollution vulnerability',
        details: 'A detailed description of the vulnerability...',
        publishedAt: '2022-05-15T10:30:00Z',
        updatedAt: '2022-06-01T14:45:00Z',
        severity: 'HIGH',
        cvssV3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        cvssV3BaseScore: 9.8,
        cvssV3Severity: 'CRITICAL',
        introducedVersions: ['4.0.0'],
        fixedVersions: ['4.17.21'],
        referenceUrls: ['https://nvd.nist.gov/vuln/detail/CVE-2022-1234'],
      };

      const json = JSON.stringify(original);
      const deserialized = JSON.parse(json) as Vulnerability;

      expect(deserialized).toEqual(original);
      expect(deserialized.id).toBe('vuln_123');
      expect(deserialized.severity).toBe('HIGH');
      expect(deserialized.cvssV3Severity).toBe('CRITICAL');
    });

    it('should correctly serialize and deserialize compliance report', () => {
      const original: ComplianceReport = {
        key: ReportType.OWASP_TOP_10,
        title: 'OWASP Top 10',
        currentValue: 85.5,
        status: ReportStatus.PASSING,
        securityIssueStats: [
          {
            key: 'A1:2017',
            title: 'Injection',
            occurrence: {
              critical: 0,
              major: 0,
              minor: 0,
              total: 0,
            },
          },
        ],
        trends: [
          {
            label: 'Last 30 days',
            value: 82.3,
            changePercentage: 3.2,
          },
        ],
      };

      const json = JSON.stringify(original);
      const deserialized = JSON.parse(json) as ComplianceReport;

      expect(deserialized).toEqual(original);
      expect(deserialized.key).toBe(ReportType.OWASP_TOP_10);
      expect(deserialized.status).toBe(ReportStatus.PASSING);
    });
  });
});