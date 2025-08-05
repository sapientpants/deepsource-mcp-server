/**
 * @fileoverview Tests for Entity base class
 */

import { describe, it, expect } from '@jest/globals';
import { Entity } from '../entity.js';

/**
 * Test ID type
 */
type TestId = string & { readonly __brand: unique symbol };

/**
 * Test implementation of Entity
 */
class TestEntity extends Entity<TestId> {
  private _name: string;
  private _value: number;

  constructor(id: TestId, name: string, value: number) {
    super(id);
    this._name = name;
    this._value = value;
  }

  get name(): string {
    return this._name;
  }

  get value(): number {
    return this._value;
  }

  updateName(name: string): void {
    this._name = name;
  }

  updateValue(value: number): void {
    this._value = value;
  }
}

/**
 * Another test entity for comparison
 */
class AnotherTestEntity extends Entity<TestId> {}

describe('Entity', () => {
  const createTestId = (value: string): TestId => value as TestId;

  describe('constructor', () => {
    it('should create an entity with the given id', () => {
      const id = createTestId('test-123');
      const entity = new TestEntity(id, 'Test', 42);

      expect(entity.id).toBe(id);
      expect(entity.name).toBe('Test');
      expect(entity.value).toBe(42);
    });
  });

  describe('equals', () => {
    it('should return true for entities with the same id', () => {
      const id = createTestId('test-123');
      const entity1 = new TestEntity(id, 'Test1', 42);
      const entity2 = new TestEntity(id, 'Test2', 99);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for entities with different ids', () => {
      const entity1 = new TestEntity(createTestId('test-123'), 'Test', 42);
      const entity2 = new TestEntity(createTestId('test-456'), 'Test', 42);

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should return true even if entities have different state', () => {
      const id = createTestId('test-123');
      const entity1 = new TestEntity(id, 'Original', 1);
      const entity2 = new TestEntity(id, 'Modified', 999);

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should work with different entity types that have the same id', () => {
      const id = createTestId('test-123');
      const testEntity = new TestEntity(id, 'Test', 42);
      const anotherEntity = new AnotherTestEntity(id);

      expect(testEntity.equals(anotherEntity)).toBe(true);
      expect(anotherEntity.equals(testEntity)).toBe(true);
    });

    it('should handle null or undefined comparisons', () => {
      const entity = new TestEntity(createTestId('test-123'), 'Test', 42);

      // @ts-expect-error - Testing null comparison
      expect(entity.equals(null)).toBe(false);

      // @ts-expect-error - Testing undefined comparison
      expect(entity.equals(undefined)).toBe(false);
    });
  });

  describe('identity', () => {
    it('should maintain identity even after state changes', () => {
      const id = createTestId('test-123');
      const entity = new TestEntity(id, 'Original', 42);

      entity.updateName('Modified');
      entity.updateValue(999);

      expect(entity.id).toBe(id);
      expect(entity.name).toBe('Modified');
      expect(entity.value).toBe(999);
    });

    it('should not allow id modification', () => {
      const entity = new TestEntity(createTestId('test-123'), 'Test', 42);

      // The id property should be readonly
      // @ts-expect-error - Testing readonly property
      expect(() => {
        entity.id = createTestId('new-id');
      }).toThrow();
    });
  });

  describe('type safety', () => {
    it('should work with different id types', () => {
      // Number ID type
      type NumberId = number & { readonly __brand: unique symbol };

      class NumberIdEntity extends Entity<NumberId> {}

      const numId = 123 as NumberId;
      const numEntity = new NumberIdEntity(numId);

      expect(numEntity.id).toBe(123);
    });

    it('should work with complex branded types', () => {
      // Complex ID type
      type ComplexId = { projectKey: string; runId: string } & { readonly __brand: unique symbol };

      class ComplexIdEntity extends Entity<ComplexId> {}

      const complexId = { projectKey: 'proj-1', runId: 'run-1' } as ComplexId;
      const complexEntity = new ComplexIdEntity(complexId);

      expect(complexEntity.id).toEqual({ projectKey: 'proj-1', runId: 'run-1' });
    });
  });
});
