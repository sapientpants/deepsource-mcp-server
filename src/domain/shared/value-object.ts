/**
 * @fileoverview Base value object class for domain-driven design
 *
 * This module provides the base class for all value objects in the domain layer.
 * Value objects are immutable objects that are defined by their attributes rather
 * than a unique identity. They provide type safety and encapsulation of business rules.
 */

/**
 * Base class for all value objects in the domain
 *
 * Value objects are immutable and compared by their properties rather than identity.
 * They encapsulate validation logic and provide type safety for domain concepts.
 *
 * @example
 * ```typescript
 * class Money extends ValueObject<{ amount: number; currency: string }> {
 *   constructor(amount: number, currency: string) {
 *     if (amount < 0) throw new Error('Amount cannot be negative');
 *     super({ amount, currency });
 *   }
 *
 *   get amount(): number {
 *     return this.props.amount;
 *   }
 *
 *   get currency(): string {
 *     return this.props.currency;
 *   }
 * }
 * ```
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Checks equality between two value objects
   *
   * Two value objects are equal if all their properties are equal.
   * This method performs deep equality checking for nested objects.
   *
   * @param other - The value object to compare with
   * @returns True if the value objects are equal, false otherwise
   */
  public equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (other.props === undefined) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Creates a copy of the value object with updated properties
   *
   * Since value objects are immutable, this method creates a new instance
   * with the specified properties updated.
   *
   * @param props - Partial properties to update
   * @returns A new instance of the value object with updated properties
   */
  protected copyWith(_props: Partial<T>): this {
    // Using any type for constructor to enable proper inheritance
    const ctor = this.constructor as any;
    return new ctor({ ...this.props, ..._props });
  }
}
