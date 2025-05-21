/**
 * @fileoverview GraphQL queries for the DeepSource API
 * This module provides pre-defined GraphQL queries for various API operations.
 */

/**
 * Helper function to create a pagination string for GraphQL queries
 * @param paginationVars Pagination variables
 * @returns Formatted pagination string
 * @private
 */
function createPaginationString(paginationVars: Record<string, unknown>): string {
  // Define pagination modes with their parameters
  const paginationModes = [
    {
      check: () => Boolean(paginationVars.first),
      format: () => {
        let result = `first: ${paginationVars.first}`;
        if (paginationVars.after) {
          result += `, after: "${paginationVars.after}"`;
        }
        return result;
      },
    },
    {
      check: () => Boolean(paginationVars.last),
      format: () => {
        let result = `last: ${paginationVars.last}`;
        if (paginationVars.before) {
          result += `, before: "${paginationVars.before}"`;
        }
        return result;
      },
    },
    {
      check: () => Boolean(paginationVars.offset),
      format: () => `offset: ${paginationVars.offset}`,
    },
  ];

  // Find the first applicable pagination mode
  const applicableMode = paginationModes.find((mode) => mode.check());

  // Return the formatted string or empty string if no mode applies
  return applicableMode ? applicableMode.format() : '';
}

/**
 * Query to fetch the list of projects for the current user
 * @public
 */
export const VIEWER_PROJECTS_QUERY = `
query {
  viewer {
    email
    accounts {
      edges {
        node {
          login
          repositories(first: 100) {
            edges {
              node {
                name
                defaultBranch
                dsn
                isPrivate
                isActivated
                vcsProvider
              }
            }
          }
        }
      }
    }
  }
}
`.trim();

/**
 * Query to fetch issues from a project with pagination
 * @param projectKey The DeepSource project key
 * @param paginationVars Pagination variables for the query
 * @param filterVars Filter variables for the query
 * @returns GraphQL query for fetching issues
 * @public
 */
export function createIssuesQuery(
  projectKey: string,
  paginationVars: Record<string, unknown>,
  filterVars: Record<string, unknown> = {}
): string {
  const filterExpressions = [];

  if (filterVars.path) {
    filterExpressions.push(`path: {eq: "${filterVars.path}"}`);
  }

  if (filterVars.analyzerIn && Array.isArray(filterVars.analyzerIn)) {
    const analyzers = (filterVars.analyzerIn as string[]).map((a) => `"${a}"`).join(', ');
    filterExpressions.push(`analyzer: {in: [${analyzers}]}`);
  }

  if (filterVars.tags && Array.isArray(filterVars.tags)) {
    const tags = (filterVars.tags as string[]).map((t) => `"${t}"`).join(', ');
    filterExpressions.push(`tags: {overlap: [${tags}]}`);
  }

  const filterString =
    filterExpressions.length > 0 ? `, filter: {${filterExpressions.join(', ')}}` : '';

  const paginationString = createPaginationString(paginationVars);

  return `
query {
  repository(name: "${projectKey}") {
    issues(${paginationString}${filterString}) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
      edges {
        node {
          id
          title
          shortcode
          category
          severity
          status
          issueText
          path
          beginLine
          tags
        }
      }
    }
  }
}
`.trim();
}

/**
 * Query to fetch analysis runs from a project with pagination
 * @param projectKey The DeepSource project key
 * @param paginationVars Pagination variables for the query
 * @param filterVars Filter variables for the query
 * @returns GraphQL query for fetching runs
 * @public
 */
export function createRunsQuery(
  projectKey: string,
  paginationVars: Record<string, unknown>,
  filterVars: Record<string, unknown> = {}
): string {
  const filterExpressions = [];

  if (filterVars.analyzerIn && Array.isArray(filterVars.analyzerIn)) {
    const analyzers = (filterVars.analyzerIn as string[]).map((a) => `"${a}"`).join(', ');
    filterExpressions.push(`analyzer: {in: [${analyzers}]}`);
  }

  const filterString =
    filterExpressions.length > 0 ? `, filter: {${filterExpressions.join(', ')}}` : '';

  const paginationString = createPaginationString(paginationVars);

  return `
query {
  repository(name: "${projectKey}") {
    runs(${paginationString}${filterString}) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
      edges {
        node {
          id
          runUid
          commitOid
          branchName
          baseOid
          status
          createdAt
          updatedAt
          finishedAt
          summary {
            occurrencesIntroduced
            occurrencesResolved
            occurrencesSuppressed
            occurrenceDistributionByAnalyzer {
              analyzerShortcode
              introduced
            }
            occurrenceDistributionByCategory {
              category
              introduced
            }
          }
          repository {
            name
            id
          }
        }
      }
    }
  }
}
`.trim();
}

/**
 * Query to fetch a specific run by ID or commit hash
 * @param runIdentifier The run UID or commit hash to fetch
 * @returns GraphQL query for fetching a run
 * @public
 */
export function createRunQuery(runIdentifier: string): string {
  // Determine if the identifier is a commit hash or run UID
  const isCommitHash = /^[0-9a-f]{7,40}$/i.test(runIdentifier);

  const queryField = isCommitHash ? 'commitOid' : 'runUid';

  return `
query {
  run(${queryField}: "${runIdentifier}") {
    id
    runUid
    commitOid
    branchName
    baseOid
    status
    createdAt
    updatedAt
    finishedAt
    summary {
      occurrencesIntroduced
      occurrencesResolved
      occurrencesSuppressed
      occurrenceDistributionByAnalyzer {
        analyzerShortcode
        introduced
      }
      occurrenceDistributionByCategory {
        category
        introduced
      }
    }
    repository {
      name
      id
    }
  }
}
`.trim();
}

/**
 * Query to fetch the most recent run for a branch
 * @param projectKey The DeepSource project key
 * @param branchName The branch name to find runs for
 * @returns GraphQL query for fetching the most recent run
 * @public
 */
export function createRecentRunQuery(projectKey: string, branchName: string): string {
  return `
query {
  repository(name: "${projectKey}") {
    runs(first: 1, filter: {branchName: {eq: "${branchName}"}}, sort: {field: CREATED_AT, direction: DESC}) {
      edges {
        node {
          id
          runUid
          commitOid
          branchName
          baseOid
          status
          createdAt
          updatedAt
          finishedAt
          summary {
            occurrencesIntroduced
            occurrencesResolved
            occurrencesSuppressed
          }
        }
      }
    }
  }
}
`.trim();
}

/**
 * Query to fetch issues from a specific run with pagination
 * @param runId The run ID to fetch issues for
 * @param paginationVars Pagination variables for the query
 * @returns GraphQL query for fetching run issues
 * @public
 */
export function createRunIssuesQuery(
  runId: string,
  paginationVars: Record<string, unknown>
): string {
  const paginationString = createPaginationString(paginationVars);

  return `
query {
  run(id: "${runId}") {
    checks {
      edges {
        node {
          occurrences(${paginationString}) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
            edges {
              node {
                id
                issue {
                  shortcode
                  title
                  category
                  severity
                  description
                  tags
                }
                path
                beginLine
              }
            }
          }
        }
      }
    }
  }
}
`.trim();
}

/**
 * Query to fetch dependency vulnerabilities with pagination
 * @param projectKey The DeepSource project key
 * @param paginationVars Pagination variables for the query
 * @returns GraphQL query for fetching vulnerabilities
 * @public
 */
export function createVulnerabilitiesQuery(
  projectKey: string,
  paginationVars: Record<string, unknown>
): string {
  const paginationString = createPaginationString(paginationVars);

  return `
query {
  repository(name: "${projectKey}") {
    dependencyVulnerabilities(${paginationString}) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
      edges {
        node {
          id
          package {
            id
            ecosystem
            name
            purl
          }
          packageVersion {
            id
            version
            versionType
          }
          vulnerability {
            id
            identifier
            aliases
            summary
            details
            publishedAt
            updatedAt
            withdrawnAt
            severity
            cvssV2Vector
            cvssV2BaseScore
            cvssV2Severity
            cvssV3Vector
            cvssV3BaseScore
            cvssV3Severity
            cvssV4Vector
            cvssV4BaseScore
            cvssV4Severity
            epssScore
            epssPercentile
            introducedVersions
            fixedVersions
            referenceUrls
          }
          reachability
          fixability
        }
      }
    }
  }
}
`.trim();
}

/**
 * Query to fetch quality metrics
 * @param projectKey The DeepSource project key
 * @param shortcodeFilter Optional filter for specific metric shortcodes
 * @returns GraphQL query for fetching quality metrics
 * @public
 */
export function createQualityMetricsQuery(projectKey: string, shortcodeFilter?: string[]): string {
  const filterString = shortcodeFilter?.length
    ? `, filter: {shortcode: {in: [${shortcodeFilter.map((s) => `"${s}"`).join(', ')}]}}`
    : '';

  return `
query {
  repository(name: "${projectKey}") {
    id
    metrics(${filterString}) {
      edges {
        node {
          name
          shortcode
          description
          positiveDirection
          unit
          minValueAllowed
          maxValueAllowed
          isReported
          isThresholdEnforced
          items {
            id
            key
            threshold
            latestValue
            latestValueDisplay
            thresholdStatus
          }
        }
      }
    }
  }
}
`.trim();
}

/**
 * Mutation to update a metric threshold
 * @param params Parameters for the update
 * @returns GraphQL mutation for updating a metric threshold
 * @public
 */
export function createUpdateMetricThresholdMutation(params: {
  repositoryId: string;
  metricShortcode: string;
  metricKey: string;
  thresholdValue: number | null;
}): string {
  const { repositoryId, metricShortcode, metricKey, thresholdValue } = params;

  const valueString = thresholdValue !== null ? thresholdValue.toString() : 'null';

  return `
mutation {
  setMetricThreshold(
    input: {
      repositoryId: "${repositoryId}",
      metricShortcode: "${metricShortcode}",
      metricKey: "${metricKey}",
      thresholdValue: ${valueString}
    }
  ) {
    ok
  }
}
`.trim();
}

/**
 * Mutation to update metric settings
 * @param params Parameters for the update
 * @returns GraphQL mutation for updating metric settings
 * @public
 */
export function createUpdateMetricSettingMutation(params: {
  repositoryId: string;
  metricShortcode: string;
  isReported: boolean;
  isThresholdEnforced: boolean;
}): string {
  const { repositoryId, metricShortcode, isReported, isThresholdEnforced } = params;

  return `
mutation {
  updateMetricSetting(
    input: {
      repositoryId: "${repositoryId}",
      metricShortcode: "${metricShortcode}",
      isReported: ${isReported},
      isThresholdEnforced: ${isThresholdEnforced}
    }
  ) {
    ok
  }
}
`.trim();
}

/**
 * Query to fetch a compliance report
 * @param projectKey The DeepSource project key
 * @param reportType The type of report to fetch
 * @returns GraphQL query for fetching a compliance report
 * @public
 */
export function createComplianceReportQuery(projectKey: string, reportType: string): string {
  return `
query {
  repository(name: "${projectKey}") {
    complianceReport(reportType: ${reportType}) {
      key
      title
      currentValue
      status
      securityIssueStats {
        key
        title
        occurrence {
          critical
          major
          minor
          total
        }
      }
      trends
    }
  }
}
`.trim();
}
