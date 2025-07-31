/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { DeepSourceClientFactory } from '../client/factory.js';
import { ProjectsClient } from '../client/projects-client.js';
import { IssuesClient } from '../client/issues-client.js';
import { RunsClient } from '../client/runs-client.js';
import { MetricsClient } from '../client/metrics-client.js';
import { SecurityClient } from '../client/security-client.js';

describe('DeepSourceClientFactory', () => {
  const API_KEY = 'test-api-key';

  describe('constructor', () => {
    it('should throw an error if API key is not provided', () => {
      expect(() => {
        // @ts-expect-error - Testing with empty API key
        const factory = new DeepSourceClientFactory('');
        return factory; // Return factory to prevent unused variable warning
      }).toThrow('DeepSource API key is required');

      expect(() => {
        // @ts-expect-error - Testing with null API key
        const factory = new DeepSourceClientFactory(null);
        return factory; // Return factory to prevent unused variable warning
      }).toThrow('DeepSource API key is required');
    });

    it('should create a factory with default config', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      expect(factory).toBeInstanceOf(DeepSourceClientFactory);
    });

    it('should create a factory with custom config', () => {
      const config = {
        baseURL: 'https://custom-api.deepsource.io/graphql/',
        timeout: 15000,
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const factory = new DeepSourceClientFactory(API_KEY, config);
      expect(factory).toBeInstanceOf(DeepSourceClientFactory);
    });
  });

  describe('getProjectsClient', () => {
    it('should return a ProjectsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      const client = factory.getProjectsClient();

      expect(client).toBeInstanceOf(ProjectsClient);
    });

    it('should cache the ProjectsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      const client1 = factory.getProjectsClient();
      const client2 = factory.getProjectsClient();

      // Should be the same instance
      expect(client1).toBe(client2);
    });
  });

  describe('testConnection', () => {
    it('should return true if connection test succeeds', async () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      // Mock the listProjects method
      const mockProjectsClient = {
        listProjects: jest.fn().mockResolvedValue([]),
      };

      // Override getProjectsClient to return our mock
      jest
        .spyOn(factory, 'getProjectsClient')
        .mockReturnValue(mockProjectsClient as unknown as ProjectsClient);

      const result = await factory.testConnection();

      expect(result).toBe(true);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });

    it('should return false if connection test fails', async () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      // Mock the listProjects method
      const mockProjectsClient = {
        listProjects: jest.fn().mockRejectedValue(new Error('Connection error')),
      };

      // Override getProjectsClient to return our mock
      jest
        .spyOn(factory, 'getProjectsClient')
        .mockReturnValue(mockProjectsClient as unknown as ProjectsClient);

      const result = await factory.testConnection();

      expect(result).toBe(false);
      expect(mockProjectsClient.listProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('getIssuesClient', () => {
    it('should return an IssuesClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      const client = factory.getIssuesClient();

      expect(client).toBeInstanceOf(IssuesClient);
    });

    it('should cache the IssuesClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      const client1 = factory.getIssuesClient();
      const client2 = factory.getIssuesClient();

      // Should be the same instance
      expect(client1).toBe(client2);
    });
  });

  describe('getRunsClient', () => {
    it('should return a RunsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      const client = factory.getRunsClient();

      expect(client).toBeInstanceOf(RunsClient);
    });

    it('should cache the RunsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      const client1 = factory.getRunsClient();
      const client2 = factory.getRunsClient();

      // Should be the same instance
      expect(client1).toBe(client2);
    });
  });

  describe('getMetricsClient', () => {
    it('should return a MetricsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      const client = factory.getMetricsClient();

      expect(client).toBeInstanceOf(MetricsClient);
    });

    it('should cache the MetricsClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      const client1 = factory.getMetricsClient();
      const client2 = factory.getMetricsClient();

      // Should be the same instance
      expect(client1).toBe(client2);
    });
  });

  describe('getSecurityClient', () => {
    it('should return a SecurityClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);
      const client = factory.getSecurityClient();

      expect(client).toBeInstanceOf(SecurityClient);
    });

    it('should cache the SecurityClient instance', () => {
      const factory = new DeepSourceClientFactory(API_KEY);

      const client1 = factory.getSecurityClient();
      const client2 = factory.getSecurityClient();

      // Should be the same instance
      expect(client1).toBe(client2);
    });
  });
});
