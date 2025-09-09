/**
 * @fileoverview Tests for CoveragePercentage value object
 */

import { describe, it, expect } from 'vitest';
import { CoveragePercentage } from '../coverage-percentage.js';

describe('CoveragePercentage', () => {
  describe('create', () => {
    it('should create a coverage percentage with valid value', () => {
      const coverage = CoveragePercentage.create(75.5);

      expect(coverage.value).toBe(75.5);
      expect(coverage.decimalPlaces).toBe(1);
    });

    it('should create with custom decimal places', () => {
      const coverage = CoveragePercentage.create(75.567, 2);

      expect(coverage.value).toBe(75.567);
      expect(coverage.decimalPlaces).toBe(2);
    });

    it('should throw error for values below 0', () => {
      expect(() => CoveragePercentage.create(-1)).toThrow(
        'Coverage percentage must be between 0 and 100'
      );
    });

    it('should throw error for values above 100', () => {
      expect(() => CoveragePercentage.create(101)).toThrow(
        'Coverage percentage must be between 0 and 100'
      );
    });

    it('should throw error for non-finite values', () => {
      expect(() => CoveragePercentage.create(Infinity)).toThrow(
        'Coverage percentage must be a finite number'
      );

      expect(() => CoveragePercentage.create(NaN)).toThrow(
        'Coverage percentage must be a finite number'
      );
    });

    it('should throw error for negative decimal places', () => {
      expect(() => CoveragePercentage.create(50, -1)).toThrow(
        'Decimal places must be a non-negative integer'
      );
    });

    it('should throw error for non-integer decimal places', () => {
      expect(() => CoveragePercentage.create(50, 1.5)).toThrow(
        'Decimal places must be a non-negative integer'
      );
    });

    it('should allow 0% coverage', () => {
      const coverage = CoveragePercentage.create(0);

      expect(coverage.value).toBe(0);
      expect(coverage.isZero).toBe(true);
    });

    it('should allow 100% coverage', () => {
      const coverage = CoveragePercentage.create(100);

      expect(coverage.value).toBe(100);
      expect(coverage.isPerfect).toBe(true);
    });
  });

  describe('zero', () => {
    it('should create zero coverage', () => {
      const coverage = CoveragePercentage.zero();

      expect(coverage.value).toBe(0);
      expect(coverage.isZero).toBe(true);
      expect(coverage.isPerfect).toBe(false);
    });
  });

  describe('perfect', () => {
    it('should create perfect coverage', () => {
      const coverage = CoveragePercentage.perfect();

      expect(coverage.value).toBe(100);
      expect(coverage.isPerfect).toBe(true);
      expect(coverage.isZero).toBe(false);
    });
  });

  describe('fromFraction', () => {
    it('should create from covered and total counts', () => {
      const coverage = CoveragePercentage.fromFraction(75, 100);

      expect(coverage.value).toBe(75);
    });

    it('should handle zero covered', () => {
      const coverage = CoveragePercentage.fromFraction(0, 100);

      expect(coverage.value).toBe(0);
      expect(coverage.isZero).toBe(true);
    });

    it('should handle all covered', () => {
      const coverage = CoveragePercentage.fromFraction(100, 100);

      expect(coverage.value).toBe(100);
      expect(coverage.isPerfect).toBe(true);
    });

    it('should calculate correct percentages', () => {
      const coverage = CoveragePercentage.fromFraction(3, 4);

      expect(coverage.value).toBe(75);
    });

    it('should handle decimal results', () => {
      const coverage = CoveragePercentage.fromFraction(1, 3);

      expect(coverage.value).toBeCloseTo(33.333, 3);
    });

    it('should throw error for zero total', () => {
      expect(() => CoveragePercentage.fromFraction(0, 0)).toThrow('Total must be positive');
    });

    it('should throw error for negative total', () => {
      expect(() => CoveragePercentage.fromFraction(50, -100)).toThrow('Total must be positive');
    });

    it('should throw error for negative covered', () => {
      expect(() => CoveragePercentage.fromFraction(-10, 100)).toThrow(
        'Covered count cannot be negative'
      );
    });

    it('should throw error when covered exceeds total', () => {
      expect(() => CoveragePercentage.fromFraction(110, 100)).toThrow(
        'Covered count cannot exceed total'
      );
    });

    it('should use custom decimal places', () => {
      const coverage = CoveragePercentage.fromFraction(1, 3, 3);

      expect(coverage.decimalPlaces).toBe(3);
    });
  });

  describe('getters', () => {
    it('should provide access to value and decimal places', () => {
      const coverage = CoveragePercentage.create(85.567, 2);

      expect(coverage.value).toBe(85.567);
      expect(coverage.decimalPlaces).toBe(2);
    });

    it('should correctly identify zero coverage', () => {
      const zero = CoveragePercentage.zero();
      const nonZero = CoveragePercentage.create(0.1);

      expect(zero.isZero).toBe(true);
      expect(nonZero.isZero).toBe(false);
    });

    it('should correctly identify perfect coverage', () => {
      const perfect = CoveragePercentage.perfect();
      const almostPerfect = CoveragePercentage.create(99.9);

      expect(perfect.isPerfect).toBe(true);
      expect(almostPerfect.isPerfect).toBe(false);
    });
  });

  describe('level', () => {
    it('should return excellent for >= 90%', () => {
      expect(CoveragePercentage.create(90).level).toBe('excellent');
      expect(CoveragePercentage.create(95).level).toBe('excellent');
      expect(CoveragePercentage.create(100).level).toBe('excellent');
    });

    it('should return good for >= 80%', () => {
      expect(CoveragePercentage.create(80).level).toBe('good');
      expect(CoveragePercentage.create(85).level).toBe('good');
      expect(CoveragePercentage.create(89.9).level).toBe('good');
    });

    it('should return fair for >= 60%', () => {
      expect(CoveragePercentage.create(60).level).toBe('fair');
      expect(CoveragePercentage.create(70).level).toBe('fair');
      expect(CoveragePercentage.create(79.9).level).toBe('fair');
    });

    it('should return poor for < 60%', () => {
      expect(CoveragePercentage.create(0).level).toBe('poor');
      expect(CoveragePercentage.create(30).level).toBe('poor');
      expect(CoveragePercentage.create(59.9).level).toBe('poor');
    });
  });

  describe('isAcceptable', () => {
    it('should return true when coverage meets threshold', () => {
      const coverage = CoveragePercentage.create(80);

      expect(coverage.isAcceptable(70)).toBe(true);
      expect(coverage.isAcceptable(80)).toBe(true);
    });

    it('should return false when coverage is below threshold', () => {
      const coverage = CoveragePercentage.create(70);

      expect(coverage.isAcceptable(80)).toBe(false);
      expect(coverage.isAcceptable(70.1)).toBe(false);
    });

    it('should handle edge cases', () => {
      const zero = CoveragePercentage.zero();
      const perfect = CoveragePercentage.perfect();

      expect(zero.isAcceptable(0)).toBe(true);
      expect(zero.isAcceptable(0.1)).toBe(false);
      expect(perfect.isAcceptable(100)).toBe(true);
    });
  });

  describe('improvementNeeded', () => {
    it('should calculate improvement needed to reach target', () => {
      const current = CoveragePercentage.create(60);

      expect(current.improvementNeeded(80)).toBe(20);
      expect(current.improvementNeeded(100)).toBe(40);
    });

    it('should return 0 when already at or above target', () => {
      const current = CoveragePercentage.create(85);

      expect(current.improvementNeeded(80)).toBe(0);
      expect(current.improvementNeeded(85)).toBe(0);
    });

    it('should handle decimal improvements', () => {
      const current = CoveragePercentage.create(75.5);

      expect(current.improvementNeeded(80.7)).toBeCloseTo(5.2, 1);
    });

    it('should handle edge cases', () => {
      const zero = CoveragePercentage.zero();
      const perfect = CoveragePercentage.perfect();

      expect(zero.improvementNeeded(50)).toBe(50);
      expect(perfect.improvementNeeded(100)).toBe(0);
    });
  });

  describe('combine', () => {
    it('should combine with equal weights by default', () => {
      const coverage1 = CoveragePercentage.create(80);
      const coverage2 = CoveragePercentage.create(60);

      const combined = coverage1.combine(coverage2);

      expect(combined.value).toBe(70);
    });

    it('should combine with custom weights', () => {
      const coverage1 = CoveragePercentage.create(80);
      const coverage2 = CoveragePercentage.create(60);

      const combined = coverage1.combine(coverage2, 3, 2);

      // (80 * 3 + 60 * 2) / 5 = 72
      expect(combined.value).toBe(72);
    });

    it('should throw error for zero total weight', () => {
      const coverage1 = CoveragePercentage.create(80);
      const coverage2 = CoveragePercentage.create(60);

      expect(() => coverage1.combine(coverage2, 0, 0)).toThrow('Total weight cannot be zero');
    });

    it('should handle extreme values', () => {
      const zero = CoveragePercentage.zero();
      const perfect = CoveragePercentage.perfect();

      const combined = zero.combine(perfect);

      expect(combined.value).toBe(50);
    });

    it('should use maximum decimal places', () => {
      const coverage1 = CoveragePercentage.create(80, 1);
      const coverage2 = CoveragePercentage.create(60, 3);

      const combined = coverage1.combine(coverage2);

      expect(combined.decimalPlaces).toBe(3);
    });

    it('should handle decimal weights', () => {
      const coverage1 = CoveragePercentage.create(80);
      const coverage2 = CoveragePercentage.create(60);

      const combined = coverage1.combine(coverage2, 1.5, 0.5);

      // (80 * 1.5 + 60 * 0.5) / 2 = 75
      expect(combined.value).toBe(75);
    });
  });

  describe('toString', () => {
    it('should format with specified decimal places', () => {
      const coverage = CoveragePercentage.create(75.567, 2);

      expect(coverage.toString()).toBe('75.57%');
    });

    it('should format with default decimal places', () => {
      const coverage = CoveragePercentage.create(75.567);

      expect(coverage.toString()).toBe('75.6%');
    });

    it('should format 0%', () => {
      const coverage = CoveragePercentage.zero();

      expect(coverage.toString()).toBe('0.0%');
    });

    it('should format 100%', () => {
      const coverage = CoveragePercentage.perfect();

      expect(coverage.toString()).toBe('100.0%');
    });

    it('should handle no decimal places', () => {
      const coverage = CoveragePercentage.create(75.567, 0);

      expect(coverage.toString()).toBe('76%');
    });
  });

  describe('toDisplayString', () => {
    it('should include level in display string', () => {
      const excellent = CoveragePercentage.create(95);
      const good = CoveragePercentage.create(85);
      const fair = CoveragePercentage.create(65);
      const poor = CoveragePercentage.create(30);

      expect(excellent.toDisplayString()).toBe('95.0% (excellent)');
      expect(good.toDisplayString()).toBe('85.0% (good)');
      expect(fair.toDisplayString()).toBe('65.0% (fair)');
      expect(poor.toDisplayString()).toBe('30.0% (poor)');
    });
  });

  describe('equals', () => {
    it('should return true for same coverage values and decimal places', () => {
      const coverage1 = CoveragePercentage.create(75.5, 2);
      const coverage2 = CoveragePercentage.create(75.5, 2);

      expect(coverage1.equals(coverage2)).toBe(true);
    });

    it('should return false for different coverage values', () => {
      const coverage1 = CoveragePercentage.create(75);
      const coverage2 = CoveragePercentage.create(76);

      expect(coverage1.equals(coverage2)).toBe(false);
    });

    it('should return false for different decimal places', () => {
      const coverage1 = CoveragePercentage.create(75, 1);
      const coverage2 = CoveragePercentage.create(75, 2);

      expect(coverage1.equals(coverage2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be immutable after creation', () => {
      const coverage = CoveragePercentage.create(75);

      // Properties should be readonly
      // @ts-expect-error - Testing immutability
      expect(() => {
        coverage.value = 80;
      }).toThrow();

      // @ts-expect-error - Testing immutability
      expect(() => {
        coverage.decimalPlaces = 2;
      }).toThrow();
    });
  });
});
