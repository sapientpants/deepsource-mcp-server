/**
 * @fileoverview Base handler interfaces and types for standardized handler patterns
 * @packageDocumentation
 */

import { DeepSourceClientFactory } from '../../client/factory.js';
import { Logger } from '../../utils/logging/logger.js';
import { ApiResponse } from '../../models/common.js';

/**
 * Base dependencies that all handlers require
 */
export interface BaseHandlerDeps {
  /** Factory for creating DeepSource API clients */
  clientFactory: DeepSourceClientFactory;
  /** Logger instance for the handler */
  logger: Logger;
  /** Function to retrieve the API key */
  getApiKey: () => string;
}

/**
 * Generic handler function type
 * @template TParams - The input parameters type
 * @template TResult - The result type (defaults to ApiResponse)
 */
export type HandlerFunction<TParams = unknown, TResult = ApiResponse> = TParams extends undefined
  ? () => Promise<TResult>
  : (params: TParams) => Promise<TResult>;

/**
 * Factory function type for creating handlers with dependencies
 * @template TDeps - The dependencies type (extends BaseHandlerDeps)
 * @template TParams - The handler parameters type
 * @template TResult - The handler result type
 */
export type HandlerFactory<
  TDeps extends BaseHandlerDeps = BaseHandlerDeps,
  TParams = unknown,
  TResult = ApiResponse,
> = (deps: TDeps) => HandlerFunction<TParams, TResult>;

/**
 * Handler configuration for registration
 */
export interface HandlerConfig<TParams = unknown> {
  /** The name of the handler/tool */
  name: string;
  /** Factory function to create the handler */
  factory: HandlerFactory<BaseHandlerDeps, TParams>;
  /** Optional custom dependencies (will be merged with base deps) */
  customDeps?: Partial<BaseHandlerDeps>;
}

/**
 * Result type for handlers that return structured data
 */
export interface HandlerResult<T> {
  /** The structured data */
  data: T;
  /** Optional metadata about the result */
  metadata?: {
    /** Total count of items (for paginated results) */
    totalCount?: number;
    /** Whether there are more pages */
    hasMore?: boolean;
    /** Cursor for next page */
    nextCursor?: string;
  };
}

/**
 * Error result type for standardized error handling
 */
export interface HandlerError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Suggested actions for resolution */
  suggestions?: string[];
}
