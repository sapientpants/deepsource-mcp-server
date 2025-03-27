import nock from 'nock';
import { DeepSourceClient } from '../deepsource';

describe('DeepSourceClient', () => {
  const API_KEY = 'test-api-key';
  const client = new DeepSourceClient(API_KEY);

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('listProjects', () => {
    it('should return a list of projects', async () => {
      const mockProjects = {
        results: [
          {
            key: 'project1',
            name: 'Project One',
            repository: {
              url: 'https://github.com/org/repo1',
              provider: 'github',
            },
          },
          {
            key: 'project2',
            name: 'Project Two',
            repository: {
              url: 'https://github.com/org/repo2',
              provider: 'github',
            },
          },
        ],
      };

      nock('https://deepsource.io/api/v1')
        .get('/projects')
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockProjects);

      const projects = await client.listProjects();
      expect(projects).toEqual(mockProjects.results);
    });

    it('should handle API errors', async () => {
      nock('https://deepsource.io/api/v1').get('/projects').reply(401, { error: 'Unauthorized' });

      await expect(client.listProjects()).rejects.toThrow();
    });
  });

  describe('getIssues', () => {
    const projectKey = 'test-project';

    it('should return a list of issues for a project', async () => {
      const mockIssues = {
        results: [
          {
            id: 'issue1',
            title: 'Security Issue',
            category: 'security',
            severity: 'high',
            status: 'open',
            lead_time: 1000,
            created_at: '2024-03-27T12:00:00Z',
            file_path: 'src/main.ts',
            line_number: 42,
            issue_text: 'Potential security vulnerability',
            issue_url: 'https://deepsource.io/issues/1',
          },
        ],
      };

      nock('https://deepsource.io/api/v1')
        .get(`/projects/${projectKey}/issues`)
        .matchHeader('Authorization', `Bearer ${API_KEY}`)
        .reply(200, mockIssues);

      const issues = await client.getIssues(projectKey);
      expect(issues).toEqual(mockIssues.results);
    });

    it('should handle API errors when fetching issues', async () => {
      nock('https://deepsource.io/api/v1')
        .get(`/projects/${projectKey}/issues`)
        .reply(404, { error: 'Project not found' });

      await expect(client.getIssues(projectKey)).rejects.toThrow();
    });
  });
});
