import axios, { AxiosError } from 'axios';

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

export interface PaginationParams {
  offset?: number;
  first?: number;
  after?: string;
  before?: string;
}

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
  private handleGraphQLError(error: Error | unknown): never {
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
      return this.handleGraphQLError(error);
    }
  }

  /**
   * Fetches issues from a specified DeepSource project
   * @param projectKey - The unique identifier for the DeepSource project
   * @param pagination - Optional pagination parameters for the query
   * @returns Promise that resolves to a paginated response containing DeepSource issues
   */
  async getIssues(
    projectKey: string,
    pagination: PaginationParams = {}
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

      // Set default limit to 10 issues if not specified
      const paginationWithDefaults = {
        ...pagination,
        first: pagination.first ?? 10,
      };

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!, $offset: Int, $first: Int, $after: String, $before: String) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            defaultBranch
            dsn
            isPrivate
            issues(offset: $offset, first: $first, after: $after, before: $before) {
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
          offset: paginationWithDefaults.offset,
          first: paginationWithDefaults.first,
          after: paginationWithDefaults.after,
          before: paginationWithDefaults.before,
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
            tags: [],
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
      return this.handleGraphQLError(error);
    }
  }

  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      const result = await this.getIssues(projectKey);
      const issue = result.items.find((issue) => issue.id === issueId);
      return issue || null;
    } catch (error) {
      return this.handleGraphQLError(error);
    }
  }
}
