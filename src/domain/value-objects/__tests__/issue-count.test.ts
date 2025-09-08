/**
 * @fileoverview Tests for IssueCount value object
 */

import { describe, it, expect } from 'vitest';
import { IssueCount } from '../issue-count.js';

describe('IssueCount', () => {
  describe('create', () => {
    it('should create an issue count with valid value', () => {
      const count = IssueCount.create(42);

      expect(count.count).toBe(42);
      expect(count.category).toBeUndefined();
    });

    it('should create an issue count with category', () => {
      const count = IssueCount.create(10, 'security');

      expect(count.count).toBe(10);
      expect(count.category).toBe('security');
    });

    it('should throw error for negative values', () => {
      expect(() => IssueCount.create(-1)).toThrow('Issue count cannot be negative');
    });

    it('should allow zero value', () => {
      const count = IssueCount.create(0);

      expect(count.count).toBe(0);
      expect(count.isZero).toBe(true);
    });

    it('should throw error for non-integer values', () => {
      expect(() => IssueCount.create(3.14)).toThrow('Issue count must be an integer');

      expect(() => IssueCount.create(2.5)).toThrow('Issue count must be an integer');
    });

    it('should handle very large numbers', () => {
      const count = IssueCount.create(Number.MAX_SAFE_INTEGER);

      expect(count.count).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('zero', () => {
    it('should create a zero issue count', () => {
      const count = IssueCount.zero();

      expect(count.count).toBe(0);
      expect(count.category).toBeUndefined();
      expect(count.isZero).toBe(true);
    });

    it('should create a zero issue count with category', () => {
      const count = IssueCount.zero('bugs');

      expect(count.count).toBe(0);
      expect(count.category).toBe('bugs');
      expect(count.isZero).toBe(true);
    });
  });

  describe('getters', () => {
    it('should provide access to count and category', () => {
      const count = IssueCount.create(25, 'performance');

      expect(count.count).toBe(25);
      expect(count.category).toBe('performance');
    });

    it('should correctly identify zero counts', () => {
      const zero = IssueCount.zero();
      const nonZero = IssueCount.create(1);

      expect(zero.isZero).toBe(true);
      expect(nonZero.isZero).toBe(false);
    });

    it('should correctly identify positive counts', () => {
      const zero = IssueCount.zero();
      const positive = IssueCount.create(1);

      expect(zero.isPositive).toBe(false);
      expect(positive.isPositive).toBe(true);
    });
  });

  describe('add', () => {
    it('should add two issue counts', () => {
      const count1 = IssueCount.create(10);
      const count2 = IssueCount.create(5);

      const result = count1.add(count2);

      expect(result.count).toBe(15);
    });

    it('should preserve category when both have same category', () => {
      const count1 = IssueCount.create(10, 'security');
      const count2 = IssueCount.create(5, 'security');

      const result = count1.add(count2);

      expect(result.count).toBe(15);
      expect(result.category).toBe('security');
    });

    it('should clear category when categories differ', () => {
      const count1 = IssueCount.create(10, 'security');
      const count2 = IssueCount.create(5, 'performance');

      const result = count1.add(count2);

      expect(result.count).toBe(15);
      expect(result.category).toBeUndefined();
    });

    it('should preserve category of first when second has no category', () => {
      const count1 = IssueCount.create(10, 'security');
      const count2 = IssueCount.create(5);

      const result = count1.add(count2);

      expect(result.category).toBeUndefined();
    });

    it('should add zero without changing value', () => {
      const count = IssueCount.create(42);
      const zero = IssueCount.zero();

      const result = count.add(zero);

      expect(result.count).toBe(42);
    });

    it('should create a new instance', () => {
      const count1 = IssueCount.create(10);
      const count2 = IssueCount.create(5);

      const result = count1.add(count2);

      expect(result).not.toBe(count1);
      expect(result).not.toBe(count2);
      expect(count1.count).toBe(10); // Original unchanged
    });
  });

  describe('subtract', () => {
    it('should subtract two issue counts', () => {
      const count1 = IssueCount.create(15);
      const count2 = IssueCount.create(5);

      const result = count1.subtract(count2);

      expect(result.count).toBe(10);
    });

    it('should throw error when result would be negative', () => {
      const count1 = IssueCount.create(5);
      const count2 = IssueCount.create(10);

      expect(() => count1.subtract(count2)).toThrow('Cannot subtract: result would be negative');
    });

    it('should allow subtracting to zero', () => {
      const count1 = IssueCount.create(10);
      const count2 = IssueCount.create(10);

      const result = count1.subtract(count2);

      expect(result.count).toBe(0);
      expect(result.isZero).toBe(true);
    });

    it('should preserve category when both have same category', () => {
      const count1 = IssueCount.create(10, 'security');
      const count2 = IssueCount.create(3, 'security');

      const result = count1.subtract(count2);

      expect(result.count).toBe(7);
      expect(result.category).toBe('security');
    });

    it('should clear category when categories differ', () => {
      const count1 = IssueCount.create(10, 'security');
      const count2 = IssueCount.create(3, 'performance');

      const result = count1.subtract(count2);

      expect(result.category).toBeUndefined();
    });

    it('should create a new instance', () => {
      const count1 = IssueCount.create(10);
      const count2 = IssueCount.create(5);

      const result = count1.subtract(count2);

      expect(result).not.toBe(count1);
      expect(count1.count).toBe(10); // Original unchanged
    });
  });

  describe('increment', () => {
    it('should increment by one', () => {
      const count = IssueCount.create(41);
      const result = count.increment();

      expect(result.count).toBe(42);
    });

    it('should preserve category', () => {
      const count = IssueCount.create(10, 'bugs');
      const result = count.increment();

      expect(result.count).toBe(11);
      expect(result.category).toBe('bugs');
    });

    it('should create a new instance', () => {
      const count = IssueCount.create(10);
      const result = count.increment();

      expect(result).not.toBe(count);
      expect(count.count).toBe(10); // Original unchanged
    });

    it('should increment from zero', () => {
      const count = IssueCount.zero();
      const result = count.increment();

      expect(result.count).toBe(1);
      expect(result.isPositive).toBe(true);
    });
  });

  describe('decrement', () => {
    it('should decrement by one', () => {
      const count = IssueCount.create(43);
      const result = count.decrement();

      expect(result.count).toBe(42);
    });

    it('should throw error when count is already zero', () => {
      const count = IssueCount.zero();

      expect(() => count.decrement()).toThrow('Cannot decrement: count is already zero');
    });

    it('should allow decrementing to zero', () => {
      const count = IssueCount.create(1);
      const result = count.decrement();

      expect(result.count).toBe(0);
      expect(result.isZero).toBe(true);
    });

    it('should preserve category', () => {
      const count = IssueCount.create(10, 'bugs');
      const result = count.decrement();

      expect(result.count).toBe(9);
      expect(result.category).toBe('bugs');
    });

    it('should create a new instance', () => {
      const count = IssueCount.create(10);
      const result = count.decrement();

      expect(result).not.toBe(count);
      expect(count.count).toBe(10); // Original unchanged
    });
  });

  describe('toString', () => {
    it('should format singular correctly', () => {
      const count = IssueCount.create(1);

      expect(count.toString()).toBe('1 issue');
    });

    it('should format plural correctly', () => {
      const count = IssueCount.create(5);

      expect(count.toString()).toBe('5 issues');
    });

    it('should format zero as plural', () => {
      const count = IssueCount.zero();

      expect(count.toString()).toBe('0 issues');
    });

    it('should include category when present', () => {
      const count = IssueCount.create(3, 'security');

      expect(count.toString()).toBe('3 security issues');
    });

    it('should handle singular with category', () => {
      const count = IssueCount.create(1, 'performance');

      expect(count.toString()).toBe('1 performance issue');
    });

    it('should handle large numbers', () => {
      const count = IssueCount.create(1000000);

      expect(count.toString()).toBe('1000000 issues');
    });
  });

  describe('equals', () => {
    it('should return true for counts with same value and no category', () => {
      const count1 = IssueCount.create(42);
      const count2 = IssueCount.create(42);

      expect(count1.equals(count2)).toBe(true);
    });

    it('should return false for counts with different values', () => {
      const count1 = IssueCount.create(42);
      const count2 = IssueCount.create(43);

      expect(count1.equals(count2)).toBe(false);
    });

    it('should consider category in equality', () => {
      const count1 = IssueCount.create(42, 'bugs');
      const count2 = IssueCount.create(42, 'security');

      expect(count1.equals(count2)).toBe(false);
    });

    it('should handle undefined categories', () => {
      const count1 = IssueCount.create(42);
      const count2 = IssueCount.create(42, 'bugs');

      expect(count1.equals(count2)).toBe(false);
    });

    it('should match counts with same category', () => {
      const count1 = IssueCount.create(42, 'bugs');
      const count2 = IssueCount.create(42, 'bugs');

      expect(count1.equals(count2)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const count = IssueCount.create(42, 'bugs');

      // Properties should be readonly
      // @ts-expect-error - Testing immutability
      expect(() => {
        count.count = 50;
      }).toThrow();

      // @ts-expect-error - Testing immutability
      expect(() => {
        count.category = 'security';
      }).toThrow();
    });

    it('should maintain immutability through operations', () => {
      const original = IssueCount.create(10);

      const added = original.add(IssueCount.create(5));
      const incremented = original.increment();
      const decremented = original.decrement();

      expect(original.count).toBe(10); // All operations leave original unchanged
      expect(added.count).toBe(15);
      expect(incremented.count).toBe(11);
      expect(decremented.count).toBe(9);
    });
  });
});
