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
  /** Input schema using Zod - can be ZodType or ZodRawShape */
  inputSchema?: z.ZodType<TInput> | z.ZodRawShape;
  /** Output schema using Zod - can be ZodType or ZodRawShape */
  outputSchema?: z.ZodType<TOutput> | z.ZodRawShape;
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
    logger.debug(`Registering tool: ${tool.name}`, {
      hasInputSchema: Boolean(tool.inputSchema),
      inputSchemaType: tool.inputSchema ? typeof tool.inputSchema : 'undefined',
      inputSchemaDetails: tool.inputSchema
        ? {
            isZodSchema: tool.inputSchema && '_def' in (tool.inputSchema as object),
            schemaKeys: tool.inputSchema ? Object.keys(tool.inputSchema) : [],
          }
        : null,
    });

    // MCP SDK expects Zod schemas directly
    const toolConfig: Record<string, unknown> = {
      description: tool.description,
    };

    if (tool.inputSchema) {
      toolConfig.inputSchema = tool.inputSchema;
      logger.debug(`Tool ${tool.name} inputSchema details`, {
        schemaType: typeof tool.inputSchema,
        isZodSchema:
          tool.inputSchema && typeof tool.inputSchema === 'object' && '_def' in tool.inputSchema,
        hasShape:
          tool.inputSchema && typeof tool.inputSchema === 'object' && 'shape' in tool.inputSchema,
      });
    }

    if (tool.outputSchema) {
      toolConfig.outputSchema = tool.outputSchema;
      logger.debug(`Tool ${tool.name} outputSchema details`, {
        schemaType: typeof tool.outputSchema,
        isZodSchema:
          tool.outputSchema && typeof tool.outputSchema === 'object' && '_def' in tool.outputSchema,
      });
    }

    // Register with MCP server
    logger.info(`About to register tool with MCP server: ${tool.name}`, {
      mcpServerType: typeof this.server,
      mcpServerHasRegisterTool: 'registerTool' in this.server,
      toolConfigKeys: Object.keys(toolConfig),
    });

    try {
      this.server.registerTool(
        tool.name,
        toolConfig,

        async (params: Record<string, unknown>, _: unknown): Promise<McpResponse> => {
          // Second parameter required by MCP SDK but not used
          logger.info(`===== TOOL INVOCATION START: ${tool.name} =====`);
          logger.info(`Tool ${tool.name} received params:`, {
            params,
            paramsType: typeof params,
            paramsKeys: params ? Object.keys(params) : [],
            paramsStringified: JSON.stringify(params),
            hasInputSchema: Boolean(tool.inputSchema),
          });
          try {
            logger.debug(`Tool ${tool.name} invoked`, {
              params,
              paramsType: typeof params,
              hasInputSchema: Boolean(tool.inputSchema),
            });
            logToolInvocation(tool.name, params);

            // Validate input if schema provided
            let validatedParams: TInput;
            if (tool.inputSchema && params !== undefined) {
              logger.debug(`Validating params for ${tool.name}`, {
                schemaType: typeof tool.inputSchema,
                hasDefProperty: '_def' in (tool.inputSchema as object),
                hasSafeParseMethod: 'safeParse' in (tool.inputSchema as object),
              });

              // Wrap the inputSchema in z.object() if it's a ZodRawShape
              const schema =
                tool.inputSchema &&
                typeof tool.inputSchema === 'object' &&
                !('safeParse' in tool.inputSchema)
                  ? z.object(tool.inputSchema as z.ZodRawShape)
                  : (tool.inputSchema as z.ZodSchema);

              const parseResult = schema.safeParse(params);
              if (!parseResult.success) {
                logger.error(`Input validation failed for tool ${tool.name}`, {
                  errors: parseResult.error.issues,
                });
                throw new Error(`Invalid input: ${parseResult.error.message}`);
              }
              validatedParams = parseResult.data;
            } else {
              // If no schema or params is undefined, pass through as-is
              validatedParams = (params ?? {}) as TInput;
            }

            // Execute handler
            logger.info(`About to execute handler for ${tool.name} with validated params:`, {
              validatedParams,
              handlerType: typeof tool.handler,
            });

            const result = await tool.handler(validatedParams);

            logger.info(`Handler for ${tool.name} returned result:`, {
              resultType: typeof result,
              isApiResponse: isApiResponse(result),
              result,
            });

            logToolResult(tool.name, result);

            // Handle ApiResponse format
            if (isApiResponse(result)) {
              // If it's an error response, handle appropriately
              if (result.isError) {
                const errorContent = result.content[0];
                if (errorContent?.type === 'text') {
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
              if (textContent?.type === 'text') {
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

                // Wrap arrays in an object for MCP SDK compatibility
                // Use tool-specific field names for arrays
                const structuredData = Array.isArray(parsedData)
                  ? { [tool.name]: parsedData }
                  : parsedData;

                const finalResponse = {
                  content: result.content,
                  structuredContent: structuredData as Record<string, unknown>,
                  isError: false,
                } as McpResponse;

                logger.info(`===== TOOL INVOCATION SUCCESS: ${tool.name} =====`, {
                  responseType: 'ApiResponse',
                  finalResponse,
                });

                return finalResponse;
              }

              logger.info(`===== TOOL INVOCATION SUCCESS: ${tool.name} =====`, {
                responseType: 'ApiResponse-passthrough',
                result,
              });

              return result as unknown as McpResponse;
            }

            // For non-ApiResponse results, wrap them
            // Wrap arrays in an object for MCP SDK compatibility
            // Use tool-specific field names for arrays
            const structuredResult = Array.isArray(result) ? { [tool.name]: result } : result;

            const wrappedResponse = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
              structuredContent: structuredResult as Record<string, unknown>,
              isError: false,
            } as McpResponse;

            logger.info(`===== TOOL INVOCATION SUCCESS: ${tool.name} =====`, {
              responseType: 'wrapped',
              wrappedResponse,
            });

            return wrappedResponse;
          } catch (error) {
            logger.error(`===== TOOL INVOCATION ERROR: ${tool.name} =====`, {
              error,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });

            const errorMessage = logAndFormatError(error, tool.name);
            const errorResponse = createErrorResponse(error, `Failed to execute ${tool.name}`);

            // Extract structured error data
            let structuredError = {};
            try {
              const errorContent = errorResponse.content[0];
              if (errorContent?.type === 'text') {
                structuredError = JSON.parse(errorContent.text);
              }
            } catch {
              structuredError = { error: errorMessage };
            }

            const finalErrorResponse = {
              content: [
                {
                  type: 'text',
                  text: errorMessage,
                },
              ],
              structuredContent: structuredError as Record<string, unknown>,
              isError: true,
            } as McpResponse;

            logger.error(`===== TOOL INVOCATION FAILED: ${tool.name} =====`, {
              finalErrorResponse,
            });

            return finalErrorResponse;
          }
        }
      );

      logger.info(`MCP server.registerTool completed for: ${tool.name}`);
    } catch (error) {
      logger.error(`Failed to register tool ${tool.name} with MCP server`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

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
