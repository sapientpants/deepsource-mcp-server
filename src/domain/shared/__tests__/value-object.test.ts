/**
 * @fileoverview Tests for ValueObject base class
 */

import { describe, it, expect } from '@jest/globals';
import { ValueObject } from '../value-object.js';

/**
 * Test implementation of ValueObject
 */
class TestValueObject extends ValueObject<{ value: string; number: number }> {
  constructor(value: string, number: number) {
    super({ value, number });
  }

  get value(): string {
    return this.props.value;
  }

  get number(): number {
    return this.props.number;
  }
}

/**
 * Another test implementation for equality testing
 */
class AnotherValueObject extends ValueObject<{ data: string }> {
  constructor(data: string) {
    super({ data });
  }

  get data(): string {
    return this.props.data;
  }
}

describe('ValueObject', () => {
  describe('constructor', () => {
    it('should create an immutable value object', () => {
      const vo = new TestValueObject('test', 42);

      expect(vo.value).toBe('test');
      expect(vo.number).toBe(42);
    });

    it('should freeze the props object', () => {
      const vo = new TestValueObject('test', 42);

      // @ts-expect-error - Testing immutability
      expect(() => {
        vo.props.value = 'changed';
      }).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for value objects with the same props', () => {
      const vo1 = new TestValueObject('test', 42);
      const vo2 = new TestValueObject('test', 42);

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for value objects with different props', () => {
      const vo1 = new TestValueObject('test', 42);
      const vo2 = new TestValueObject('test', 43);

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false for value objects with different property values', () => {
      const vo1 = new TestValueObject('test1', 42);
      const vo2 = new TestValueObject('test2', 42);

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should handle nested objects in props', () => {
      class NestedValueObject extends ValueObject<{ nested: { a: number; b: string } }> {
        constructor(a: number, b: string) {
          super({ nested: { a, b } });
        }
      }

      const vo1 = new NestedValueObject(1, 'test');
      const vo2 = new NestedValueObject(1, 'test');
      const vo3 = new NestedValueObject(2, 'test');

      expect(vo1.equals(vo2)).toBe(true);
      expect(vo1.equals(vo3)).toBe(false);
    });

    it('should handle arrays in props', () => {
      class ArrayValueObject extends ValueObject<{ items: number[] }> {
        constructor(items: number[]) {
          super({ items });
        }
      }

      const vo1 = new ArrayValueObject([1, 2, 3]);
      const vo2 = new ArrayValueObject([1, 2, 3]);
      const vo3 = new ArrayValueObject([1, 2, 4]);

      expect(vo1.equals(vo2)).toBe(true);
      expect(vo1.equals(vo3)).toBe(false);
    });

    it('should work with different value object types', () => {
      const testVo = new TestValueObject('test', 42);
      const anotherVo = new AnotherValueObject('test');

      // @ts-expect-error - Testing type mismatch
      expect(testVo.equals(anotherVo)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not allow modification of props after creation', () => {
      const props = { value: 'test', number: 42 };

      // Create a new value object with the props
      class MutableTestValueObject extends ValueObject<typeof props> {
        constructor(p: typeof props) {
          super(p);
        }

        getPropsValue(): string {
          return this.props.value;
        }
      }

      const mutableVo = new MutableTestValueObject(props);

      // The props should be frozen, so this should not modify the value object's props
      expect(mutableVo.getPropsValue()).toBe('test');

      // Verify that the internal props are indeed frozen
      expect(Object.isFrozen(mutableVo.props)).toBe(true);
    });

    it('should handle null and undefined values', () => {
      class NullableValueObject extends ValueObject<{ value: string | null; optional?: number }> {
        constructor(value: string | null, optional?: number) {
          super({ value, optional });
        }
      }

      const vo1 = new NullableValueObject(null);
      const vo2 = new NullableValueObject(null, undefined);
      const vo3 = new NullableValueObject('test', 42);

      expect(vo1.equals(vo2)).toBe(true);
      expect(vo1.equals(vo3)).toBe(false);
    });
  });
});
