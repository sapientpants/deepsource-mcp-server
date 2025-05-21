/**
 * Tests for GraphQL query functions
 */
import {
  VIEWER_PROJECTS_QUERY,
  createIssuesQuery,
  createRunsQuery,
  createRunQuery,
  createRecentRunQuery,
  createRunIssuesQuery,
  createVulnerabilitiesQuery,
  createQualityMetricsQuery,
  createUpdateMetricThresholdMutation,
  createUpdateMetricSettingMutation,
  createComplianceReportQuery,
} from '../../../utils/graphql/queries';

describe('GraphQL Queries', () => {
  // Comment out unused helper function for now
  /* Helper function for whitespace normalization if needed in future tests
  const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
  */

  describe('VIEWER_PROJECTS_QUERY', () => {
    it('should contain required fields for project listing', () => {
      // The query should include necessary fields for project data
      expect(VIEWER_PROJECTS_QUERY).toContain('viewer {');
      expect(VIEWER_PROJECTS_QUERY).toContain('email');
      expect(VIEWER_PROJECTS_QUERY).toContain('accounts {');
      expect(VIEWER_PROJECTS_QUERY).toContain('repositories(first: 100)');
      expect(VIEWER_PROJECTS_QUERY).toContain('name');
      expect(VIEWER_PROJECTS_QUERY).toContain('dsn');
      expect(VIEWER_PROJECTS_QUERY).toContain('vcsProvider');
    });
  });

  describe('createIssuesQuery', () => {
    it('should create a basic issues query with no filters or pagination', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = {};

      // Act
      const query = createIssuesQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain('issues(');
      expect(query).toContain('edges {');
      expect(query).toContain('node {');
      expect(query).toContain('id');
      expect(query).toContain('title');
      expect(query).toContain('shortcode');
      expect(query).toContain('category');
      expect(query).toContain('path');
      expect(query).toContain('beginLine');
      expect(query).not.toContain('filter:');
    });

    it('should add path filter when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = { path: 'src/main.js' };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain('path: {eq: "src/main.js"}');
    });

    it('should add analyzer filter when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = { analyzerIn: ['javascript', 'typescript'] };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain('analyzer: {in: ["javascript", "typescript"]}');
    });

    it('should add tags filter when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = { tags: ['security', 'bug'] };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain('tags: {overlap: ["security", "bug"]}');
    });

    it('should add forward pagination when first is provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 10 };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('issues(first: 10)');
    });

    it('should add forward pagination with cursor when first and after are provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 10, after: 'cursor123' };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('issues(first: 10, after: "cursor123")');
    });

    it('should add backward pagination when last is provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { last: 10 };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('issues(last: 10)');
    });

    it('should add backward pagination with cursor when last and before are provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { last: 10, before: 'cursor456' };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('issues(last: 10, before: "cursor456")');
    });

    it('should add offset pagination when offset is provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { offset: 20 };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('issues(offset: 20)');
    });

    it('should handle multiple filters together', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 10 };
      const filterVars = {
        path: 'src/main.js',
        analyzerIn: ['javascript'],
        tags: ['security'],
      };

      // Act
      const query = createIssuesQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain('path: {eq: "src/main.js"}');
      expect(query).toContain('analyzer: {in: ["javascript"]}');
      expect(query).toContain('tags: {overlap: ["security"]}');
      expect(query).toContain('issues(first: 10, filter: {');
    });
  });

  describe('createRunsQuery', () => {
    it('should create a basic runs query with project key', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = {};

      // Act
      const query = createRunsQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain('runs(');
      expect(query).toContain('edges {');
      expect(query).toContain('node {');
      expect(query).toContain('runUid');
      expect(query).toContain('createdAt');
      expect(query).toContain('status');
    });

    it('should add pagination when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 5 };

      // Act
      const query = createRunsQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('runs(first: 5');
    });

    it('should add analyzer filter when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = {};
      const filterVars = { analyzerIn: ['python', 'go'] };

      // Act
      const query = createRunsQuery(projectKey, paginationVars, filterVars);

      // Assert
      expect(query).toContain('analyzer: {in: ["python", "go"]}');
    });
  });

  describe('createRunQuery', () => {
    it('should create query by runUid when runUid is provided', () => {
      // Arrange
      const runIdentifier = 'run-123-uid';

      // Act
      const query = createRunQuery(runIdentifier);

      // Assert
      expect(query).toContain(`run(runUid: "${runIdentifier}")`);
      expect(query).toContain('status');
      expect(query).toContain('repository {');
      expect(query).toContain('commitOid');
    });

    it('should create query by commitOid when a likely commit hash is provided', () => {
      // Arrange - Use a string that looks like a git commit hash
      const commitHash = '8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b';

      // Act
      const query = createRunQuery(commitHash);

      // Assert
      expect(query).toContain(`run(commitOid: "${commitHash}")`);
    });
  });

  describe('createRecentRunQuery', () => {
    it('should create a query for the most recent run on a branch', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const branchName = 'main';

      // Act
      const query = createRecentRunQuery(projectKey, branchName);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain(`filter: {branchName: {eq: "${branchName}"}}`);
      expect(query).toContain('sort: {field: CREATED_AT, direction: DESC}');
      expect(query).toContain('runs(first: 1,');
      expect(query).toContain('edges {');
      expect(query).toContain('node {');
      expect(query).toContain('runUid');
      expect(query).toContain('commitOid');
      expect(query).toContain('branchName');
      expect(query).toContain('status');
      expect(query).toContain('summary {');
    });
  });

  describe('createRunIssuesQuery', () => {
    it('should create a query for issues in a run with basic pagination', () => {
      // Arrange
      const runId = 'run-123';
      const paginationVars = { first: 10 };

      // Act
      const query = createRunIssuesQuery(runId, paginationVars);

      // Assert
      expect(query).toContain(`run(id: "${runId}")`);
      expect(query).toContain('checks {');
      expect(query).toContain('occurrences(first: 10)');
      expect(query).toContain('pageInfo {');
      expect(query).toContain('edges {');
      expect(query).toContain('issue {');
      expect(query).toContain('shortcode');
      expect(query).toContain('title');
      expect(query).toContain('category');
      expect(query).toContain('severity');
      expect(query).toContain('path');
      expect(query).toContain('beginLine');
    });

    it('should include pagination with after cursor', () => {
      // Arrange
      const runId = 'run-123';
      const paginationVars = { first: 10, after: 'cursor123' };

      // Act
      const query = createRunIssuesQuery(runId, paginationVars);

      // Assert
      expect(query).toContain('occurrences(first: 10, after: "cursor123")');
    });

    it('should include pagination with before cursor', () => {
      // Arrange
      const runId = 'run-123';
      const paginationVars = { last: 10, before: 'cursor123' };

      // Act
      const query = createRunIssuesQuery(runId, paginationVars);

      // Assert
      expect(query).toContain('occurrences(last: 10, before: "cursor123")');
    });

    it('should include pagination with offset', () => {
      // Arrange
      const runId = 'run-123';
      const paginationVars = { offset: 20 };

      // Act
      const query = createRunIssuesQuery(runId, paginationVars);

      // Assert
      expect(query).toContain('occurrences(offset: 20)');
    });
  });

  describe('createVulnerabilitiesQuery', () => {
    it('should create a basic query for dependency vulnerabilities', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 10 };

      // Act
      const query = createVulnerabilitiesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain('dependencyVulnerabilities(first: 10)');
      expect(query).toContain('pageInfo {');
      expect(query).toContain('totalCount');
      expect(query).toContain('package {');
      expect(query).toContain('ecosystem');
      expect(query).toContain('name');
      expect(query).toContain('packageVersion {');
      expect(query).toContain('vulnerability {');
      expect(query).toContain('identifier');
      expect(query).toContain('severity');
      expect(query).toContain('reachability');
      expect(query).toContain('fixability');
    });

    it('should include pagination with after cursor', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { first: 10, after: 'cursor123' };

      // Act
      const query = createVulnerabilitiesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('dependencyVulnerabilities(first: 10, after: "cursor123")');
    });

    it('should include pagination with before cursor', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { last: 10, before: 'cursor123' };

      // Act
      const query = createVulnerabilitiesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('dependencyVulnerabilities(last: 10, before: "cursor123")');
    });

    it('should include pagination with offset', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const paginationVars = { offset: 20 };

      // Act
      const query = createVulnerabilitiesQuery(projectKey, paginationVars);

      // Assert
      expect(query).toContain('dependencyVulnerabilities(offset: 20)');
    });
  });

  describe('createQualityMetricsQuery', () => {
    it('should create a basic query for quality metrics without filters', () => {
      // Arrange
      const projectKey = 'test-project-key';

      // Act
      const query = createQualityMetricsQuery(projectKey);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain('metrics(');
      expect(query).toContain('edges {');
      expect(query).toContain('node {');
      expect(query).toContain('name');
      expect(query).toContain('shortcode');
      expect(query).toContain('description');
      expect(query).toContain('items {');
      expect(query).not.toContain('filter:');
    });

    it('should include shortcode filter when provided', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const shortcodeFilter = ['LCV', 'DDP'];

      // Act
      const query = createQualityMetricsQuery(projectKey, shortcodeFilter);

      // Assert
      expect(query).toContain('filter: {shortcode: {in: ["LCV", "DDP"]}}');
    });

    it('should handle empty shortcode filter array', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const shortcodeFilter: string[] = [];

      // Act
      const query = createQualityMetricsQuery(projectKey, shortcodeFilter);

      // Assert
      expect(query).not.toContain('filter:');
    });
  });

  describe('createUpdateMetricThresholdMutation', () => {
    it('should create a mutation to set a numeric threshold', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        metricKey: 'PYTHON',
        thresholdValue: 80,
      };

      // Act
      const mutation = createUpdateMetricThresholdMutation(params);

      // Assert
      expect(mutation).toContain('mutation {');
      expect(mutation).toContain('setMetricThreshold(');
      expect(mutation).toContain('input: {');
      expect(mutation).toContain(`repositoryId: "${params.repositoryId}"`);
      expect(mutation).toContain(`metricShortcode: "${params.metricShortcode}"`);
      expect(mutation).toContain(`metricKey: "${params.metricKey}"`);
      expect(mutation).toContain(`thresholdValue: ${params.thresholdValue}`);
      expect(mutation).toContain('ok');
    });

    it('should create a mutation to remove a threshold', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        metricKey: 'PYTHON',
        thresholdValue: null,
      };

      // Act
      const mutation = createUpdateMetricThresholdMutation(params);

      // Assert
      expect(mutation).toContain('thresholdValue: null');
    });

    it('should handle zero as a valid threshold value', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'DDP',
        metricKey: 'AGGREGATE',
        thresholdValue: 0,
      };

      // Act
      const mutation = createUpdateMetricThresholdMutation(params);

      // Assert
      expect(mutation).toContain('thresholdValue: 0');
    });
  });

  describe('createUpdateMetricSettingMutation', () => {
    it('should create a mutation to enable reporting and threshold enforcement', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        isReported: true,
        isThresholdEnforced: true,
      };

      // Act
      const mutation = createUpdateMetricSettingMutation(params);

      // Assert
      expect(mutation).toContain('mutation {');
      expect(mutation).toContain('updateMetricSetting(');
      expect(mutation).toContain('input: {');
      expect(mutation).toContain(`repositoryId: "${params.repositoryId}"`);
      expect(mutation).toContain(`metricShortcode: "${params.metricShortcode}"`);
      expect(mutation).toContain('isReported: true');
      expect(mutation).toContain('isThresholdEnforced: true');
      expect(mutation).toContain('ok');
    });

    it('should create a mutation to disable reporting and threshold enforcement', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        isReported: false,
        isThresholdEnforced: false,
      };

      // Act
      const mutation = createUpdateMetricSettingMutation(params);

      // Assert
      expect(mutation).toContain('isReported: false');
      expect(mutation).toContain('isThresholdEnforced: false');
    });

    it('should create a mutation to enable reporting but disable threshold enforcement', () => {
      // Arrange
      const params = {
        repositoryId: 'repo-123',
        metricShortcode: 'LCV',
        isReported: true,
        isThresholdEnforced: false,
      };

      // Act
      const mutation = createUpdateMetricSettingMutation(params);

      // Assert
      expect(mutation).toContain('isReported: true');
      expect(mutation).toContain('isThresholdEnforced: false');
    });
  });

  describe('createComplianceReportQuery', () => {
    it('should create a query for OWASP Top 10 report', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const reportType = 'OWASP_TOP_10';

      // Act
      const query = createComplianceReportQuery(projectKey, reportType);

      // Assert
      expect(query).toContain(`repository(name: "${projectKey}")`);
      expect(query).toContain(`complianceReport(reportType: ${reportType})`);
      expect(query).toContain('key');
      expect(query).toContain('title');
      expect(query).toContain('currentValue');
      expect(query).toContain('status');
      expect(query).toContain('securityIssueStats {');
      expect(query).toContain('trends');
    });

    it('should create a query for SANS Top 25 report', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const reportType = 'SANS_TOP_25';

      // Act
      const query = createComplianceReportQuery(projectKey, reportType);

      // Assert
      expect(query).toContain(`complianceReport(reportType: ${reportType})`);
    });

    it('should create a query for MISRA C report', () => {
      // Arrange
      const projectKey = 'test-project-key';
      const reportType = 'MISRA_C';

      // Act
      const query = createComplianceReportQuery(projectKey, reportType);

      // Assert
      expect(query).toContain(`complianceReport(reportType: ${reportType})`);
    });
  });
});
