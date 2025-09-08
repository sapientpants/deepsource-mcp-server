/**
 * @fileoverview Tests for AggregateRoot base class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AggregateRoot } from '../aggregate-root.js';

/**
 * Test ID type
 */
type TestId = string & { readonly __brand: unique symbol };

/**
 * Test implementation of AggregateRoot
 */
class TestAggregate extends AggregateRoot<TestId> {
  private _status: 'active' | 'inactive' = 'active';
  private _name: string;

  constructor(id: TestId, name: string) {
    super(id);
    this._name = name;
  }

  get status(): 'active' | 'inactive' {
    return this._status;
  }

  get name(): string {
    return this._name;
  }

  activate(): void {
    if (this._status === 'active') {
      throw new Error('Already active');
    }

    this._status = 'active';
    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'TestAggregateActivated',
      occurredAt: new Date(),
      payload: { name: this._name } as Record<string, unknown>,
    });
  }

  deactivate(): void {
    if (this._status === 'inactive') {
      throw new Error('Already inactive');
    }

    this._status = 'inactive';
    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'TestAggregateDeactivated',
      occurredAt: new Date(),
      payload: { name: this._name } as Record<string, unknown>,
    });
  }

  updateName(name: string): void {
    const oldName = this._name;
    this._name = name;

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'TestAggregateNameUpdated',
      occurredAt: new Date(),
      payload: { oldName, newName: name } as Record<string, unknown>,
    });
  }

  // Test method to add multiple events at once
  performComplexOperation(): void {
    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'ComplexOperationStarted',
      occurredAt: new Date(),
      payload: {} as Record<string, unknown>,
    });

    this.addDomainEvent({
      aggregateId: this.id,
      eventType: 'ComplexOperationCompleted',
      occurredAt: new Date(),
      payload: { result: 'success' } as Record<string, unknown>,
    });
  }
}

describe('AggregateRoot', () => {
  const createTestId = (value: string): TestId => value as TestId;
  let aggregate: TestAggregate;
  let testId: TestId;

  beforeEach(() => {
    testId = createTestId('test-123');
    aggregate = new TestAggregate(testId, 'Test Aggregate');
  });

  describe('domain events', () => {
    it('should start with no domain events', () => {
      expect(aggregate.domainEvents).toHaveLength(0);
    });

    it('should add domain events when business methods are called', () => {
      aggregate.deactivate();

      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toMatchObject({
        aggregateId: testId,
        eventType: 'TestAggregateDeactivated',
        payload: { name: 'Test Aggregate' },
      });
    });

    it('should accumulate multiple domain events', () => {
      aggregate.updateName('New Name');
      aggregate.deactivate();

      expect(aggregate.domainEvents).toHaveLength(2);
      expect(aggregate.domainEvents[0].eventType).toBe('TestAggregateNameUpdated');
      expect(aggregate.domainEvents[1].eventType).toBe('TestAggregateDeactivated');
    });

    it('should include timestamps in domain events', () => {
      // First deactivate so we can activate
      aggregate.deactivate();
      aggregate.clearEvents();

      const before = new Date();
      aggregate.activate();
      const after = new Date();

      const event = aggregate.domainEvents[0];
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should clear events when requested', () => {
      aggregate.updateName('Name 1');
      aggregate.updateName('Name 2');

      expect(aggregate.domainEvents).toHaveLength(2);

      aggregate.clearEvents();

      expect(aggregate.domainEvents).toHaveLength(0);
    });

    it('should continue accumulating events after clearing', () => {
      aggregate.updateName('Name 1');
      aggregate.clearEvents();
      aggregate.updateName('Name 2');

      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0].payload).toMatchObject({
        oldName: 'Name 1',
        newName: 'Name 2',
      });
    });

    it('should handle complex operations with multiple events', () => {
      aggregate.performComplexOperation();

      expect(aggregate.domainEvents).toHaveLength(2);
      expect(aggregate.domainEvents[0].eventType).toBe('ComplexOperationStarted');
      expect(aggregate.domainEvents[1].eventType).toBe('ComplexOperationCompleted');
      expect(aggregate.domainEvents[1].payload).toMatchObject({ result: 'success' });
    });

    it('should return domain events as a readonly array type', () => {
      aggregate.updateName('New Name');

      const events = aggregate.domainEvents;

      // TypeScript should prevent modifications at compile time
      // At runtime, we can still verify the array contents
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('TestAggregateNameUpdated');

      // Verify the type is ReadonlyArray (this is a compile-time check)
      // The following line would cause a TypeScript error if uncommented:
      // events.push({ aggregateId: 'test', eventType: 'test', occurredAt: new Date(), payload: {} });

      // We can still access array methods that don't modify
      const filtered = events.filter((e) => e.eventType === 'TestAggregateNameUpdated');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('business invariants', () => {
    it('should enforce business rules before adding events', () => {
      aggregate.deactivate();

      // Should throw when trying to deactivate an already inactive aggregate
      expect(() => aggregate.deactivate()).toThrow('Already inactive');

      // Should only have one event (from the first deactivate)
      expect(aggregate.domainEvents).toHaveLength(1);
    });

    it('should maintain state consistency with events', () => {
      expect(aggregate.status).toBe('active');

      aggregate.deactivate();
      expect(aggregate.status).toBe('inactive');

      aggregate.activate();
      expect(aggregate.status).toBe('active');

      // Should have two events
      expect(aggregate.domainEvents).toHaveLength(2);
    });
  });

  describe('inheritance', () => {
    it('should inherit Entity behavior', () => {
      const id = createTestId('test-456');
      const aggregate1 = new TestAggregate(id, 'Aggregate 1');
      const aggregate2 = new TestAggregate(id, 'Aggregate 2');

      expect(aggregate1.equals(aggregate2)).toBe(true);
    });

    it('should maintain identity across operations', () => {
      const originalId = aggregate.id;

      aggregate.updateName('Changed');
      aggregate.deactivate();
      aggregate.activate();

      expect(aggregate.id).toBe(originalId);
    });
  });

  describe('event payload validation', () => {
    it('should store event payloads correctly', () => {
      aggregate.updateName('Updated Name');

      const event = aggregate.domainEvents[0];
      expect(event.payload).toEqual({
        oldName: 'Test Aggregate',
        newName: 'Updated Name',
      });
    });

    it('should handle empty payloads', () => {
      aggregate.performComplexOperation();

      const startEvent = aggregate.domainEvents[0];
      expect(startEvent.payload).toEqual({});
    });

    it('should preserve payload reference sharing', () => {
      aggregate.updateName('New Name');

      const event = aggregate.domainEvents[0];
      const payload = event.payload as Record<string, unknown>;

      // Domain events don't freeze payloads by default
      // This test verifies that payloads are shared references
      payload.testProperty = 'added';

      // The change should be reflected in the aggregate's event
      const actualPayload = aggregate.domainEvents[0].payload as Record<string, unknown>;
      expect(actualPayload.testProperty).toBe('added');

      // But the original properties should still be there
      expect(actualPayload.oldName).toBe('Test Aggregate');
      expect(actualPayload.newName).toBe('New Name');
    });
  });
});
