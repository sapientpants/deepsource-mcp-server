/**
 * @fileoverview Shared domain building blocks
 *
 * This module exports the base classes and interfaces used throughout
 * the domain layer for implementing domain-driven design patterns.
 */

export { ValueObject } from './value-object.js';
export { Entity } from './entity.js';
export { AggregateRoot } from './aggregate-root.js';
export type { DomainEvent } from './aggregate-root.js';
export type {
  IRepository,
  IPaginatedRepository,
  PaginationOptions,
  PaginatedResult,
} from './repository.interface.js';
