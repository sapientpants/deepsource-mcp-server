/**
 * @fileoverview Base repository interface for domain-driven design
 *
 * This module provides the base interface for all repositories in the domain layer.
 * Repositories provide an abstraction over data access and act as in-memory collections
 * of aggregate roots.
 */

import { AggregateRoot } from './aggregate-root.js';

/**
 * Base repository interface for aggregate roots
 *
 * Repositories encapsulate the logic needed to access aggregate roots.
 * They provide an illusion of an in-memory collection of objects while
 * hiding the complexities of data access.
 *
 * @template T - The type of aggregate root
 * @template TId - The type of the aggregate's identifier
 *
 * @example
 * ```typescript
 * interface IOrderRepository extends IRepository<Order, string> {
 *   findByCustomerId(customerId: string): Promise<Order[]>;
 *   findPendingOrders(): Promise<Order[]>;
 * }
 *
 * class OrderRepository implements IOrderRepository {
 *   async findById(id: string): Promise<Order | null> {
 *     // Implementation
 *   }
 *
 *   async save(order: Order): Promise<void> {
 *     // Implementation
 *   }
 *
 *   async delete(id: string): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IRepository<T extends AggregateRoot<TId>, TId> {
  /**
   * Finds an aggregate by its unique identifier
   *
   * @param id - The unique identifier of the aggregate
   * @returns The aggregate if found, null otherwise
   */
  findById(_id: TId): Promise<T | null>;

  /**
   * Persists an aggregate
   *
   * This method should handle both creating new aggregates and updating existing ones.
   * It should also dispatch any domain events after successful persistence.
   *
   * @param aggregate - The aggregate to persist
   */
  save(_aggregate: T): Promise<void>;

  /**
   * Deletes an aggregate
   *
   * @param id - The unique identifier of the aggregate to delete
   */
  delete(_id: TId): Promise<void>;
}

/**
 * Extended repository interface with pagination support
 *
 * This interface extends the base repository with methods that support
 * pagination for retrieving collections of aggregates.
 */
export interface IPaginatedRepository<T extends AggregateRoot<TId>, TId>
  extends IRepository<T, TId> {
  /**
   * Finds all aggregates with pagination
   *
   * @param options - Pagination options
   * @returns A paginated result containing the aggregates
   */
  findAll(_options: PaginationOptions): Promise<PaginatedResult<T>>;
}

/**
 * Pagination options for repository queries
 */
export interface PaginationOptions {
  /** The page number (1-based) */
  page: number;
  /** The number of items per page */
  pageSize: number;
  /** Optional sorting field */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated result container
 */
export interface PaginatedResult<T> {
  /** The items in the current page */
  items: T[];
  /** The current page number */
  page: number;
  /** The number of items per page */
  pageSize: number;
  /** The total number of items */
  totalCount: number;
  /** The total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}
