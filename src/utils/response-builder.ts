/**
 * @fileoverview Response builder utility for MCP tool handlers.
 * Provides a consistent way to build tool responses with proper error handling.
 * @packageDocumentation
 */

import { createLogger } from './logging/logger.js';

const logger = createLogger('DeepSourceMCP:ResponseBuilder');

/**
 * Response structure for MCP tools
 */
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent?: unknown;
  isError: boolean;
}

/**
 * Options for building a response
 */
export interface ResponseBuilderOptions {
  /** Whether to log the response */
  log?: boolean;
  /** Tool name for logging */
  toolName?: string;
  /** Structured content to include */
  structuredContent?: unknown;
}

/**
 * Builder class for creating consistent tool responses
 */
export class ToolResponseBuilder {
  private content: Array<{ type: 'text'; text: string }> = [];
  private isError = false;
  private structuredContent?: unknown;
  private options: ResponseBuilderOptions;

  constructor(options: ResponseBuilderOptions = {}) {
    this.options = options;
  }

  /**
   * Create a success response builder
   */
  static success(data: unknown, options?: ResponseBuilderOptions): ToolResponseBuilder {
    const builder = new ToolResponseBuilder(options);
    return builder.withData(data);
  }

  /**
   * Create an error response builder
   */
  static error(error: Error | string, options?: ResponseBuilderOptions): ToolResponseBuilder {
    const builder = new ToolResponseBuilder(options);
    return builder.withError(error);
  }

  /**
   * Add data to the response
   */
  withData(data: unknown): this {
    this.content.push({
      type: 'text',
      text: JSON.stringify(data),
    });

    if (this.options.log && this.options.toolName) {
      logger.info(`${this.options.toolName} response built successfully`);
    }

    return this;
  }

  /**
   * Add an error to the response
   */
  withError(error: Error | string): this {
    this.isError = true;
    const errorMessage = error instanceof Error ? error.message : error;

    this.content.push({
      type: 'text',
      text: JSON.stringify({
        error: errorMessage,
        details: 'Operation failed',
      }),
    });

    if (this.options.log && this.options.toolName) {
      logger.error(`${this.options.toolName} response contains error`, { error: errorMessage });
    }

    return this;
  }

  /**
   * Set structured content
   */
  withStructuredContent(content: unknown): this {
    this.structuredContent = content;
    return this;
  }

  /**
   * Build the final response
   */
  build(): ToolResponse {
    const response: ToolResponse = {
      content: this.content,
      isError: this.isError,
    };

    if (this.options.structuredContent !== undefined) {
      response.structuredContent = this.options.structuredContent;
    } else if (this.structuredContent !== undefined) {
      response.structuredContent = this.structuredContent;
    }

    return response;
  }
}

/**
 * Helper function to create a success response
 */
export function successResponse(data: unknown, options?: ResponseBuilderOptions): ToolResponse {
  return ToolResponseBuilder.success(data, options).build();
}

/**
 * Helper function to create an error response
 */
export function errorResponse(
  error: Error | string,
  options?: ResponseBuilderOptions
): ToolResponse {
  return ToolResponseBuilder.error(error, options).build();
}

/**
 * Helper function to parse and validate a tool response
 */
export function parseToolResponse<T = unknown>(
  response: ToolResponse,
  validator?: (data: unknown) => data is T
): T {
  if (response.isError) {
    const errorData = JSON.parse(response.content[0].text);
    throw new Error(errorData.error || 'Unknown error');
  }

  const data = JSON.parse(response.content[0].text);

  if (validator && !validator(data)) {
    throw new Error('Response data failed validation');
  }

  return data as T;
}
