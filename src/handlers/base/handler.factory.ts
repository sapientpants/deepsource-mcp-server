/**
 * @fileoverview Base handler factory implementation for standardized handler creation
 * @packageDocumentation
 */

import {
  BaseHandlerDeps,
  HandlerFactory,
  HandlerFunction,
  HandlerError,
} from './handler.interface.js';
import { ApiResponse } from '../../models/common.js';
import { createLogger } from '../../utils/logging/logger.js';
import { DeepSourceClientFactory } from '../../client/factory.js';
import { getApiKey } from '../../config/index.js';

/**
 * Creates a base handler factory with common functionality
 * @template TParams - The handler parameters type
 * @template TResult - The handler result type
 * @param handlerName - The name of the handler for logging
 * @param handlerLogic - The actual handler implementation
 * @returns A handler factory function
 */
export function createBaseHandlerFactory<TParams = unknown, TResult = ApiResponse>(
  handlerName: string,
  // eslint-disable-next-line no-unused-vars
  handlerLogic: (deps: BaseHandlerDeps, params: TParams) => Promise<TResult>
): HandlerFactory<BaseHandlerDeps, TParams, TResult> {
  return (deps: BaseHandlerDeps): HandlerFunction<TParams, TResult> => {
    const handler = async (params: TParams): Promise<TResult> => {
      const startTime = Date.now();

      try {
        // Log handler invocation
        deps.logger.info(`Handler ${handlerName} invoked`, {
          hasParams: params !== undefined && params !== null,
          ...(params && typeof params === 'object' ? { params } : {}),
        });

        // Execute the handler logic
        const result = await handlerLogic(deps, params);

        // Log successful completion
        const duration = Date.now() - startTime;
        deps.logger.info(`Handler ${handlerName} completed successfully`, {
          duration,
          ...(result && typeof result === 'object' && 'data' in result
            ? {
                resultCount: Array.isArray((result as Record<string, unknown>).data)
                  ? ((result as Record<string, unknown>).data as unknown[]).length
                  : 1,
              }
            : {}),
        });

        return result;
      } catch (error) {
        // Log error details
        const duration = Date.now() - startTime;
        deps.logger.error(`Handler ${handlerName} failed`, {
          duration,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });

        // Re-throw the error for upstream handling
        throw error;
      }
    };
    return handler as HandlerFunction<TParams, TResult>;
  };
}

/**
 * Creates default handler dependencies
 * @param overrides - Optional overrides for specific dependencies
 * @returns The complete handler dependencies
 */
export function createDefaultHandlerDeps(overrides?: Partial<BaseHandlerDeps>): BaseHandlerDeps {
  const apiKey = getApiKey();

  return {
    clientFactory: new DeepSourceClientFactory(apiKey),
    logger: createLogger('Handler'),
    getApiKey,
    ...overrides,
  };
}

/**
 * Wraps a handler result in an ApiResponse format
 * @param data - The data to wrap
 * @returns An ApiResponse with the data as JSON text
 */
export function wrapInApiResponse<T>(data: T): ApiResponse {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Creates an error ApiResponse
 * @param error - The error to convert
 * @param defaultMessage - Default message if error parsing fails
 * @returns An ApiResponse with error information
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): ApiResponse {
  let errorData: HandlerError;

  if (error instanceof Error) {
    // Check if it's a structured error with code
    if ('code' in error && typeof error.code === 'string') {
      errorData = {
        code: error.code,
        message: error.message,
        details: 'details' in error ? (error.details as Record<string, unknown>) : undefined,
        suggestions: 'suggestions' in error ? (error.suggestions as string[]) : undefined,
      };
    } else {
      // Generic error
      errorData = {
        code: 'HANDLER_ERROR',
        message: error.message || defaultMessage,
      };
    }
  } else {
    // Unknown error type
    errorData = {
      code: 'UNKNOWN_ERROR',
      message: String(error) || defaultMessage,
    };
  }

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(errorData),
      },
    ],
  };
}

/**
 * Type guard to check if a value is an ApiResponse
 * @param value - The value to check
 * @returns True if the value is an ApiResponse
 */
export function isApiResponse(value: unknown): value is ApiResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as Record<string, unknown>).content)
  );
}
