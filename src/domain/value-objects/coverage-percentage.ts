/**
 * @fileoverview CoveragePercentage value object
 *
 * This module defines the CoveragePercentage value object which represents
 * code coverage as a percentage with specific validation and formatting rules.
 */

import { ValueObject } from '../shared/value-object.js';

/**
 * Properties for the CoveragePercentage value object
 */
interface CoveragePercentageProps {
  value: number;
  decimalPlaces: number;
}

/**
 * Value object representing code coverage as a percentage
 *
 * Ensures that coverage values are always between 0 and 100 (inclusive)
 * and provides specialized formatting and comparison methods.
 *
 * @example
 * ```typescript
 * const coverage = CoveragePercentage.create(85.567);
 * console.log(coverage.toString()); // "85.6%"
 * console.log(coverage.isAcceptable(80)); // true
 *
 * const perfect = CoveragePercentage.perfect();
 * console.log(perfect.value); // 100
 * ```
 */
export class CoveragePercentage extends ValueObject<CoveragePercentageProps> {
  private constructor(props: CoveragePercentageProps) {
    super(props);
  }

  /**
   * Creates a new CoveragePercentage instance
   *
   * @param value - The coverage percentage (0-100)
   * @param decimalPlaces - Number of decimal places for display (default: 1)
   * @returns A new CoveragePercentage instance
   * @throws Error if value is outside 0-100 range
   */
  static create(value: number, decimalPlaces = 1): CoveragePercentage {
    if (!Number.isFinite(value)) {
      throw new Error('Coverage percentage must be a finite number');
    }

    if (value < 0 || value > 100) {
      throw new Error('Coverage percentage must be between 0 and 100');
    }

    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
      throw new Error('Decimal places must be a non-negative integer');
    }

    return new CoveragePercentage({
      value,
      decimalPlaces,
    });
  }

  /**
   * Creates a zero coverage instance
   *
   * @returns A new CoveragePercentage with 0% coverage
   */
  static zero(): CoveragePercentage {
    return CoveragePercentage.create(0);
  }

  /**
   * Creates a perfect coverage instance
   *
   * @returns A new CoveragePercentage with 100% coverage
   */
  static perfect(): CoveragePercentage {
    return CoveragePercentage.create(100);
  }

  /**
   * Creates a coverage percentage from a fraction
   *
   * @param covered - Number of covered items
   * @param total - Total number of items
   * @param decimalPlaces - Number of decimal places for display
   * @returns A new CoveragePercentage instance
   * @throws Error if total is zero or negative
   */
  static fromFraction(covered: number, total: number, decimalPlaces = 1): CoveragePercentage {
    if (total <= 0) {
      throw new Error('Total must be positive');
    }

    if (covered < 0) {
      throw new Error('Covered count cannot be negative');
    }

    if (covered > total) {
      throw new Error('Covered count cannot exceed total');
    }

    const percentage = (covered / total) * 100;
    return CoveragePercentage.create(percentage, decimalPlaces);
  }

  /**
   * Gets the percentage value
   */
  get value(): number {
    return this.props.value;
  }

  /**
   * Gets the number of decimal places for display
   */
  get decimalPlaces(): number {
    return this.props.decimalPlaces;
  }

  /**
   * Checks if coverage is zero
   */
  get isZero(): boolean {
    return this.props.value === 0;
  }

  /**
   * Checks if coverage is perfect (100%)
   */
  get isPerfect(): boolean {
    return this.props.value === 100;
  }

  /**
   * Gets the coverage level category
   */
  get level(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.props.value >= 90) return 'excellent';
    if (this.props.value >= 80) return 'good';
    if (this.props.value >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Checks if the coverage meets or exceeds a threshold
   *
   * @param threshold - The minimum acceptable percentage
   * @returns True if coverage meets the threshold
   */
  isAcceptable(threshold: number): boolean {
    return this.props.value >= threshold;
  }

  /**
   * Calculates the improvement needed to reach a target
   *
   * @param target - The target percentage
   * @returns The percentage points needed to reach the target
   */
  improvementNeeded(target: number): number {
    return Math.max(0, target - this.props.value);
  }

  /**
   * Combines this coverage with another (weighted average)
   *
   * @param other - The other coverage percentage
   * @param thisWeight - Weight for this coverage (default: 1)
   * @param otherWeight - Weight for the other coverage (default: 1)
   * @returns A new CoveragePercentage with the weighted average
   */
  combine(other: CoveragePercentage, thisWeight = 1, otherWeight = 1): CoveragePercentage {
    const totalWeight = thisWeight + otherWeight;
    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }

    const weightedAverage =
      (this.props.value * thisWeight + other.props.value * otherWeight) / totalWeight;

    return CoveragePercentage.create(
      weightedAverage,
      Math.max(this.props.decimalPlaces, other.props.decimalPlaces)
    );
  }

  /**
   * Returns a formatted string representation
   */
  toString(): string {
    return `${this.props.value.toFixed(this.props.decimalPlaces)}%`;
  }

  /**
   * Returns a display string with the coverage level
   */
  toDisplayString(): string {
    return `${this.toString()} (${this.level})`;
  }
}
