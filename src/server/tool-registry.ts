/**
 * @fileoverview Tool registry for managing MCP tool definitions and handlers
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createLogger } from '../utils/logging/logger.js';
import { HandlerFunction, BaseHandlerDeps } from '../handlers/base/handler.interface.js';
import {
  createDefaultHandlerDeps,
  isApiResponse,
  createErrorResponse,
} from '../handlers/base/handler.factory.js';
import { logToolInvocation, logToolResult, logAndFormatError } from './tool-helpers.js';

const logger = createLogger('ToolRegistry');

/**
 * MCP response type
 */
type McpResponse = {
  content: Array<{
    type: 'text';
    text: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Tool definition interface
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input schema using Zod */
  inputSchema?: z.ZodType<TInput>;
  /** Output schema using Zod */
  outputSchema?: z.ZodType<TOutput>;
  /** Handler function */
  handler: HandlerFunction<TInput>;
}

/**
 * Registry for managing MCP tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<unknown, unknown>>();
  private server: McpServer;
  private defaultDeps: BaseHandlerDeps;

  constructor(server: McpServer, defaultDeps?: BaseHandlerDeps) {
    this.server = server;
    this.defaultDeps = defaultDeps || createDefaultHandlerDeps();
    logger.info('ToolRegistry initialized');
  }

  /**
   * Registers a tool with the MCP server
   * @param tool - The tool definition
   */
  registerTool<TInput = unknown, TOutput = unknown>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is already registered, overwriting`);
    }

    this.tools.set(tool.name, tool as ToolDefinition<unknown, unknown>);
    logger.debug(`Registering tool: ${tool.name}`);

    // Convert Zod schemas to MCP format
    const toolConfig: Record<string, unknown> = {
      description: tool.description,
    };

    if (tool.inputSchema) {
      toolConfig.inputSchema = tool.inputSchema;
    }

    if (tool.outputSchema) {
      toolConfig.outputSchema = tool.outputSchema;
    }

    // Register with MCP server
    this.server.registerTool(
      tool.name,
      toolConfig,
      // eslint-disable-next-line no-unused-vars
      async (params: Record<string, unknown>, _extra: unknown): Promise<McpResponse> => {
        try {
          logToolInvocation(tool.name, params);

          // Validate input if schema provided
          let validatedParams: TInput | undefined;
          if (tool.inputSchema && params !== undefined) {
            const parseResult = tool.inputSchema.safeParse(params);
            if (!parseResult.success) {
              logger.error(`Input validation failed for tool ${tool.name}`, {
                errors: parseResult.error.errors,
              });
              throw new Error(`Invalid input: ${parseResult.error.message}`);
            }
            validatedParams = parseResult.data;
          } else {
            validatedParams = params as TInput;
          }

          // Execute handler
          const result = await tool.handler(validatedParams!);

          logToolResult(tool.name, result);

          // Handle ApiResponse format
          if (isApiResponse(result)) {
            // If it's an error response, handle appropriately
            if (result.isError) {
              const errorContent = result.content[0];
              if (errorContent && errorContent.type === 'text') {
                let errorData;
                try {
                  errorData = JSON.parse(errorContent.text);
                } catch {
                  errorData = { error: errorContent.text };
                }
                logger.error(`${tool.name} handler returned error`, errorData);
                throw new Error(errorContent.text);
              }
            }

            // Parse the JSON content for structured response
            const textContent = result.content[0];
            if (textContent && textContent.type === 'text') {
              let parsedData;
              try {
                parsedData = JSON.parse(textContent.text);
              } catch {
                parsedData = textContent.text;
              }

              logger.info(`Successfully processed ${tool.name}`, {
                success: true,
                hasData: parsedData !== null && parsedData !== undefined,
              });

              return {
                content: result.content,
                structuredContent: parsedData as Record<string, unknown>,
                isError: false,
              } as McpResponse;
            }

            return result as unknown as McpResponse;
          }

          // For non-ApiResponse results, wrap them
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result as Record<string, unknown>,
            isError: false,
          } as McpResponse;
        } catch (error) {
          const errorMessage = logAndFormatError(error, tool.name);
          const errorResponse = createErrorResponse(error, `Failed to execute ${tool.name}`);

          // Extract structured error data
          let structuredError = {};
          try {
            const errorContent = errorResponse.content[0];
            if (errorContent && errorContent.type === 'text') {
              structuredError = JSON.parse(errorContent.text);
            }
          } catch {
            structuredError = { error: errorMessage };
          }

          return {
            content: [
              {
                type: 'text',
                text: errorMessage,
              },
            ],
            structuredContent: structuredError as Record<string, unknown>,
            isError: true,
          } as McpResponse;
        }
      }
    );

    logger.info(`Tool ${tool.name} registered successfully`);
  }

  /**
   * Registers multiple tools at once
   * @param tools - Array of tool definitions
   */
  registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Gets a registered tool by name
   * @param name - Tool name
   * @returns The tool definition or undefined
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Gets all registered tools
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Checks if a tool is registered
   * @param name - Tool name
   * @returns True if registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Updates the default dependencies
   * @param deps - New default dependencies
   */
  updateDefaultDeps(deps: BaseHandlerDeps): void {
    this.defaultDeps = deps;
    logger.debug('Default dependencies updated');
  }
}
