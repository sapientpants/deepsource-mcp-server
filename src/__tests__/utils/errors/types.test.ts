import { ErrorCategory } from '../../../utils/errors/categories';
import { ClassifiedError, isClassifiedError } from '../../../utils/errors/types';

describe('Error Types', () => {
  describe('isClassifiedError', () => {
    it('should return true for valid ClassifiedError objects', () => {
      // Create a mock ClassifiedError
      const error: ClassifiedError = {
        name: 'TestError',
        message: 'This is a test error',
        category: ErrorCategory.CLIENT,
        originalError: new Error('Original error'),
        metadata: { source: 'test' },
        stack: 'Error stack',
      };

      expect(isClassifiedError(error)).toBe(true);
    });

    it('should return false for non-error objects', () => {
      expect(isClassifiedError(null)).toBe(false);
      expect(isClassifiedError(undefined)).toBe(false);
      expect(isClassifiedError(42)).toBe(false);
      expect(isClassifiedError('error string')).toBe(false);
      expect(isClassifiedError({})).toBe(false);
      expect(isClassifiedError([])).toBe(false);
    });

    it('should return false for standard Error objects without category', () => {
      const standardError = new Error('Standard error');
      expect(isClassifiedError(standardError)).toBe(false);
    });

    it('should return false for objects with message but without category', () => {
      const incompleteError = {
        message: 'Incomplete error',
        name: 'IncompleteError',
      };
      expect(isClassifiedError(incompleteError)).toBe(false);
    });

    it('should return false for objects with category but without message', () => {
      const incompleteError = {
        category: ErrorCategory.CLIENT,
        name: 'IncompleteError',
      };
      expect(isClassifiedError(incompleteError)).toBe(false);
    });

    it('should return false for objects with category of wrong type', () => {
      const invalidCategoryError = {
        message: 'Invalid category error',
        category: 42, // Not a string
        name: 'InvalidCategoryError',
      };
      expect(isClassifiedError(invalidCategoryError)).toBe(false);
    });

    it('should return true for errors with minimum valid properties', () => {
      const minimalError = {
        message: 'Minimal error',
        category: ErrorCategory.AUTH,
        name: 'MinimalError',
      };
      expect(isClassifiedError(minimalError)).toBe(true);
    });
  });
});
