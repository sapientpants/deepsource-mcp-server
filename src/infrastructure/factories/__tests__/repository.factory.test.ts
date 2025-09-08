/**
 * @fileoverview Tests for repository factory
 */

import { describe, it, expect, beforeEach, jest } from 'vitest';
import {
  RepositoryFactory,
  createRepositoryFactory,
  createRepositories,
} from '../repository.factory.js';

// Mock logger
vi.mock('../../../utils/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('RepositoryFactory', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://test.deepsource.io',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create factory with required config', () => {
      const factory = new RepositoryFactory({ apiKey: 'test-key' });

      expect(factory).toBeInstanceOf(RepositoryFactory);
      expect(factory.getConfig()).toEqual({ apiKey: 'test-key' });
    });

    it('should create factory with full config', () => {
      const factory = new RepositoryFactory(mockConfig);

      expect(factory).toBeInstanceOf(RepositoryFactory);
      expect(factory.getConfig()).toEqual(mockConfig);
    });
  });

  describe('createRepositories', () => {
    it('should create all repository instances', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repositories = factory.createRepositories();

      expect(repositories).toHaveProperty('projectRepository');
      expect(repositories).toHaveProperty('analysisRunRepository');
      expect(repositories).toHaveProperty('qualityMetricsRepository');
      expect(repositories).toHaveProperty('complianceReportRepository');

      // Verify all repositories are defined
      expect(repositories.projectRepository).toBeDefined();
      expect(repositories.analysisRunRepository).toBeDefined();
      expect(repositories.qualityMetricsRepository).toBeDefined();
      expect(repositories.complianceReportRepository).toBeDefined();
    });

    it('should return cached instances on subsequent calls', () => {
      const factory = new RepositoryFactory(mockConfig);

      const firstCall = factory.createRepositories();
      const secondCall = factory.createRepositories();

      // Should return the same object reference
      expect(firstCall).toBe(secondCall);
    });

    it('should create new instances after cache clear', () => {
      const factory = new RepositoryFactory(mockConfig);

      const firstCall = factory.createRepositories();
      factory.clearCache();
      const secondCall = factory.createRepositories();

      // Should return different object references
      expect(firstCall).not.toBe(secondCall);
    });
  });

  describe('individual repository creation methods', () => {
    it('should create project repository', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repository = factory.createProjectRepository();

      expect(repository).toBeDefined();
      expect(repository).toHaveProperty('findByKey');
    });

    it('should create analysis run repository', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repository = factory.createAnalysisRunRepository();

      expect(repository).toBeDefined();
      expect(repository).toHaveProperty('findById');
    });

    it('should create quality metrics repository', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repository = factory.createQualityMetricsRepository();

      expect(repository).toBeDefined();
      expect(repository).toHaveProperty('findByProjectAndMetric');
    });

    it('should create compliance report repository', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repository = factory.createComplianceReportRepository();

      expect(repository).toBeDefined();
      expect(repository).toHaveProperty('findByProjectAndType');
    });
  });

  describe('clearCache', () => {
    it('should clear cached instances', () => {
      const factory = new RepositoryFactory(mockConfig);

      // Create and cache instances
      const firstRepos = factory.createRepositories();

      // Clear cache
      factory.clearCache();

      // Create new instances
      const secondRepos = factory.createRepositories();

      // Should be different instances
      expect(firstRepos).not.toBe(secondRepos);
    });

    it('should allow multiple cache clears', () => {
      const factory = new RepositoryFactory(mockConfig);

      factory.createRepositories();
      factory.clearCache();
      factory.clearCache(); // Should not throw

      const repos = factory.createRepositories();
      expect(repos).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const factory = new RepositoryFactory(mockConfig);
      const config = factory.getConfig();

      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy

      // Verify it's a defensive copy
      config.apiKey = 'modified';
      expect(factory.getConfig().apiKey).toBe('test-api-key');
    });

    it('should preserve optional fields', () => {
      const configWithOptional = {
        apiKey: 'test-key',
        baseUrl: 'https://custom.url',
      };
      const factory = new RepositoryFactory(configWithOptional);
      const config = factory.getConfig();

      expect(config).toEqual(configWithOptional);
    });
  });

  describe('convenience functions', () => {
    it('createRepositoryFactory should create a factory instance', () => {
      const factory = createRepositoryFactory(mockConfig);

      expect(factory).toBeInstanceOf(RepositoryFactory);
      expect(factory.getConfig()).toEqual(mockConfig);
    });

    it('createRepositories should create all repositories immediately', () => {
      const repositories = createRepositories(mockConfig);

      expect(repositories).toHaveProperty('projectRepository');
      expect(repositories).toHaveProperty('analysisRunRepository');
      expect(repositories).toHaveProperty('qualityMetricsRepository');
      expect(repositories).toHaveProperty('complianceReportRepository');

      // Verify all are defined
      expect(repositories.projectRepository).toBeDefined();
      expect(repositories.analysisRunRepository).toBeDefined();
      expect(repositories.qualityMetricsRepository).toBeDefined();
      expect(repositories.complianceReportRepository).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing baseUrl in config', () => {
      const minimalConfig = { apiKey: 'test-key' };
      const factory = new RepositoryFactory(minimalConfig);
      const repositories = factory.createRepositories();

      expect(repositories).toBeDefined();
      expect(factory.getConfig()).toEqual(minimalConfig);
    });

    it('should create independent instances for different factories', () => {
      const factory1 = new RepositoryFactory({ apiKey: 'key1' });
      const factory2 = new RepositoryFactory({ apiKey: 'key2' });

      const repos1 = factory1.createRepositories();
      const repos2 = factory2.createRepositories();

      // Should be different instances
      expect(repos1).not.toBe(repos2);

      // Should have different configurations
      expect(factory1.getConfig().apiKey).toBe('key1');
      expect(factory2.getConfig().apiKey).toBe('key2');
    });

    it('should propagate errors when apiKey is invalid', () => {
      const factory = new RepositoryFactory({ apiKey: '' });

      // Should throw when trying to create repositories with empty API key
      expect(() => factory.createRepositories()).toThrow('DeepSource API key is required');
    });
  });

  describe('repository interface compliance', () => {
    it('should create repositories that implement required methods', () => {
      const factory = new RepositoryFactory(mockConfig);
      const repositories = factory.createRepositories();

      // Project repository interface check
      expect(typeof repositories.projectRepository.findByKey).toBe('function');
      expect(typeof repositories.projectRepository.findAll).toBe('function');
      expect(typeof repositories.projectRepository.save).toBe('function');
      expect(typeof repositories.projectRepository.delete).toBe('function');

      // AnalysisRun repository interface check
      expect(typeof repositories.analysisRunRepository.findById).toBe('function');
      expect(typeof repositories.analysisRunRepository.findByProject).toBe('function');
      expect(typeof repositories.analysisRunRepository.findByCommit).toBe('function');

      // QualityMetrics repository interface check
      expect(typeof repositories.qualityMetricsRepository.findById).toBe('function');
      expect(typeof repositories.qualityMetricsRepository.findByProject).toBe('function');
      expect(typeof repositories.qualityMetricsRepository.findByProjectAndMetric).toBe('function');

      // ComplianceReport repository interface check
      expect(typeof repositories.complianceReportRepository.findById).toBe('function');
      expect(typeof repositories.complianceReportRepository.findByProjectAndType).toBe('function');
      expect(typeof repositories.complianceReportRepository.findLatest).toBe('function');
    });
  });
});
