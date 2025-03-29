import axios, { AxiosError } from 'axios';
import { Buffer } from 'buffer';

// Helper to conditionally log errors only when not in test environment
const logIfNotTest = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'test') {
    if (data) {
      console.error(message, data);
    } else {
      console.error(message);
    }
  }
};

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
      logIfNotTest('GraphQL Errors:', graphqlErrors);
      throw new Error(`GraphQL Error: ${graphqlErrors.map((e) => e.message).join(', ')}`);
    }
    logIfNotTest('API Error:', error);
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

      logIfNotTest('Fetching viewer and repositories...');
      const response = await this.client.post('', {
        query: viewerQuery.trim(),
      });

      logIfNotTest('Response:', JSON.stringify(response.data, null, 2));

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
      logIfNotTest('Error in listProjects:', error);
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
        logIfNotTest('Project not found:', projectKey);
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

      logIfNotTest('Fetching issues for project:', project.name);
      const response = await this.client.post('', {
        query: repoQuery.trim(),
        variables: {
          login: project.repository.login,
          name: project.name,
          provider: project.repository.provider,
        },
      });

      logIfNotTest('Issues response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        throw new Error(
          `GraphQL Errors: ${response.data.errors.map((e: { message: string }) => e.message).join(', ')}`
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
      logIfNotTest('Error in getIssues:', error);
      if (error instanceof Error && error.message.includes('NoneType')) {
        return [];
      }
      return this.handleGraphQLError(error);
    }
  }

  async getIssue(projectKey: string, issueId: string): Promise<DeepSourceIssue | null> {
    try {
      logIfNotTest(`Getting issue with ID ${issueId} for project ${projectKey}`);

      const issues = await this.getIssues(projectKey);
      logIfNotTest(`Found ${issues.length} issues in project ${projectKey}`);

      // Try direct match first
      let issue = issues.find((i) => i.id === issueId);

      // If not found, try to base64 decode the ID
      if (!issue && issueId.includes('=')) {
        try {
          // The ID might be base64 encoded
          const potentialBase64 = Buffer.from(issueId, 'base64').toString('utf-8');
          logIfNotTest(`Trying base64 decoded ID: ${potentialBase64}`);

          // Sometimes the format might be "Occurrence:actualid"
          if (potentialBase64.includes(':')) {
            const actualId = potentialBase64.split(':')[1];
            issue = issues.find(
              (i) => i.id === actualId || i.id.endsWith(actualId) || i.id.includes(actualId)
            );
          }
        } catch (e) {
          logIfNotTest('Error decoding base64:', e);
        }
      }

      // Last resort: try partial matching (case insensitive)
      if (!issue) {
        logIfNotTest('Trying partial matching...');
        issue = issues.find(
          (i) =>
            i.id.toLowerCase().includes(issueId.toLowerCase()) ||
            (issueId.toLowerCase().includes(i.id.toLowerCase()) && i.id.length > 5)
        );
      }

      if (!issue) {
        logIfNotTest(`Issue with ID ${issueId} not found in project ${projectKey}`);
        logIfNotTest(
          'Available issue IDs:',
          issues.map((i) => i.id)
        );
        return null;
      }

      logIfNotTest(`Found issue: ${issue.title} (${issue.id})`);
      return issue;
    } catch (error) {
      logIfNotTest('Error in getIssue:', error);
      if (error instanceof Error && error.message.includes('NoneType')) {
        return null;
      }
      return this.handleGraphQLError(error);
    }
  }
}
