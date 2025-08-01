/**
 * @fileoverview Base aggregate root class for domain-driven design
 *
 * This module provides the base class for all aggregate roots in the domain layer.
 * Aggregate roots are the entry points to aggregates and enforce consistency boundaries.
 * They can emit domain events to communicate changes to other parts of the system.
 */

import { Entity } from './entity.js';

/**
 * Base interface for domain events
 */
export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

/**
 * Base class for all aggregate roots in the domain
 *
 * Aggregate roots are entities that serve as the entry point to an aggregate.
 * They maintain consistency within the aggregate boundary and can emit domain events.
 *
 * @example
 * ```typescript
 * class Order extends AggregateRoot<string> {
 *   private items: OrderItem[] = [];
 *   private status: OrderStatus;
 *
 *   constructor(id: string) {
 *     super(id);
 *     this.status = OrderStatus.PENDING;
 *   }
 *
 *   addItem(product: Product, quantity: number): void {
 *     const item = new OrderItem(product, quantity);
 *     this.items.push(item);
 *
 *     this.addDomainEvent({
 *       aggregateId: this.id,
 *       eventType: 'OrderItemAdded',
 *       occurredAt: new Date(),
 *       payload: { productId: product.id, quantity }
 *     });
 *   }
 *
 *   submit(): void {
 *     if (this.items.length === 0) {
 *       throw new Error('Cannot submit empty order');
 *     }
 *     this.status = OrderStatus.SUBMITTED;
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  /**
   * Gets the uncommitted domain events
   */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  /**
   * Adds a domain event to be dispatched
   *
   * Domain events are collected during the execution of aggregate methods
   * and should be dispatched by the infrastructure layer after persistence.
   *
   * @param event - The domain event to add
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Clears all domain events
   *
   * This should be called by the infrastructure layer after
   * successfully dispatching all domain events.
   */
  public clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Marks the aggregate as having uncommitted changes
   *
   * This can be used by repositories to track which aggregates
   * need to be persisted.
   */
  public markAsModified(): void {
    this.addDomainEvent({
      aggregateId: String(this._id),
      eventType: 'AggregateModified',
      occurredAt: new Date(),
      payload: {},
    });
  }
}
