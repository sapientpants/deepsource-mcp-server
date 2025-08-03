/**
 * @fileoverview Enhanced tool registry with automatic discovery and plugin support
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logging/logger.js';
import { HandlerFunction, BaseHandlerDeps } from '../handlers/base/handler.interface.js';
import { ToolRegistry, ToolDefinition } from './tool-registry.js';

const logger = createLogger('EnhancedToolRegistry');

/**
 * Tool metadata for discovery
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
 * Enhanced tool definition with metadata
 */
export interface EnhancedToolDefinition<TInput = unknown, TOutput = unknown>
  extends ToolDefinition<TInput, TOutput> {
  /** Tool metadata */
  metadata?: ToolMetadata;
}

/**
 * Tool module interface for discovered tools
 */
export interface ToolModule {
  /** Tool definition export */
  toolDefinition?: EnhancedToolDefinition;
  /** Tool schema export */
  toolSchema?: Record<string, unknown>;
  /** Handler export */
  handler?: HandlerFunction<unknown>;
  /** Default export (fallback) */
  default?: EnhancedToolDefinition | Record<string, unknown>;
}

/**
 * Tool discovery options
 */
export interface ToolDiscoveryOptions {
  /** Directories to scan for tools */
  directories?: string[];
  /** File patterns to match (default: ['*.tool.js', '*.tool.ts']) */
  patterns?: string[];
  /** Whether to enable recursive scanning */
  recursive?: boolean;
  /** Tool categories to include */
  includeCategories?: string[];
  /** Tool categories to exclude */
  excludeCategories?: string[];
  /** Tool tags to include */
  includeTags?: string[];
  /** Tool tags to exclude */
  excludeTags?: string[];
}

/**
 * Enhanced registry for managing MCP tools with automatic discovery
 */
export class EnhancedToolRegistry extends ToolRegistry {
  private toolMetadata = new Map<string, ToolMetadata>();
  private discoveredTools = new Map<string, string>(); // tool name -> file path

  constructor(server: McpServer, defaultDeps?: BaseHandlerDeps) {
    super(server, defaultDeps);
    logger.info('EnhancedToolRegistry initialized');
  }

  /**
   * Registers an enhanced tool with metadata
   * @param tool - The enhanced tool definition
   */
  registerEnhancedTool<TInput = unknown, TOutput = unknown>(
    tool: EnhancedToolDefinition<TInput, TOutput>
  ): void {
    // Store metadata if provided
    if (tool.metadata) {
      this.toolMetadata.set(tool.name, tool.metadata);
      logger.debug(`Stored metadata for tool: ${tool.name}`, tool.metadata);
    }

    // Register the tool using parent method
    super.registerTool(tool);
  }

  /**
   * Discovers and loads tools from specified directories
   * @param options - Discovery options
   * @returns Array of discovered tool names
   */
  async discoverTools(options: ToolDiscoveryOptions = {}): Promise<string[]> {
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
        const toolsFound = await this.scanDirectory(directory, patterns, recursive, {
          includeCategories,
          excludeCategories,
          includeTags,
          excludeTags,
        });
        discoveredTools.push(...toolsFound);
      } catch (error) {
        logger.warn(`Failed to scan directory: ${directory}`, error);
      }
    }

    logger.info(`Tool discovery complete. Found ${discoveredTools.length} tools`);
    return discoveredTools;
  }

  /**
   * Scans a directory for tool files
   * @param directory - Directory to scan
   * @param patterns - File patterns to match
   * @param recursive - Whether to scan recursively
   * @param filters - Category and tag filters
   * @returns Array of discovered tool names
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
          // Recursively scan subdirectories
          const subTools = await this.scanDirectory(fullPath, patterns, recursive, filters);
          discoveredTools.push(...subTools);
        } else if (entry.isFile() && EnhancedToolRegistry.matchesPattern(entry.name, patterns)) {
          // Try to load the tool
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
   * @param filename - File name to check
   * @param patterns - Patterns to match against
   * @returns True if matches any pattern
   */
  private static matchesPattern(filename: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filename);
    });
  }

  /**
   * Loads a tool from a file
   * @param filePath - Path to the tool file
   * @param filters - Category and tag filters
   * @returns Tool name if successfully loaded, null otherwise
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

      // Import the module
      const module = (await import(filePath)) as ToolModule;

      // Extract tool definition from various export patterns
      let toolDef: EnhancedToolDefinition | null = null;

      if (module.toolDefinition) {
        toolDef = module.toolDefinition;
      } else if (module.default && typeof module.default === 'object') {
        // Check if default export is a tool definition
        if ('name' in module.default && 'handler' in module.default) {
          toolDef = module.default as EnhancedToolDefinition;
        }
      } else if (module.toolSchema && module.handler) {
        // Construct tool definition from separate exports
        const schema = module.toolSchema as Record<string, unknown>;
        toolDef = {
          name: schema.name as string,
          description: schema.description as string,
          inputSchema: schema.inputSchema as z.ZodType<unknown> | undefined,
          outputSchema: schema.outputSchema as z.ZodType<unknown> | undefined,
          handler: module.handler,
        };
      }

      if (!toolDef) {
        logger.warn(`No valid tool definition found in: ${filePath}`);
        return null;
      }

      // Apply filters
      if (!EnhancedToolRegistry.passesFilters(toolDef, filters)) {
        logger.debug(`Tool ${toolDef.name} filtered out`);
        return null;
      }

      // Check if tool should be enabled
      if (toolDef.metadata?.enabled === false) {
        logger.info(`Tool ${toolDef.name} is disabled, skipping registration`);
        return null;
      }

      // Register the tool
      this.registerEnhancedTool(toolDef);
      logger.info(`Successfully loaded tool: ${toolDef.name} from ${filePath}`);
      return toolDef.name;
    } catch (error) {
      logger.error(`Failed to load tool from file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Checks if a tool passes the configured filters
   * @param tool - Tool definition to check
   * @param filters - Filters to apply
   * @returns True if passes all filters
   */
  private static passesFilters(
    tool: EnhancedToolDefinition,
    filters: {
      includeCategories?: string[];
      excludeCategories?: string[];
      includeTags?: string[];
      excludeTags?: string[];
    }
  ): boolean {
    const metadata = tool.metadata || {};

    // Category filters
    if (filters.includeCategories && filters.includeCategories.length > 0) {
      if (!metadata.category || !filters.includeCategories.includes(metadata.category)) {
        return false;
      }
    }

    if (filters.excludeCategories && filters.excludeCategories.length > 0) {
      if (metadata.category && filters.excludeCategories.includes(metadata.category)) {
        return false;
      }
    }

    // Tag filters
    if (filters.includeTags && filters.includeTags.length > 0) {
      if (!metadata.tags || !metadata.tags.some((tag) => filters.includeTags?.includes(tag))) {
        return false;
      }
    }

    if (filters.excludeTags && filters.excludeTags.length > 0) {
      if (metadata.tags && metadata.tags.some((tag) => filters.excludeTags?.includes(tag))) {
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
   * Gets tools by category
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
   * Gets tools by tag
   * @param tag - Tag to filter by
   * @returns Array of tool names with the tag
   */
  getToolsByTag(tag: string): string[] {
    const tools: string[] = [];
    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.tags && metadata.tags.includes(tag)) {
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
   * Reloads a tool from its file
   * @param name - Tool name to reload
   * @returns True if successfully reloaded
   */
  async reloadTool(name: string): Promise<boolean> {
    const filePath = this.discoveredTools.get(name);
    if (!filePath) {
      logger.warn(`Cannot reload tool ${name}: not a discovered tool`);
      return false;
    }

    try {
      // Clear the module cache
      const resolvedPath = require.resolve(filePath);
      delete require.cache[resolvedPath];

      // Reload the tool
      const reloadedName = await this.loadToolFromFile(filePath, {});
      return reloadedName === name;
    } catch (error) {
      logger.error(`Failed to reload tool ${name}`, error);
      return false;
    }
  }

  /**
   * Enables a disabled tool
   * @param name - Tool name to enable
   * @returns True if successfully enabled
   */
  enableTool(name: string): boolean {
    const metadata = this.toolMetadata.get(name);
    if (!metadata) {
      logger.warn(`Cannot enable tool ${name}: no metadata found`);
      return false;
    }

    metadata.enabled = true;
    this.toolMetadata.set(name, metadata);
    logger.info(`Enabled tool: ${name}`);
    return true;
  }

  /**
   * Disables a tool
   * @param name - Tool name to disable
   * @returns True if successfully disabled
   */
  disableTool(name: string): boolean {
    const metadata = this.toolMetadata.get(name);
    if (!metadata) {
      // Create metadata if it doesn't exist
      this.toolMetadata.set(name, { enabled: false });
    } else {
      metadata.enabled = false;
      this.toolMetadata.set(name, metadata);
    }

    logger.info(`Disabled tool: ${name}`);
    return true;
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
          category: metadata?.category,
          version: metadata?.version,
          tags: metadata?.tags,
          enabled: metadata?.enabled !== false,
          discovered,
        });
      }
    }

    return toolsInfo;
  }
}

/**
 * Creates an enhanced tool registry with discovery capabilities
 * @param server - MCP server instance
 * @param defaultDeps - Default dependencies
 * @returns Enhanced tool registry instance
 */
export function createEnhancedToolRegistry(
  server: McpServer,
  defaultDeps?: BaseHandlerDeps
): EnhancedToolRegistry {
  return new EnhancedToolRegistry(server, defaultDeps);
}
