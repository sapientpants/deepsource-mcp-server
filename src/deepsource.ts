import axios, { AxiosInstance } from 'axios';

export interface DeepSourceProject {
  key: string;
  name: string;
  repository: {
    url: string;
    provider: string;
  };
}

export interface DeepSourceIssue {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  lead_time: number;
  created_at: string;
  resolved_at?: string;
  file_path: string;
  line_number: number;
  issue_text: string;
  issue_url: string;
}

export class DeepSourceClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://deepsource.io/api/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
  }

  async listProjects(): Promise<DeepSourceProject[]> {
    const response = await this.client.get('/projects');
    return response.data.results;
  }

  async getIssues(projectKey: string): Promise<DeepSourceIssue[]> {
    const response = await this.client.get(`/projects/${projectKey}/issues`);
    return response.data.results;
  }
}
