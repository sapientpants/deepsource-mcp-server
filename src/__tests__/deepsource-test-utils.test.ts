/**
 * @jest-environment node
 */

import { TestableDeepSourceClient } from './utils/test-utils';
import { jest } from '@jest/globals';
import { DeepSourceClient } from '../deepsource';

describe('TestableDeepSourceClient Utility Methods Tests', () => {
  describe('testIterateVulnerabilities', () => {
    it('should call the iterateVulnerabilities method with the provided edges', () => {
      // Create mock edges array
      const mockEdges = [{ node: { id: 'vuln1' } }, { node: { id: 'vuln2' } }];

      // Create mock results to be yielded by the generator
      const mockResults = [
        { id: 'vuln1', severity: 'HIGH' },
        { id: 'vuln2', severity: 'MEDIUM' },
      ];

      // Create a mock generator function
      function* mockGenerator() {
        for (const result of mockResults) {
          yield result;
        }
      }

      // Save original method
      // @ts-expect-error Accessing private method for testing
      const originalMethod = DeepSourceClient.iterateVulnerabilities;

      try {
        // Mock the iterateVulnerabilities method
        // @ts-expect-error Mocking private method for testing
        DeepSourceClient.iterateVulnerabilities = function () {
          return mockGenerator();
        };

        // Call the test method
        const generator = TestableDeepSourceClient.testIterateVulnerabilities(mockEdges);

        // Convert generator to array
        const results = Array.from(generator);

        // Verify results
        expect(results).toEqual(mockResults);
      } finally {
        // Restore original method
        // @ts-expect-error Restoring private method
        DeepSourceClient.iterateVulnerabilities = originalMethod;
      }
    });
  });

  describe('testGetQualityMetricsWithNoneTypeError', () => {
    it('should handle NoneType errors and call handleGraphQLError', async () => {
      // Let's override the testIsErrorWithMessage method to force different paths
      const originalIsErrorWithMessage = TestableDeepSourceClient.testIsErrorWithMessage;
      // Save original handleGraphQLError method
      // @ts-expect-error Accessing private method for testing
      const originalHandleGraphQLError = DeepSourceClient.handleGraphQLError;

      try {
        // First, test the NoneType error path
        TestableDeepSourceClient.testIsErrorWithMessage = jest.fn().mockReturnValue(true);

        let result = await TestableDeepSourceClient.testGetQualityMetricsWithNoneTypeError();
        expect(result).toEqual([]); // Should return empty array for NoneType errors

        // Now, test the non-NoneType error path that calls handleGraphQLError
        TestableDeepSourceClient.testIsErrorWithMessage = jest.fn().mockReturnValue(false);

        // Mock handleGraphQLError
        // @ts-expect-error Mocking private method for testing
        DeepSourceClient.handleGraphQLError = jest.fn().mockImplementation(() => {
          return ['mocked error response'];
        });

        result = await TestableDeepSourceClient.testGetQualityMetricsWithNoneTypeError();

        // Verify handleGraphQLError was called
        // @ts-expect-error Accessing mocked method
        expect(DeepSourceClient.handleGraphQLError).toHaveBeenCalled();
        expect(result).toEqual(['mocked error response']);
      } finally {
        // Restore original methods
        TestableDeepSourceClient.testIsErrorWithMessage = originalIsErrorWithMessage;
        // @ts-expect-error Restoring private method
        DeepSourceClient.handleGraphQLError = originalHandleGraphQLError;
      }
    });
  });

  describe('testNoneTypeErrorHandler', () => {
    it('should handle NoneType errors correctly', async () => {
      // Original methods
      const originalIsError = TestableDeepSourceClient.testIsError;
      const originalIsErrorWithMessage = TestableDeepSourceClient.testIsErrorWithMessage;

      try {
        // Mock methods to control flow
        TestableDeepSourceClient.testIsError = jest.fn().mockReturnValue(true);
        TestableDeepSourceClient.testIsErrorWithMessage = jest.fn().mockReturnValue(true);

        // Test NoneType error path
        let result = await TestableDeepSourceClient.testNoneTypeErrorHandler();
        expect(result).toEqual([]);

        // Test throw error path by making isErrorWithMessage return false
        TestableDeepSourceClient.testIsErrorWithMessage = jest.fn().mockReturnValue(false);

        // Should throw an error when NoneType is not in the message
        await expect(TestableDeepSourceClient.testNoneTypeErrorHandler()).rejects.toThrow();
      } finally {
        // Restore original methods
        TestableDeepSourceClient.testIsError = originalIsError;
        TestableDeepSourceClient.testIsErrorWithMessage = originalIsErrorWithMessage;
      }
    });
  });

  describe('testValidateProjectRepository', () => {
    it('should not throw for valid project repositories', () => {
      // Valid project with repository
      const validProject = {
        name: 'Test Project',
        repository: {
          login: 'test-org',
          provider: 'github',
        },
      };

      // Should not throw
      expect(() => {
        TestableDeepSourceClient.testValidateProjectRepository(validProject, 'test-project-key');
      }).not.toThrow();
    });

    it('should throw an error for project without repository', () => {
      // Invalid project without repository
      const invalidProject = {
        name: 'Test Project',
      };

      // Should throw with a specific message
      expect(() => {
        TestableDeepSourceClient.testValidateProjectRepository(invalidProject, 'test-project-key');
      }).toThrow(`Invalid repository information for project 'test-project-key'`);
    });

    it('should throw an error for project with invalid repository', () => {
      // Invalid project with incomplete repository
      const invalidProject = {
        name: 'Test Project',
        repository: {
          // Missing required fields
        },
      };

      // Should throw with specific message
      expect(() => {
        TestableDeepSourceClient.testValidateProjectRepository(invalidProject, 'test-project-key');
      }).toThrow(`Invalid repository information for project 'test-project-key'`);
    });
  });
});
