/**
 * @fileoverview MetricValue value object
 *
 * This module defines the MetricValue value object which represents
 * a measured metric value with its unit and display formatting.
 */

import { ValueObject } from '../shared/value-object.js';

/**
 * Properties for the MetricValue value object
 */
interface MetricValueProps {
  value: number;
  unit: string;
  displayValue: string;
  measuredAt: Date;
}

/**
 * Value object representing a metric measurement
 *
 * Encapsulates a metric value with its unit, display formatting,
 * and the timestamp when it was measured.
 *
 * @example
 * ```typescript
 * const coverage = MetricValue.create(85.5, '%');
 * console.log(coverage.value); // 85.5
 * console.log(coverage.displayValue); // "85.5%"
 *
 * const complexity = MetricValue.create(12, 'points', '12/20');
 * console.log(complexity.displayValue); // "12/20"
 * ```
 */
export class MetricValue extends ValueObject<MetricValueProps> {
  private constructor(props: MetricValueProps) {
    super(props);
  }

  /**
   * Creates a new MetricValue instance
   *
   * @param value - The numeric value of the metric
   * @param unit - The unit of measurement
   * @param displayValue - Optional custom display value (defaults to value + unit)
   * @param measuredAt - Optional measurement timestamp (defaults to now)
   * @returns A new MetricValue instance
   * @throws Error if the value is not a valid number
   */
  static create(
    value: number,
    unit: string,
    displayValue?: string,
    measuredAt?: Date
  ): MetricValue {
    if (!Number.isFinite(value)) {
      throw new Error('Metric value must be a finite number');
    }

    if (unit.length === 0) {
      throw new Error('Unit cannot be empty');
    }

    const display = displayValue || `${value}${unit}`;
    const timestamp = measuredAt || new Date();

    return new MetricValue({
      value,
      unit,
      displayValue: display,
      measuredAt: timestamp,
    });
  }

  /**
   * Creates a percentage metric value
   *
   * @param value - The percentage value
   * @param decimalPlaces - Number of decimal places to display (default: 1)
   * @returns A new MetricValue instance for percentages
   */
  static createPercentage(value: number, decimalPlaces = 1): MetricValue {
    const displayValue = `${value.toFixed(decimalPlaces)}%`;
    return MetricValue.create(value, '%', displayValue);
  }

  /**
   * Creates a null/unknown metric value
   *
   * @param unit - The unit of measurement
   * @returns A new MetricValue instance representing an unknown value
   */
  static createUnknown(unit: string): MetricValue {
    return MetricValue.create(0, unit, 'N/A');
  }

  /**
   * Gets the numeric value
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
   * Gets the display-formatted value
   */
  get displayValue(): string {
    return this.props.displayValue;
  }

  /**
   * Gets the measurement timestamp
   */
  get measuredAt(): Date {
    return this.props.measuredAt;
  }

  /**
   * Checks if this is a percentage value
   */
  get isPercentage(): boolean {
    return this.props.unit === '%';
  }

  /**
   * Checks if this represents an unknown/null value
   */
  get isUnknown(): boolean {
    return this.props.displayValue === 'N/A';
  }

  /**
   * Calculates the difference between this value and another
   *
   * @param other - The other metric value to compare
   * @returns The numeric difference
   * @throws Error if the units don't match
   */
  difference(other: MetricValue): number {
    if (this.props.unit !== other.props.unit) {
      throw new Error('Cannot calculate difference between metrics with different units');
    }
    return this.props.value - other.props.value;
  }

  /**
   * Calculates the percentage change from another value
   *
   * @param previous - The previous metric value
   * @returns The percentage change
   * @throws Error if the units don't match
   */
  percentageChange(previous: MetricValue): number {
    if (this.props.unit !== previous.props.unit) {
      throw new Error('Cannot calculate percentage change between metrics with different units');
    }

    if (previous.props.value === 0) {
      return this.props.value > 0 ? 100 : 0;
    }

    return ((this.props.value - previous.props.value) / previous.props.value) * 100;
  }

  /**
   * Returns a string representation of the metric value
   */
  toString(): string {
    return this.props.displayValue;
  }
}
