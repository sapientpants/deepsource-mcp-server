/**
 * @jest-environment node
 */

import { expect } from '@jest/globals';
import { DeepSourceClient } from '../deepsource.js';

describe('DeepSourceClient generic error handling', () => {
  // We need to access private static methods for testing
  // @ts-expect-error - Accessing private static method for testing
  const handleGenericError = DeepSourceClient['handleGenericError'];

  describe('handleGenericError method', () => {
    it('should handle Error objects correctly', () => {
      const error = new Error('Test error message');

      try {
        handleGenericError(error);
        expect(true).toBe(false); // This will fail if the code reaches here
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe('DeepSource API error: Test error message');
      }
    });

    it('should handle non-Error objects correctly', () => {
      const nonErrorObject = { foo: 'bar' };

      try {
        handleGenericError(nonErrorObject);
        expect(true).toBe(false); // This will fail if the code reaches here
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe(
          'Unknown error occurred while communicating with DeepSource API'
        );
      }
    });

    it('should handle string errors correctly', () => {
      const stringError = 'String error';

      try {
        handleGenericError(stringError);
        expect(true).toBe(false); // This will fail if the code reaches here
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe(
          'Unknown error occurred while communicating with DeepSource API'
        );
      }
    });

    it('should handle null/undefined errors correctly', () => {
      try {
        handleGenericError(null);
        expect(true).toBe(false); // This will fail if the code reaches here
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe(
          'Unknown error occurred while communicating with DeepSource API'
        );
      }

      try {
        handleGenericError(undefined);
        expect(true).toBe(false); // This will fail if the code reaches here
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe(
          'Unknown error occurred while communicating with DeepSource API'
        );
      }
    });
  });
});
