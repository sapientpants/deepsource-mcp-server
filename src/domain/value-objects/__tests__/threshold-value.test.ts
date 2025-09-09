/**
 * @fileoverview Tests for ThresholdValue value object
 */

import { describe, it, expect } from 'vitest';
import { ThresholdValue } from '../threshold-value.js';

describe('ThresholdValue', () => {
  describe('create', () => {
    it('should create a threshold value with valid parameters', () => {
      const threshold = ThresholdValue.create(80, '%', 0, 100);

      expect(threshold.value).toBe(80);
      expect(threshold.unit).toBe('%');
      expect(threshold.minAllowed).toBe(0);
      expect(threshold.maxAllowed).toBe(100);
    });

    it('should throw error if value is below minimum allowed', () => {
      expect(() => ThresholdValue.create(-10, '%', 0, 100)).toThrow(
        'Threshold value -10 is outside allowed range [0, 100]'
      );
    });

    it('should throw error if value is above maximum allowed', () => {
      expect(() => ThresholdValue.create(150, '%', 0, 100)).toThrow(
        'Threshold value 150 is outside allowed range [0, 100]'
      );
    });

    it('should throw error if unit is empty', () => {
      expect(() => ThresholdValue.create(50, '', 0, 100)).toThrow('Unit cannot be empty');
    });

    it('should allow value at minimum boundary', () => {
      const threshold = ThresholdValue.create(0, '%', 0, 100);
      expect(threshold.value).toBe(0);
    });

    it('should allow value at maximum boundary', () => {
      const threshold = ThresholdValue.create(100, '%', 0, 100);
      expect(threshold.value).toBe(100);
    });

    it('should handle different units', () => {
      const threshold = ThresholdValue.create(500, 'ms', 0, 1000);
      expect(threshold.unit).toBe('ms');
    });

    it('should handle negative ranges', () => {
      const threshold = ThresholdValue.create(-50, 'delta', -100, 0);
      expect(threshold.value).toBe(-50);
    });
  });

  describe('createPercentage', () => {
    it('should create a percentage threshold', () => {
      const threshold = ThresholdValue.createPercentage(75);

      expect(threshold.value).toBe(75);
      expect(threshold.unit).toBe('%');
      expect(threshold.minAllowed).toBe(0);
      expect(threshold.maxAllowed).toBe(100);
      expect(threshold.isPercentage).toBe(true);
    });

    it('should validate percentage bounds', () => {
      expect(() => ThresholdValue.createPercentage(-10)).toThrow(
        'Threshold value -10 is outside allowed range [0, 100]'
      );

      expect(() => ThresholdValue.createPercentage(110)).toThrow(
        'Threshold value 110 is outside allowed range [0, 100]'
      );
    });

    it('should allow 0% and 100%', () => {
      const zero = ThresholdValue.createPercentage(0);
      const hundred = ThresholdValue.createPercentage(100);

      expect(zero.value).toBe(0);
      expect(hundred.value).toBe(100);
    });
  });

  describe('getters', () => {
    it('should provide access to all properties', () => {
      const threshold = ThresholdValue.create(42, 'points', 0, 100);

      expect(threshold.value).toBe(42);
      expect(threshold.unit).toBe('points');
      expect(threshold.minAllowed).toBe(0);
      expect(threshold.maxAllowed).toBe(100);
    });

    it('should correctly identify percentage thresholds', () => {
      const percentage = ThresholdValue.createPercentage(50);
      const other = ThresholdValue.create(50, 'count', 0, 100);

      expect(percentage.isPercentage).toBe(true);
      expect(other.isPercentage).toBe(false);
    });
  });

  describe('updateValue', () => {
    it('should create a new threshold with updated value', () => {
      const original = ThresholdValue.create(50, '%', 0, 100);
      const updated = original.updateValue(75);

      expect(updated.value).toBe(75);
      expect(updated.unit).toBe('%');
      expect(updated.minAllowed).toBe(0);
      expect(updated.maxAllowed).toBe(100);

      // Original should be unchanged
      expect(original.value).toBe(50);
    });

    it('should validate the new value', () => {
      const threshold = ThresholdValue.create(50, '%', 0, 100);

      expect(() => threshold.updateValue(150)).toThrow(
        'Threshold value 150 is outside allowed range [0, 100]'
      );
    });

    it('should preserve all other properties', () => {
      const original = ThresholdValue.create(100, 'ms', 0, 1000);
      const updated = original.updateValue(200);

      expect(updated.unit).toBe('ms');
      expect(updated.minAllowed).toBe(0);
      expect(updated.maxAllowed).toBe(1000);
    });
  });

  describe('isMet', () => {
    const threshold = ThresholdValue.create(70, '%', 0, 100);

    describe('with upward direction', () => {
      it('should return true when value is above threshold', () => {
        expect(threshold.isMet(80, 'upward')).toBe(true);
        expect(threshold.isMet(90, 'upward')).toBe(true);
      });

      it('should return true when value equals threshold', () => {
        expect(threshold.isMet(70, 'upward')).toBe(true);
      });

      it('should return false when value is below threshold', () => {
        expect(threshold.isMet(60, 'upward')).toBe(false);
        expect(threshold.isMet(69.99, 'upward')).toBe(false);
      });
    });

    describe('with downward direction', () => {
      it('should return true when value is below threshold', () => {
        expect(threshold.isMet(60, 'downward')).toBe(true);
        expect(threshold.isMet(50, 'downward')).toBe(true);
      });

      it('should return true when value equals threshold', () => {
        expect(threshold.isMet(70, 'downward')).toBe(true);
      });

      it('should return false when value is above threshold', () => {
        expect(threshold.isMet(80, 'downward')).toBe(false);
        expect(threshold.isMet(70.01, 'downward')).toBe(false);
      });
    });

    it('should work with negative values', () => {
      const negThreshold = ThresholdValue.create(-10, 'delta', -100, 100);

      expect(negThreshold.isMet(0, 'upward')).toBe(true);
      expect(negThreshold.isMet(-20, 'upward')).toBe(false);
      expect(negThreshold.isMet(-20, 'downward')).toBe(true);
      expect(negThreshold.isMet(0, 'downward')).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format the threshold as value+unit', () => {
      const threshold = ThresholdValue.create(80, '%', 0, 100);
      expect(threshold.toString()).toBe('80%');
    });

    it('should handle different units', () => {
      const threshold = ThresholdValue.create(500, 'ms', 0, 1000);
      expect(threshold.toString()).toBe('500ms');
    });

    it('should handle decimal values', () => {
      const threshold = ThresholdValue.create(75.5, '%', 0, 100);
      expect(threshold.toString()).toBe('75.5%');
    });

    it('should handle negative values', () => {
      const threshold = ThresholdValue.create(-25, 'points', -100, 100);
      expect(threshold.toString()).toBe('-25points');
    });
  });

  describe('equals', () => {
    it('should return true for thresholds with same properties', () => {
      const threshold1 = ThresholdValue.create(80, '%', 0, 100);
      const threshold2 = ThresholdValue.create(80, '%', 0, 100);

      expect(threshold1.equals(threshold2)).toBe(true);
    });

    it('should return false for thresholds with different values', () => {
      const threshold1 = ThresholdValue.create(80, '%', 0, 100);
      const threshold2 = ThresholdValue.create(70, '%', 0, 100);

      expect(threshold1.equals(threshold2)).toBe(false);
    });

    it('should return false for thresholds with different units', () => {
      const threshold1 = ThresholdValue.create(80, '%', 0, 100);
      const threshold2 = ThresholdValue.create(80, 'ratio', 0, 100);

      expect(threshold1.equals(threshold2)).toBe(false);
    });

    it('should return false for thresholds with different ranges', () => {
      const threshold1 = ThresholdValue.create(50, 'count', 0, 100);
      const threshold2 = ThresholdValue.create(50, 'count', 0, 200);

      expect(threshold1.equals(threshold2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const threshold = ThresholdValue.create(80, '%', 0, 100);

      // Properties should be readonly
      // @ts-expect-error - Testing immutability
      expect(() => {
        threshold.value = 90;
      }).toThrow();

      // @ts-expect-error - Testing immutability
      expect(() => {
        threshold.unit = 'ratio';
      }).toThrow();
    });
  });
});
