/**
 * @fileoverview IssueCount value object
 *
 * This module defines the IssueCount value object which represents
 * counts of issues with validation for non-negative values.
 */

import { ValueObject } from '../shared/value-object.js';

/**
 * Properties for the IssueCount value object
 */
interface IssueCountProps {
  count: number;
  category?: string;
}

/**
 * Value object representing a count of issues
 *
 * Ensures that issue counts are always non-negative integers.
 * Can optionally include a category for the issues being counted.
 *
 * @example
 * ```typescript
 * const criticalIssues = IssueCount.create(5, 'critical');
 * const totalIssues = IssueCount.create(23);
 *
 * const combined = criticalIssues.add(totalIssues);
 * console.log(combined.count); // 28
 * ```
 */
export class IssueCount extends ValueObject<IssueCountProps> {
  // Private constructor enforces factory pattern - instances must be created via static methods
  // skipcq: JS-0358 - This constructor is necessary to prevent direct instantiation
  private constructor(props: IssueCountProps) {
    super(props);
  }

  /**
   * Creates a new IssueCount instance
   *
   * @param count - The number of issues
   * @param category - Optional category of issues
   * @returns A new IssueCount instance
   * @throws Error if count is negative or not an integer
   */
  static create(count: number, category?: string): IssueCount {
    if (!Number.isInteger(count)) {
      throw new Error('Issue count must be an integer');
    }

    if (count < 0) {
      throw new Error('Issue count cannot be negative');
    }

    const props: IssueCountProps = { count };
    if (category !== undefined) {
      props.category = category;
    }
    return new IssueCount(props);
  }

  /**
   * Creates a zero count
   *
   * @param category - Optional category of issues
   * @returns A new IssueCount instance with zero count
   */
  static zero(category?: string): IssueCount {
    return IssueCount.create(0, category);
  }

  /**
   * Gets the count value
   */
  get count(): number {
    return this.props.count;
  }

  /**
   * Gets the category, if specified
   */
  get category(): string | undefined {
    return this.props.category;
  }

  /**
   * Checks if the count is zero
   */
  get isZero(): boolean {
    return this.props.count === 0;
  }

  /**
   * Checks if the count is positive (greater than zero)
   */
  get isPositive(): boolean {
    return this.props.count > 0;
  }

  /**
   * Adds another issue count to this one
   *
   * @param other - The other issue count to add
   * @returns A new IssueCount with the sum
   */
  add(other: IssueCount): IssueCount {
    const newCategory =
      this.props.category === other.props.category ? this.props.category : undefined;

    return IssueCount.create(this.props.count + other.props.count, newCategory);
  }

  /**
   * Subtracts another issue count from this one
   *
   * @param other - The other issue count to subtract
   * @returns A new IssueCount with the difference
   * @throws Error if the result would be negative
   */
  subtract(other: IssueCount): IssueCount {
    const difference = this.props.count - other.props.count;

    if (difference < 0) {
      throw new Error('Cannot subtract: result would be negative');
    }

    const newCategory =
      this.props.category === other.props.category ? this.props.category : undefined;

    return IssueCount.create(difference, newCategory);
  }

  /**
   * Increments the count by one
   *
   * @returns A new IssueCount with count increased by one
   */
  increment(): IssueCount {
    return IssueCount.create(this.props.count + 1, this.props.category);
  }

  /**
   * Decrements the count by one
   *
   * @returns A new IssueCount with count decreased by one
   * @throws Error if the count is already zero
   */
  decrement(): IssueCount {
    if (this.props.count === 0) {
      throw new Error('Cannot decrement: count is already zero');
    }

    return IssueCount.create(this.props.count - 1, this.props.category);
  }

  /**
   * Returns a string representation of the issue count
   */
  override toString(): string {
    const categoryStr = this.props.category ? ` ${this.props.category}` : '';
    return `${this.props.count}${categoryStr} issue${this.props.count !== 1 ? 's' : ''}`;
  }
}
