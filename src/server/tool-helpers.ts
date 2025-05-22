/**
 * @fileoverview Helper functions for tool registration and response handling.
 * Provides utilities to reduce boilerplate in tool handlers.
 * @packageDocumentation
 */

import { createLogger } from '../utils/logging/logger.js';

const logger = createLogger('DeepSourceMCP:ToolHelpers');

/**
 * Parse error message if it looks like JSON
 */
export function parseErrorMessage(errorMessage: string): string {
  if (errorMessage.startsWith('{') && errorMessage.endsWith('}')) {
    try {
      const parsedError = JSON.parse(errorMessage);
      if (parsedError?.error) {
        let message = `DeepSource API Error: ${parsedError.error}`;
        if (parsedError.details) {
          message = `${message} - ${parsedError.details}`;
        }
        return message;
      }
    } catch {
      logger.debug('Failed to parse error message as JSON', { message: errorMessage });
    }
  }
  return errorMessage;
}

/**
 * Format error for consistent error handling
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return parseErrorMessage(error.message);
  }
  return 'Unknown error occurred';
}

/**
 * Log tool handler invocation
 */
export function logToolInvocation(toolName: string, params?: unknown): void {
  logger.info(`MCP ${toolName} tool handler invoked`, params ? { params } : {});
}

/**
 * Log tool handler result
 */
export function logToolResult(
  toolName: string,
  result: { content?: Array<{ text?: string }> }
): void {
  logger.debug(`${toolName} handler result received`, {
    contentLength: result.content?.[0]?.text?.length || 0,
    contentPreview: result.content?.[0]?.text
      ? `${result.content[0].text.substring(0, 50)}...`
      : 'No content',
  });
}

/**
 * Log and format error
 */
export function logAndFormatError(error: unknown, toolName: string): string {
  logger.error(`Error in ${toolName} tool handler`, {
    errorType: typeof error,
    errorName: error instanceof Error ? error.name : 'Unknown',
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : 'No stack available',
  });

  const errorMessage = formatError(error);
  logger.info(`Returning error response to MCP client for ${toolName}`, { errorMessage });
  return errorMessage;
}
