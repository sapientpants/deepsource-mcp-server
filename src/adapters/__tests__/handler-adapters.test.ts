import { describe, it, expect } from 'vitest';
import {
  adaptQualityMetricsParams,
  adaptUpdateMetricThresholdParams,
  adaptUpdateMetricSettingParams,
  adaptComplianceReportParams,
  adaptProjectIssuesParams,
  adaptDependencyVulnerabilitiesParams,
  adaptProjectRunsParams,
  adaptRunParams,
  adaptRecentRunIssuesParams,
  adaptToDomainQualityMetricsParams,
  adaptToDomainUpdateMetricThresholdParams,
  adaptToDomainUpdateMetricSettingParams,
  adaptToDomainComplianceReportParams,
  adaptToDomainProjectIssuesParams,
  adaptToDomainDependencyVulnerabilitiesParams,
  adaptToDomainProjectRunsParams,
  adaptToDomainRunParams,
  adaptToDomainRecentRunIssuesParams,
} from '../handler-adapters.js';
// The following are imported but not used directly in tests, only in type assertions
// import { MetricShortcode } from '../../types/metrics.js';
// import { ReportType } from '../../types/reports.js';

describe('Handler Adapters', () => {
  describe('Quality Metrics Adapters', () => {
    it('should adapt quality metrics parameters', () => {
      const params = {
        projectKey: 'test-project',
        shortcodeIn: ['LCV', 'BCV'],
      };

      const adapted = adaptQualityMetricsParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.shortcodeIn).toEqual(['LCV', 'BCV']);
    });

    it('should handle optional shortcodeIn', () => {
      const params = {
        projectKey: 'test-project',
      };

      const adapted = adaptQualityMetricsParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.shortcodeIn).toBeUndefined();
    });

    it('should adapt to domain quality metrics parameters', () => {
      const params = {
        projectKey: 'test-project',
        shortcodeIn: ['LCV', 'BCV'],
      };

      const adapted = adaptToDomainQualityMetricsParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.shortcodeIn).toEqual(['LCV', 'BCV']);
    });
  });

  describe('Update Metric Threshold Adapters', () => {
    it('should adapt update metric threshold parameters', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        metricKey: 'metric-key',
        thresholdValue: 80,
      };

      const adapted = adaptUpdateMetricThresholdParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.repositoryId).toBe('repo123');
      expect(adapted.metricShortcode).toBe('LCV');
      expect(adapted.metricKey).toBe('metric-key');
      expect(adapted.thresholdValue).toBe(80);
    });

    it('should handle null threshold value', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        metricKey: 'metric-key',
        thresholdValue: null,
      };

      const adapted = adaptUpdateMetricThresholdParams(params);
      expect(adapted.thresholdValue).toBeNull();
    });

    it('should adapt to domain update metric threshold parameters', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        metricKey: 'metric-key',
        thresholdValue: 80,
      };

      const adapted = adaptToDomainUpdateMetricThresholdParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.repositoryId).toBe('repo123');
      expect(adapted.metricShortcode).toBe('LCV');
      expect(adapted.metricKey).toBe('metric-key');
      expect(adapted.thresholdValue).toBe(80);
    });
  });

  describe('Update Metric Setting Adapters', () => {
    it('should adapt update metric setting parameters', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        isReported: true,
        isThresholdEnforced: false,
      };

      const adapted = adaptUpdateMetricSettingParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.repositoryId).toBe('repo123');
      expect(adapted.metricShortcode).toBe('LCV');
      expect(adapted.isReported).toBe(true);
      expect(adapted.isThresholdEnforced).toBe(false);
    });

    it('should adapt to domain update metric setting parameters', () => {
      const params = {
        projectKey: 'test-project',
        repositoryId: 'repo123',
        metricShortcode: 'LCV',
        isReported: true,
        isThresholdEnforced: false,
      };

      const adapted = adaptToDomainUpdateMetricSettingParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.repositoryId).toBe('repo123');
      expect(adapted.metricShortcode).toBe('LCV');
      expect(adapted.isReported).toBe(true);
      expect(adapted.isThresholdEnforced).toBe(false);
    });
  });

  describe('Compliance Report Adapters', () => {
    it('should adapt compliance report parameters', () => {
      const params = {
        projectKey: 'test-project',
        reportType: 'OWASP_TOP_10',
      };

      const adapted = adaptComplianceReportParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.reportType).toBe('OWASP_TOP_10');
    });

    it('should adapt to domain compliance report parameters', () => {
      const params = {
        projectKey: 'test-project',
        reportType: 'OWASP_TOP_10',
      };

      const adapted = adaptToDomainComplianceReportParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.reportType).toBe('OWASP_TOP_10');
    });
  });

  describe('Project Issues Adapters', () => {
    it('should adapt project issues parameters', () => {
      const params = {
        projectKey: 'test-project',
        path: '/src/test.js',
        analyzerIn: ['javascript', 'test-coverage'],
        tags: ['bug', 'security'],
        first: 50,
        after: 'cursor123',
      };

      const adapted = adaptProjectIssuesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.path).toBe('/src/test.js');
      expect(adapted.analyzerIn).toEqual(['javascript', 'test-coverage']);
      expect(adapted.tags).toEqual(['bug', 'security']);
      expect(adapted.first).toBe(50);
      expect(adapted.after).toBe('cursor123');
    });

    it('should handle optional parameters', () => {
      const params = {
        projectKey: 'test-project',
      };

      const adapted = adaptProjectIssuesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.path).toBeUndefined();
      expect(adapted.analyzerIn).toBeUndefined();
      expect(adapted.tags).toBeUndefined();
      expect(adapted.first).toBeUndefined();
    });

    it('should adapt to domain project issues parameters', () => {
      const params = {
        projectKey: 'test-project',
        analyzerIn: ['javascript', 'test-coverage'],
        first: 50,
      };

      const adapted = adaptToDomainProjectIssuesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.analyzerIn).toEqual(['javascript', 'test-coverage']);
      expect(adapted.first).toBe(50);
    });
  });

  describe('Dependency Vulnerabilities Adapters', () => {
    it('should adapt dependency vulnerabilities parameters', () => {
      const params = {
        projectKey: 'test-project',
        first: 25,
        after: 'cursor456',
      };

      const adapted = adaptDependencyVulnerabilitiesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.first).toBe(25);
      expect(adapted.after).toBe('cursor456');
    });

    it('should adapt to domain dependency vulnerabilities parameters', () => {
      const params = {
        projectKey: 'test-project',
        last: 25,
        before: 'cursor456',
      };

      const adapted = adaptToDomainDependencyVulnerabilitiesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.last).toBe(25);
      expect(adapted.before).toBe('cursor456');
    });
  });

  describe('Project Runs Adapters', () => {
    it('should adapt project runs parameters', () => {
      const params = {
        projectKey: 'test-project',
        analyzerIn: ['javascript', 'python'],
        first: 10,
        after: 'cursor789',
      };

      const adapted = adaptProjectRunsParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.analyzerIn).toEqual(['javascript', 'python']);
      expect(adapted.first).toBe(10);
      expect(adapted.after).toBe('cursor789');
    });

    it('should adapt to domain project runs parameters', () => {
      const params = {
        projectKey: 'test-project',
        analyzerIn: ['javascript', 'python'],
        last: 10,
      };

      const adapted = adaptToDomainProjectRunsParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.analyzerIn).toEqual(['javascript', 'python']);
      expect(adapted.last).toBe(10);
    });
  });

  describe('Run Adapters', () => {
    it('should adapt run parameters with runId', () => {
      const params = {
        projectKey: 'test-project',
        runIdentifier: 'run123',
        isCommitOid: false,
      };

      const adapted = adaptRunParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.runIdentifier).toBe('run123');
      expect(adapted.isCommitOid).toBe(false);
    });

    it('should adapt run parameters with commitOid', () => {
      const params = {
        projectKey: 'test-project',
        runIdentifier: 'abc123def',
        isCommitOid: true,
      };

      const adapted = adaptRunParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.runIdentifier).toBe('abc123def');
      expect(adapted.isCommitOid).toBe(true);
    });

    it('should default isCommitOid to false', () => {
      const params = {
        projectKey: 'test-project',
        runIdentifier: 'run123',
      };

      const adapted = adaptRunParams(params);
      expect(adapted.isCommitOid).toBe(false);
    });

    it('should adapt to domain run parameters', () => {
      const params = {
        projectKey: 'test-project',
        runIdentifier: 'run123',
        isCommitOid: false,
      };

      const adapted = adaptToDomainRunParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.runIdentifier).toBe('run123');
      expect(adapted.isCommitOid).toBe(false);
    });
  });

  describe('Recent Run Issues Adapters', () => {
    it('should adapt recent run issues parameters', () => {
      const params = {
        projectKey: 'test-project',
        branchName: 'main',
        first: 100,
        after: 'cursor999',
      };

      const adapted = adaptRecentRunIssuesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.branchName).toBe('main');
      expect(adapted.first).toBe(100);
      expect(adapted.after).toBe('cursor999');
    });

    it('should adapt to domain recent run issues parameters', () => {
      const params = {
        projectKey: 'test-project',
        branchName: 'develop',
        last: 50,
        before: 'cursor888',
      };

      const adapted = adaptToDomainRecentRunIssuesParams(params);
      expect(adapted.projectKey).toBe('test-project');
      expect(adapted.branchName).toBe('develop');
      expect(adapted.last).toBe(50);
      expect(adapted.before).toBe('cursor888');
    });
  });
});
