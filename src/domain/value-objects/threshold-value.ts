/**
 * @fileoverview ThresholdValue value object
 *
 * This module defines the ThresholdValue value object which represents
 * a metric threshold with validation rules.
 */

import { ValueObject } from '../shared/value-object.js';

/**
 * Properties for the ThresholdValue value object
 */
interface ThresholdValueProps {
  value: number;
  unit: string;
  minAllowed: number;
  maxAllowed: number;
}

/**
 * Value object representing a metric threshold
 *
 * Encapsulates a threshold value with its unit and allowed range.
 * Ensures the value is always within the valid range.
 *
 * @example
 * ```typescript
 * const coverageThreshold = ThresholdValue.create(80, '%', 0, 100);
 * console.log(coverageThreshold.value); // 80
 * console.log(coverageThreshold.isPercentage); // true
 *
 * // This will throw an error
 * const invalidThreshold = ThresholdValue.create(150, '%', 0, 100);
 * ```
 */
export class ThresholdValue extends ValueObject<ThresholdValueProps> {
  // Private constructor enforces factory pattern - instances must be created via static methods
  // skipcq: JS-0358 - This constructor is necessary to prevent direct instantiation
  private constructor(props: ThresholdValueProps) {
    super(props);
  }

  /**
   * Creates a new ThresholdValue instance
   *
   * @param value - The threshold value
   * @param unit - The unit of measurement (e.g., '%', 'ms')
   * @param minAllowed - The minimum allowed value
   * @param maxAllowed - The maximum allowed value
   * @returns A new ThresholdValue instance
   * @throws Error if the value is outside the allowed range
   */
  static create(
    value: number,
    unit: string,
    minAllowed: number,
    maxAllowed: number
  ): ThresholdValue {
    if (value < minAllowed || value > maxAllowed) {
      throw new Error(
        `Threshold value ${value} is outside allowed range [${minAllowed}, ${maxAllowed}]`
      );
    }

    if (unit.length === 0) {
      throw new Error('Unit cannot be empty');
    }

    return new ThresholdValue({
      value,
      unit,
      minAllowed,
      maxAllowed,
    });
  }

  /**
   * Creates a percentage threshold (0-100)
   *
   * @param value - The percentage value
   * @returns A new ThresholdValue instance for percentages
   */
  static createPercentage(value: number): ThresholdValue {
    return ThresholdValue.create(value, '%', 0, 100);
  }

  /**
   * Gets the threshold value
   */
  get value(): number {
    return this.props.value;
  }

  /**
   * Gets the unit of measurement
   */
  get unit(): string {
    return this.props.unit;
  }

  /**
   * Gets the minimum allowed value
   */
  get minAllowed(): number {
    return this.props.minAllowed;
  }

  /**
   * Gets the maximum allowed value
   */
  get maxAllowed(): number {
    return this.props.maxAllowed;
  }

  /**
   * Checks if this is a percentage threshold
   */
  get isPercentage(): boolean {
    return this.props.unit === '%';
  }

  /**
   * Updates the threshold value
   *
   * @param newValue - The new threshold value
   * @returns A new ThresholdValue instance with the updated value
   * @throws Error if the new value is outside the allowed range
   */
  updateValue(newValue: number): ThresholdValue {
    return ThresholdValue.create(
      newValue,
      this.props.unit,
      this.props.minAllowed,
      this.props.maxAllowed
    );
  }

  /**
   * Checks if a given value meets this threshold
   *
   * @param value - The value to check
   * @param direction - Whether higher values are better ('upward') or lower values are better ('downward')
   * @returns True if the value meets the threshold, false otherwise
   */
  isMet(value: number, direction: 'upward' | 'downward'): boolean {
    if (direction === 'upward') {
      return value >= this.props.value;
    } else {
      return value <= this.props.value;
    }
  }

  /**
   * Returns a string representation of the threshold
   */
  override toString(): string {
    return `${this.props.value}${this.props.unit}`;
  }
}
