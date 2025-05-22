/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { DeepSourceClientFactory } from '../client/factory.js';
import { ProjectsClient } from '../client/projects-client.js';

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
});
