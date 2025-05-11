import axios, { AxiosError } from 'axios';

/**
 * @fileoverview DeepSource API client for interacting with the DeepSource service.
 * This module exports interfaces and classes for working with the DeepSource API.
 * @packageDocumentation
 */

// Interfaces and types below are exported as part of the public API

/**
 * Represents a DeepSource project in the API
 * @public
 */
export interface DeepSourceProject {
  key: string;
  name: string;
  repository: {
    url: string;
    provider: string;
    login: string;
    isPrivate: boolean;
    isActivated: boolean;
  };
}

/**
 * Represents an issue found by DeepSource analysis
 * @public
 */
export interface DeepSourceIssue {
  id: string;
  title: string;
  shortcode: string;
  category: string;
  severity: string;
  status: string;
  issue_text: string;
  file_path: string;
  line_number: number;
  tags: string[];
}

/**
 * Distribution of occurrences by analyzer type
 * @public
 */
export interface OccurrenceDistributionByAnalyzer {
  analyzerShortcode: string;
  introduced: number;
}

/**
 * Distribution of occurrences by category
 * @public
 */
export interface OccurrenceDistributionByCategory {
  category: string;
  introduced: number;
}

/**
 * Summary of an analysis run, including counts of issues
 * @public
 */
export interface RunSummary {
  occurrencesIntroduced: number;
  occurrencesResolved: number;
  occurrencesSuppressed: number;
  occurrenceDistributionByAnalyzer?: OccurrenceDistributionByAnalyzer[];
  occurrenceDistributionByCategory?: OccurrenceDistributionByCategory[];
}

/**
 * Possible status values for an analysis run
 * Using a type instead of enum to avoid unused enum values linting errors
 * @public
 */
export type AnalysisRunStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMEOUT'
  | 'CANCEL'
  | 'READY'
  | 'SKIPPED';

/**
 * Represents a DeepSource analysis run
 * @public
 */
export interface DeepSourceRun {
  id: string;
  runUid: string;
  commitOid: string;
  branchName: string;
  baseOid: string;
  status: AnalysisRunStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  summary: RunSummary;
  repository: {
    name: string;
    id: string;
  };
}

/**
 * Parameters for paginating through API results
 * @public
 */
export interface PaginationParams {
  /** Legacy pagination: Number of items to skip */
  offset?: number;
  /** Relay-style pagination: Number of items to return after the 'after' cursor */
  first?: number;
  /** Relay-style pagination: Cursor to fetch records after this cursor */
  after?: string;
  /** Relay-style pagination: Cursor to fetch records before this cursor */
  before?: string;
  /** Relay-style pagination: Number of items to return before the 'before' cursor */
  last?: number;
}

/**
 * Parameters for filtering issues
 * @public
 */
export interface IssueFilterParams extends PaginationParams {
  /** Filter issues by path (file path) */
  path?: string;
  /** Filter issues by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
  /** Filter issues by tags */
  tags?: string[];
}

/**
 * Parameters for filtering runs
 * @public
 */
export interface RunFilterParams extends PaginationParams {
  /** Filter runs by analyzer shortcodes (e.g. ["python", "javascript"]) */
  analyzerIn?: string[];
}

/**
 * Generic response structure containing paginated results
 * @public
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}

export class DeepSourceClient {
  /**
   * HTTP client for making API requests to DeepSource
   * @private
   */
  private client;

  /**
   * Creates a new DeepSourceClient instance
   * @param apiKey - DeepSource API key for authentication
   */
  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.deepsource.io/graphql/',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Handles GraphQL errors by formatting and throwing appropriate error messages
   * @param error - The error object from the GraphQL request
   * @throws Error with formatted GraphQL error messages
   */
  private static handleGraphQLError(error: Error | unknown): never {
    if (error instanceof AxiosError && error.response?.data?.errors) {
      const graphqlErrors: Array<{ message: string }> = error.response.data.errors;
      throw new Error(`GraphQL Error: ${graphqlErrors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }

  /**
   * Fetches a list of all accessible DeepSource projects
   * @returns Promise that resolves to an array of DeepSourceProject objects
   */
  async listProjects(): Promise<DeepSourceProject[]> {
    try {
      const viewerQuery = `
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
      `;

      const response = await this.client.post('', {
        query: viewerQuery.trim(),
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const accounts = response.data.data?.viewer?.accounts?.edges || [];
      const allRepos: DeepSourceProject[] = [];

      for (const { node: account } of accounts) {
        const repos = account.repositories?.edges || [];
        for (const { node: repo } of repos) {
          if (!repo.dsn) continue;
          allRepos.push({
            key: repo.dsn,
            name: repo.name || 'Unnamed Repository',
            repository: {
              url: repo.dsn,
              provider: repo.vcsProvider || 'N/A',
              login: account.login,
              isPrivate: repo.isPrivate || false,
              isActivated: repo.isActivated || false,
            },
          });
        }
      }

      return allRepos;
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoneType')) {
        return [];
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches issues from a specified DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param params - Optional pagination and filtering parameters for the query.
   *                Supports both legacy pagination (offset) and Relay-style cursor-based pagination.
   *                For forward pagination use 'first' with optional 'after' cursor.
   *                For backward pagination use 'last' with optional 'before' cursor.
   *                Note: Using both 'first' and 'last' together is not recommended and will prioritize
   *                'last' if 'before' is provided, otherwise will prioritize 'first'.
   *
   *                When 'last' is provided without 'before', a warning will be logged, but the
   *                request will still be processed using 'last'. For standard Relay behavior,
   *                'last' should always be accompanied by 'before'.
   *
   *                Filtering parameters:
   *                - path: Filter issues by specific file path
   *                - analyzerIn: Filter issues by specific analyzers
   *                - tags: Filter issues by tags
   * @returns Promise that resolves to a paginated response containing DeepSource issues
   */
  async getIssues(
    projectKey: string,
    params: IssueFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceIssue>> {
    try {
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }

      // Set default pagination parameters
      const paramsWithDefaults = {
        ...params,
      };

      // Ensure we're not using both first and last at the same time (not recommended in Relay)
      if (paramsWithDefaults.before) {
        // When fetching backwards with 'before', prioritize 'last'
        paramsWithDefaults.last = params.last ?? params.first ?? 10;
        paramsWithDefaults.first = undefined;
      } else if (paramsWithDefaults.last) {
        // If 'last' is provided without 'before', add a warning but still use 'last'
        // This is not standard Relay behavior but we'll support it for flexibility
        console.warn(
          'Using "last" without "before" is not standard Relay pagination behavior. Consider using "first" for forward pagination.'
        );
        paramsWithDefaults.last = params.last;
        paramsWithDefaults.first = undefined;
      } else {
        // Default or forward pagination with 'after', prioritize 'first'
        paramsWithDefaults.first = params.first ?? 10;
        paramsWithDefaults.last = undefined;
      }

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $path: String, $analyzerIn: [String], $tags: [String]) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            defaultBranch
            dsn
            isPrivate
            issues(offset: $offset, first: $first, after: $after, before: $before, last: $last, path: $path, analyzerIn: $analyzerIn, tags: $tags) {
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
                  occurrences(first: 100) {
                    edges {
                      node {
                        id
                        path
                        beginLine
                        endLine
                        beginColumn
                        endColumn
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          offset: paramsWithDefaults.offset,
          first: paramsWithDefaults.first,
          after: paramsWithDefaults.after,
          before: paramsWithDefaults.before,
          last: paramsWithDefaults.last,
          path: paramsWithDefaults.path,
          analyzerIn: paramsWithDefaults.analyzerIn,
          tags: paramsWithDefaults.tags,
        },
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const issues: DeepSourceIssue[] = [];
      const repoIssues = response.data.data?.repository?.issues?.edges || [];
      const pageInfo = response.data.data?.repository?.issues?.pageInfo || {
        hasNextPage: false,
        hasPreviousPage: false,
      };
      const totalCount = response.data.data?.repository?.issues?.totalCount || 0;

      for (const { node: repoIssue } of repoIssues) {
        const occurrences = repoIssue.occurrences?.edges || [];
        for (const { node: occurrence } of occurrences) {
          issues.push({
            id: occurrence.id || 'unknown',
            shortcode: repoIssue.issue?.shortcode || '',
            title: repoIssue.issue?.title || 'Untitled Issue',
            category: repoIssue.issue?.category || 'UNKNOWN',
            severity: repoIssue.issue?.severity || 'UNKNOWN',
            status: 'OPEN',
            issue_text: repoIssue.issue?.description || '',
            file_path: occurrence.path || 'N/A',
            line_number: occurrence.beginLine || 0,
            tags: repoIssue.issue?.tags || [],
          });
        }
      }

      return {
        items: issues,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          hasPreviousPage: pageInfo.hasPreviousPage,
          startCursor: pageInfo.startCursor,
          endCursor: pageInfo.endCursor,
        },
        totalCount,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoneType')) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches a specific issue from a DeepSource project by its ID
   * @param projectKey - The unique identifier for the DeepSource project
   * @param issueId - The unique identifier of the issue to retrieve
   * @returns Promise that resolves to the issue if found, or null if not found
   */
  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      const result = await this.getIssues(projectKey);
      const issue = result.items.find((issue) => issue.id === issueId);
      return issue || null;
    } catch (error) {
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches analysis runs for a specified DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param params - Optional pagination and filtering parameters for the query
   *                Pagination supports both legacy pagination (offset) and Relay-style cursor-based pagination.
   *                Filtering parameters:
   *                - analyzerIn: Filter runs by specific analyzers
   * @returns Promise that resolves to a paginated response containing DeepSource runs
   */
  async listRuns(
    projectKey: string,
    params: RunFilterParams = {}
  ): Promise<PaginatedResponse<DeepSourceRun>> {
    try {
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }

      // Set default pagination parameters
      const paramsWithDefaults = { ...params };

      // Ensure we're not using both first and last at the same time (not recommended in Relay)
      if (paramsWithDefaults.before) {
        // When fetching backwards with 'before', prioritize 'last'
        paramsWithDefaults.last = params.last ?? params.first ?? 10;
        paramsWithDefaults.first = undefined;
      } else if (paramsWithDefaults.last) {
        // If 'last' is provided without 'before', add a warning but still use 'last'
        console.warn(
          'Using "last" without "before" is not standard Relay pagination behavior. Consider using "first" for forward pagination.'
        );
        paramsWithDefaults.last = params.last;
        paramsWithDefaults.first = undefined;
      } else {
        // Default or forward pagination with 'after', prioritize 'first'
        paramsWithDefaults.first = params.first ?? 10;
        paramsWithDefaults.last = undefined;
      }

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String, $last: Int, $analyzerIn: [String]) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            id
            analysisRuns(offset: $offset, first: $first, after: $after, before: $before, last: $last) {
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
                  checks(analyzerIn: $analyzerIn) {
                    edges {
                      node {
                        analyzer {
                          shortcode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
          offset: paramsWithDefaults.offset,
          first: paramsWithDefaults.first,
          after: paramsWithDefaults.after,
          before: paramsWithDefaults.before,
          last: paramsWithDefaults.last,
          analyzerIn: paramsWithDefaults.analyzerIn,
        },
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const runs: DeepSourceRun[] = [];
      const repoRuns = response.data.data?.repository?.analysisRuns?.edges || [];
      const pageInfo = response.data.data?.repository?.analysisRuns?.pageInfo || {
        hasNextPage: false,
        hasPreviousPage: false,
      };
      const totalCount = response.data.data?.repository?.analysisRuns?.totalCount || 0;

      for (const { node: run } of repoRuns) {
        runs.push({
          id: run.id,
          runUid: run.runUid,
          commitOid: run.commitOid,
          branchName: run.branchName,
          baseOid: run.baseOid,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          finishedAt: run.finishedAt,
          summary: {
            occurrencesIntroduced: run.summary?.occurrencesIntroduced || 0,
            occurrencesResolved: run.summary?.occurrencesResolved || 0,
            occurrencesSuppressed: run.summary?.occurrencesSuppressed || 0,
            occurrenceDistributionByAnalyzer: run.summary?.occurrenceDistributionByAnalyzer || [],
            occurrenceDistributionByCategory: run.summary?.occurrenceDistributionByCategory || [],
          },
          repository: {
            name: run.repository?.name || '',
            id: run.repository?.id || '',
          },
        });
      }

      return {
        items: runs,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          hasPreviousPage: pageInfo.hasPreviousPage,
          startCursor: pageInfo.startCursor,
          endCursor: pageInfo.endCursor,
        },
        totalCount,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoneType')) {
        return {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
          },
          totalCount: 0,
        };
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }

  /**
   * Fetches a specific analysis run by ID or commit hash
   * @param runIdentifier - The runUid or commitOid to identify the run
   * @returns Promise that resolves to the run if found, or null if not found
   */
  async getRun(runIdentifier: string): Promise<DeepSourceRun | null> {
    try {
      // Determine if the identifier is a UUID or a commit hash
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        runIdentifier
      );

      const runQuery = `
        query($runUid: UUID, $commitOid: String) {
          run(runUid: $runUid, commitOid: $commitOid) {
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
      `;

      const response = await this.client.post('', {
        query: runQuery.trim(),
        variables: {
          runUid: isUuid ? runIdentifier : null,
          commitOid: !isUuid ? runIdentifier : null,
        },
      });

      if (response.data.errors) {
        // If the error is about not finding the run, return null
        if (
          response.data.errors.some(
            (e: { message: string }) =>
              e.message.includes('not found') || e.message.includes('NoneType')
          )
        ) {
          return null;
        }
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      const run = response.data.data?.run;
      if (!run) {
        return null;
      }

      return {
        id: run.id,
        runUid: run.runUid,
        commitOid: run.commitOid,
        branchName: run.branchName,
        baseOid: run.baseOid,
        status: run.status,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        finishedAt: run.finishedAt,
        summary: {
          occurrencesIntroduced: run.summary?.occurrencesIntroduced || 0,
          occurrencesResolved: run.summary?.occurrencesResolved || 0,
          occurrencesSuppressed: run.summary?.occurrencesSuppressed || 0,
          occurrenceDistributionByAnalyzer: run.summary?.occurrenceDistributionByAnalyzer || [],
          occurrenceDistributionByCategory: run.summary?.occurrenceDistributionByCategory || [],
        },
        repository: {
          name: run.repository?.name || '',
          id: run.repository?.id || '',
        },
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('NoneType') || error.message.includes('not found'))
      ) {
        return null;
      }
      return DeepSourceClient.handleGraphQLError(error);
    }
  }
}
