/**
 * @fileoverview Error types for the DeepSource MCP Server
 * This module defines error types and interfaces.
 */

import { ErrorCategory } from './categories.js';

/**
 * Enriched error with additional metadata
 * Extends the standard Error with additional properties for better error handling.
 * @interface
 * @public
 */
export interface ClassifiedError extends Error {
  /** The category of the error */
  category: ErrorCategory;
  /** The original error that caused this error */
  originalError?: unknown;
  /** Any additional metadata related to the error */
  metadata?: Record<string, unknown>;
  /** Error code for specific error identification */
  code?: string;
}

/**
 * Check if an error is a classified error
 * @param error The error to check
 * @returns True if the error is a classified error
 * @public
 */
export function isClassifiedError(error: unknown): error is ClassifiedError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      'category' in error &&
      typeof (error as Record<string, unknown>).category === 'string'
  );
}
