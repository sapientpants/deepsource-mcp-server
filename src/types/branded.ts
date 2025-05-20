/**
 * @fileoverview Branded types for the DeepSource MCP server
 * 
 * This module defines branded types to enforce type safety for string-based identifiers.
 * Branded types help prevent mixing different string identifiers that share the same primitive type.
 * For example, a ProjectKey and RunId are both strings, but they represent different concepts.
 * Using branded types ensures that functions expecting a ProjectKey cannot accept a RunId.
 */

/**
 * A branded type for DeepSource project keys
 */
export type ProjectKey = string & { readonly __brand: 'ProjectKey' };

/**
 * A branded type for DeepSource run identifiers (UUID)
 */
export type RunId = string & { readonly __brand: 'RunId' };

/**
 * A branded type for commit hashes (SHA)
 */
export type CommitOid = string & { readonly __brand: 'CommitOid' };

/**
 * A branded type for repository branch names
 */
export type BranchName = string & { readonly __brand: 'BranchName' };

/**
 * A branded type for analyzer shortcodes
 */
export type AnalyzerShortcode = string & { readonly __brand: 'AnalyzerShortcode' };

/**
 * A branded type for internal GraphQL node IDs
 */
export type GraphQLNodeId = string & { readonly __brand: 'GraphQLNodeId' };

/**
 * Type guard functions to safely assert branded types
 */

/**
 * Converts a string to a ProjectKey type
 * @param value The string to convert
 * @returns The string as a ProjectKey
 */
export function asProjectKey(value: string): ProjectKey {
  return value as ProjectKey;
}

/**
 * Converts a string to a RunId type
 * @param value The string to convert
 * @returns The string as a RunId
 */
export function asRunId(value: string): RunId {
  return value as RunId;
}

/**
 * Converts a string to a CommitOid type
 * @param value The string to convert
 * @returns The string as a CommitOid
 */
export function asCommitOid(value: string): CommitOid {
  return value as CommitOid;
}

/**
 * Converts a string to a BranchName type
 * @param value The string to convert
 * @returns The string as a BranchName
 */
export function asBranchName(value: string): BranchName {
  return value as BranchName;
}

/**
 * Converts a string to an AnalyzerShortcode type
 * @param value The string to convert
 * @returns The string as an AnalyzerShortcode
 */
export function asAnalyzerShortcode(value: string): AnalyzerShortcode {
  return value as AnalyzerShortcode;
}

/**
 * Converts a string to a GraphQLNodeId type
 * @param value The string to convert
 * @returns The string as a GraphQLNodeId
 */
export function asGraphQLNodeId(value: string): GraphQLNodeId {
  return value as GraphQLNodeId;
}