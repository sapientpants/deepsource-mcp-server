/**
 * @fileoverview Example tool plugin demonstrating the enhanced tool format
 */

import { z } from 'zod';
import { EnhancedToolDefinition } from '../server/tool-registry-enhanced.js';
import { wrapInApiResponse } from '../handlers/base/handler.factory.js';

/**
 * Example tool schema
 */
export const toolSchema = {
  name: 'example_tool',
  description: 'An example tool demonstrating the enhanced plugin format',
  inputSchema: z.object({
    message: z.string().describe('Message to process'),
    count: z.number().optional().default(1).describe('Number of times to repeat'),
  }),
  outputSchema: z.object({
    result: z.string(),
    processedAt: z.string(),
    metadata: z.object({
      messageLength: z.number(),
      repeatCount: z.number(),
    }),
  }),
};

/**
 * Example tool handler
 */
export const handler = async (params: unknown) => {
  const typedParams = params as { message: string; count?: number };
  const count = typedParams.count ?? 1;
  const repeatedMessage = Array(count).fill(typedParams.message).join(' ');

  return wrapInApiResponse({
    result: repeatedMessage,
    processedAt: new Date().toISOString(),
    metadata: {
      messageLength: typedParams.message.length,
      repeatCount: count,
    },
  });
};

/**
 * Enhanced tool definition with metadata
 */
export const toolDefinition: EnhancedToolDefinition = {
  ...toolSchema,
  handler,
  metadata: {
    category: 'utilities',
    version: '1.0.0',
    tags: ['example', 'demo', 'text-processing'],
    enabled: true,
  },
};

// Default export for automatic discovery
export default toolDefinition;
