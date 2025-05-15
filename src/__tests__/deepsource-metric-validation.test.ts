import { DeepSourceClient } from '../deepsource';
import { MetricDirection } from '../types/metrics';

describe('DeepSource Validation Utilities', () => {
  describe('validateProjectRepository', () => {
    // Access the private static method
    const validateProjectRepository = (DeepSourceClient as Record<string, unknown>)
      .validateProjectRepository as Function;

    it('should throw error when repository is missing', () => {
      const projectWithoutRepo = {
        key: 'test-project',
        name: 'Test Project',
        // Missing repository property
      };

      expect(() => {
        validateProjectRepository(projectWithoutRepo, 'test-project');
      }).toThrow('Invalid repository information for project');
    });

    it('should throw error when repository fields are incomplete', () => {
      const projectWithIncompleteRepo = {
        key: 'test-project',
        name: 'Test Project',
        repository: {
          login: 'testorg',
          // Missing name and provider
        },
      };

      expect(() => {
        validateProjectRepository(projectWithIncompleteRepo, 'test-project');
      }).toThrow('Invalid repository information for project');
    });

    it('should not throw error when repository is valid', () => {
      const validProject = {
        key: 'test-project',
        name: 'Test Project',
        repository: {
          login: 'testorg',
          name: 'test-repo',
          provider: 'github',
        },
      };

      expect(() => {
        validateProjectRepository(validProject, 'test-project');
      }).not.toThrow();
    });
  });

  describe('getVcsProvider', () => {
    // Access the private static method
    const getVcsProvider = (DeepSourceClient as Record<string, unknown>).getVcsProvider as Function;

    it('should convert provider string to uppercase', () => {
      expect(getVcsProvider('github')).toBe('GITHUB');
      expect(getVcsProvider('gitlab')).toBe('GITLAB');
      expect(getVcsProvider('bitbucket')).toBe('BITBUCKET');
    });

    it('should handle provider strings that are already uppercase', () => {
      expect(getVcsProvider('GITHUB')).toBe('GITHUB');
    });

    it('should handle mixed case provider strings', () => {
      expect(getVcsProvider('GitLab')).toBe('GITLAB');
    });
  });

  describe('isNotFoundError', () => {
    // Access the private static method
    const isNotFoundError = (DeepSourceClient as Record<string, unknown>)
      .isNotFoundError as Function;

    it('should identify GraphQL not found errors', () => {
      const notFoundError = new Error('GraphQL error: Resource not found');
      expect(isNotFoundError(notFoundError)).toBe(true);

      const repositoryNotFoundError = new Error('GraphQL error: Repository not found');
      expect(isNotFoundError(repositoryNotFoundError)).toBe(true);

      const noneTypeError = new Error('GraphQL error: NoneType object has no attribute');
      expect(isNotFoundError(noneTypeError)).toBe(true);
    });

    it('should identify errors with not found messages', () => {
      const httpNotFoundError = new Error(
        'Request failed with status code 404: Resource not found'
      );
      expect(isNotFoundError(httpNotFoundError)).toBe(true);
    });

    it('should return false for other errors', () => {
      const otherError = new Error('Some other error');
      expect(isNotFoundError(otherError)).toBe(false);

      const httpOtherError = { response: { status: 500 } };
      expect(isNotFoundError(httpOtherError)).toBe(false);
    });
  });

  describe('calculateTrendDirection', () => {
    // Access the private static method
    const calculateTrendDirection = (DeepSourceClient as Record<string, unknown>)
      .calculateTrendDirection as Function;

    it('should return true when not enough data points', () => {
      // One data point isn't enough to determine a trend
      const singleValue = [{ value: 75, createdAt: '2023-01-01T12:00:00Z' }];

      expect(calculateTrendDirection(singleValue, 'UPWARD')).toBe(true);
      expect(calculateTrendDirection([], 'UPWARD')).toBe(true);
    });

    it('should identify positive trend for upward metrics', () => {
      const increasingValues = [
        { value: 70, createdAt: '2023-01-01T12:00:00Z' },
        { value: 75, createdAt: '2023-01-15T12:00:00Z' },
        { value: 80, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(increasingValues, 'UPWARD')).toBe(true);
      expect(calculateTrendDirection(increasingValues, MetricDirection.UPWARD)).toBe(true);
    });

    it('should identify negative trend for upward metrics', () => {
      const decreasingValues = [
        { value: 90, createdAt: '2023-01-01T12:00:00Z' },
        { value: 85, createdAt: '2023-01-15T12:00:00Z' },
        { value: 80, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(decreasingValues, 'UPWARD')).toBe(false);
      expect(calculateTrendDirection(decreasingValues, MetricDirection.UPWARD)).toBe(false);
    });

    it('should identify positive trend for downward metrics', () => {
      const decreasingValues = [
        { value: 15, createdAt: '2023-01-01T12:00:00Z' },
        { value: 10, createdAt: '2023-01-15T12:00:00Z' },
        { value: 5, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(decreasingValues, 'DOWNWARD')).toBe(true);
      expect(calculateTrendDirection(decreasingValues, MetricDirection.DOWNWARD)).toBe(true);
    });

    it('should identify negative trend for downward metrics', () => {
      const increasingValues = [
        { value: 5, createdAt: '2023-01-01T12:00:00Z' },
        { value: 10, createdAt: '2023-01-15T12:00:00Z' },
        { value: 15, createdAt: '2023-02-01T12:00:00Z' },
      ];

      expect(calculateTrendDirection(increasingValues, 'DOWNWARD')).toBe(false);
      expect(calculateTrendDirection(increasingValues, MetricDirection.DOWNWARD)).toBe(false);
    });
  });
});
