/**
 * @fileoverview Tests for MetricValue value object
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MetricValue } from '../metric-value.js';

describe('MetricValue', () => {
  let baseDate: Date;

  beforeEach(() => {
    baseDate = new Date('2024-01-01T00:00:00Z');
  });

  describe('create', () => {
    it('should create a metric value with all parameters', () => {
      const metric = MetricValue.create(42.5, '%', '42.5%', baseDate);

      expect(metric.value).toBe(42.5);
      expect(metric.unit).toBe('%');
      expect(metric.displayValue).toBe('42.5%');
      expect(metric.measuredAt).toEqual(baseDate);
    });

    it('should create a metric value with default display value', () => {
      const metric = MetricValue.create(100, 'ms');

      expect(metric.value).toBe(100);
      expect(metric.unit).toBe('ms');
      expect(metric.displayValue).toBe('100ms');
    });

    it('should create a metric value with current timestamp by default', () => {
      const before = new Date();
      const metric = MetricValue.create(50, 'count');
      const after = new Date();

      expect(metric.measuredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metric.measuredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error for non-finite values', () => {
      expect(() => MetricValue.create(Infinity, '%')).toThrow(
        'Metric value must be a finite number'
      );

      expect(() => MetricValue.create(NaN, '%')).toThrow('Metric value must be a finite number');
    });

    it('should throw error for empty unit', () => {
      expect(() => MetricValue.create(50, '')).toThrow('Unit cannot be empty');
    });

    it('should handle zero values', () => {
      const metric = MetricValue.create(0, 'count');
      expect(metric.value).toBe(0);
    });

    it('should handle negative values', () => {
      const metric = MetricValue.create(-10, 'delta');
      expect(metric.value).toBe(-10);
    });

    it('should use custom display value when provided', () => {
      const metric = MetricValue.create(12, 'points', '12/20');
      expect(metric.displayValue).toBe('12/20');
    });
  });

  describe('createPercentage', () => {
    it('should create a percentage metric with default decimal places', () => {
      const metric = MetricValue.createPercentage(85.567);

      expect(metric.value).toBe(85.567);
      expect(metric.unit).toBe('%');
      expect(metric.displayValue).toBe('85.6%');
      expect(metric.isPercentage).toBe(true);
    });

    it('should create a percentage metric with custom decimal places', () => {
      const metric = MetricValue.createPercentage(85.567, 2);

      expect(metric.displayValue).toBe('85.57%');
    });

    it('should handle zero decimal places', () => {
      const metric = MetricValue.createPercentage(85.567, 0);

      expect(metric.displayValue).toBe('86%');
    });

    it('should handle 0%', () => {
      const metric = MetricValue.createPercentage(0);

      expect(metric.value).toBe(0);
      expect(metric.displayValue).toBe('0.0%');
    });

    it('should handle 100%', () => {
      const metric = MetricValue.createPercentage(100);

      expect(metric.value).toBe(100);
      expect(metric.displayValue).toBe('100.0%');
    });
  });

  describe('createUnknown', () => {
    it('should create an unknown metric value', () => {
      const metric = MetricValue.createUnknown('count');

      expect(metric.value).toBe(0);
      expect(metric.unit).toBe('count');
      expect(metric.displayValue).toBe('N/A');
      expect(metric.isUnknown).toBe(true);
    });

    it('should handle different units', () => {
      const metric = MetricValue.createUnknown('%');

      expect(metric.unit).toBe('%');
      expect(metric.isUnknown).toBe(true);
    });
  });

  describe('getters', () => {
    it('should provide access to all properties', () => {
      const metric = MetricValue.create(42, 'count', 'Custom: 42', baseDate);

      expect(metric.value).toBe(42);
      expect(metric.unit).toBe('count');
      expect(metric.displayValue).toBe('Custom: 42');
      expect(metric.measuredAt).toEqual(baseDate);
    });

    it('should correctly identify percentage metrics', () => {
      const percentage = MetricValue.createPercentage(50);
      const other = MetricValue.create(50, 'ratio');

      expect(percentage.isPercentage).toBe(true);
      expect(other.isPercentage).toBe(false);
    });

    it('should correctly identify unknown metrics', () => {
      const unknown = MetricValue.createUnknown('count');
      const known = MetricValue.create(0, 'count');

      expect(unknown.isUnknown).toBe(true);
      expect(known.isUnknown).toBe(false);
    });
  });

  describe('difference', () => {
    it('should calculate difference between metrics with same unit', () => {
      const metric1 = MetricValue.create(100, 'count');
      const metric2 = MetricValue.create(75, 'count');

      expect(metric1.difference(metric2)).toBe(25);
      expect(metric2.difference(metric1)).toBe(-25);
    });

    it('should throw error for metrics with different units', () => {
      const metric1 = MetricValue.create(100, 'count');
      const metric2 = MetricValue.create(75, '%');

      expect(() => metric1.difference(metric2)).toThrow(
        'Cannot calculate difference between metrics with different units'
      );
    });

    it('should handle zero differences', () => {
      const metric1 = MetricValue.create(50, 'count');
      const metric2 = MetricValue.create(50, 'count');

      expect(metric1.difference(metric2)).toBe(0);
    });

    it('should handle negative values', () => {
      const metric1 = MetricValue.create(-10, 'delta');
      const metric2 = MetricValue.create(-20, 'delta');

      expect(metric1.difference(metric2)).toBe(10);
    });
  });

  describe('percentageChange', () => {
    it('should calculate positive percentage change', () => {
      const previous = MetricValue.create(100, 'count');
      const current = MetricValue.create(150, 'count');

      expect(current.percentageChange(previous)).toBe(50);
    });

    it('should calculate negative percentage change', () => {
      const previous = MetricValue.create(100, 'count');
      const current = MetricValue.create(75, 'count');

      expect(current.percentageChange(previous)).toBe(-25);
    });

    it('should handle zero previous value', () => {
      const previous = MetricValue.create(0, 'count');
      const current = MetricValue.create(100, 'count');

      expect(current.percentageChange(previous)).toBe(100);
    });

    it('should return 0 when current is 0 and previous is 0', () => {
      const previous = MetricValue.create(0, 'count');
      const current = MetricValue.create(0, 'count');

      expect(current.percentageChange(previous)).toBe(0);
    });

    it('should throw error for metrics with different units', () => {
      const previous = MetricValue.create(100, 'count');
      const current = MetricValue.create(150, '%');

      expect(() => current.percentageChange(previous)).toThrow(
        'Cannot calculate percentage change between metrics with different units'
      );
    });

    it('should handle decimal changes', () => {
      const previous = MetricValue.create(10, 'count');
      const current = MetricValue.create(12.5, 'count');

      expect(current.percentageChange(previous)).toBe(25);
    });

    it('should handle very small values', () => {
      const previous = MetricValue.create(0.01, 'ratio');
      const current = MetricValue.create(0.02, 'ratio');

      expect(current.percentageChange(previous)).toBe(100);
    });
  });

  describe('toString', () => {
    it('should return the display value', () => {
      const metric = MetricValue.create(42, 'count', 'Custom Display');

      expect(metric.toString()).toBe('Custom Display');
    });

    it('should return default formatted value', () => {
      const metric = MetricValue.create(100, 'ms');

      expect(metric.toString()).toBe('100ms');
    });

    it('should return N/A for unknown values', () => {
      const metric = MetricValue.createUnknown('count');

      expect(metric.toString()).toBe('N/A');
    });
  });

  describe('equals', () => {
    it('should return true for metrics with same properties', () => {
      const date = new Date();
      const metric1 = MetricValue.create(42, 'count', '42 items', date);
      const metric2 = MetricValue.create(42, 'count', '42 items', date);

      expect(metric1.equals(metric2)).toBe(true);
    });

    it('should return false for metrics with different values', () => {
      const metric1 = MetricValue.create(42, 'count');
      const metric2 = MetricValue.create(43, 'count');

      expect(metric1.equals(metric2)).toBe(false);
    });

    it('should return false for metrics with different units', () => {
      const metric1 = MetricValue.create(42, 'count');
      const metric2 = MetricValue.create(42, '%');

      expect(metric1.equals(metric2)).toBe(false);
    });

    it('should return false for metrics with different display values', () => {
      const metric1 = MetricValue.create(42, 'count', 'Display 1');
      const metric2 = MetricValue.create(42, 'count', 'Display 2');

      expect(metric1.equals(metric2)).toBe(false);
    });

    it('should return false for metrics with different timestamps', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const metric1 = MetricValue.create(42, 'count', undefined, date1);
      const metric2 = MetricValue.create(42, 'count', undefined, date2);

      expect(metric1.equals(metric2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const metric = MetricValue.create(42, 'count');

      // Properties should be readonly
      // @ts-expect-error - Testing immutability
      expect(() => {
        metric.value = 50;
      }).toThrow();

      // @ts-expect-error - Testing immutability
      expect(() => {
        metric.unit = '%';
      }).toThrow();
    });
  });
});
