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

export class DeepSourceClient {
  private client;

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

  private handleGraphQLError(error: Error | unknown): never {
    if (error instanceof AxiosError && error.response?.data?.errors) {
      const graphqlErrors: Array<{ message: string }> = error.response.data.errors;
      console.error('GraphQL Errors:', graphqlErrors);
      throw new Error(`GraphQL Error: ${graphqlErrors.map((e) => e.message).join(', ')}`);
    }
    console.error('API Error:', error);
    throw error;
  }

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

      console.log('Fetching viewer and repositories...');
      const response = await this.client.post('', {
        query: viewerQuery.trim(),
      });

      console.log('Response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: any) => e.message).join(', ')}`
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
      console.error('Error in listProjects:', error);
      if (error instanceof Error && error.message.includes('NoneType')) {
        return [];
      }
      return this.handleGraphQLError(error);
    }
  }

  async getIssues(projectKey: string): Promise<DeepSourceIssue[]> {
    try {
      const projects = await this.listProjects();
      const project = projects.find((p) => p.key === projectKey);

      if (!project) {
        console.error('Project not found:', projectKey);
        return [];
      }

      const repoQuery = `
        query($login: String!, $name: String!, $provider: VCSProvider!) {
          repository(login: $login, name: $name, vcsProvider: $provider) {
            name
            defaultBranch
            dsn
            isPrivate
            issues(first: 100) {
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

      console.log('Fetching issues for project:', project.name);
      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
        },
      });

      console.log('Issues response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: any) => e.message).join(', ')}`
        );
      }

      const issues: DeepSourceIssue[] = [];
      const repoIssues = response.data.data?.repository?.issues?.edges || [];

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

      return issues;
    } catch (error) {
      console.error('Error in getIssues:', error);
      if (error instanceof Error && error.message.includes('NoneType')) {
        return [];
      }
      return this.handleGraphQLError(error);
    }
  }

  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      const issues = await this.getIssues(projectKey);
      const issue = issues.find((i) => i.id === issueId);

      if (!issue) {
        console.log(`Issue with ID ${issueId} not found in project ${projectKey}`);
        return null;
      }

      return issue;
    } catch (error) {
      console.error('Error in getIssue:', error);
      if (error instanceof Error && error.message.includes('NoneType')) {
        return null;
      }
      return this.handleGraphQLError(error);
    }
  }
}
