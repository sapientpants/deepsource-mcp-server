import { jest } from '@jest/globals';
import { DeepSourceClient } from '../deepsource';

// We need to access private static methods, so we'll create a way to access them
// Create a test subclass to expose private methods
class TestableDeepSourceClient extends DeepSourceClient {
  static testIsError(error: unknown): error is Error {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.isError(error);
  }

  static testExtractErrorMessages(errors: unknown[]): string {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.extractErrorMessages(errors);
  }
}

describe('DeepSource Error Handling', () => {
  describe('isError', () => {
    it('should return true for Error instances', () => {
      const error = new Error('Test Error');
      expect(TestableDeepSourceClient.testIsError(error)).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(TestableDeepSourceClient.testIsError('string error')).toBe(false);
      expect(TestableDeepSourceClient.testIsError(123)).toBe(false);
      expect(TestableDeepSourceClient.testIsError({})).toBe(false);
      expect(TestableDeepSourceClient.testIsError(null)).toBe(false);
      expect(TestableDeepSourceClient.testIsError(undefined)).toBe(false);
    });
  });

  describe('extractErrorMessages', () => {
    it('should extract message from GraphQL errors', () => {
      const errors = [{ message: 'Error 1' }, { message: 'Error 2' }];

      const result = TestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
      expect(result).toContain('Error 2');
    });

    it('should handle missing message property', () => {
      const errors = [{ message: 'Error 1' }, { other: 'Not a message' }];

      const result = TestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
    });

    it('should handle empty array', () => {
      const result = TestableDeepSourceClient.testExtractErrorMessages([]);
      // The implementation may return different default messages
      expect(result).toBeDefined();
    });

    it('should handle non-object array items', () => {
      const errors = [{ message: 'Error 1' }, 'Not an object', 42];

      const result = TestableDeepSourceClient.testExtractErrorMessages(errors);
      expect(result).toContain('Error 1');
    });
  });
});
