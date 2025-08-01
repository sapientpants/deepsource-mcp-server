/**
 * @fileoverview Base entity class for domain-driven design
 *
 * This module provides the base class for all entities in the domain layer.
 * Entities are domain objects that have a unique identity that persists
 * throughout their lifecycle, even as their attributes change.
 */

/**
 * Base class for all entities in the domain
 *
 * Entities are distinguished by their identity rather than their attributes.
 * Two entities with the same attributes but different identities are considered different.
 *
 * @example
 * ```typescript
 * class User extends Entity<string> {
 *   constructor(
 *     id: string,
 *     private _name: string,
 *     private _email: string
 *   ) {
 *     super(id);
 *   }
 *
 *   get name(): string {
 *     return this._name;
 *   }
 *
 *   changeName(name: string): void {
 *     if (!name || name.length === 0) {
 *       throw new Error('Name cannot be empty');
 *     }
 *     this._name = name;
 *   }
 * }
 * ```
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  /**
   * Gets the unique identifier of the entity
   */
  get id(): TId {
    return this._id;
  }

  /**
   * Checks equality between two entities
   *
   * Two entities are equal if they have the same identity,
   * regardless of their other attributes.
   *
   * @param other - The entity to compare with
   * @returns True if the entities have the same identity, false otherwise
   */
  public equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof Entity)) {
      return false;
    }

    return this._id === other._id;
  }
}
