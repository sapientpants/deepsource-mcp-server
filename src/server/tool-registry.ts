/**
 * @fileoverview Tool registry for managing MCP tool definitions and handlers
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logging/logger.js';
import { HandlerFunction, BaseHandlerDeps } from '../handlers/base/handler.interface.js';
import {
  createDefaultHandlerDeps,
  isApiResponse,
  createErrorResponse,
} from '../handlers/base/handler.factory.js';
import { logToolInvocation, logToolResult, logAndFormatError } from './tool-helpers.js';
import { isFeatureEnabled } from '../config/features.js';
import type { DiscoveryConfig } from '../config/default.js';

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
 * Tool metadata for categorization and filtering
 */
export interface ToolMetadata {
  /** Tool category for grouping */
  category?: string;
  /** Tool version */
  version?: string;
  /** Tool tags for filtering */
  tags?: string[];
  /** Whether the tool is enabled by default */
  enabled?: boolean;
}

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
  /** Optional metadata for enhanced features */
  metadata?: ToolMetadata;
}

/**
 * Tool discovery options (compatible with DiscoveryConfig)
 */
export type ToolDiscoveryOptions = Partial<DiscoveryConfig>;

/**
 * Registry for managing MCP tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<unknown, unknown>>();
  private toolMetadata = new Map<string, ToolMetadata>();
  private discoveredTools = new Map<string, string>(); // tool name -> file path
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

    // Store metadata if provided
    if (tool.metadata) {
      this.toolMetadata.set(tool.name, tool.metadata);
      logger.debug(`Stored metadata for tool: ${tool.name}`, tool.metadata);
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

  /**
   * Discovers and loads tools from specified directories (requires FEATURE_TOOL_DISCOVERY)
   * @param options - Discovery options
   * @returns Array of discovered tool names
   */
  async discoverTools(options: ToolDiscoveryOptions = {}): Promise<string[]> {
    if (!isFeatureEnabled('toolDiscovery')) {
      logger.debug('Tool discovery is disabled by feature flag');
      return [];
    }

    const {
      directories = ['./tools'],
      patterns = ['*.tool.js', '*.tool.mjs'],
      recursive = true,
      includeCategories,
      excludeCategories,
      includeTags,
      excludeTags,
    } = options;

    logger.info('Starting tool discovery', { directories, patterns });
    const discoveredTools: string[] = [];

    for (const directory of directories) {
      try {
        const filterOptions: {
          includeCategories?: string[];
          excludeCategories?: string[];
          includeTags?: string[];
          excludeTags?: string[];
        } = {};

        if (includeCategories) filterOptions.includeCategories = includeCategories;
        if (excludeCategories) filterOptions.excludeCategories = excludeCategories;
        if (includeTags) filterOptions.includeTags = includeTags;
        if (excludeTags) filterOptions.excludeTags = excludeTags;

        const toolsFound = await this.scanDirectory(directory, patterns, recursive, filterOptions);
        discoveredTools.push(...toolsFound);
      } catch (error) {
        logger.warn(`Failed to scan directory: ${directory}`, error);
      }
    }

    logger.info(`Tool discovery complete. Found ${discoveredTools.length} tools`);
    return discoveredTools;
  }

  /**
   * Scans a directory for tool files (internal)
   */
  private async scanDirectory(
    directory: string,
    patterns: string[],
    recursive: boolean,
    filters: {
      includeCategories?: string[];
      excludeCategories?: string[];
      includeTags?: string[];
      excludeTags?: string[];
    }
  ): Promise<string[]> {
    const discoveredTools: string[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory() && recursive) {
          const subTools = await this.scanDirectory(fullPath, patterns, recursive, filters);
          discoveredTools.push(...subTools);
        } else if (entry.isFile() && this.matchesPattern(entry.name, patterns)) {
          const toolName = await this.loadToolFromFile(fullPath, filters);
          if (toolName) {
            discoveredTools.push(toolName);
            this.discoveredTools.set(toolName, fullPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to scan directory: ${directory}`, error);
    }

    return discoveredTools;
  }

  /**
   * Checks if a filename matches any of the patterns
   */
  private matchesPattern(filename: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filename);
    });
  }

  /**
   * Loads a tool from a file
   */
  private async loadToolFromFile(
    filePath: string,
    filters: {
      includeCategories?: string[];
      excludeCategories?: string[];
      includeTags?: string[];
      excludeTags?: string[];
    }
  ): Promise<string | null> {
    try {
      logger.debug(`Loading tool from file: ${filePath}`);
      const module = (await import(filePath)) as Record<string, unknown>;

      let toolDef: ToolDefinition | null = null;

      if (module.toolDefinition && typeof module.toolDefinition === 'object') {
        toolDef = module.toolDefinition as ToolDefinition;
      } else if (module.default && typeof module.default === 'object') {
        const defaultExport = module.default as Record<string, unknown>;
        if (
          'name' in defaultExport &&
          'handler' in defaultExport &&
          'description' in defaultExport
        ) {
          toolDef = defaultExport as unknown as ToolDefinition;
        }
      }

      if (!toolDef) {
        logger.warn(`No valid tool definition found in: ${filePath}`);
        return null;
      }

      if (!this.passesFilters(toolDef, filters)) {
        logger.debug(`Tool ${toolDef.name} filtered out`);
        return null;
      }

      if (toolDef.metadata?.enabled === false) {
        logger.info(`Tool ${toolDef.name} is disabled, skipping registration`);
        return null;
      }

      this.registerTool(toolDef);
      logger.info(`Successfully loaded tool: ${toolDef.name} from ${filePath}`);
      return toolDef.name;
    } catch (error) {
      logger.error(`Failed to load tool from file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Checks if a tool passes the configured filters
   */
  private passesFilters(
    tool: ToolDefinition,
    filters: {
      includeCategories?: string[];
      excludeCategories?: string[];
      includeTags?: string[];
      excludeTags?: string[];
    }
  ): boolean {
    const metadata = tool.metadata || {};

    if (filters.includeCategories?.length) {
      if (!metadata.category || !filters.includeCategories.includes(metadata.category)) {
        return false;
      }
    }

    if (filters.excludeCategories?.length) {
      if (metadata.category && filters.excludeCategories.includes(metadata.category)) {
        return false;
      }
    }

    if (filters.includeTags?.length) {
      if (!metadata.tags || !metadata.tags.some((tag) => filters.includeTags?.includes(tag))) {
        return false;
      }
    }

    if (filters.excludeTags?.length) {
      if (metadata.tags?.some((tag) => filters.excludeTags?.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets tool metadata
   * @param name - Tool name
   * @returns Tool metadata or undefined
   */
  getToolMetadata(name: string): ToolMetadata | undefined {
    return this.toolMetadata.get(name);
  }

  /**
   * Gets tools by category (requires metadata)
   * @param category - Category to filter by
   * @returns Array of tool names in the category
   */
  getToolsByCategory(category: string): string[] {
    const tools: string[] = [];
    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.category === category) {
        tools.push(name);
      }
    }
    return tools;
  }

  /**
   * Gets tools by tag (requires metadata)
   * @param tag - Tag to filter by
   * @returns Array of tool names with the tag
   */
  getToolsByTag(tag: string): string[] {
    const tools: string[] = [];
    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.tags?.includes(tag)) {
        tools.push(name);
      }
    }
    return tools;
  }

  /**
   * Gets all tool categories
   * @returns Array of unique categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const metadata of this.toolMetadata.values()) {
      if (metadata.category) {
        categories.add(metadata.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Gets all tool tags
   * @returns Array of unique tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const metadata of this.toolMetadata.values()) {
      if (metadata.tags) {
        metadata.tags.forEach((tag) => tags.add(tag));
      }
    }
    return Array.from(tags);
  }

  /**
   * Gets enhanced tool information including metadata
   * @returns Array of tool information objects
   */
  getToolsInfo(): Array<{
    name: string;
    description: string;
    category?: string;
    version?: string;
    tags?: string[];
    enabled?: boolean;
    discovered?: boolean;
  }> {
    const toolsInfo = [];

    for (const name of this.getToolNames()) {
      const tool = this.getTool(name);
      const metadata = this.getToolMetadata(name);
      const discovered = this.discoveredTools.has(name);

      if (tool) {
        toolsInfo.push({
          name: tool.name,
          description: tool.description,
          ...(metadata?.category && { category: metadata.category }),
          ...(metadata?.version && { version: metadata.version }),
          ...(metadata?.tags && { tags: metadata.tags }),
          enabled: metadata?.enabled !== false,
          discovered,
        });
      }
    }

    return toolsInfo;
  }
}
