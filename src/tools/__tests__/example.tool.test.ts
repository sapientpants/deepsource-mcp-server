/**
 * @fileoverview Tests for example tool plugin
 */

import { describe, it, expect } from '@jest/globals';
import { toolSchema, handler, toolDefinition } from '../example.tool.js';

describe('Example Tool', () => {
  describe('toolSchema', () => {
    it('should have correct basic properties', () => {
      expect(toolSchema.name).toBe('example_tool');
      expect(toolSchema.description).toBe(
        'An example tool demonstrating the enhanced plugin format'
      );
      expect(toolSchema.inputSchema).toBeDefined();
      expect(toolSchema.outputSchema).toBeDefined();
    });

    it('should validate valid input', () => {
      const validInput = { message: 'Hello', count: 3 };
      const result = toolSchema.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should validate input with default count', () => {
      const inputWithoutCount = { message: 'Hello' };
      const result = toolSchema.inputSchema.safeParse(inputWithoutCount);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(1);
      }
    });

    it('should reject invalid input', () => {
      const invalidInput = { count: 3 }; // missing required message
      const result = toolSchema.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate expected output format', () => {
      const validOutput = {
        result: 'Hello Hello',
        processedAt: '2023-01-01T00:00:00.000Z',
        metadata: {
          messageLength: 5,
          repeatCount: 2,
        },
      };
      const result = toolSchema.outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('should process single message', async () => {
      const params = { message: 'Hello', count: 1 };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe('Hello');
      expect(responseData.metadata.messageLength).toBe(5);
      expect(responseData.metadata.repeatCount).toBe(1);
      expect(responseData.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should repeat message multiple times', async () => {
      const params = { message: 'Test', count: 3 };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe('Test Test Test');
      expect(responseData.metadata.messageLength).toBe(4);
      expect(responseData.metadata.repeatCount).toBe(3);
    });

    it('should handle default count when not provided', async () => {
      const params = { message: 'Default' };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe('Default');
      expect(responseData.metadata.repeatCount).toBe(1);
    });

    it('should handle zero count', async () => {
      const params = { message: 'Zero', count: 0 };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe('');
      expect(responseData.metadata.repeatCount).toBe(0);
    });

    it('should handle empty message', async () => {
      const params = { message: '', count: 2 };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe(' ');
      expect(responseData.metadata.messageLength).toBe(0);
      expect(responseData.metadata.repeatCount).toBe(2);
    });

    it('should process with large count', async () => {
      const params = { message: 'Big', count: 10 };
      const result = await handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      const expectedResult = Array(10).fill('Big').join(' ');
      expect(responseData.result).toBe(expectedResult);
      expect(responseData.metadata.repeatCount).toBe(10);
    });
  });

  describe('toolDefinition', () => {
    it('should have correct structure', () => {
      expect(toolDefinition.name).toBe('example_tool');
      expect(toolDefinition.description).toBe(
        'An example tool demonstrating the enhanced plugin format'
      );
      expect(toolDefinition.handler).toBe(handler);
      expect(toolDefinition.inputSchema).toBe(toolSchema.inputSchema);
      expect(toolDefinition.outputSchema).toBe(toolSchema.outputSchema);
    });

    it('should have correct metadata', () => {
      expect(toolDefinition.metadata).toBeDefined();
      expect(toolDefinition.metadata?.category).toBe('utilities');
      expect(toolDefinition.metadata?.version).toBe('1.0.0');
      expect(toolDefinition.metadata?.tags).toEqual(['example', 'demo', 'text-processing']);
      expect(toolDefinition.metadata?.enabled).toBe(true);
    });

    it('should be callable through toolDefinition handler', async () => {
      const params = { message: 'Definition', count: 2 };
      const result = await toolDefinition.handler(params);

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.result).toBe('Definition Definition');
    });
  });
});
